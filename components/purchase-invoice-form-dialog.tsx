'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { PurchaseInvoicesService } from '@/lib/services/purchase-invoices-service';
import { PaymentsService } from '@/lib/services/payments-service';
import { ProductsService } from '@/lib/services/products-service';
import { PurchaseInvoice, CreatePurchaseInvoiceInput } from '@/lib/types/purchase-invoices';
import { PendingPurchaseInvoice } from '@/lib/types/payments';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PurchaseInvoiceFormDialogProps {
  companyId: string;
  receivedPayment?: PurchaseInvoice | null;
  suppliers: any[];
  numerations: any[];
  accounts: any[];
  paymentMethods: any[];
  costCenters: any[];
  products?: any[];
  taxes?: any[];
  warehouses?: any[];
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function PurchaseInvoiceFormDialog({
  companyId,
  receivedPayment,
  suppliers,
  numerations,
  accounts,
  paymentMethods,
  costCenters,
  products = [],
  taxes = [],
  warehouses = [],
  onSave,
  trigger,
}: PurchaseInvoiceFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingInvoices, setPendingPurchaseInvoices] = useState<PendingPurchaseInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<any[]>(products);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [formData, setFormData] = useState<CreatePurchaseInvoiceInput>({
    company_id: companyId,
    invoice_date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    supplier_invoice_number: '',
    currency: 'COP',
    items: [],
  });

  useEffect(() => {
    if (open && receivedPayment) {
      setFormData({
        company_id: companyId,
        invoice_date: receivedPayment.invoice_date,
        supplier_id: receivedPayment.supplier_id,
        supplier_invoice_number: receivedPayment.supplier_invoice_number,
        numeration_id: receivedPayment.numeration_id || undefined,
        currency: receivedPayment.currency,
        warehouse_id: receivedPayment.warehouse_id || undefined,
        cost_center_id: receivedPayment.cost_center_id || undefined,
        due_date: receivedPayment.due_date || undefined,
        observations: receivedPayment.observations || undefined,
        items: receivedPayment.items?.map((item) => ({
          item_type: item.item_type,
          product_id: item.product_id,
          account_id: item.account_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          account_amount: item.account_amount,
          discount_percentage: item.discount_percentage,
          tax_id: item.tax_id,
          description: item.description,
          sort_order: item.sort_order,
        })) || [],
        withholdings: receivedPayment.withholdings?.map((withholding) => ({
          withholding_type: withholding.withholding_type,
          base_amount: withholding.base_amount,
          percentage: withholding.percentage,
          withholding_amount: withholding.withholding_amount,
          description: withholding.description,
        })) || [],
      });
    } else if (open && !receivedPayment) {
      setFormData({
        company_id: companyId,
        invoice_date: new Date().toISOString().split('T')[0],
        supplier_id: '',
        supplier_invoice_number: '',
        currency: 'COP',
        items: [],
      });
      // Inicializar productos con todos los productos de la empresa
      setFilteredProducts(products);
    }
  }, [open, receivedPayment, companyId]);

  // Seleccionar automáticamente la numeración si solo hay una disponible
  useEffect(() => {
    if (open && !receivedPayment && numerations.length === 1 && !formData.numeration_id) {
      const singleNumeration = numerations[0];
      if (singleNumeration?.id) {
        setFormData((prev) => ({
          ...prev,
          numeration_id: singleNumeration.id,
        }));
      }
    }
  }, [open, receivedPayment, numerations, formData.numeration_id]);

  const loadProducts = useCallback(async () => {
    if (!open) return;
    setLoadingProducts(true);
    try {
      const result = await ProductsService.getProducts(companyId, {
        supplierId: formData.supplier_id || undefined,
        isActive: true,
        sortBy: 'name',
        sortOrder: 'asc',
        limit: 1000, // Cargar hasta 1000 productos
      });
      setFilteredProducts(result.products);
    } catch (error) {
      console.error('Error cargando productos:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar los productos',
      });
      // En caso de error, usar los productos iniciales
      setFilteredProducts(products);
    } finally {
      setLoadingProducts(false);
    }
  }, [open, companyId, formData.supplier_id, products]);

  // Cargar productos cuando cambia el proveedor o se abre el diálogo
  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open, loadProducts]);

  // Cargar facturas pendientes cuando se selecciona un proveedor
  useEffect(() => {
    if (open && formData.supplier_id) {
      loadPendingPurchaseInvoices();
    } else {
      setPendingPurchaseInvoices([]);
    }
  }, [open, formData.supplier_id]);

  const loadPendingPurchaseInvoices = async () => {
    if (!formData.supplier_id) return;
    setLoadingInvoices(true);
    try {
      const invoices = await PaymentsService.getPendingPurchaseInvoices(
        companyId,
        formData.supplier_id
      );
      setPendingPurchaseInvoices(invoices);
    } catch (error) {
      console.error('Error cargando facturas pendientes:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar las facturas pendientes',
      });
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que haya al menos un item
    if (!formData.items || formData.items.length === 0) {
      toast.error('Error', {
        description: 'Debe agregar al menos un producto o cuenta contable',
      });
      return;
    }

    // Validar items
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (item.item_type === 'PRODUCT') {
        if (!item.product_id) {
          toast.error('Error', {
            description: `El producto ${i + 1} debe tener un producto seleccionado`,
          });
          return;
        }
        if (!item.quantity || item.quantity <= 0) {
          toast.error('Error', {
            description: `El producto ${i + 1} debe tener una cantidad mayor a 0`,
          });
          return;
        }
        if (item.unit_cost === undefined || item.unit_cost === null || item.unit_cost < 0) {
          toast.error('Error', {
            description: `El producto ${i + 1} debe tener un precio unitario válido`,
          });
          return;
        }
      } else if (item.item_type === 'ACCOUNT') {
        if (!item.account_id) {
          toast.error('Error', {
            description: `La cuenta ${i + 1} debe tener una cuenta seleccionada`,
          });
          return;
        }
        if (!item.account_amount || item.account_amount <= 0) {
          toast.error('Error', {
            description: `La cuenta ${i + 1} debe tener un monto mayor a 0`,
          });
          return;
        }
      }
    }

    setLoading(true);

    try {
      if (receivedPayment) {
        await PurchaseInvoicesService.updatePurchaseInvoice(
          receivedPayment.id,
          companyId,
          formData
        );
        toast.success('Éxito', {
          description: 'Factura de compra actualizada',
        });
      } else {
        await PurchaseInvoicesService.createPurchaseInvoice(formData);
        toast.success('Éxito', {
          description: 'Factura de compra creada exitosamente',
        });
      }
      setOpen(false);
      onSave?.();
    } catch (error: any) {
      console.error('Error en handleSubmit:', error);
      const errorMessage = error?.message || 
                          error?.details || 
                          error?.hint || 
                          'No se pudo guardar la factura de compra';
      toast.error('Error', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Nota: Esta función no aplica para PurchaseInvoice ya que las facturas de compra
  // no tienen items de tipo INVOICE. Los items son productos o cuentas contables.
  // Se mantiene comentada para referencia futura si es necesario.
  /*
  const addInvoiceItem = (invoice: PendingPurchaseInvoice) => {
    // Esta funcionalidad no aplica para formularios de factura de compra
  };
  */

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItemAmount = (index: number, amount: number) => {
    const newItems = [...formData.items];
    const item = newItems[index];
    if (item.item_type === 'ACCOUNT') {
      newItems[index] = { ...item, account_amount: amount };
    } else if (item.item_type === 'PRODUCT') {
      // For products, calculate unit_cost from amount and quantity
      const quantity = item.quantity || 1;
      newItems[index] = { ...item, unit_cost: amount / quantity };
    }
    setFormData({ ...formData, items: newItems });
  };

  const totalAmount = formData.items.reduce((sum, item) => {
    if (item.item_type === 'ACCOUNT') {
      return sum + (item.account_amount || 0);
    } else if (item.item_type === 'PRODUCT') {
      return sum + ((item.unit_cost || 0) * (item.quantity || 0));
    }
    return sum;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {receivedPayment ? 'Editar Factura de Compra' : 'Nueva Factura de Compra'}
          </DialogTitle>
          <DialogDescription>
            {receivedPayment 
              ? 'Modifica la información de la factura de compra'
              : 'Registre las facturas de compra de sus proveedores y actualice su inventario automáticamente'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Proveedor (Contacto) *</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) => setFormData({ ...formData, supplier_id: value, items: [] })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name || supplier.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número *</Label>
                <Input
                  type="text"
                  value={formData.supplier_invoice_number}
                  onChange={(e) => setFormData({ ...formData, supplier_invoice_number: e.target.value })}
                  placeholder="Número de factura del proveedor"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Vencimiento</Label>
                <Input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value || undefined })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Moneda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value: 'COP' | 'USD' | 'EUR') =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COP">COP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bodega</Label>
                <Select
                  value={formData.warehouse_id || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, warehouse_id: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar bodega" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Centro de Costos</Label>
                <Select
                  value={formData.cost_center_id || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, cost_center_id: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar centro de costos" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Numeración</Label>
                <Select
                  value={formData.numeration_id || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, numeration_id: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar numeración" />
                  </SelectTrigger>
                  <SelectContent>
                    {numerations.map((num) => (
                      <SelectItem key={num.id} value={num.id}>
                        {num.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Observaciones</Label>
              <Textarea
                value={formData.observations || ''}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value || undefined })}
                rows={3}
                placeholder="Observaciones adicionales"
              />
            </div>

            {/* Facturas Pendientes */}
            {formData.supplier_id && (
              <div>
                <Label>Facturas Pendientes</Label>
                {loadingInvoices ? (
                  <p className="text-sm text-muted-foreground mt-2">Cargando facturas...</p>
                ) : pendingInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Este proveedor no tiene facturas pendientes
                  </p>
                ) : (
                  <div className="mt-2 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Factura</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Pagado</TableHead>
                          <TableHead>Pendiente</TableHead>
                          <TableHead className="w-[100px]">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoice_number || invoice.supplier_invoice_number}</TableCell>
                            <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                            <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                            <TableCell>{formatCurrency(invoice.paid_amount)}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(invoice.pending_amount)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Funcionalidad deshabilitada - no aplica para facturas de compra
                                  toast.info('Info', {
                                    description: 'Las facturas pendientes no se agregan como items en este formulario',
                                  });
                                }}
                                disabled={false}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Items agregados */}
            {formData.items.length > 0 && (
              <div>
                <Label>Items de la Factura</Label>
                <div className="mt-2 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead className="w-[100px]">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.items.map((item, index) => {
                        let description = item.description || 'Sin descripción';
                        
                        // Si es un producto, obtener el nombre del producto
                        if (item.item_type === 'PRODUCT' && item.product_id) {
                          const product = filteredProducts.find((p) => p.id === item.product_id) || products.find((p) => p.id === item.product_id);
                          if (product) {
                            description = product.name;
                            if (item.quantity && item.quantity > 1) {
                              description += ` (x${item.quantity})`;
                            }
                          }
                        }
                        
                        // Si es una cuenta contable, obtener el nombre de la cuenta
                        if (item.item_type === 'ACCOUNT' && item.account_id) {
                          const account = accounts.find((a) => a.id === item.account_id);
                          if (account) {
                            description = account.account_name || account.name || description;
                          }
                        }
                        
                        const amount = item.item_type === 'ACCOUNT' 
                          ? (item.account_amount || 0)
                          : ((item.unit_cost || 0) * (item.quantity || 0));
                        
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{description}</TableCell>
                            <TableCell>{formatCurrency(amount)}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-2 text-right">
                  <p className="text-lg font-bold">
                    Total: {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>
            )}

            {/* Agregar Producto */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Productos (Inventario)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      items: [
                        ...formData.items,
                        {
                          item_type: 'PRODUCT',
                          product_id: '',
                          quantity: 1,
                          unit_cost: 0,
                          discount_percentage: 0,
                          tax_id: '',
                          description: '',
                        },
                      ],
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Producto
                </Button>
              </div>
              {formData.items
                .map((item, actualIndex) => {
                  if (item.item_type !== 'PRODUCT') return null;
                  const product = filteredProducts.find((p) => p.id === item.product_id) || products.find((p) => p.id === item.product_id);
                  const subtotal = (item.unit_cost || 0) * (item.quantity || 0);
                  const discountAmount = subtotal * ((item.discount_percentage || 0) / 100);
                  const taxRate = item.tax_id ? (taxes.find((t) => t.id === item.tax_id)?.rate || 0) : 0;
                  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
                  const total = subtotal - discountAmount + taxAmount;

                  return (
                    <div key={actualIndex} className="grid grid-cols-12 gap-2 items-end p-2 border rounded mb-2">
                      <div className="col-span-3">
                        <Label>Producto</Label>
                        <Select
                          value={item.product_id || ''}
                          onValueChange={(value) => {
                            const newItems = [...formData.items];
                            const selectedProduct = products.find((p) => p.id === value);
                            newItems[actualIndex] = {
                              ...newItems[actualIndex],
                              product_id: value,
                              unit_cost: selectedProduct?.cost_price || 0,
                              description: selectedProduct?.name || '',
                              tax_id: selectedProduct?.tax_id || '',
                            };
                            setFormData({ ...formData, items: newItems });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {loadingProducts ? (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                Cargando productos...
                              </div>
                            ) : filteredProducts.length === 0 ? (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                {formData.supplier_id 
                                  ? 'No hay productos asociados a este proveedor'
                                  : 'No hay productos disponibles'}
                              </div>
                            ) : (
                              filteredProducts.map((prod) => (
                                <SelectItem key={prod.id} value={prod.id}>
                                  {prod.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity || 1}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[actualIndex] = {
                              ...newItems[actualIndex],
                              quantity: parseFloat(e.target.value) || 1,
                            };
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Precio Unit.</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost || 0}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[actualIndex] = {
                              ...newItems[actualIndex],
                              unit_cost: parseFloat(e.target.value) || 0,
                            };
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>Desc. %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.discount_percentage || 0}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[actualIndex] = {
                              ...newItems[actualIndex],
                              discount_percentage: parseFloat(e.target.value) || 0,
                            };
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Impuesto</Label>
                        <Select
                          value={item.tax_id || 'none'}
                          onValueChange={(value) => {
                            const newItems = [...formData.items];
                            newItems[actualIndex] = {
                              ...newItems[actualIndex],
                              tax_id: value === 'none' ? undefined : value,
                            };
                            setFormData({ ...formData, items: newItems });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sin impuesto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin impuesto</SelectItem>
                            {taxes.map((tax) => (
                              <SelectItem key={tax.id} value={tax.id}>
                                {tax.name} ({tax.rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Total</Label>
                        <Input
                          type="number"
                          value={total.toFixed(2)}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(actualIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Agregar cuenta contable */}
            <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Cuentas Contables / Ítems</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        items: [
                          ...formData.items,
                          {
                            item_type: 'ACCOUNT',
                            account_id: '',
                            account_amount: 0,
                            description: '',
                          },
                        ],
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Cuenta
                  </Button>
                </div>
                {formData.items.map((item, index) => {
                  if (item.item_type !== 'ACCOUNT') return null;
                  return (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border rounded mb-2">
                    <div className="col-span-4">
                      <Label>Cuenta</Label>
                      <Select
                        value={item.account_id || ''}
                        onValueChange={(value) => {
                          const newItems = [...formData.items];
                          const selectedAccount = accounts.find((a) => a.id === value);
                          newItems[index] = {
                            ...newItems[index],
                            account_id: value,
                            description: selectedAccount?.account_name || selectedAccount?.name || '',
                          };
                          setFormData({ ...formData, items: newItems });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cuenta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No hay cuentas disponibles
                            </div>
                          ) : (
                            accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_name || account.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Label>Monto</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.item_type === 'ACCOUNT' ? (item.account_amount || 0) : ((item.unit_cost || 0) * (item.quantity || 0))}
                        onChange={(e) =>
                          updateItemAmount(index, parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-3">
                      <Label>Descripción</Label>
                      <Input
                        value={item.description || ''}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index] = { ...newItems[index], description: e.target.value };
                          setFormData({ ...formData, items: newItems });
                        }}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  );
                })}
                {formData.items.filter((item) => item.item_type === 'ACCOUNT').length > 0 && (
                  <div className="mt-2 text-right">
                    <p className="text-lg font-bold">
                      Total: {formatCurrency(totalAmount)}
                    </p>
                  </div>
                )}
              </div>

            {/* Resumen Total */}
            {formData.items.length > 0 && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Factura:</span>
                  <span className="text-2xl font-bold">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || formData.items.length === 0}>
              {loading ? 'Guardando...' : receivedPayment ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


