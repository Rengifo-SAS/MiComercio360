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
      className="h-full flex flex-col bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/20 dark:from-slate-900 dark:via-indigo-950/20 dark:to-purple-950/20"
      role="main"
      aria-label="Catálogo de productos"
    >
      {/* Barra de Búsqueda - Rediseñada completamente */}
      <div
        className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 shadow-xl flex-shrink-0 sticky top-0 z-10"
        role="search"
      >
        {/* Indicador de estado offline */}
        <OfflineIndicator />
        <div className="relative flex-1 min-w-0">
          {/* Icono de búsqueda o código de barras según el modo */}
          {isScanning ? (
            <Barcode
              className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-indigo-600 h-4 w-4 sm:h-5 sm:w-5 animate-pulse"
              aria-hidden="true"
            />
          ) : (
            <Search
              className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-indigo-600 dark:text-indigo-400 h-5 w-5 sm:h-6 sm:w-6"
              aria-hidden="true"
            />
          )}

          <Input
            ref={searchInputRef}
            placeholder={
              isScanning ? 'Escanee código...' : 'Buscar productos'
            }
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn(
              'pl-9 sm:pl-10 md:pl-11 pr-8 sm:pr-9 md:pr-10 text-sm sm:text-base md:text-lg h-10 sm:h-12 md:h-14 rounded-lg sm:rounded-xl transition-all min-h-[40px] sm:min-h-[48px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-2 shadow-lg',
              isScanning
                ? 'border-yellow-400 focus:ring-yellow-400 focus:border-yellow-500'
                : 'border-white/50 dark:border-slate-700/50 focus:ring-white focus:border-white'
            )}
            aria-label="Buscar productos por nombre, SKU o código de barras"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />

          {/* Indicadores de estado */}
          {isSearching && (
            <Loader2
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-indigo-600"
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
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
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
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
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
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md border-indigo-600'
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
            className="h-10 px-3 rounded-md font-medium hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-400 dark:hover:bg-indigo-900/20 dark:hover:border-indigo-600 transition-all gap-1.5 text-gray-700 dark:text-gray-300"
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
                className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"
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
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5 p-2 sm:p-3 md:p-4 lg:p-6 bg-transparent"
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
                    'group flex flex-col bg-white dark:bg-slate-800 select-none relative cursor-pointer transition-all duration-200 active:scale-95 rounded-xl sm:rounded-2xl overflow-hidden border-2 min-h-[140px] sm:min-h-[180px] md:min-h-[200px] lg:min-h-[220px] shadow-md hover:shadow-xl',
                    isOutOfStock
                      ? 'opacity-60 cursor-not-allowed border-slate-300 dark:border-slate-600'
                      : cartQuantity > 0
                        ? 'border-indigo-500 dark:border-indigo-400 shadow-xl shadow-indigo-500/30 ring-2 ring-indigo-500/20 scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg hover:scale-[1.01]'
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
                  {/* Gradiente de fondo sutil */}
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                      isOutOfStock
                        ? 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900'
                        : 'from-indigo-50/50 via-purple-50/30 to-pink-50/50 dark:from-indigo-900/10 dark:via-purple-900/10 dark:to-pink-900/10'
                    )}
                  />

                  {/* Referencia - Mejorado */}
                  {product.sku && (
                    <div className="absolute top-2 left-2 z-20">
                      <span className="text-[9px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 shadow-sm">
                        #{product.sku.slice(-6)}
                      </span>
                    </div>
                  )}

                  {/* Badge de cantidad en carrito - Mejorado */}
                  {cartQuantity > 0 && (
                    <div className="absolute -top-2 -right-2 z-20 animate-in zoom-in-50 duration-300">
                      <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-md opacity-60 animate-pulse" />
                        <Badge className="relative bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center p-0 text-xs sm:text-sm font-bold shadow-xl ring-2 ring-white dark:ring-gray-800">
                          {cartQuantity}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Zona de imagen - Rediseñada y más compacta para móvil */}
                  <div className="relative overflow-hidden h-24 sm:h-28 md:h-32 lg:h-36 xl:h-40 w-full bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-indigo-900/40 dark:via-purple-900/40 dark:to-pink-900/40 flex-shrink-0">
                    {/* Cantidad de inventario - Mejorado */}
                    {!isOutOfStock ? (
                      <div className="absolute top-2 right-2 z-20">
                        <span className="inline-flex items-center gap-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-2 py-1 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[10px] font-semibold text-green-700 dark:text-green-400">
                            {product.available_quantity || 0}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 z-20">
                        <span className="inline-flex items-center gap-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-2 py-1 rounded-lg border border-red-200 dark:border-red-800 shadow-sm">
                          <AlertCircle className="h-3 w-3 text-red-500" />
                          <span className="text-[9px] font-semibold text-red-600 dark:text-red-400">
                            Agotado
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Icono/imagen del producto - Mejorado */}
                    <div className="w-full h-full flex items-center justify-center absolute">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                        <div className="relative bg-gradient-to-br from-white to-indigo-50 dark:from-slate-800 dark:to-indigo-900/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                          <Package className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 text-indigo-600 dark:text-indigo-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nombre del producto - Rediseñado */}
                  <div className="relative px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-b from-white to-indigo-50/50 dark:from-slate-800 dark:to-indigo-950/30 border-t-2 border-indigo-100 dark:border-indigo-900/50 flex-1 flex items-center justify-center min-h-[56px]">
                    <p className="text-center text-sm sm:text-base leading-tight font-bold text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                      {product.name}
                    </p>
                  </div>

                  {/* Precio - Super destacado */}
                  <div className="px-3 sm:px-4 pb-4 sm:pb-5 pt-2 bg-gradient-to-b from-indigo-50/50 via-purple-50/30 to-pink-50/30 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/20 flex-shrink-0">
                    <p className="text-center text-lg sm:text-xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
                      {formatCurrency(
                        parseFloat(product.selling_price.toString())
                      )}
                    </p>
                  </div>
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
                    'cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white dark:bg-gray-800 border-2 relative focus:ring-2 focus:ring-indigo-500 focus:outline-none rounded-xl',
                    isOutOfStock
                      ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700'
                      : cartQuantity > 0
                        ? 'ring-2 ring-indigo-500/30 border-indigo-400 dark:border-indigo-500 shadow-lg shadow-indigo-500/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                  )}
                  onClick={() => !isOutOfStock && onAddToCart(product)}
                  tabIndex={0}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-4">
                      {/* Icono */}
                      <div className="flex-shrink-0 h-16 w-16 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 rounded-xl flex items-center justify-center border-2 border-indigo-200 dark:border-indigo-800 shadow-sm">
                        <Package className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
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
                            <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs border-0 shadow-md">
                              En carrito: {cartQuantity}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Precio */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
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
