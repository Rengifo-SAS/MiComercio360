'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { RecurringInvoice } from '@/lib/types/recurring-invoices';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Calendar, Repeat, User, FileText } from 'lucide-react';

interface RecurringInvoiceViewDialogProps {
  recurringInvoice: RecurringInvoice;
  trigger?: React.ReactNode;
}

export function RecurringInvoiceViewDialog({
  recurringInvoice,
  trigger,
}: RecurringInvoiceViewDialogProps) {
  return (
    <Dialog>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de Factura Recurrente</DialogTitle>
          <DialogDescription>
            Información completa de la factura recurrente
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cliente</label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                <p className="font-medium">{recurringInvoice.customer?.business_name || 'N/A'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <div className="mt-1">
                <Badge variant={recurringInvoice.is_active ? 'default' : 'secondary'}>
                  {recurringInvoice.is_active ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Frecuencia</label>
              <div className="flex items-center gap-2 mt-1">
                <Repeat className="h-4 w-4" />
                <p>Cada {recurringInvoice.frequency_months} mes(es)</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Día del Mes</label>
              <p className="mt-1">Día {recurringInvoice.day_of_month}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Próxima Generación</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <p>
                  {recurringInvoice.next_generation_date
                    ? formatDate(recurringInvoice.next_generation_date)
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha de Inicio</label>
              <p className="mt-1">{formatDate(recurringInvoice.start_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha de Fin</label>
              <p className="mt-1">
                {recurringInvoice.end_date ? formatDate(recurringInvoice.end_date) : 'Sin fecha de fin'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Total</label>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(recurringInvoice.total_amount)}
            </p>
          </div>

          {recurringInvoice.notes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Notas</label>
              <p className="mt-1">{recurringInvoice.notes}</p>
            </div>
          )}

          {recurringInvoice.items && recurringInvoice.items.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Items</label>
              <div className="space-y-2">
                {recurringInvoice.items.map((item, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {item.product?.name || item.description || `Item ${index + 1}`}
                        </p>
                        {item.product_reference && (
                          <p className="text-sm text-muted-foreground">
                            Ref: {item.product_reference}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(item.total_price)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}












