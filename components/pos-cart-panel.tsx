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

  return (
    <Card className="h-full flex flex-col bg-white dark:bg-gray-800 border dark:border-gray-700">
      {/* Header - Ultra Responsive */}
      <CardHeader className="pb-2 xs:pb-3 sm:pb-4 p-2 xs:p-3 sm:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-sm xs:text-base sm:text-lg text-gray-900 dark:text-gray-100">
            <Receipt className="h-4 w-4 xs:h-5 xs:w-5 mr-1 xs:mr-2" />
            <span className="hidden xs:inline">Factura de Venta</span>
            <span className="xs:hidden">Factura</span>
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 xs:h-8 xs:w-8 p-0"
            >
              <CreditCard className="h-3 w-3 xs:h-4 xs:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-2 xs:space-y-3 sm:space-y-4 p-2 xs:p-3 sm:p-6">
        {/* Selectores Superiores - Ultra Responsive */}
        <div className="space-y-1 xs:space-y-2">
          {/* Primera línea: Tipo Factura y Numeración */}
          <div className="grid grid-cols-2 gap-1 xs:gap-2">
            <div>
              <Label htmlFor="invoice-type" className="text-[10px] xs:text-xs">
                Tipo Factura
              </Label>
              <Select value={invoiceType} onValueChange={setInvoiceType}>
                <SelectTrigger className="h-6 xs:h-8 text-[10px] xs:text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="numeration" className="text-[10px] xs:text-xs">
                Numeración
              </Label>
              <Select
                value={selectedNumeration?.id || ''}
                onValueChange={(value) => {
                  const numeration = numerations.find((n) => n.id === value);
                  onNumerationChange(numeration || null);
                }}
              >
                <SelectTrigger className="h-6 xs:h-8 text-[10px] xs:text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Numeración" />
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
            <Label htmlFor="customer" className="text-[10px] xs:text-xs">
              Cliente
            </Label>
            <Select
              value={selectedCustomer?.id || ''}
              onValueChange={(value) => {
                const customer = customers.find((c) => c.id === value);
                onCustomerChange(customer || null);
              }}
            >
              <SelectTrigger className="h-6 xs:h-8 text-[10px] xs:text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                <SelectValue placeholder="Cliente" />
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
          </div>
        </div>

        <Separator />

        {/* Carrito de Productos - Ultra Responsive */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2 xs:mb-3 flex-shrink-0">
            <h3 className="font-medium flex items-center text-xs xs:text-sm text-gray-900 dark:text-gray-100">
              <ShoppingCart className="h-3 w-3 xs:h-4 xs:w-4 mr-1 xs:mr-2" />
              <span className="hidden xs:inline">Productos ({totalItems})</span>
              <span className="xs:hidden">({totalItems})</span>
            </h3>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearCart}
                className="text-red-600 hover:text-red-700 h-6 xs:h-8 px-1 xs:px-2"
              >
                <RotateCcw className="h-3 w-3 xs:h-4 xs:w-4 xs:mr-1" />
                <span className="hidden xs:inline">Limpiar</span>
              </Button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-4 xs:py-6 sm:py-8 text-gray-500 dark:text-gray-400 flex-1 flex flex-col justify-center">
              <ShoppingCart className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 mx-auto mb-2 xs:mb-3 sm:mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-xs xs:text-sm">El carrito está vacío</p>
              <p className="text-[10px] xs:text-xs">
                Agrega productos para continuar
              </p>
            </div>
          ) : (
            <div className="space-y-1 xs:space-y-2 overflow-y-auto flex-1">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center space-x-2 xs:space-x-3 p-2 xs:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs xs:text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                      {item.product.name}
                    </p>
                    <p className="text-[10px] xs:text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(
                        parseFloat(item.product.selling_price.toString())
                      )}{' '}
                      c/u
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 xs:space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 xs:h-8 xs:w-8 p-0"
                      onClick={() =>
                        onUpdateQuantity(item.product.id, item.quantity - 1)
                      }
                    >
                      <Minus className="h-2 w-2 xs:h-3 xs:w-3" />
                    </Button>

                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value) || 0;
                        onUpdateQuantity(item.product.id, newQuantity);
                      }}
                      className="w-8 xs:w-10 h-6 xs:h-8 text-center text-[10px] xs:text-xs"
                      min="1"
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 xs:h-8 xs:w-8 p-0"
                      onClick={() =>
                        onUpdateQuantity(item.product.id, item.quantity + 1)
                      }
                    >
                      <Plus className="h-2 w-2 xs:h-3 xs:w-3" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 xs:h-8 xs:w-8 p-0 text-red-600 hover:text-red-700"
                      onClick={() => onRemoveItem(item.product.id)}
                    >
                      <Trash2 className="h-2 w-2 xs:h-3 xs:w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Resumen de Totales - Ultra Responsive */}
        <div className="space-y-1 xs:space-y-2 flex-shrink-0">
          <div className="flex justify-between text-[10px] xs:text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <span>Subtotal:</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-[10px] xs:text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <span>IVA:</span>
            <span>{formatCurrency(totals.iva_amount)}</span>
          </div>
          <div className="flex justify-between text-[10px] xs:text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <span>ICA:</span>
            <span>{formatCurrency(totals.ica_amount)}</span>
          </div>
          <div className="flex justify-between text-[10px] xs:text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <span>Retención:</span>
            <span>{formatCurrency(totals.retencion_amount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-sm xs:text-base sm:text-lg text-gray-900 dark:text-gray-100">
            <span>Total:</span>
            <span className="text-teal-600">
              {formatCurrency(totals.total_amount)}
            </span>
          </div>
        </div>

        {/* Botones de Acción - Ultra Responsive */}
        <div className="space-y-1 xs:space-y-2 flex-shrink-0">
          <Button
            variant="outline"
            className="w-full h-8 xs:h-10 text-[10px] xs:text-xs sm:text-sm"
            onClick={onClearCart}
            disabled={cart.length === 0 || loading}
          >
            Cancelar
          </Button>

          <Button
            className="w-full h-8 xs:h-10 bg-teal-600 hover:bg-teal-700 text-[10px] xs:text-xs sm:text-sm"
            onClick={onProcessSale}
            disabled={cart.length === 0 || !selectedCustomer || loading}
          >
            {loading
              ? 'Procesando...'
              : `Vender ${formatCurrency(totals.total_amount)}`}
          </Button>
        </div>

        {/* Información del Cliente */}
        {selectedCustomer && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center text-sm text-blue-700">
              <User className="h-4 w-4 mr-2" />
              <div>
                <p className="font-medium">{selectedCustomer.business_name}</p>
                <p className="text-xs">
                  {selectedCustomer.identification_type}{' '}
                  {selectedCustomer.identification_number}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
