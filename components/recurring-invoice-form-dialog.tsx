'use client';

import { useState, useEffect } from 'react';
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
import { RecurringInvoicesService } from '@/lib/services/recurring-invoices-service';
import { RecurringInvoice, CreateRecurringInvoiceInput, CreateRecurringInvoiceItemInput } from '@/lib/types/recurring-invoices';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';

// Tipo extendido para items del formulario con campos calculados
interface RecurringInvoiceFormItem extends CreateRecurringInvoiceItemInput {
  discount_amount?: number;
  total_price?: number;
}

interface RecurringInvoiceFormData extends Omit<CreateRecurringInvoiceInput, 'items'> {
  items: RecurringInvoiceFormItem[];
}

interface RecurringInvoiceFormDialogProps {
  companyId: string;
  recurringInvoice?: RecurringInvoice | null;
  customers: any[];
  numerations: any[];
  warehouses: any[];
  products: any[];
  taxes: any[];
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function RecurringInvoiceFormDialog({
  companyId,
  recurringInvoice,
  customers,
  numerations,
  warehouses,
  products,
  taxes,
  onSave,
  trigger,
}: RecurringInvoiceFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<RecurringInvoiceFormData>({
    company_id: companyId,
    customer_id: '',
    start_date: new Date().toISOString().split('T')[0],
    day_of_month: 1,
    frequency_months: 1,
    payment_terms: 0,
    currency: 'COP',
    items: [],
  });

  useEffect(() => {
    if (open && recurringInvoice) {
      setFormData({
        company_id: companyId,
        customer_id: recurringInvoice.customer_id,
        numeration_id: recurringInvoice.numeration_id || undefined,
        start_date: recurringInvoice.start_date,
        end_date: recurringInvoice.end_date || undefined,
        day_of_month: recurringInvoice.day_of_month,
        frequency_months: recurringInvoice.frequency_months,
        payment_terms: recurringInvoice.payment_terms,
        currency: recurringInvoice.currency,
        warehouse_id: recurringInvoice.warehouse_id || undefined,
        notes: recurringInvoice.notes || undefined,
        observations: recurringInvoice.observations || undefined,
        items: recurringInvoice.items?.map((item) => ({
          product_id: item.product_id,
          product_reference: item.product_reference,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage,
          tax_id: item.tax_id,
          sort_order: item.sort_order,
        })) || [],
      });
    } else if (open && !recurringInvoice) {
      setFormData({
        company_id: companyId,
        customer_id: '',
        start_date: new Date().toISOString().split('T')[0],
        day_of_month: 1,
        frequency_months: 1,
        payment_terms: 0,
        currency: 'COP',
        items: [],
      });
    }
  }, [open, recurringInvoice, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Preparar datos para enviar al servidor (sin campos calculados)
      const submitData: CreateRecurringInvoiceInput = {
        ...formData,
        items: formData.items.map((item) => ({
          product_id: item.product_id,
          product_reference: item.product_reference,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage,
          tax_id: item.tax_id,
          sort_order: item.sort_order,
        })),
      };

      if (recurringInvoice) {
        await RecurringInvoicesService.updateRecurringInvoice(
          recurringInvoice.id,
          companyId,
          submitData
        );
        toast.success('Éxito', {
          description: 'Factura recurrente actualizada',
        });
      } else {
        await RecurringInvoicesService.createRecurringInvoice(submitData);
        toast.success('Éxito', {
          description: 'Factura recurrente creada',
        });
      }
      setOpen(false);
      onSave?.();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo guardar',
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_id: '',
          quantity: 1,
          unit_price: 0,
          discount_percentage: 0,
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const currentItem = { ...newItems[index] };
    
    // Si se selecciona un producto, cargar sus datos
    if (field === 'product_id' && value) {
      const selectedProduct = products.find((p) => p.id === value);
      if (selectedProduct) {
        currentItem.product_id = value;
        currentItem.unit_price = selectedProduct.sale_price || 0;
        currentItem.product_reference = selectedProduct.reference || undefined;
        currentItem.tax_id = selectedProduct.tax_id || undefined;
        if (!currentItem.description && selectedProduct.name) {
          currentItem.description = selectedProduct.name;
        }
      }
    } else {
      // Asignación segura por campo
      switch (field) {
        case 'product_id':
          currentItem.product_id = value;
          break;
        case 'product_reference':
          currentItem.product_reference = value;
          break;
        case 'description':
          currentItem.description = value;
          break;
        case 'quantity':
          currentItem.quantity = value;
          break;
        case 'unit_price':
          currentItem.unit_price = value;
          break;
        case 'discount_percentage':
          currentItem.discount_percentage = value;
          break;
        case 'tax_id':
          currentItem.tax_id = value;
          break;
        case 'sort_order':
          currentItem.sort_order = value;
          break;
      }
    }
    
    // Calcular total si es precio, cantidad o descuento
    if (field === 'unit_price' || field === 'quantity' || field === 'discount_percentage' || field === 'product_id') {
      const subtotal = (currentItem.unit_price || 0) * (currentItem.quantity || 0);
      const discount = subtotal * ((currentItem.discount_percentage || 0) / 100);
      currentItem.discount_amount = discount;
      currentItem.total_price = subtotal - discount;
    }
    
    newItems[index] = currentItem;
    setFormData({ ...formData, items: newItems });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {recurringInvoice ? 'Editar Factura Recurrente' : 'Nueva Factura Recurrente'}
          </DialogTitle>
          <DialogDescription>
            Configure la factura recurrente que se generará automáticamente
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.business_name}
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
                    {numerations && numerations.length > 0 ? (
                      numerations.map((num) => (
                        <SelectItem key={num.id} value={num.id}>
                          {num.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay numeraciones disponibles
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fecha de Inicio *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Fecha de Fin</Label>
                <Input
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value || undefined })
                  }
                />
              </div>
              <div>
                <Label>Día del Mes *</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.day_of_month}
                  onChange={(e) =>
                    setFormData({ ...formData, day_of_month: parseInt(e.target.value) || 1 })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Frecuencia (meses) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.frequency_months}
                  onChange={(e) =>
                    setFormData({ ...formData, frequency_months: parseInt(e.target.value) || 1 })
                  }
                  required
                />
              </div>
              <div>
                <Label>Plazo de Pago (días)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.payment_terms || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
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

            <div>
              <Label>Notas (visibles en PDF)</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || undefined })}
                rows={2}
              />
            </div>

            <div>
              <Label>Observaciones (internas)</Label>
              <Textarea
                value={formData.observations || ''}
                onChange={(e) =>
                  setFormData({ ...formData, observations: e.target.value || undefined })
                }
                rows={2}
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item
                </Button>
              </div>
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border rounded">
                    <div className="col-span-4">
                      <Label>Producto</Label>
                      <Select
                        value={item.product_id || ''}
                        onValueChange={(value) => updateItem(index, 'product_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products && products.length > 0 ? (
                            products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No hay productos disponibles
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Precio Unit.</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Desc. %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discount_percentage || 0}
                        onChange={(e) =>
                          updateItem(index, 'discount_percentage', parseFloat(e.target.value) || 0)
                        }
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
                    <div className="col-span-12 mt-2">
                      <Label>Descripción</Label>
                      <Input
                        value={item.description || ''}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Descripción del producto"
                      />
                    </div>
                    {item.product_reference && (
                      <div className="col-span-12 text-sm text-muted-foreground">
                        Ref: {item.product_reference}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : recurringInvoice ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

