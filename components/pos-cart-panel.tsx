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
  Package,
  ChevronDown,
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
  onUpdatePrice?: (productId: string, price: number, skipValidation?: boolean) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onProcessSale: () => void;
  loading: boolean;
  numerations: Numeration[];
  selectedNumeration: Numeration | null;
  onNumerationChange: (numeration: Numeration | null) => void;
  isMobile?: boolean;
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
  isMobile = false,
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
      {/* Header - Diseño mejorado con gradiente indigo-purple-pink vibrante */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 text-white flex-shrink-0 shadow-2xl border-b-4 border-white/30 backdrop-blur-sm transition-all duration-300">
          <h2 className="flex items-center text-lg sm:text-xl md:text-2xl font-black tracking-tight">
            <ShoppingCart
              className={`h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 mr-3 sm:mr-3.5 transition-transform duration-300 ${totalItems > 0 ? 'scale-110 animate-pulse' : ''}`}
              aria-hidden="true"
            />
            <span className="hidden xs:inline sm:hidden">Carrito</span>
            <span className="hidden sm:inline md:hidden">Carrito</span>
            <span className="hidden md:inline">Carrito de Compra</span>
          </h2>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Badge className="bg-white/40 backdrop-blur-md text-white border-3 border-white/60 px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base md:text-lg font-black tracking-wide transition-all duration-300 shadow-xl ring-2 ring-white/30">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </Badge>
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('closeMobileCart'));
              }}
              className="min-h-[44px] min-w-[44px] h-11 w-11 p-0 text-white hover:bg-white/20 rounded-lg ml-1 transition-all active:scale-95"
              aria-label="Cerrar carrito"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Configuración - Optimizada para tablets y pantallas medianas */}
      {!isMobile && (
        <div
          className="px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 bg-white dark:bg-gray-800 border-b dark:border-gray-700 space-y-1.5 sm:space-y-2 flex-shrink-0"
          role="form"
          aria-label="Configuración de la factura"
        >
        {/* Cliente - Optimizado para tablets */}
        <div>
          <Label
            htmlFor="customer"
            className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center mb-1"
          >
            <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            Cliente
          </Label>
          <div className="flex gap-1.5 sm:gap-2">
            <Select
              value={selectedCustomer?.id || undefined}
              onValueChange={(value) => {
                const customer = customers.find((c) => c.id === value);
                onCustomerChange(customer || null);
              }}
            >
              <SelectTrigger
                id="customer"
                className="h-7 sm:h-8 text-[11px] sm:text-xs bg-gray-50 dark:bg-gray-700 flex-1 focus:ring-2 focus:ring-indigo-500 border-gray-200 dark:border-gray-600 rounded-lg"
                aria-label="Seleccionar cliente"
              >
                <SelectValue placeholder="Consumidor final" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    <div className="flex flex-col">
                      <span className="font-medium text-[11px] sm:text-xs">
                        {customer.business_name}
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-gray-500">
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
              className="h-7 sm:h-8 w-7 sm:w-8 p-0 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 dark:hover:bg-indigo-900/20 transition-all flex-shrink-0"
              aria-label="Agregar nuevo cliente"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Numeración y Lista de precio - Grid responsive */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <div>
            <Label
              htmlFor="numeration"
              className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center mb-1"
            >
              <Receipt className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
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
                className="h-7 sm:h-8 text-[11px] sm:text-xs bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 border-gray-200 dark:border-gray-600 rounded-lg"
                aria-label="Seleccionar numeración"
              >
                <SelectValue placeholder="Principal" />
              </SelectTrigger>
              <SelectContent>
                {numerations.map((numeration) => (
                  <SelectItem
                    key={numeration.id}
                    value={numeration.id}
                    className="text-[11px] sm:text-xs"
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
              className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block"
            >
              Lista precio
            </Label>
            <Select value={invoiceType} onValueChange={setInvoiceType}>
              <SelectTrigger
                id="invoice-type"
                className="h-7 sm:h-8 text-[11px] sm:text-xs bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 border-gray-200 dark:border-gray-600 rounded-lg"
                aria-label="Seleccionar lista de precios"
              >
                <SelectValue placeholder="General" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local" className="text-[11px] sm:text-xs">
                  General
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        </div>
      )}
      
      {/* Configuración móvil - Más compacta */}
      {isMobile && (
        <div
          className="px-2 py-1.5 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex-shrink-0"
          role="form"
          aria-label="Configuración de la factura"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <Label className="text-[9px] text-gray-600 dark:text-gray-400 mb-0.5 block">Cliente</Label>
              <Select
                value={selectedCustomer?.id || undefined}
                onValueChange={(value) => {
                  const customer = customers.find((c) => c.id === value);
                  onCustomerChange(customer || null);
                }}
              >
                <SelectTrigger className="h-6 text-[10px] bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id} className="text-[10px]">
                      {customer.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-[9px] text-gray-600 dark:text-gray-400 mb-0.5 block">Numeración</Label>
              <Select
                value={selectedNumeration?.id || undefined}
                onValueChange={(value) => {
                  const numeration = numerations.find((n) => n.id === value);
                  onNumerationChange(numeration || null);
                }}
              >
                <SelectTrigger className="h-6 text-[10px] bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded">
                  <SelectValue placeholder="Num." />
                </SelectTrigger>
                <SelectContent>
                  {numerations.map((numeration) => (
                    <SelectItem key={numeration.id} value={numeration.id} className="text-[10px]">
                      {numeration.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Contenido del Carrito - Scroll optimizado */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* Lista de Productos - Scroll con altura garantizada */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {cart.length === 0 ? (
            <div
              className="flex items-center justify-center h-full p-4"
              role="status"
              aria-live="polite"
            >
              <div className="text-center text-gray-500">
                <ShoppingCart
                  className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto mb-3 text-gray-300"
                  aria-hidden="true"
                />
                <p className="text-xs sm:text-sm font-medium">Carrito vacío</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Agrega productos desde el catálogo</p>
              </div>
            </div>
          ) : (
            <div
              className={`${isMobile ? 'p-1.5 space-y-2' : 'p-2 sm:p-3 space-y-2 sm:space-y-3'}`}
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
                    className={`transition-all duration-300 hover:shadow-2xl rounded-2xl border-2 ${
                      isAtLimit
                        ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-400 dark:border-red-600 shadow-xl shadow-red-200/50 dark:shadow-red-900/30'
                        : isNearLimit
                        ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 border-yellow-400 dark:border-yellow-600 shadow-xl shadow-yellow-200/50 dark:shadow-yellow-900/30'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-lg hover:shadow-2xl hover:scale-[1.02]'
                    }`}
                    aria-label={`Producto: ${item.product.name}, cantidad: ${
                      item.quantity
                    }, precio: ${formatCurrency(totalPrice)}`}
                  >
                    <CardContent className={isMobile ? "p-3" : "p-3 sm:p-4"}>
                      {/* Vista móvil optimizada - Layout horizontal compacto estilo Alegra POS */}
                      {isMobile ? (
                        <div className="flex items-center gap-3">
                          {/* Imagen/icono pequeño - Estilo Alegra */}
                          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-indigo-900/40 dark:via-purple-900/40 dark:to-pink-900/40 rounded-lg flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          
                          {/* Contenido principal - Layout vertical compacto */}
                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
                              {item.product.name}
                            </h3>
                            {/* Controles de cantidad inline - Estilo Alegra */}
                            <div className="flex items-center gap-2.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  onUpdateQuantity(
                                    item.product.id,
                                    Math.max(0, item.quantity - getQuantityStep(item.product.unit))
                                  )
                                }
                                className="h-8 w-8 p-0 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-md transition-all active:scale-95"
                                aria-label="Disminuir cantidad"
                              >
                                <Minus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </Button>
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 min-w-[32px] text-center">
                                {formatQuantity(item.quantity, item.product.unit)}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const step = getQuantityStep(item.product.unit);
                                  onUpdateQuantity(item.product.id, item.quantity + step, false);
                                }}
                                disabled={isAtLimit}
                                className="h-8 w-8 p-0 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-md transition-all active:scale-95 disabled:opacity-50"
                                aria-label="Aumentar cantidad"
                              >
                                <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Precio total y eliminar - Alineado a la derecha */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100">
                              {formatCurrency(totalPrice)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveItem(item.product.id)}
                              className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-all active:scale-95"
                              aria-label={`Eliminar ${item.product.name} del carrito`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Vista desktop - Layout original */}
                          <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 mb-0.5">
                                {item.product.name}
                              </h3>
                              {item.product.sku && (
                                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-mono">
                                  #{item.product.sku}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveItem(item.product.id)}
                              className="min-h-[44px] min-w-[44px] h-11 w-11 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 focus:ring-2 focus:ring-red-500 rounded-lg transition-all active:scale-95 flex-shrink-0"
                              aria-label={`Eliminar ${item.product.name} del carrito`}
                            >
                              <Trash2 className="h-5 w-5" aria-hidden="true" />
                            </Button>
                          </div>

                      {/* Grid responsive para precio, cantidad y total */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
                        {/* Precio unitario */}
                        <div className="space-y-1">
                          <label className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400 font-medium`}>
                            Precio unitario
                          </label>
                          {onUpdatePrice ? (
                            <div className="space-y-0.5">
                              <Input
                                type="number"
                                min={costPrice}
                                step="any"
                                value={unitPrice}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || value === '.') return;
                                  const numValue = parseFloat(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    onUpdatePrice(item.product.id, numValue, true);
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = parseFloat(e.target.value);
                                  const productForOriginalPrice = updatedProduct || item.product;
                                  const originalPrice = parseFloat(productForOriginalPrice.selling_price.toString());
                                  if (isNaN(value) || value < costPrice) {
                                    const restorePrice = Math.max(costPrice, originalPrice);
                                    onUpdatePrice(item.product.id, restorePrice, false);
                                  } else {
                                    onUpdatePrice(item.product.id, value, false);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                className={`min-h-[44px] ${isMobile ? 'h-11 text-sm' : 'h-11 text-base'} font-semibold px-3 border-2 border-indigo-200 dark:border-indigo-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 rounded-lg`}
                                aria-label={`Precio por ${getUnitLabel(item.product.unit)}`}
                              />
                              {!isMobile && (
                                <p className="text-[9px] text-gray-400">
                                  Mín: {formatCurrency(costPrice)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-900 dark:text-gray-100`}>
                              {formatCurrency(unitPrice)}
                            </p>
                          )}
                        </div>

                        {/* Cantidad */}
                        <div className="space-y-1">
                          <label className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400 font-medium`}>
                            Cantidad
                          </label>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                onUpdateQuantity(
                                  item.product.id,
                                  Math.max(0, item.quantity - getQuantityStep(item.product.unit))
                                )
                              }
                              className={`min-h-[44px] min-w-[44px] ${isMobile ? 'h-11 w-11' : 'h-11 w-11'} p-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 rounded-lg transition-all active:scale-95`}
                              aria-label={`Disminuir cantidad`}
                            >
                              <Minus className={isMobile ? "h-5 w-5" : "h-5 w-5"} />
                            </Button>
                            <div className="flex-1 flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || value === '.') return;
                                  const numValue = parseFloat(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    onUpdateQuantity(item.product.id, numValue, true);
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = parseFloat(e.target.value);
                                  const updatedProduct = products?.find((p) => p.id === item.product.id);
                                  const availableQuantity = updatedProduct?.available_quantity ?? item.product.available_quantity ?? 0;
                                  
                                  if (isNaN(value) || value < 0) {
                                    const minQuantity = availableQuantity > 0 ? 1 : 0;
                                    onUpdateQuantity(item.product.id, minQuantity, false);
                                  } else if (value > availableQuantity) {
                                    onUpdateQuantity(item.product.id, availableQuantity, false);
                                  } else if (value === 0) {
                                    onUpdateQuantity(item.product.id, 0, false);
                                  } else {
                                    onUpdateQuantity(item.product.id, value, false);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                className={`min-h-[44px] ${isMobile ? 'h-11 text-sm' : 'h-11 text-base'} text-center font-semibold border-2 border-indigo-200 dark:border-indigo-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 rounded-lg`}
                                aria-label={`Cantidad: ${formatQuantity(item.quantity, item.product.unit)} ${getUnitLabel(item.product.unit)}`}
                              />
                              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 font-medium whitespace-nowrap`}>
                                {getUnitLabel(item.product.unit)}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const step = getQuantityStep(item.product.unit);
                                onUpdateQuantity(item.product.id, item.quantity + step, false);
                              }}
                              disabled={isAtLimit}
                              className={`min-h-[44px] min-w-[44px] ${isMobile ? 'h-11 w-11' : 'h-11 w-11'} p-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 rounded-lg transition-all active:scale-95 ${
                                isAtLimit ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              aria-label={isAtLimit ? 'Sin stock disponible' : 'Aumentar cantidad'}
                            >
                              <Plus className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
                            </Button>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Total
                          </label>
                          <p className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                            {formatCurrency(totalPrice)}
                          </p>
                        </div>
                      </div>

                      {/* Stock y estado - Footer del item */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                            isAtLimit
                              ? 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300'
                              : isNearLimit
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'
                              : 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300'
                          }`}
                          role="status"
                        >
                          {isAtLimit
                            ? 'Sin stock'
                            : `Stock: ${formatQuantity(availableQuantity, item.product.unit)} ${getUnitLabel(item.product.unit)}`}
                        </span>
                        {onUpdatePrice && (
                          <span className="text-[9px] text-gray-400">
                            Mín: {formatCurrency(costPrice)}
                          </span>
                        )}
                      </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Diseño mejorado estilo Alegra POS para móviles */}
      <footer
        className={`border-t-2 border-gray-200 dark:border-gray-700 ${isMobile ? 'p-3 pb-4' : 'p-3 sm:p-4'} flex-shrink-0 bg-white dark:bg-gray-800 shadow-lg`}
        role="contentinfo"
      >
        {/* Resumen de totales - Grid responsive */}
        <div className={`mb-3 sm:mb-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-lg ${isMobile ? 'p-2.5' : 'p-3 sm:p-4'} space-y-2`}>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="space-y-1">
              <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600 dark:text-gray-400`}>
                Subtotal
              </p>
              <p className={`${isMobile ? 'text-sm' : 'text-base sm:text-lg'} font-semibold text-gray-900 dark:text-gray-100`}>
                {formatCurrency(totals.subtotal)}
              </p>
            </div>
            {totals.iva_amount > 0 && (
              <div className="space-y-1">
                <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600 dark:text-gray-400`}>
                  IVA
                </p>
                <p className={`${isMobile ? 'text-sm' : 'text-base sm:text-lg'} font-semibold text-gray-900 dark:text-gray-100`}>
                  {formatCurrency(totals.iva_amount)}
                </p>
              </div>
            )}
          </div>
          
          <Separator className="my-2" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm sm:text-base'} font-bold text-gray-900 dark:text-gray-100`}>
                Total
              </p>
              {!isMobile && (
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
                </p>
              )}
            </div>
            <p className={`${isMobile ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent`}>
              {formatCurrency(totals.total_amount)}
            </p>
          </div>
        </div>

        {/* Botones de acción - Mejorados */}
        <div
          className={`flex ${isMobile ? 'gap-2' : 'gap-3'}`}
          role="group"
          aria-label="Acciones del carrito"
        >
          {!isMobile && (
            <Button
              variant="outline"
                className={`flex-1 ${isMobile ? 'h-10' : 'h-11 sm:h-12'} text-xs sm:text-sm font-semibold rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all`}
              onClick={onClearCart}
              disabled={cart.length === 0 || loading}
              aria-label="Limpiar carrito"
            >
              <RotateCcw className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} mr-1.5`} />
              Cancelar
            </Button>
          )}
          <Button
            className={`flex-1 min-h-[44px] ${isMobile ? 'h-12 text-base' : 'h-12 sm:h-14 text-base sm:text-lg'} font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all active:scale-95 ${
              hasInsufficientInventory || hasOutOfStockItems
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white ring-4 ring-indigo-500/20'
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
                ? 'Error de inventario'
                : 'Procesar venta'
            }
          >
            <CreditCard className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} mr-2`} />
            {loading
              ? 'Procesando...'
              : hasInsufficientInventory || hasOutOfStockItems
              ? 'Error Inventario'
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
