'use client';

import { useState } from 'react';
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
import { QuotesService } from '@/lib/services/quotes-service';
import { Quote } from '@/lib/types/quotes';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';

interface ConvertQuoteDialogProps {
  quote: Quote;
  companyId: string;
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function ConvertQuoteDialog({
  quote,
  companyId,
  onSave,
  trigger,
}: ConvertQuoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversionType, setConversionType] = useState<'INVOICE' | 'DELIVERY_NOTE'>('INVOICE');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const handleConvert = async () => {
    setLoading(true);
    try {
      await QuotesService.convertQuoteToSale({
        quote_id: quote.id,
        company_id: companyId,
        conversion_type: conversionType,
        sale_date: saleDate,
        payment_method: paymentMethod,
      });
      toast.success('Éxito', {
        description: 'Cotización convertida a venta',
      });
      setOpen(false);
      onSave?.();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo convertir',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convertir Cotización a Venta</DialogTitle>
          <DialogDescription>
            Convierta esta cotización en una factura de venta o remisión
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label>Tipo de Conversión *</Label>
            <Select
              value={conversionType}
              onValueChange={(value: 'INVOICE' | 'DELIVERY_NOTE') =>
                setConversionType(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INVOICE">Factura de Venta</SelectItem>
                <SelectItem value="DELIVERY_NOTE">Remisión</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConvert} disabled={loading}>
            {loading ? 'Convirtiendo...' : 'Convertir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

