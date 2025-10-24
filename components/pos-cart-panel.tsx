'use client';

import { useState } from 'react';
import { Customer } from '@/lib/types/customers';
import { formatCurrency, calculateSaleTotals } from '@/lib/types/sales';
import { Numeration } from '@/lib/types/numerations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  Receipt,
  CreditCard,
  RotateCcw,
} from 'lucide-react';

interface CartItem {
  product: any;
  quantity: number;
}

interface POSCartPanelProps {
  cart: CartItem[];
  customers: Customer[];
  selectedCustomer: Customer | null;
  onCustomerChange: (customer: Customer | null) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onProcessSale: () => void;
  loading: boolean;
  numerations: Numeration[];
  selectedNumeration: Numeration | null;
  onNumerationChange: (numeration: Numeration | null) => void;
}

export function POSCartPanel({
  cart,
  customers,
  selectedCustomer,
  onCustomerChange,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProcessSale,
  loading,
  numerations,
  selectedNumeration,
  onNumerationChange,
}: POSCartPanelProps) {
  const [invoiceType, setInvoiceType] = useState('local');

  // Calcular totales
  const saleItems = cart.map((item) => ({
    product_id: item.product.id,
    quantity: item.quantity,
    unit_price: parseFloat(item.product.selling_price.toString()),
    discount_percentage: 0,
    discount_amount: 0,
    total_price:
      parseFloat(item.product.selling_price.toString()) * item.quantity,
    iva_rate: parseFloat(item.product.iva_rate?.toString() || '0'),
    ica_rate: parseFloat(item.product.ica_rate?.toString() || '0'),
    retencion_rate: parseFloat(item.product.retencion_rate?.toString() || '0'),
  }));

  const totals = calculateSaleTotals(
    saleItems,
    0,
    cart.map((item) => item.product)
  );

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Validar si hay productos con inventario insuficiente
  const hasInsufficientInventory = cart.some((item) => {
    const availableQuantity = item.product.available_quantity || 0;
    return item.quantity > availableQuantity;
  });

  // Validar si hay productos sin inventario
  const hasOutOfStockItems = cart.some((item) => {
    const availableQuantity = item.product.available_quantity || 0;
    return availableQuantity <= 0;
  });

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header - Responsivo */}
      <div className="flex items-center justify-between p-2 sm:p-3 border-b dark:border-gray-700 flex-shrink-0">
        <h2 className="flex items-center text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
          <Receipt className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          Factura
        </h2>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 sm:h-7 sm:w-7 p-0"
          >
            <CreditCard className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Configuración - Responsiva */}
      <div className="p-2 border-b dark:border-gray-700 space-y-1.5 flex-shrink-0">
        {/* Primera línea: Tipo Factura y Numeración */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="invoice-type" className="text-xs">
              Lista de precio
            </Label>
            <Select value={invoiceType} onValueChange={setInvoiceType}>
              <SelectTrigger className="h-7 sm:h-8 text-xs bg-white dark:bg-gray-700">
                <SelectValue placeholder="General" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="numeration" className="text-xs">
              Numeración
            </Label>
            <Select
              value={selectedNumeration?.id || undefined}
              onValueChange={(value) => {
                const numeration = numerations.find((n) => n.id === value);
                onNumerationChange(numeration || null);
              }}
            >
              <SelectTrigger className="h-7 sm:h-8 text-xs bg-white dark:bg-gray-700">
                <SelectValue placeholder="Principal" />
              </SelectTrigger>
              <SelectContent>
                {numerations.map((numeration) => (
                  <SelectItem key={numeration.id} value={numeration.id}>
                    {numeration.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Segunda línea: Cliente */}
        <div>
          <Label htmlFor="customer" className="text-xs">
            Cliente
          </Label>
          <div className="flex gap-2">
            <Select
              value={selectedCustomer?.id || undefined}
              onValueChange={(value) => {
                const customer = customers.find((c) => c.id === value);
                onCustomerChange(customer || null);
              }}
            >
              <SelectTrigger className="h-7 sm:h-8 text-xs bg-white dark:bg-gray-700 flex-1">
                <SelectValue placeholder="Consumidor final" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs">
                        {customer.business_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {customer.identification_type}{' '}
                        {customer.identification_number}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido del Carrito - Scroll optimizado */}
      <div className="flex-1 flex flex-col min-h-0 p-2 overflow-hidden">
        {/* Lista de Productos - Scroll */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-xs">Aquí verás los productos</p>
                <p className="text-xs">que elijas</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3">
              {cart.map((item) => {
                const availableQuantity = item.product.available_quantity || 0;
                const isNearLimit = item.quantity >= availableQuantity * 0.8; // 80% del inventario
                const isAtLimit = item.quantity >= availableQuantity;
                const totalPrice =
                  parseFloat(item.product.selling_price.toString()) *
                  item.quantity;

                return (
                  <Card
                    key={item.product.id}
                    className={`transition-all duration-200 hover:shadow-md ${
                      isAtLimit
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : isNearLimit
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <CardContent className="p-3">
                      {/* Información del producto */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {item.product.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {item.product.sku && `SKU: ${item.product.sku}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveItem(item.product.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Precio y cantidad */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(
                              parseFloat(item.product.selling_price.toString())
                            )}
                          </span>
                          <span className="text-xs text-gray-500">
                            Precio unitario
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(totalPrice)}
                          </span>
                          <p className="text-xs text-gray-500">Total</p>
                        </div>
                      </div>

                      {/* Controles de cantidad */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onUpdateQuantity(
                                item.product.id,
                                item.quantity - 1
                              )
                            }
                            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center justify-center min-w-[3rem] h-8 bg-gray-100 dark:bg-gray-700 rounded-md">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {item.quantity}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onUpdateQuantity(
                                item.product.id,
                                item.quantity + 1
                              )
                            }
                            disabled={isAtLimit}
                            className={`h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              isAtLimit ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Estado del inventario */}
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isAtLimit
                                ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                : isNearLimit
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                                : 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                            }`}
                          >
                            {isAtLimit
                              ? 'Sin stock'
                              : `Stock: ${availableQuantity}`}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Siempre visible con altura fija */}
      <div className="border-t dark:border-gray-700 p-2 flex-shrink-0 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
              {totalItems} Productos
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Subtotal: {formatCurrency(totals.subtotal)}
            </p>
            <p className="text-sm font-bold text-teal-600">
              {formatCurrency(totals.total_amount)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-8 sm:h-10 text-xs"
            onClick={onClearCart}
            disabled={cart.length === 0 || loading}
          >
            Cancelar
          </Button>
          <Button
            className={`flex-1 h-8 sm:h-10 text-xs ${
              hasInsufficientInventory || hasOutOfStockItems
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
            onClick={() => {
              if (hasInsufficientInventory || hasOutOfStockItems) {
                toast.error(
                  'No se puede procesar la venta. Verifica el inventario de los productos.'
                );
                return;
              }
              onProcessSale();
            }}
            disabled={cart.length === 0 || !selectedCustomer || loading}
          >
            {loading
              ? 'Procesando...'
              : hasInsufficientInventory || hasOutOfStockItems
              ? 'Error de Inventario'
              : 'Vender'}
          </Button>
        </div>
      </div>
    </div>
  );
}
