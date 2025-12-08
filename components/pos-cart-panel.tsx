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
import { POSQuantityDialog } from '@/components/pos-quantity-dialog';
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

// Funciones auxiliares para manejo de unidades de medida
const getQuantityStep = (unit: string): number => {
  switch (unit) {
    case 'kg':
    case 'l':
      return 0.1; // Incrementos de 100g o 100ml
    case 'g':
    case 'ml':
      return 1; // Incrementos de 1g o 1ml
    case 'm':
      return 0.1; // Incrementos de 10cm
    case 'cm':
      return 1; // Incrementos de 1cm
    default:
      return 1; // Para piezas (pcs) y otros
  }
};

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

const formatQuantity = (quantity: number, unit: string): string => {
  if (unit === 'kg' || unit === 'l' || unit === 'm') {
    return quantity.toFixed(1);
  }
  return quantity.toString();
};

interface CartItem {
  product: any;
  quantity: number;
  customPrice?: number;
}

interface POSCartPanelProps {
  cart: CartItem[];
  products?: any[]; // Lista de productos actualizada para obtener available_quantity
  customers: Customer[];
  selectedCustomer: Customer | null;
  onCustomerChange: (customer: Customer | null) => void;
  onUpdateQuantity: (productId: string, quantity: number, skipValidation?: boolean) => void;
  onUpdatePrice?: (productId: string, price: number) => void;
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
  products = [],
  customers,
  selectedCustomer,
  onCustomerChange,
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  onClearCart,
  onProcessSale,
  loading,
  numerations,
  selectedNumeration,
  onNumerationChange,
}: POSCartPanelProps) {
  const [invoiceType, setInvoiceType] = useState('local');
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(0);

  // Función para abrir el diálogo de cantidad
  const handleOpenQuantityDialog = (product: any, currentQuantity: number) => {
    setSelectedProduct(product);
    setSelectedQuantity(currentQuantity);
    setShowQuantityDialog(true);
  };

  // Función para confirmar la nueva cantidad
  const handleConfirmQuantity = (newQuantity: number) => {
    if (selectedProduct) {
      onUpdateQuantity(selectedProduct.id, newQuantity);
    }
    setShowQuantityDialog(false);
    setSelectedProduct(null);
    setSelectedQuantity(0);
  };

  // Calcular totales
  const saleItems = cart.map((item) => {
    const unitPrice = item.customPrice ?? parseFloat(item.product.selling_price.toString());
    return {
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: unitPrice,
      discount_percentage: 0,
      discount_amount: 0,
      total_price: unitPrice * item.quantity,
      iva_rate: parseFloat(item.product.iva_rate?.toString() || '0'),
      ica_rate: parseFloat(item.product.ica_rate?.toString() || '0'),
      retencion_rate: parseFloat(item.product.retencion_rate?.toString() || '0'),
    };
  });

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

  // Debug: verificar estado del cliente seleccionado (comentado para producción)
  // console.log('POSCartPanel Debug:', {
  //   selectedCustomer,
  //   cartLength: cart.length,
  //   loading,
  //   hasInsufficientInventory,
  //   hasOutOfStockItems,
  // });

  return (
    <div
      className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden shadow-xl"
      role="complementary"
      aria-label="Panel del carrito de compras"
    >
      {/* Header - Moderno y Profesional */}
      <header className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 text-white flex-shrink-0 shadow-md">
        <h2 className="flex items-center text-base sm:text-lg font-bold">
          <ShoppingCart
            className="h-5 w-5 sm:h-6 sm:w-6 mr-2"
            aria-hidden="true"
          />
          Carrito de Compra
        </h2>
        <div className="flex items-center space-x-2">
          <Badge className="bg-white/20 text-white border-white/30 px-2 py-1">
            {totalItems} items
          </Badge>
        </div>
      </header>

      {/* Configuración - Moderna y compacta */}
      <div
        className="p-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 space-y-2 flex-shrink-0"
        role="form"
        aria-label="Configuración de la factura"
      >
        {/* Cliente - Destacado */}
        <div>
          <Label
            htmlFor="customer"
            className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 flex items-center mb-1"
          >
            <User className="h-3 w-3 mr-1" />
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
              <SelectTrigger
                id="customer"
                className="h-7 text-[11px] bg-gray-50 dark:bg-gray-700 flex-1 focus:ring-2 focus:ring-teal-500 border-gray-200 dark:border-gray-600 rounded-lg"
                aria-label="Seleccionar cliente"
              >
                <SelectValue placeholder="Consumidor final" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    <div className="flex flex-col">
                      <span className="font-medium text-[11px]">
                        {customer.business_name}
                      </span>
                      <span className="text-[10px] text-gray-500">
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
              className="h-7 w-7 p-0 rounded-lg hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 dark:hover:bg-teal-900/20 transition-all"
              aria-label="Agregar nuevo cliente"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Numeración y Lista de precio */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label
              htmlFor="numeration"
              className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 flex items-center mb-1"
            >
              <Receipt className="h-3 w-3 mr-1" />
              Numeración
            </Label>
            <Select
              value={selectedNumeration?.id || undefined}
              onValueChange={(value) => {
                const numeration = numerations.find((n) => n.id === value);
                onNumerationChange(numeration || null);
              }}
            >
              <SelectTrigger
                id="numeration"
                className="h-7 text-[11px] bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-teal-500 border-gray-200 dark:border-gray-600 rounded-lg"
                aria-label="Seleccionar numeración"
              >
                <SelectValue placeholder="Principal" />
              </SelectTrigger>
              <SelectContent>
                {numerations.map((numeration) => (
                  <SelectItem
                    key={numeration.id}
                    value={numeration.id}
                    className="text-[11px]"
                  >
                    {numeration.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label
              htmlFor="invoice-type"
              className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1 block"
            >
              Lista precio
            </Label>
            <Select value={invoiceType} onValueChange={setInvoiceType}>
              <SelectTrigger
                id="invoice-type"
                className="h-7 text-[11px] bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-teal-500 border-gray-200 dark:border-gray-600 rounded-lg"
                aria-label="Seleccionar lista de precios"
              >
                <SelectValue placeholder="General" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local" className="text-[11px]">
                  General
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contenido del Carrito - Scroll optimizado */}
      <div className="flex-1 flex flex-col min-h-0 p-2 overflow-hidden">
        {/* Lista de Productos - Scroll */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {cart.length === 0 ? (
            <div
              className="flex-1 flex items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <div className="text-center text-gray-500">
                <ShoppingCart
                  className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-300"
                  aria-hidden="true"
                />
                <p className="text-xs">Aquí verás los productos</p>
                <p className="text-xs">que elijas</p>
              </div>
            </div>
          ) : (
            <div
              className="flex-1 overflow-y-auto space-y-3 custom-scrollbar"
              role="list"
              aria-label="Productos en el carrito"
            >
              {cart.map((item) => {
                // Obtener el producto actualizado de la lista para tener información actualizada
                const updatedProduct = products?.find((p) => p.id === item.product.id);
                const availableQuantity = updatedProduct?.available_quantity ?? item.product.available_quantity ?? 0;
                const isNearLimit = item.quantity >= availableQuantity * 0.8; // 80% del inventario
                const isAtLimit = item.quantity >= availableQuantity;
                const unitPrice = item.customPrice ?? parseFloat(item.product.selling_price.toString());
                const totalPrice = unitPrice * item.quantity;
                // Usar cost_price actualizado de products si está disponible, sino del producto del carrito
                const costPrice = updatedProduct?.cost_price 
                  ? parseFloat(updatedProduct.cost_price.toString()) 
                  : parseFloat(item.product.cost_price?.toString() || '0');

                return (
                  <Card
                    key={item.product.id}
                    role="listitem"
                    className={`transition-all duration-200 hover:shadow-lg rounded-xl border-2 ${
                      isAtLimit
                        ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-300 dark:border-red-700'
                        : isNearLimit
                        ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-300 dark:border-yellow-700'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                    aria-label={`Producto: ${item.product.name}, cantidad: ${
                      item.quantity
                    }, precio: ${formatCurrency(totalPrice)}`}
                  >
                    <CardContent className="p-3 sm:p-4">
                      {/* Información del producto */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                            {item.product.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                            {item.product.sku && `#${item.product.sku}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveItem(item.product.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 focus:ring-2 focus:ring-red-500 rounded-lg transition-all"
                          aria-label={`Eliminar ${item.product.name} del carrito`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>

                      {/* Precio y cantidad */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                          {onUpdatePrice ? (
                            <Input
                              type="number"
                              min={costPrice}
                              step="any"
                              value={unitPrice}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Permitir cualquier entrada mientras el usuario escribe
                                if (value === '' || value === '.') {
                                  return;
                                }
                                const numValue = parseFloat(value);
                                // Actualizar inmediatamente sin validación para permitir escribir libremente
                                if (!isNaN(numValue) && numValue >= 0) {
                                  onUpdatePrice(item.product.id, numValue);
                                }
                              }}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value);
                                // Obtener precio original actualizado
                                const productForOriginalPrice = updatedProduct || item.product;
                                const originalPrice = parseFloat(productForOriginalPrice.selling_price.toString());
                                // Validar al perder el foco
                                if (isNaN(value) || value < costPrice) {
                                  // Restaurar al precio original o al precio de compra si es inválido
                                  const restorePrice = Math.max(costPrice, originalPrice);
                                  onUpdatePrice(item.product.id, restorePrice);
                                } else {
                                  // Asegurar que se actualice correctamente
                                  onUpdatePrice(item.product.id, value);
                                }
                              }}
                              onKeyDown={(e) => {
                                // Permitir Enter para confirmar
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="h-8 w-24 text-sm font-semibold px-2"
                              aria-label={`Precio por ${getUnitLabel(item.product.unit)}`}
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(unitPrice)}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            Precio por {getUnitLabel(item.product.unit)}
                          </span>
                          {onUpdatePrice && (
                            <span className="text-[10px] text-gray-400 mt-0.5">
                              Mín: {formatCurrency(costPrice)}
                            </span>
                          )}
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
                        <div
                          className="flex items-center gap-2"
                          role="group"
                          aria-label={`Controles de cantidad para ${item.product.name}`}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onUpdateQuantity(
                                item.product.id,
                                Math.max(
                                  0,
                                  item.quantity -
                                    getQuantityStep(item.product.unit)
                                )
                              )
                            }
                            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                            aria-label={`Disminuir cantidad de ${item.product.name}`}
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Permitir cualquier entrada mientras el usuario escribe
                                if (value === '' || value === '.') {
                                  return;
                                }
                                const numValue = parseFloat(value);
                                // Actualizar inmediatamente sin validación para permitir escribir libremente
                                if (!isNaN(numValue) && numValue >= 0) {
                                  onUpdateQuantity(item.product.id, numValue, true);
                                }
                              }}
                              onBlur={(e) => {
                                // Validar y corregir al perder el foco
                                const value = parseFloat(e.target.value);
                                const updatedProduct = products?.find((p) => p.id === item.product.id);
                                const availableQuantity = updatedProduct?.available_quantity ?? item.product.available_quantity ?? 0;
                                
                                if (isNaN(value) || value < 0) {
                                  // Si es inválido, restaurar a cantidad mínima
                                  const minQuantity = availableQuantity > 0 ? 1 : 0;
                                  onUpdateQuantity(item.product.id, minQuantity, false);
                                } else if (value > availableQuantity) {
                                  // Si excede el stock, ajustar al máximo disponible
                                  onUpdateQuantity(item.product.id, availableQuantity, false);
                                } else if (value === 0) {
                                  // Si es 0, eliminar del carrito
                                  onUpdateQuantity(item.product.id, 0, false);
                                } else {
                                  // Validar normalmente
                                  onUpdateQuantity(item.product.id, value, false);
                                }
                              }}
                              onKeyDown={(e) => {
                                // Permitir Enter para confirmar
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="h-8 w-20 text-center text-sm font-semibold"
                              aria-label={`Cantidad actual: ${formatQuantity(
                                item.quantity,
                                item.product.unit
                              )} ${getUnitLabel(item.product.unit)}`}
                            />
                            <span className="text-xs text-gray-500 font-medium">
                              {getUnitLabel(item.product.unit)}
                            </span>
                          </div>
                            <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const step = getQuantityStep(item.product.unit);
                              const newQuantity = item.quantity + step;
                              // Permitir incrementar sin validación inmediata
                              // La validación se hará en updateCartItemQuantity
                              onUpdateQuantity(item.product.id, newQuantity, false);
                            }}
                            disabled={isAtLimit}
                            className={`h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                              isAtLimit ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            aria-label={
                              isAtLimit
                                ? `No se puede aumentar la cantidad de ${item.product.name}, sin stock disponible`
                                : `Aumentar cantidad de ${item.product.name}`
                            }
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
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
                            role="status"
                            aria-label={`Estado del inventario: ${
                              isAtLimit
                                ? 'Sin stock'
                                : `Stock disponible: ${formatQuantity(
                                    availableQuantity,
                                    item.product.unit
                                  )} ${getUnitLabel(item.product.unit)}`
                            }`}
                          >
                            {isAtLimit
                              ? 'Sin stock'
                              : `Stock: ${formatQuantity(
                                  availableQuantity,
                                  item.product.unit
                                )} ${getUnitLabel(item.product.unit)}`}
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

      {/* Footer - Moderno con totales destacados */}
      <footer
        className="border-t-2 dark:border-gray-700 p-4 flex-shrink-0 bg-white dark:bg-gray-800 shadow-lg"
        role="contentinfo"
      >
        {/* Resumen de totales */}
        <div className="mb-4 space-y-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatCurrency(totals.subtotal)}
            </span>
          </div>
          {totals.iva_amount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">IVA:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(totals.iva_amount)}
              </span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-900 dark:text-gray-100">
              Total:
            </span>
            <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
              {formatCurrency(totals.total_amount)}
            </span>
          </div>
          <div className="text-xs text-center text-gray-500 dark:text-gray-400">
            {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
          </div>
        </div>

        {/* Botones de acción */}
        <div
          className="flex gap-3"
          role="group"
          aria-label="Acciones del carrito"
        >
          <Button
            variant="outline"
            className="flex-1 h-12 sm:h-14 text-sm font-semibold rounded-lg border-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            onClick={onClearCart}
            disabled={cart.length === 0 || loading}
            aria-label="Limpiar carrito de compras"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            className={`flex-1 h-12 sm:h-14 text-sm font-bold rounded-lg shadow-md transition-all ${
              hasInsufficientInventory || hasOutOfStockItems
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                : 'bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800'
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
            aria-label={
              cart.length === 0
                ? 'No hay productos en el carrito'
                : !selectedCustomer
                ? 'Debe seleccionar un cliente'
                : hasInsufficientInventory || hasOutOfStockItems
                ? 'Error de inventario, no se puede procesar la venta'
                : 'Procesar venta'
            }
          >
            <CreditCard className="h-5 w-5 mr-2" />
            {loading
              ? 'Procesando...'
              : hasInsufficientInventory || hasOutOfStockItems
              ? 'Error de Inventario'
              : 'Cobrar'}
          </Button>
        </div>
      </footer>

      {/* Diálogo de cantidad */}
      <POSQuantityDialog
        open={showQuantityDialog}
        onOpenChange={setShowQuantityDialog}
        product={selectedProduct}
        currentQuantity={selectedQuantity}
        onConfirm={handleConfirmQuantity}
      />
    </div>
  );
}
