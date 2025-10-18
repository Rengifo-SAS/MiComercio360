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
            <div className="flex-1 overflow-y-auto space-y-1 sm:space-y-2">
              {cart.map((item) => {
                const availableQuantity = item.product.available_quantity || 0;
                const isNearLimit = item.quantity >= availableQuantity * 0.8; // 80% del inventario
                const isAtLimit = item.quantity >= availableQuantity;

                return (
                  <div
                    key={item.product.id}
                    className={`flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-lg ${
                      isAtLimit
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : isNearLimit
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                        : 'bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.product.name}
                      </p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-gray-500">
                          {formatCurrency(
                            parseFloat(item.product.selling_price.toString())
                          )}{' '}
                          × {item.quantity}
                        </p>
                        <span
                          className={`text-xs px-1 py-0.5 rounded-full ${
                            isAtLimit
                              ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                              : isNearLimit
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                              : 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                          }`}
                        >
                          {isAtLimit
                            ? 'Sin stock'
                            : `Disponible: ${availableQuantity}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onUpdateQuantity(item.product.id, item.quantity - 1)
                        }
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                      >
                        <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </Button>
                      <span className="text-xs font-medium w-5 sm:w-6 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onUpdateQuantity(item.product.id, item.quantity + 1)
                        }
                        disabled={isAtLimit}
                        className={`h-5 w-5 sm:h-6 sm:w-6 p-0 ${
                          isAtLimit ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveItem(item.product.id)}
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                  </div>
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
