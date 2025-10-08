'use client';

import { useState, useEffect, useRef } from 'react';
import { Product } from '@/lib/types/sales';
import { formatCurrency } from '@/lib/types/sales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, Package, Barcode, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartItem {
  product: Product;
  quantity: number;
}

interface POSProductsGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  cart: CartItem[];
  loading: boolean;
}

export function POSProductsGrid({
  products,
  onAddToCart,
  cart,
  loading,
}: POSProductsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [products, searchQuery]);

  // Auto-focus en el campo de búsqueda para códigos de barras
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Si es un código de barras (solo números y longitud típica), buscar automáticamente
    if (/^\d{8,}$/.test(value)) {
      const product = products.find((p) => p.barcode === value);
      if (product) {
        onAddToCart(product);
        setSearchQuery(''); // Limpiar búsqueda
        searchInputRef.current?.focus();
      }
    }
  };

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
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
      {/* Barra de Búsqueda - Ultra Responsive */}
      <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-1 xs:gap-2 sm:gap-4 p-2 xs:p-3 sm:p-4 border-b dark:border-gray-700 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2 xs:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 xs:h-4 xs:w-4" />
          <Input
            ref={searchInputRef}
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-6 xs:pl-10 pr-8 xs:pr-4 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-xs xs:text-sm h-8 xs:h-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 xs:h-8 xs:w-8 p-0"
              onClick={() => setSearchQuery('')}
            >
              ×
            </Button>
          )}
        </div>
        <div className="flex gap-1 xs:gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] xs:text-xs sm:text-sm h-7 xs:h-8 px-2"
          >
            <Barcode className="h-3 w-3 xs:h-4 xs:w-4 xs:mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Escanear</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] xs:text-xs sm:text-sm h-7 xs:h-8 px-2"
          >
            <Plus className="h-3 w-3 xs:h-4 xs:w-4 xs:mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Grid de Productos - Ultra Responsive */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 xs:h-48 sm:h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 xs:h-8 xs:w-8 border-b-2 border-teal-600 mx-auto mb-2 xs:mb-4"></div>
              <p className="text-xs xs:text-sm">Cargando productos...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-32 xs:h-48 sm:h-64">
            <div className="text-center text-gray-500">
              <Package className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 mx-auto mb-2 xs:mb-4 text-gray-300" />
              <p className="text-xs xs:text-sm">No se encontraron productos</p>
              <p className="text-[10px] xs:text-xs">
                Intenta con otros términos de búsqueda
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-1 xs:gap-2 sm:gap-3 md:gap-4 p-1 xs:p-2 sm:p-3 md:p-4 overflow-y-auto">
            {filteredProducts.map((product) => {
              const cartQuantity = getCartQuantity(product.id);
              const inventoryStatus = getInventoryStatus(product);
              const isOutOfStock = inventoryStatus.text === 'Sin Stock';

              return (
                <Card
                  key={product.id}
                  className={cn(
                    'cursor-pointer transition-all duration-200 hover:shadow-md bg-white dark:bg-gray-800 border dark:border-gray-700 relative',
                    isOutOfStock && 'opacity-50 cursor-not-allowed',
                    cartQuantity > 0 && 'ring-1 xs:ring-2 ring-teal-500'
                  )}
                  onClick={() => !isOutOfStock && onAddToCart(product)}
                >
                  <CardContent className="p-1 xs:p-2 sm:p-3 md:p-4">
                    <div className="space-y-1 xs:space-y-2 sm:space-y-3">
                      {/* Código del producto */}
                      <div className="text-[10px] xs:text-xs text-gray-500 dark:text-gray-400 text-left truncate">
                        {product.sku}
                      </div>

                      {/* Icono de etiqueta de precio */}
                      <div className="flex items-center justify-center h-6 xs:h-8 sm:h-10 md:h-12 w-full bg-gray-100 dark:bg-gray-700 rounded">
                        <span className="text-xs xs:text-sm sm:text-base md:text-lg font-medium text-gray-600 dark:text-gray-300">
                          ₡
                        </span>
                      </div>

                      {/* Badge de inventario */}
                      <div className="text-center">
                        {getInventoryBadge(product)}
                      </div>

                      {/* Nombre del producto */}
                      <div className="text-[10px] xs:text-xs sm:text-sm font-medium text-center leading-tight h-6 xs:h-8 sm:h-10 flex items-center justify-center text-gray-900 dark:text-gray-100">
                        <span className="line-clamp-2">{product.name}</span>
                      </div>

                      {/* Precio */}
                      <div className="text-center">
                        <span className="text-[10px] xs:text-xs sm:text-sm md:text-base font-bold text-gray-800 dark:text-gray-200">
                          {formatCurrency(
                            parseFloat(product.selling_price.toString())
                          )}
                        </span>
                      </div>

                      {/* Badge de cantidad en carrito */}
                      {cartQuantity > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 xs:-top-1 xs:-right-1 sm:-top-2 sm:-right-2">
                          <Badge className="bg-teal-600 text-white rounded-full h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 flex items-center justify-center p-0 text-[10px] xs:text-xs">
                            {cartQuantity}
                          </Badge>
                        </div>
                      )}

                      {/* Indicador de sin stock */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded">
                          <AlertCircle className="h-8 w-8 text-red-500" />
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

      {/* Información de productos encontrados */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          {filteredProducts.length} producto
          {filteredProducts.length !== 1 ? 's' : ''} encontrado
          {filteredProducts.length !== 1 ? 's' : ''}
          {searchQuery && ` para "${searchQuery}"`}
        </p>
      </div>
    </div>
  );
}
