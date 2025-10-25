'use client';

import { useState, useEffect, useRef } from 'react';
import { Product } from '@/lib/types/sales';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { POSQuickProductDialog } from '@/components/pos-quick-product-dialog';
import { ProductsService } from '@/lib/services/products-service';

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
}

export function POSProductsGrid({
  products,
  onAddToCart,
  cart,
  loading,
  companyId,
  onProductsReload,
}: POSProductsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  const [showQuickProductDialog, setShowQuickProductDialog] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Actualizar productos filtrados cuando cambien los productos base
  useEffect(() => {
    if (!searchQuery) {
      setFilteredProducts(products);
    }
  }, [products, searchQuery]);

  // Función para buscar productos en la base de datos
  const searchProductsInDB = async (searchTerm: string) => {
    if (!searchTerm.trim() || !companyId) {
      setFilteredProducts(products);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await ProductsService.searchProducts(
        companyId,
        searchTerm
      );
      setFilteredProducts(searchResults);
    } catch (error) {
      console.error('Error buscando productos:', error);
      // En caso de error, usar búsqueda local como fallback
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } finally {
      setIsSearching(false);
    }
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

  // Función para manejar la detección de códigos de barras desde el escáner
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Si estamos en modo escáner y se presiona Enter
      if (isScanning && e.key === 'Enter') {
        e.preventDefault();
        const currentValue = searchQuery.trim();

        if (currentValue && /^\d{8,}$/.test(currentValue)) {
          // Buscar primero en productos cargados
          const product = products.find((p) => p.barcode === currentValue);
          if (product) {
            onAddToCart(product);
            setSearchQuery('');
            return;
          }

          // Si no se encuentra, buscar en la base de datos
          searchProductsInDB(currentValue).then(() => {
            setTimeout(() => {
              const foundProduct = filteredProducts.find(
                (p) => p.barcode === currentValue
              );
              if (foundProduct) {
                onAddToCart(foundProduct);
                setSearchQuery('');
              }
            }, 100);
          });
        }
      }
    };

    if (isScanning) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isScanning, searchQuery, products, onAddToCart, filteredProducts]);

  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const getCartQuantity = (productId: string) => {
    const cartItem = cart.find((item) => item.product.id === productId);
    return cartItem?.quantity || 0;
  };

  const getInventoryStatus = (product: Product) => {
    const quantity = product.available_quantity || 0;
    if (quantity === 0)
      return { text: 'Sin Stock', color: 'bg-red-100 text-red-800' };
    if (quantity <= 5)
      return {
        text: `Inv ${quantity}`,
        color: 'bg-yellow-100 text-yellow-800',
      };
    return { text: `Inv ${quantity}`, color: 'bg-green-100 text-green-800' };
  };

  const getInventoryBadge = (product: Product) => {
    const status = getInventoryStatus(product);
    return (
      <Badge variant="secondary" className={cn('text-xs', status.color)}>
        {status.text}
      </Badge>
    );
  };

  return (
    <div
      className="h-full flex flex-col bg-white dark:bg-gray-800"
      role="main"
      aria-label="Catálogo de productos"
    >
      {/* Barra de Búsqueda - Responsiva */}
      <div
        className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-b dark:border-gray-700 flex-shrink-0"
        role="search"
      >
        <div className="relative flex-1">
          <Search
            className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4"
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 sm:pl-10 pr-4 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-xs sm:text-sm h-8 sm:h-9 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            aria-label="Buscar productos por nombre, SKU o código de barras"
            aria-describedby="search-help"
          />
          {isSearching && (
            <Loader2
              className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 animate-spin text-gray-400"
              aria-hidden="true"
            />
          )}
          {searchQuery && !isSearching && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-7 sm:w-7 p-0 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              onClick={() => {
                setSearchQuery('');
                setFilteredProducts(products);
              }}
              aria-label="Limpiar búsqueda"
            >
              ×
            </Button>
          )}
        </div>
        <div
          className="flex gap-1 sm:gap-2 flex-shrink-0"
          role="group"
          aria-label="Acciones de productos"
        >
          <Button
            variant={isScanning ? 'default' : 'outline'}
            size="sm"
            className={`text-xs h-8 sm:h-9 px-1 sm:px-2 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
              isScanning ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''
            }`}
            onClick={handleScannerToggle}
            aria-label={
              isScanning
                ? 'Desactivar modo escáner'
                : 'Activar modo escáner de códigos de barras'
            }
            aria-pressed={isScanning}
          >
            <Barcode
              className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">
              {isScanning ? 'Escaneando...' : 'Escanear'}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 sm:h-9 px-1 sm:px-2 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            onClick={() => setShowQuickProductDialog(true)}
            aria-label="Crear nuevo producto"
          >
            <Plus
              className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Grid de Productos - Solo scroll vertical */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
        ) : (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-2 p-3"
            role="grid"
            aria-label="Catálogo de productos"
          >
            {filteredProducts.map((product) => {
              const cartQuantity = getCartQuantity(product.id);
              const inventoryStatus = getInventoryStatus(product);
              const isOutOfStock = inventoryStatus.text === 'Sin Stock';

              return (
                <Card
                  key={product.id}
                  role="gridcell"
                  className={cn(
                    'cursor-pointer transition-all duration-200 hover:shadow-md bg-white dark:bg-gray-800 border dark:border-gray-700 relative focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:outline-none',
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
                  aria-describedby={`product-${product.id}-info`}
                >
                  <CardContent className="p-1.5 sm:p-2">
                    <div className="space-y-0.5 sm:space-y-1">
                      {/* Código del producto */}
                      <div
                        className="text-xs text-gray-500 dark:text-gray-400 text-left truncate"
                        id={`product-${product.id}-info`}
                      >
                        SKU: {product.sku}
                      </div>

                      {/* Icono de etiqueta de precio */}
                      <div
                        className="flex items-center justify-center h-8 sm:h-10 w-full bg-gray-100 dark:bg-gray-700 rounded"
                        aria-hidden="true"
                      >
                        <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">
                          ₡
                        </span>
                      </div>

                      {/* Badge de inventario */}
                      <div className="text-center">
                        {getInventoryBadge(product)}
                      </div>

                      {/* Nombre del producto */}
                      <div className="text-xs font-medium text-center leading-tight h-6 sm:h-8 flex items-center justify-center text-gray-900 dark:text-gray-100">
                        <span className="line-clamp-2">{product.name}</span>
                      </div>

                      {/* Precio */}
                      <div className="text-center">
                        <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
                          {formatCurrency(
                            parseFloat(product.selling_price.toString())
                          )}
                        </span>
                      </div>

                      {/* Badge de cantidad en carrito */}
                      {cartQuantity > 0 && (
                        <div
                          className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1"
                          role="status"
                          aria-live="polite"
                        >
                          <Badge
                            className="bg-teal-600 text-white rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs"
                            aria-label={`${cartQuantity} unidades en el carrito`}
                          >
                            {cartQuantity}
                          </Badge>
                        </div>
                      )}

                      {/* Indicador de sin stock */}
                      {isOutOfStock && (
                        <div
                          className="absolute inset-0 flex items-center justify-center bg-white/80 rounded"
                          role="status"
                          aria-live="polite"
                        >
                          <AlertCircle
                            className="h-4 w-4 sm:h-6 sm:w-6 text-red-500"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Producto sin stock</span>
                        </div>
                      )}
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
