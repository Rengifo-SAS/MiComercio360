'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Search,
  Calculator,
  ShoppingCart,
  UserPlus,
} from 'lucide-react';
import { SalesService } from '@/lib/services/sales-service';
import { CustomersService } from '@/lib/services/customers-service';
import { ProductsService } from '@/lib/services/products-service';
import { PaymentMethodsService } from '@/lib/services/payment-methods-service';
import {
  Sale,
  CreateSaleData,
  CreateSaleItemData,
  PaymentMethod as SalePaymentMethod,
  PaymentMethodLabels,
  formatCurrency,
  calculateSaleTotals,
} from '@/lib/types/sales';
import { PaymentMethod } from '@/lib/types/payment-methods';
import { AccountsService } from '@/lib/services/accounts-service';
import type { Account } from '@/lib/types/accounts';
import { Product } from '@/lib/types/sales';
import { Customer } from '@/lib/types/sales';

interface SalesFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  sale?: Sale | null;
  onSave: () => void;
}

export function SalesFormDialog({
  open,
  onOpenChange,
  companyId,
  sale,
  onSave,
}: SalesFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateSaleData>({
    customer_id: undefined,
    total_amount: 0,
    items: [],
    payment_method: 'cash',
    notes: '',
    discount_amount: 0,
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    if (open) {
      loadCustomers();
      loadProducts();
      loadPaymentMethods();
      loadAccounts();

      if (sale) {
        setFormData({
          customer_id: sale.customer_id || undefined,
          items:
            sale.items?.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount_percentage: item.discount_percentage,
            })) || [],
          payment_method: sale.payment_method,
          notes: sale.notes || '',
          discount_amount: sale.discount_amount,
          total_amount: sale.total_amount,
        });
      } else {
        setFormData({
          customer_id: undefined,
          items: [],
          payment_method: 'cash',
          notes: '',
          discount_amount: 0,
        });
      }
    }
  }, [open, sale]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const result = await CustomersService.getCustomers(companyId, {
        isActive: true,
        sortBy: 'business_name',
        sortOrder: 'asc',
        limit: 100,
      });
      setCustomers(result.customers);

      // Si no hay venta existente, establecer Consumidor Final como cliente por defecto
      if (!sale && result.customers.length > 0) {
        const consumidorFinal = result.customers.find(
          (customer) =>
            customer.business_name.toLowerCase().includes('consumidor') &&
            customer.business_name.toLowerCase().includes('final')
        );

        if (consumidorFinal) {
          setFormData((prev) => ({
            ...prev,
            customer_id: consumidorFinal.id,
          }));
        }
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const result = await ProductsService.getProducts(companyId, {
        isActive: true,
        sortBy: 'name',
        sortOrder: 'asc',
        limit: 100,
      });
      setProducts(result.products);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadPaymentMethods = async () => {
    setLoadingPaymentMethods(true);
    try {
      const methods = await PaymentMethodsService.getPaymentMethods(companyId);
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error cargando métodos de pago:', error);
      setPaymentMethods([]);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const list = await AccountsService.getAccounts(companyId);
      setAccounts(list);
      const cash = list.find((a) => a.account_name === 'Efectivo POS');
      if (cash && !formData.account_id) {
        setFormData((prev) => ({ ...prev, account_id: cash.id }));
      }
    } catch (error) {
      console.error('Error cargando cuentas:', error);
      setAccounts([]);
    }
  };

  // Función para convertir payment_type a SalePaymentMethod
  const convertPaymentTypeToMethod = (
    paymentType: string
  ): SalePaymentMethod => {
    const typeMap: Record<string, SalePaymentMethod> = {
      CASH: 'cash',
      CARD: 'card',
      TRANSFER: 'transfer',
      CHECK: 'transfer', // Mapear cheque a transfer
      DIGITAL_WALLET: 'transfer', // Mapear billetera digital a transfer
      CRYPTOCURRENCY: 'transfer', // Mapear cripto a transfer
      GATEWAY: 'card', // Mapear pasarela a card
      OTHER: 'mixed', // Mapear otros a mixed
    };
    return typeMap[paymentType] || 'cash';
  };

  // Función para obtener el payment_type actual basado en el PaymentMethod
  const getCurrentPaymentType = (): string => {
    const method = paymentMethods.find(
      (m) =>
        convertPaymentTypeToMethod(m.payment_type) === formData.payment_method
    );
    return method?.payment_type || 'CASH';
  };

  const handleAddItem = (product: Product) => {
    const availableQuantity = product.available_quantity || 0;

    if (availableQuantity <= 0) {
      alert('Este producto no tiene stock disponible');
      return;
    }

    const existingItemIndex = formData.items.findIndex(
      (item) => item.product_id === product.id
    );

    if (existingItemIndex >= 0) {
      // Verificar que no se exceda la cantidad disponible
      const currentQuantity = formData.items[existingItemIndex].quantity;
      if (currentQuantity >= availableQuantity) {
        alert(
          `No se puede agregar más cantidad. Disponible: ${availableQuantity}`
        );
        return;
      }

      // Incrementar cantidad si el producto ya existe
      const updatedItems = [...formData.items];
      updatedItems[existingItemIndex].quantity += 1;
      setFormData((prev) => ({ ...prev, items: updatedItems }));
    } else {
      // Agregar nuevo item
      const newItem: CreateSaleItemData = {
        product_id: product.id,
        quantity: 1,
        unit_price: product.selling_price,
        discount_percentage: 0,
        iva_rate:
          typeof product.iva_rate === 'number'
            ? product.iva_rate
            : parseFloat(String(product.iva_rate)) || 0,
        ica_rate:
          typeof product.ica_rate === 'number'
            ? product.ica_rate
            : parseFloat(String(product.ica_rate)) || 0,
        retencion_rate:
          typeof product.retencion_rate === 'number'
            ? product.retencion_rate
            : parseFloat(String(product.retencion_rate)) || 0,
      };
      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
    }
    setShowProductSearch(false);
    setSearchQuery('');
  };

  const handleUpdateItem = (
    index: number,
    field: keyof CreateSaleItemData,
    value: any
  ) => {
    const updatedItems = [...formData.items];
    const item = updatedItems[index];

    // Si se está actualizando la cantidad, validar contra el stock disponible
    if (field === 'quantity') {
      const product = products.find((p) => p.id === item.product_id);
      const availableQuantity = product?.available_quantity || 0;

      if (value > availableQuantity) {
        alert(
          `No se puede exceder la cantidad disponible (${availableQuantity})`
        );
        return;
      }

      if (value <= 0) {
        alert('La cantidad debe ser mayor a 0');
        return;
      }
    }

    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const handleSave = async () => {
    // Validar que la venta no esté cancelada o reembolsada
    if (sale && sale.status === 'cancelled') {
      alert('No se puede editar una venta cancelada o reembolsada');
      return;
    }

    if (!formData.customer_id) {
      alert('Debe seleccionar un cliente para la venta');
      return;
    }

    if (formData.items.length === 0) {
      alert('Debe agregar al menos un producto');
      return;
    }

    setLoading(true);
    try {
      if (sale) {
        await SalesService.updateSale(sale.id, formData);
      } else {
        await SalesService.createSale(companyId, formData);
      }
      onSave();
    } catch (error) {
      console.error('Error guardando venta:', error);
      alert('Error al guardar la venta');
    } finally {
      setLoading(false);
    }
  };

  // Determinar si el formulario debe estar deshabilitado
  const isFormDisabled = Boolean(sale && sale.status === 'cancelled');

  const totals = calculateSaleTotals(
    formData.items,
    formData.discount_amount || 0,
    products
  );
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sale ? 'Editar Venta' : 'Nueva Venta'}</DialogTitle>
          <DialogDescription>
            {sale ? 'Modifica los datos de la venta' : 'Crea una nueva venta'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alerta para ventas canceladas */}
          {isFormDisabled && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Venta Cancelada o Reembolsada
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Esta venta ha sido cancelada o reembolsada y no puede ser
                      editada.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="customer">Cliente</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: Abrir formulario de nuevo cliente
                    alert('Funcionalidad de nuevo cliente próximamente');
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </div>
              <Select
                value={formData.customer_id || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    customer_id: value,
                  }))
                }
                disabled={loadingCustomers || isFormDisabled}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingCustomers
                        ? 'Cargando clientes...'
                        : 'Seleccionar cliente'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.business_name} -{' '}
                      {customer.identification_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment_method">Método de Pago</Label>
              <Select
                value={getCurrentPaymentType()}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    payment_method: convertPaymentTypeToMethod(value),
                  }))
                }
                disabled={loadingPaymentMethods || isFormDisabled}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingPaymentMethods
                        ? 'Cargando métodos...'
                        : 'Seleccionar método de pago'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.length > 0
                    ? paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.payment_type}>
                          {method.name} ({method.payment_type})
                        </SelectItem>
                      ))
                    : Object.entries(PaymentMethodLabels).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="account_id">Cuenta de Ingreso</Label>
              <Select
                value={
                  formData.account_id ||
                  (accounts.find((a) => a.account_name === 'Efectivo POS')
                    ?.id ??
                    '')
                }
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    account_id: value || undefined,
                  }))
                }
                disabled={!accounts.length || isFormDisabled}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !accounts.length
                        ? 'Cargando cuentas...'
                        : 'Seleccionar cuenta'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Productos */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Productos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProductSearch(true)}
                disabled={isFormDisabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </div>

            {formData.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-24">Cantidad</TableHead>
                    <TableHead className="w-32">Precio Unit.</TableHead>
                    <TableHead className="w-24">Descuento %</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.map((item, index) => {
                    const product = products.find(
                      (p) => p.id === item.product_id
                    );
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {product?.name || 'Producto no encontrado'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              SKU: {product?.sku || 'N/A'} | Disponible:{' '}
                              {product?.available_quantity || 0}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max={
                              products.find((p) => p.id === item.product_id)
                                ?.available_quantity || 999
                            }
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(
                                index,
                                'quantity',
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-20"
                            title={`Máximo disponible: ${
                              products.find((p) => p.id === item.product_id)
                                ?.available_quantity || 0
                            }`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) =>
                              handleUpdateItem(
                                index,
                                'unit_price',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.discount_percentage || 0}
                            onChange={(e) =>
                              handleUpdateItem(
                                index,
                                'discount_percentage',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(
                            item.quantity * item.unit_price -
                              (item.quantity *
                                item.unit_price *
                                (item.discount_percentage || 0)) /
                                100
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            disabled={isFormDisabled}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay productos agregados</p>
                <p className="text-sm">Agrega productos para crear la venta</p>
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount_amount">Descuento Total</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_amount || 0}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      discount_amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  disabled={isFormDisabled}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(totals.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Descuento:</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(totals.discount_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal después de descuento:</span>
                  <span>
                    {formatCurrency(totals.subtotal - totals.discount_amount)}
                  </span>
                </div>
                {totals.iva_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>IVA:</span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(totals.iva_amount)}
                    </span>
                  </div>
                )}
                {totals.ica_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>ICA:</span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(totals.ica_amount)}
                    </span>
                  </div>
                )}
                {totals.retencion_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Retención:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(totals.retencion_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Total Impuestos:</span>
                  <span className="font-medium">
                    {formatCurrency(totals.tax_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total a Pagar:</span>
                  <span>{formatCurrency(totals.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales sobre la venta..."
              value={formData.notes || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || isFormDisabled}>
              {loading ? 'Guardando...' : sale ? 'Actualizar' : 'Crear'} Venta
            </Button>
          </div>
        </div>

        {/* Diálogo de búsqueda de productos */}
        <Dialog open={showProductSearch} onOpenChange={setShowProductSearch}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Producto</DialogTitle>
              <DialogDescription>
                Busca y selecciona un producto para agregar a la venta
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="max-h-60 overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  <div className="space-y-2">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleAddItem(product)}
                      >
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {product.sku} | Disponible:{' '}
                            {product.available_quantity || 0}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(product.selling_price)}
                          </div>
                          <Badge variant="outline">
                            {product.is_active ? 'Disponible' : 'Inactivo'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron productos</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
