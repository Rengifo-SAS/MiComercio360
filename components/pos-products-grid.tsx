'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Product } from '@/lib/types/products';
import { formatCurrency } from '@/lib/types/sales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Plus,
  Package,
  Barcode,
  AlertCircle,
  Loader2,
  Grid3x3,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { POSQuickProductDialog } from '@/components/pos-quick-product-dialog';
import { ProductsService } from '@/lib/services/products-service';
import { toast } from 'sonner';
import { OfflineIndicator } from '@/components/offline-indicator';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';
import { offlineStorage } from '@/lib/services/offline-storage-service';

// Funciones auxiliares para manejo de unidades de medida
const getUnitLabel = (unit: string): string => {
  const unitLabels: { [key: string]: string } = {
    pcs: 'pzs',
    kg: 'kg',
    g: 'g',
    l: 'L',
    ml: 'ml',
    m: 'm',
    cm: 'cm',
  };
  return unitLabels[unit] || unit;
};

interface CartItem {
  product: Product;
  quantity: number;
}

interface POSProductsGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  cart: CartItem[];
  loading: boolean;
  companyId: string;
  onProductsReload?: () => void;
  selectedCategoryId?: string | null;
}

export function POSProductsGrid({
  products,
  onAddToCart,
  cart,
  loading,
  companyId,
  onProductsReload,
  selectedCategoryId,
}: POSProductsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  const [showQuickProductDialog, setShowQuickProductDialog] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isOnline } = useOnlineStatus();

  // Memoizar funciones auxiliares
  const getCartQuantity = useCallback(
    (productId: string) => {
      const cartItem = cart.find((item) => item.product.id === productId);
      return cartItem?.quantity || 0;
    },
    [cart]
  );

  const getInventoryStatus = useCallback((product: Product) => {
    const quantity = product.available_quantity || 0;
    if (quantity === 0)
      return { text: 'Sin Stock', color: 'bg-red-100 text-red-800' };
    if (quantity <= 5)
      return {
        text: `Inv ${quantity}`,
        color: 'bg-yellow-100 text-yellow-800',
      };
    return { text: `Inv ${quantity}`, color: 'bg-green-100 text-green-800' };
  }, []);

  const getInventoryBadge = useCallback(
    (product: Product) => {
      const status = getInventoryStatus(product);
      return (
        <Badge variant="secondary" className={cn('text-xs', status.color)}>
          {status.text}
        </Badge>
      );
    },
    [getInventoryStatus]
  );

  // Actualizar productos filtrados cuando cambien los productos base o la categoría
  useEffect(() => {
    let filtered = products;

    // Filtrar por categoría si hay una seleccionada
    if (selectedCategoryId) {
      filtered = filtered.filter(
        (product) => product.category_id === selectedCategoryId
      );
    }

    // Si no hay búsqueda, mostrar los productos filtrados por categoría
    if (!searchQuery) {
      setFilteredProducts(filtered);
    }
  }, [products, searchQuery, selectedCategoryId]);

  // Función para buscar productos en la base de datos
  const searchProductsInDB = async (searchTerm: string) => {
    if (!searchTerm.trim() || !companyId) {
      // Si no hay búsqueda, aplicar filtro de categoría
      let filtered = products;
      if (selectedCategoryId) {
        filtered = filtered.filter(
          (product) => product.category_id === selectedCategoryId
        );
      }
      setFilteredProducts(filtered);
      return;
    }

    setIsSearching(true);

    // ESTRATEGIA: Intentar caché primero (más rápido y funciona offline)
    // Solo ir a red si caché falla o está vacío
    try {
      const cached = await offlineStorage.getCachedProducts();

      if (cached && cached.length > 0) {
        // Tenemos caché, usarlo directamente sin intentar red
        let filtered = cached.filter(
          (product: Product) =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Aplicar filtro de categoría si corresponde
        if (selectedCategoryId) {
          filtered = filtered.filter(
            (p) => p.category_id === selectedCategoryId
          );
        }

        setFilteredProducts(filtered);
        setIsSearching(false);
        return;
      }
    } catch (cacheError) {
      // Si falla el caché, continuar para intentar red
      console.warn(
        'Cache no disponible, intentando búsqueda online:',
        cacheError
      );
    }

    // Si no hay caché O estamos online, intentar búsqueda en servidor
    if (isOnline) {
      try {
        const searchResults = await ProductsService.searchProducts(
          companyId,
          searchTerm
        );

        // Aplicar filtro de categoría a los resultados de búsqueda
        let filtered = searchResults;
        if (selectedCategoryId) {
          filtered = filtered.filter(
            (product) => product.category_id === selectedCategoryId
          );
        }
        setFilteredProducts(filtered);
        setIsSearching(false);
        return;
      } catch (error) {
        console.warn('Error en búsqueda online, usando fallback:', error);
      }
    }

    // Fallback final: usar los productos actualmente en estado
    let filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedCategoryId) {
      filtered = filtered.filter(
        (product) => product.category_id === selectedCategoryId
      );
    }
    setFilteredProducts(filtered);
    setIsSearching(false);
  };

  // Auto-focus en el campo de búsqueda para códigos de barras
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Limpiar timeout anterior si existe
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Si es un código de barras (solo números y longitud típica), buscar automáticamente
    if (/^\d{8,}$/.test(value)) {
      // Buscar primero en productos cargados
      const product = products.find((p) => p.barcode === value);
      if (product) {
        onAddToCart(product);
        setSearchQuery(''); // Limpiar búsqueda
        searchInputRef.current?.focus();
        return;
      }

      // Si no se encuentra en productos cargados, buscar en la base de datos
      searchProductsInDB(value).then(() => {
        // Después de buscar, intentar encontrar el producto en los resultados
        setTimeout(() => {
          const foundProduct = filteredProducts.find(
            (p) => p.barcode === value
          );
          if (foundProduct) {
            onAddToCart(foundProduct);
            setSearchQuery(''); // Limpiar búsqueda
            searchInputRef.current?.focus();
          }
        }, 100);
      });
      return;
    }

    // Para búsquedas normales, usar debounce para evitar demasiadas consultas
    const timeout = setTimeout(() => {
      searchProductsInDB(value);
    }, 300); // 300ms de delay

    setSearchTimeout(timeout);
  };

  // Función para activar el escáner
  const handleScannerToggle = () => {
    setIsScanning(!isScanning);
    if (!isScanning) {
      // Enfocar el input para recibir datos del escáner
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  // Función para manejar la creación de producto
  const handleProductCreated = () => {
    setShowQuickProductDialog(false);
    if (onProductsReload) {
      onProductsReload();
    }
  };

  // Función mejorada para manejar la detección de códigos de barras desde el escáner
  useEffect(() => {
    let barcodeBuffer = '';
    let barcodeTimeout: NodeJS.Timeout | null = null;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Detectar entrada rápida de caracteres (típico de escáneres de códigos de barras)
      const isAlphanumeric = /^[a-zA-Z0-9]$/.test(e.key);

      if (isAlphanumeric) {
        // Acumular caracteres
        barcodeBuffer += e.key;

        // Limpiar buffer después de 100ms de inactividad
        if (barcodeTimeout) clearTimeout(barcodeTimeout);
        barcodeTimeout = setTimeout(() => {
          barcodeBuffer = '';
        }, 100);
      }

      // Detectar Enter (fin de escaneo)
      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        e.preventDefault();
        const scannedCode = barcodeBuffer.trim();
        barcodeBuffer = '';

        if (barcodeTimeout) clearTimeout(barcodeTimeout);

        // Procesar el código escaneado
        if (scannedCode.length >= 8) {
          // Mostrar feedback visual
          setSearchQuery(scannedCode);

          // Buscar producto por código de barras
          const product = products.find(
            (p) => p.barcode === scannedCode || p.sku === scannedCode
          );

          if (product) {
            onAddToCart(product);
            setSearchQuery('');
            searchInputRef.current?.focus();
            // Feedback visual de éxito
            toast.success(`Producto agregado: ${product.name}`);
          } else {
            // Si no se encuentra localmente, buscar en la base de datos
            searchProductsInDB(scannedCode).then(() => {
              setTimeout(() => {
                const foundProduct = filteredProducts.find(
                  (p) => p.barcode === scannedCode || p.sku === scannedCode
                );
                if (foundProduct) {
                  onAddToCart(foundProduct);
                  toast.success(`Producto agregado: ${foundProduct.name}`);
                } else {
                  toast.error('Producto no encontrado');
                }
                setSearchQuery('');
                searchInputRef.current?.focus();
              }, 200);
            });
          }
        }
      }
    };

    // Siempre escuchar para detección automática de escáner
    // Los escáneres envían caracteres muy rápido, lo cual podemos detectar
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (barcodeTimeout) clearTimeout(barcodeTimeout);
    };
  }, [products, onAddToCart, filteredProducts, searchProductsInDB]);

  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <div
      className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
      role="main"
      aria-label="Catálogo de productos"
    >
      {/* Barra de Búsqueda - Moderna y Profesional */}
      <div
        className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm flex-shrink-0"
        role="search"
      >
        {/* Indicador de estado offline */}
        <OfflineIndicator />
        <div className="relative flex-1 min-w-0">
          {/* Icono de búsqueda o código de barras según el modo */}
          {isScanning ? (
            <Barcode
              className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-teal-600 h-4 w-4 sm:h-5 sm:w-5 animate-pulse"
              aria-hidden="true"
            />
          ) : (
            <Search
              className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5"
              aria-hidden="true"
            />
          )}

          <Input
            ref={searchInputRef}
            placeholder={
              isScanning
                ? 'Escanee código...'
                : 'Buscar producto...'
            }
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn(
              'pl-9 sm:pl-11 pr-8 sm:pr-10 text-xs sm:text-sm h-9 sm:h-10 rounded-lg transition-all',
              isScanning
                ? 'bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-500 focus:ring-teal-500 focus:border-teal-600'
                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
            )}
            aria-label="Buscar productos por nombre, SKU o código de barras"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />

          {/* Indicadores de estado */}
          {isSearching && (
            <Loader2
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-teal-600"
              aria-hidden="true"
            />
          )}
          {searchQuery && !isSearching && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 transform -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              onClick={() => {
                setSearchQuery('');
                setFilteredProducts(products);
                searchInputRef.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {/* Toggle de vista */}
          <div className="hidden md:flex border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-700">
            <button
              type="button"
              className={cn(
                'h-10 w-10 flex items-center justify-center transition-colors border-r border-gray-200 dark:border-gray-600',
                viewMode === 'grid'
                  ? 'bg-teal-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
              )}
              onClick={() => setViewMode('grid')}
              aria-label="Vista en cuadrícula"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                'h-10 w-10 flex items-center justify-center transition-colors',
                viewMode === 'compact'
                  ? 'bg-teal-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
              )}
              onClick={() => setViewMode('compact')}
              aria-label="Vista compacta"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Botón de escáner */}
          <Button
            variant={isScanning ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-10 px-3 rounded-md font-medium transition-all gap-1.5',
              isScanning
                ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-md border-teal-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            )}
            onClick={handleScannerToggle}
            aria-label={
              isScanning
                ? 'Desactivar modo escáner'
                : 'Activar modo escáner de códigos de barras'
            }
            aria-pressed={isScanning}
          >
            <Barcode className={cn('h-4 w-4', isScanning && 'animate-pulse')} />
            <span className="hidden sm:inline text-xs">
              {isScanning ? 'Escáner ON' : 'Escáner'}
            </span>
          </Button>

          {/* Botón de nuevo producto */}
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-3 rounded-md font-medium hover:bg-teal-50 hover:text-teal-700 hover:border-teal-400 dark:hover:bg-teal-900/20 dark:hover:border-teal-600 transition-all gap-1.5 text-gray-700 dark:text-gray-300"
            onClick={() => setShowQuickProductDialog(true)}
            disabled={!isOnline}
            aria-label={
              isOnline
                ? 'Crear nuevo producto'
                : 'Crear producto no disponible sin conexión'
            }
            title={!isOnline ? 'Esta función requiere conexión a internet' : ''}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline text-xs">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Grid de Productos - Solo scroll vertical */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {loading ? (
          <div
            className="flex items-center justify-center h-64"
            role="status"
            aria-live="polite"
          >
            <div className="text-center">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"
                aria-hidden="true"
              ></div>
              <p className="text-sm">Cargando productos...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div
            className="flex items-center justify-center h-64"
            role="status"
            aria-live="polite"
          >
            <div className="text-center text-gray-500">
              <Package
                className="h-12 w-12 mx-auto mb-4 text-gray-300"
                aria-hidden="true"
              />
              <p className="text-sm">No se encontraron productos</p>
              <p className="text-xs">Intenta con otros términos de búsqueda</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div
            className="flex flex-wrap justify-around align-content-start gap-1.5 sm:gap-2 p-2 sm:p-3 md:p-4"
            role="grid"
            aria-label="Catálogo de productos"
          >
            {filteredProducts.map((product) => {
              const cartQuantity = getCartQuantity(product.id);
              const inventoryStatus = getInventoryStatus(product);
              const isOutOfStock = inventoryStatus.text === 'Sin Stock';

              return (
                <div
                  key={product.id}
                  role="gridcell"
                  className={cn(
                    'flex flex-col bg-white dark:bg-gray-800 select-none relative cursor-pointer transition-all duration-150 hover:shadow-lg rounded-sm overflow-hidden w-[110px] sm:w-[130px] md:w-[140px]',
                    isOutOfStock && 'opacity-50 cursor-not-allowed',
                    cartQuantity > 0 && 'ring-2 ring-teal-500'
                  )}
                  onClick={() => !isOutOfStock && onAddToCart(product)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!isOutOfStock) {
                        onAddToCart(product);
                      }
                    }
                  }}
                  tabIndex={0}
                  aria-label={`${product.name}, precio: ${formatCurrency(
                    parseFloat(product.selling_price.toString())
                  )}, stock: ${product.available_quantity || 0} unidades${
                    isOutOfStock ? ', sin stock' : ''
                  }`}
                >
                  {/* Referencia - Absolute top left */}
                  {product.sku && (
                    <p className="absolute top-1 left-1 text-[10px] text-teal-600 dark:text-teal-400 bg-white dark:bg-gray-800 px-1 rounded z-10">
                      {product.sku}
                    </p>
                  )}

                  {/* Badge de cantidad en carrito - Absolute top right con animación */}
                  {cartQuantity > 0 && (
                    <div className="absolute -top-1 -right-1 z-10 animate-in zoom-in-50 duration-300">
                      <Badge className="bg-teal-600 text-white rounded-full h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center p-0 text-xs sm:text-sm font-bold shadow-lg ring-2 ring-white dark:ring-gray-800 animate-pulse">
                        {cartQuantity}
                      </Badge>
                    </div>
                  )}

                  {/* Zona de imagen */}
                  <div className="relative overflow-hidden h-32 w-full">
                    {/* Cantidad de inventario - Absolute */}
                    {!isOutOfStock ? (
                      <p className="absolute top-1 right-1 m-0 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-[10px] rounded text-gray-700 dark:text-gray-300 z-10">
                        Inv {product.available_quantity || 0}
                      </p>
                    ) : (
                      <div className="absolute top-1 right-1 flex items-center gap-1 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded z-10">
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                        <p className="text-[9px] text-gray-600 dark:text-gray-400 m-0">
                          Agotado
                        </p>
                      </div>
                    )}

                    {/* Icono/imagen del producto */}
                    <div className="w-full h-full flex items-center justify-center absolute bg-gray-50 dark:bg-gray-700/30">
                      <Package className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>

                  {/* Nombre del producto */}
                  <p className="text-center text-xs leading-tight px-2 py-1.5 h-10 flex items-center justify-center overflow-hidden text-gray-900 dark:text-gray-100">
                    <span className="line-clamp-2">{product.name}</span>
                  </p>

                  {/* Precio */}
                  <p className="text-center text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2">
                    {formatCurrency(
                      parseFloat(product.selling_price.toString())
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          /* Vista Compacta - Lista */
          <div
            className="p-4 sm:p-6 space-y-2"
            role="list"
            aria-label="Catálogo de productos"
          >
            {filteredProducts.map((product) => {
              const cartQuantity = getCartQuantity(product.id);
              const inventoryStatus = getInventoryStatus(product);
              const isOutOfStock = inventoryStatus.text === 'Sin Stock';

              return (
                <Card
                  key={product.id}
                  role="listitem"
                  className={cn(
                    'cursor-pointer transition-all duration-200 hover:shadow-md bg-white dark:bg-gray-800 border dark:border-gray-700 relative focus:ring-2 focus:ring-teal-500 focus:outline-none',
                    isOutOfStock && 'opacity-50 cursor-not-allowed',
                    cartQuantity > 0 && 'ring-2 ring-teal-500 border-teal-300'
                  )}
                  onClick={() => !isOutOfStock && onAddToCart(product)}
                  tabIndex={0}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-4">
                      {/* Icono */}
                      <div className="flex-shrink-0 h-16 w-16 bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-teal-600 dark:text-teal-400" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                          #{product.sku}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {getInventoryBadge(product)}
                          {cartQuantity > 0 && (
                            <Badge className="bg-teal-600 text-white text-xs">
                              En carrito: {cartQuantity}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Precio */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xl font-bold text-teal-600 dark:text-teal-400">
                          {formatCurrency(
                            parseFloat(product.selling_price.toString())
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          por {getUnitLabel(product.unit)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Diálogo de Producto Rápido */}
      <POSQuickProductDialog
        open={showQuickProductDialog}
        onOpenChange={setShowQuickProductDialog}
        companyId={companyId}
        onProductCreated={handleProductCreated}
      />
    </div>
  );
}
