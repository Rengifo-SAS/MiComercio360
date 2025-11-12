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
import { PurchaseDebitNotesService } from '@/lib/services/purchase-debit-notes-service';
import { PurchaseDebitNote, CreatePurchaseDebitNoteInput, PendingPurchase } from '@/lib/types/purchase-debit-notes';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PurchaseDebitNoteFormDialogProps {
  companyId: string;
  receivedPayment?: PurchaseDebitNote | null;
  suppliers: any[];
  numerations: any[];
  accounts: any[];
  paymentMethods: any[];
  costCenters: any[];
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function PurchaseDebitNoteFormDialog({
  companyId,
  receivedPayment,
  suppliers,
  numerations,
  accounts,
  paymentMethods,
  costCenters,
  onSave,
  trigger,
}: PurchaseDebitNoteFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingInvoices, setPendingPurchases] = useState<PendingPurchase[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [formData, setFormData] = useState<CreatePurchaseDebitNoteInput>({
    company_id: companyId,
    debit_note_date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    currency: 'COP',
    items: [],
    settlements: [],
  });

  useEffect(() => {
    if (open && receivedPayment) {
      setFormData({
        company_id: companyId,
        debit_note_date: receivedPayment.debit_note_date,
        supplier_id: receivedPayment.supplier_id,
        numeration_id: receivedPayment.numeration_id || undefined,
        currency: receivedPayment.currency,
        warehouse_id: receivedPayment.warehouse_id || undefined,
        observations: receivedPayment.observations || undefined,
        items: receivedPayment.items?.map((item) => ({
          item_type: item.item_type,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          account_id: item.account_id,
          account_amount: item.account_amount,
          description: item.description,
          sort_order: item.sort_order,
        })) || [],
        settlements: receivedPayment.settlements?.map((settlement) => ({
          settlement_type: settlement.settlement_type,
          refund_date: settlement.refund_date,
          refund_account_id: settlement.refund_account_id,
          refund_amount: settlement.refund_amount,
          refund_observations: settlement.refund_observations,
          purchase_id: settlement.purchase_id,
          credit_amount: settlement.credit_amount,
        })) || [],
      });
    } else if (open && !receivedPayment) {
      setFormData({
        company_id: companyId,
        debit_note_date: new Date().toISOString().split('T')[0],
        supplier_id: '',
        currency: 'COP',
        items: [],
        settlements: [],
      });
    }
  }, [open, receivedPayment, companyId]);

  // Cargar facturas pendientes cuando se selecciona un proveedor
  useEffect(() => {
    if (open && formData.supplier_id) {
      loadPendingPurchases();
    } else {
      setPendingPurchases([]);
    }
  }, [open, formData.supplier_id]);

  const loadPendingPurchases = async () => {
    if (!formData.supplier_id) return;
    setLoadingInvoices(true);
    try {
      const invoices = await PurchaseDebitNotesService.getPendingPurchases(
        companyId,
        formData.supplier_id
      );
      setPendingPurchases(invoices);
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
        await PurchaseDebitNotesService.updatePurchaseDebitNote(
          receivedPayment.id,
          companyId,
          formData
        );
        toast.success('Éxito', {
          description: 'Pago recibido actualizado',
        });
      } else {
        await PurchaseDebitNotesService.createPurchaseDebitNote(formData);
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

  const addInvoiceItem = (invoice: PendingPurchase) => {
    // Verificar si ya está agregado como settlement
    if (formData.settlements.some((settlement) => 
      settlement.purchase_id === invoice.purchase_id
    )) {
      toast.error('Error', {
        description: 'Esta factura ya está agregada',
      });
      return;
    }

    setFormData({
      ...formData,
      settlements: [
        ...formData.settlements,
        {
          settlement_type: 'INVOICE_CREDIT',
          purchase_id: invoice.purchase_id,
          credit_amount: invoice.pending_amount,
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
            {receivedPayment ? 'Editar Nota Débito' : 'Nueva Nota Débito'}
          </DialogTitle>
          <DialogDescription>
            Crea notas débito para disminuir el saldo por pagar a proveedores
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Proveedor *</Label>
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
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.debit_note_date}
                  onChange={(e) => setFormData({ ...formData, debit_note_date: e.target.value })}
                  required
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
                          <TableRow key={invoice.purchase_id}>
                            <TableCell className="font-medium">{invoice.purchase_number}</TableCell>
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
                                disabled={formData.settlements.some(
                                  (settlement) => settlement.purchase_id === invoice.purchase_id
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
                              value={item.item_type === 'ACCOUNT' ? (item.account_amount || 0) : ((item.unit_cost || 0) * (item.quantity || 0))}
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

            {/* Agregar cuenta contable */}
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
                  // Solo mostrar items de tipo ACCOUNT
                  if (item.item_type !== 'ACCOUNT') return null;
                  
                  return (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border rounded mb-2">
                      <div className="col-span-4">
                        <Label>Cuenta</Label>
                        <Select
                          value={item.account_id || ''}
                          onValueChange={(value) => {
                            const newItems = [...formData.items];
                            const account = accounts.find((a) => a.id === value);
                            newItems[index] = {
                              ...newItems[index],
                              account_id: value,
                              description: account?.account_name || account?.name || '',
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
                                {account.account_name || account.name}
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
                          value={item.account_amount || 0}
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
                          placeholder="Descripción del item"
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