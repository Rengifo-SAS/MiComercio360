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
import { RecurringPaymentsService } from '@/lib/services/recurring-payments-service';
import {
  RecurringPayment,
  CreateRecurringPaymentInput,
} from '@/lib/types/recurring-payments';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RecurringPaymentFormDialogProps {
  companyId: string;
  recurringPayment?: RecurringPayment | null;
  suppliers: any[];
  numerations: any[];
  accounts: any[];
  paymentMethods: any[];
  costCenters: any[];
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function RecurringPaymentFormDialog({
  companyId,
  recurringPayment,
  suppliers,
  numerations,
  accounts,
  paymentMethods,
  costCenters,
  onSave,
  trigger,
}: RecurringPaymentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateRecurringPaymentInput>({
    company_id: companyId,
    start_date: new Date().toISOString().split('T')[0],
    day_of_month: 1,
    frequency_months: 1,
    account_id: '',
    transaction_type: 'ACCOUNT_PAYMENT',
    currency: 'COP',
    items: [],
  });

  useEffect(() => {
    if (open && recurringPayment) {
      setFormData({
        company_id: companyId,
        supplier_id: recurringPayment.supplier_id || undefined,
        contact_name: recurringPayment.contact_name || undefined,
        start_date: recurringPayment.start_date,
        end_date: recurringPayment.end_date || undefined,
        day_of_month: recurringPayment.day_of_month,
        frequency_months: recurringPayment.frequency_months,
        account_id: recurringPayment.account_id,
        payment_method_id: recurringPayment.payment_method_id || undefined,
        cost_center_id: recurringPayment.cost_center_id || undefined,
        currency: recurringPayment.currency,
        details: recurringPayment.details || undefined,
        notes: recurringPayment.notes || undefined,
        transaction_type: recurringPayment.transaction_type,
        numeration_id: recurringPayment.numeration_id || undefined,
        items:
          recurringPayment.items?.map((item) => ({
            item_type: item.item_type,
            account_id: item.account_id,
            amount: item.amount,
            description: item.description,
            sort_order: item.sort_order,
          })) || [],
      });
    } else if (open && !recurringPayment) {
      setFormData({
        company_id: companyId,
        start_date: new Date().toISOString().split('T')[0],
        day_of_month: 1,
        frequency_months: 1,
        account_id: '',
        transaction_type: 'ACCOUNT_PAYMENT',
        currency: 'COP',
        items: [],
      });
    }
  }, [open, recurringPayment, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones del formulario
    if (!formData.account_id || 
        (typeof formData.account_id === 'string' && formData.account_id.trim() === '') ||
        formData.account_id === null ||
        formData.account_id === undefined) {
      toast.error('Error', {
        description: 'La cuenta bancaria es requerida',
      });
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      toast.error('Error', {
        description: 'Debe agregar al menos un item de cuenta contable',
      });
      return;
    }

    // Validar que todos los items tengan monto mayor a 0
    const hasInvalidItems = formData.items.some(
      (item) => !item.description || item.description.trim() === '' || item.amount <= 0
    );

    if (hasInvalidItems) {
      toast.error('Error', {
        description: 'Todos los items deben tener descripción y monto mayor a 0',
      });
      return;
    }

    setLoading(true);

    try {
      if (recurringPayment) {
        await RecurringPaymentsService.updateRecurringPayment(
          recurringPayment.id,
          companyId,
          formData
        );
        toast.success('Éxito', {
          description: 'Pago recurrente actualizado',
        });
      } else {
        await RecurringPaymentsService.createRecurringPayment(formData);
        toast.success('Éxito', {
          description: 'Pago recurrente creado',
        });
      }
      setOpen(false);
      onSave?.();
    } catch (error: any) {
      console.error('Error guardando pago recurrente:', error);
      const errorMessage = error.message || error.details || JSON.stringify(error) || 'No se pudo guardar';
      toast.error('Error', {
        description: errorMessage,
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
          item_type: 'ACCOUNT',
          amount: 0,
          description: '',
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
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {recurringPayment ? 'Editar Pago Recurrente' : 'Nuevo Pago Recurrente'}
          </DialogTitle>
          <DialogDescription>
            Configure el pago recurrente que se generará automáticamente
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Transacción *</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(value: 'INVOICE_PAYMENT' | 'ACCOUNT_PAYMENT') =>
                    setFormData({ ...formData, transaction_type: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVOICE_PAYMENT">Pago a Factura</SelectItem>
                    <SelectItem value="ACCOUNT_PAYMENT">Pago a Cuenta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Proveedor/Contacto</Label>
                {formData.transaction_type === 'INVOICE_PAYMENT' ? (
                  <Select
                    value={formData.supplier_id || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, supplier_id: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers && suppliers.length > 0 ? (
                        suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No hay proveedores disponibles
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.contact_name || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_name: e.target.value || undefined })
                    }
                    placeholder="Nombre del contacto"
                  />
                )}
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
                    setFormData({
                      ...formData,
                      day_of_month: parseInt(e.target.value) || 1,
                    })
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
                    setFormData({
                      ...formData,
                      frequency_months: parseInt(e.target.value) || 1,
                    })
                  }
                  required
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cuenta Bancaria *</Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts && accounts.length > 0 ? (
                      accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay cuentas disponibles
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Método de Pago</Label>
                <Select
                  value={formData.payment_method_id || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, payment_method_id: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods && paymentMethods.length > 0 ? (
                      paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay métodos de pago disponibles
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                      {costCenters && costCenters.length > 0 ? (
                        costCenters.map((center) => (
                          <SelectItem key={center.id} value={center.id}>
                            {center.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No hay centros de costos disponibles
                        </div>
                      )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Detalles</Label>
              <Input
                value={formData.details || ''}
                onChange={(e) =>
                  setFormData({ ...formData, details: e.target.value || undefined })
                }
                placeholder="Concepto del pago"
              />
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || undefined })}
                rows={2}
              />
            </div>

            {/* Items - Cuentas Contables */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Cuentas Contables</Label>
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Cuenta
                </Button>
              </div>
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-end p-2 border rounded"
                  >
                    <div className="col-span-6">
                      <Label>Descripción *</Label>
                      <Input
                        value={item.description || ''}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Descripción del concepto"
                        required
                      />
                    </div>
                    <div className="col-span-5">
                      <Label>Monto *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) =>
                          updateItem(index, 'amount', parseFloat(e.target.value) || 0)
                        }
                        required
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
                ))}
              </div>
              {formData.items.length > 0 && (
                <div className="mt-2 text-right">
                  <p className="text-lg font-bold">Total: {formatCurrency(totalAmount)}</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || formData.items.length === 0}>
              {loading ? 'Guardando...' : recurringPayment ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

