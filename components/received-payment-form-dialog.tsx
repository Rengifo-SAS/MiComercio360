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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ReceivedPaymentsService } from '@/lib/services/received-payments-service';
import { ReceivedPayment, CreateReceivedPaymentInput, PendingInvoice } from '@/lib/types/received-payments';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ReceivedPaymentFormDialogProps {
  companyId: string;
  receivedPayment?: ReceivedPayment | null;
  customers: any[];
  numerations: any[];
  accounts: any[];
  paymentMethods: any[];
  costCenters: any[];
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function ReceivedPaymentFormDialog({
  companyId,
  receivedPayment,
  customers,
  numerations,
  accounts,
  paymentMethods,
  costCenters,
  onSave,
  trigger,
}: ReceivedPaymentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [formData, setFormData] = useState<CreateReceivedPaymentInput>({
    company_id: companyId,
    payment_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    account_id: '',
    transaction_type: 'INVOICE_PAYMENT',
    currency: 'COP',
    items: [],
  });

  useEffect(() => {
    if (open && receivedPayment) {
      setFormData({
        company_id: companyId,
        payment_date: receivedPayment.payment_date,
        customer_id: receivedPayment.customer_id,
        account_id: receivedPayment.account_id,
        numeration_id: receivedPayment.numeration_id || undefined,
        payment_method_id: receivedPayment.payment_method_id || undefined,
        cost_center_id: receivedPayment.cost_center_id || undefined,
        currency: receivedPayment.currency,
        notes: receivedPayment.notes || undefined,
        transaction_type: receivedPayment.transaction_type,
        bank_reference: receivedPayment.bank_reference || undefined,
        check_number: receivedPayment.check_number || undefined,
        items: receivedPayment.items?.map((item) => ({
          item_type: item.item_type,
          sale_id: item.sale_id,
          account_id: item.account_id,
          amount_paid: item.amount_paid,
          description: item.description,
        })) || [],
      });
    } else if (open && !receivedPayment) {
      setFormData({
        company_id: companyId,
        payment_date: new Date().toISOString().split('T')[0],
        customer_id: '',
        account_id: '',
        transaction_type: 'INVOICE_PAYMENT',
        currency: 'COP',
        items: [],
      });
    }
  }, [open, receivedPayment, companyId]);

  // Cargar facturas pendientes cuando se selecciona un cliente
  useEffect(() => {
    if (open && formData.customer_id && formData.transaction_type === 'INVOICE_PAYMENT') {
      loadPendingInvoices();
    } else {
      setPendingInvoices([]);
    }
  }, [open, formData.customer_id, formData.transaction_type]);

  const loadPendingInvoices = async () => {
    if (!formData.customer_id) return;
    setLoadingInvoices(true);
    try {
      const invoices = await ReceivedPaymentsService.getPendingInvoices(
        companyId,
        formData.customer_id
      );
      setPendingInvoices(invoices);
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
    setLoading(true);

    try {
      if (receivedPayment) {
        await ReceivedPaymentsService.updateReceivedPayment(
          receivedPayment.id,
          companyId,
          formData
        );
        toast.success('Éxito', {
          description: 'Pago recibido actualizado',
        });
      } else {
        await ReceivedPaymentsService.createReceivedPayment(formData);
        toast.success('Éxito', {
          description: 'Pago recibido creado',
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

  const addInvoiceItem = (invoice: PendingInvoice) => {
    // Verificar si ya está agregado
    if (formData.items.some((item) => item.sale_id === invoice.sale_id)) {
      toast.error('Error', {
        description: 'Esta factura ya está agregada',
      });
      return;
    }

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          item_type: 'INVOICE',
          sale_id: invoice.sale_id,
          amount_paid: invoice.pending_amount,
          description: `Factura ${invoice.sale_number}`,
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

  const updateItemAmount = (index: number, amount: number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], amount_paid: amount };
    setFormData({ ...formData, items: newItems });
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + item.amount_paid, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {receivedPayment ? 'Editar Pago Recibido' : 'Nuevo Pago Recibido'}
          </DialogTitle>
          <DialogDescription>
            Registre un pago recibido de un cliente
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value, items: [] })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers && customers.length > 0 ? (
                      customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.business_name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay clientes disponibles
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Transacción *</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(value: 'INVOICE_PAYMENT' | 'ACCOUNT_PAYMENT') =>
                    setFormData({ ...formData, transaction_type: value, items: [] })
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
                <Label>Referencia Bancaria</Label>
                <Input
                  value={formData.bank_reference || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_reference: e.target.value || undefined })
                  }
                  placeholder="Número de consignación, transferencia, etc."
                />
              </div>
              <div>
                <Label>Número de Cheque</Label>
                <Input
                  value={formData.check_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, check_number: e.target.value || undefined })
                  }
                  placeholder="Número de cheque"
                />
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || undefined })}
                rows={3}
                placeholder="Notas adicionales sobre el pago"
              />
            </div>

            {/* Facturas Pendientes (si es INVOICE_PAYMENT) */}
            {formData.transaction_type === 'INVOICE_PAYMENT' && formData.customer_id && (
              <div>
                <Label>Facturas Pendientes</Label>
                {loadingInvoices ? (
                  <p className="text-sm text-muted-foreground mt-2">Cargando facturas...</p>
                ) : pendingInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Este cliente no tiene facturas pendientes
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
                          <TableRow key={invoice.sale_id}>
                            <TableCell className="font-medium">{invoice.sale_number}</TableCell>
                            <TableCell>{formatDate(invoice.issue_date)}</TableCell>
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
                                onClick={() => addInvoiceItem(invoice)}
                                disabled={formData.items.some(
                                  (item) => item.sale_id === invoice.sale_id
                                )}
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
                <Label>Items del Pago</Label>
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
                      {formData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description || 'Sin descripción'}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.amount_paid}
                              onChange={(e) =>
                                updateItemAmount(index, parseFloat(e.target.value) || 0)
                              }
                              className="w-[150px]"
                            />
                          </TableCell>
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
                      ))}
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

            {/* Agregar cuenta contable (si es ACCOUNT_PAYMENT) */}
            {formData.transaction_type === 'ACCOUNT_PAYMENT' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Cuentas Contables</Label>
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
                            amount_paid: 0,
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
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border rounded mb-2">
                    <div className="col-span-4">
                      <Label>Cuenta</Label>
                      <Select
                        value={item.account_id || ''}
                        onValueChange={(value) => {
                          const newItems = [...formData.items];
                          newItems[index] = {
                            ...newItems[index],
                            account_id: value,
                            description: accounts.find((a) => a.id === value)?.account_name || '',
                          };
                          setFormData({ ...formData, items: newItems });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cuenta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Label>Monto</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount_paid}
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
                ))}
                {formData.items.length > 0 && (
                  <div className="mt-2 text-right">
                    <p className="text-lg font-bold">
                      Total: {formatCurrency(totalAmount)}
                    </p>
                  </div>
                )}
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





