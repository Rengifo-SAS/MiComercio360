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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeliveryNotesService } from '@/lib/services/delivery-notes-service';
import { DeliveryNote } from '@/lib/types/delivery-notes';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';

interface ConvertDeliveryNoteDialogProps {
  deliveryNote: DeliveryNote;
  companyId: string;
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function ConvertDeliveryNoteDialog({
  deliveryNote,
  companyId,
  onSave,
  trigger,
}: ConvertDeliveryNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Inicializar con la fecha de la remisión por defecto
  const [saleDate, setSaleDate] = useState(deliveryNote.delivery_date || new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [accountId, setAccountId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Actualizar fecha cuando cambie la remisión o se abra el diálogo
  useEffect(() => {
    if (open) {
      setSaleDate(deliveryNote.delivery_date || new Date().toISOString().split('T')[0]);
      // Inicializar notas con referencia a la remisión
      if (!notes && deliveryNote.delivery_note_number) {
        setNotes(`Convertida desde remisión ${deliveryNote.delivery_note_number}`);
      }
    }
  }, [open, deliveryNote]);

  const handleConvert = async () => {
    if (!deliveryNote.items || deliveryNote.items.length === 0) {
      toast.error('Error', {
        description: 'La remisión no tiene items para convertir',
      });
      return;
    }

    // Prevenir múltiples clics
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      // Obtener items pendientes para facturar
      const itemsToInvoice = deliveryNote.items
        .filter((item) => item.quantity_pending > 0)
        .map((item) => ({
          delivery_note_id: deliveryNote.id,
          item_id: item.id,
          quantity_to_invoice: item.quantity_pending,
        }));

      if (itemsToInvoice.length === 0) {
        toast.error('Error', {
          description: 'No hay items pendientes para facturar',
        });
        setLoading(false);
        return;
      }

      // Preparar notas con referencia a la remisión
      const saleNotes = notes || `Convertida desde remisión ${deliveryNote.delivery_note_number || deliveryNote.id.slice(0, 8)}`;

      const result = await DeliveryNotesService.convertDeliveryNotesToSale({
        delivery_note_ids: [deliveryNote.id],
        company_id: companyId,
        sale_date: saleDate,
        payment_method: paymentMethod,
        account_id: accountId || undefined,
        notes: saleNotes,
        items_to_invoice: itemsToInvoice,
      });

      toast.success('Éxito', {
        description: `Remisión convertida a venta: ${result.sale.sale_number}`,
      });
      setOpen(false);
      onSave?.();
    } catch (error: any) {
      console.error('Error convirtiendo remisión:', error);
      toast.error('Error', {
        description: error.message || 'No se pudo convertir',
      });
    } finally {
      setLoading(false);
    }
  };

  const pendingItems = deliveryNote.items?.filter((item) => item.quantity_pending > 0) || [];
  const totalPending = pendingItems.reduce(
    (sum, item) => sum + item.quantity_pending * item.unit_price,
    0
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convertir Remisión a Venta</DialogTitle>
          <DialogDescription>
            Convierta esta remisión en una factura de venta
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label>Fecha de Venta *</Label>
            <Input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Método de Pago *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="mixed">Mixto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notas</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales para la venta"
            />
          </div>
          {pendingItems.length > 0 && (
            <div className="p-3 bg-muted rounded">
              <p className="text-sm font-medium mb-2">Items Pendientes:</p>
              <div className="space-y-1">
                {pendingItems.map((item, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">
                      {item.product?.name || item.description || `Item ${index + 1}`}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}
                      - {item.quantity_pending} unidades pendientes
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium mt-2">
                Total pendiente: {totalPending.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConvert}
            disabled={loading || pendingItems.length === 0}
          >
            {loading ? 'Convirtiendo...' : 'Convertir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

