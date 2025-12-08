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
import { RecurringPayment } from '@/lib/types/recurring-payments';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Calendar, Repeat, Building2, DollarSign } from 'lucide-react';

interface RecurringPaymentViewDialogProps {
  recurringPayment: RecurringPayment;
  trigger?: React.ReactNode;
}

export function RecurringPaymentViewDialog({
  recurringPayment,
  trigger,
}: RecurringPaymentViewDialogProps) {
  return (
    <Dialog>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de Pago Recurrente</DialogTitle>
          <DialogDescription>
            Información completa del pago recurrente
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contacto</label>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4" />
                <p className="font-medium">
                  {recurringPayment.supplier?.name ||
                    recurringPayment.contact_name ||
                    'N/A'}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <div className="mt-1">
                <Badge variant={recurringPayment.is_active ? 'default' : 'secondary'}>
                  {recurringPayment.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Frecuencia</label>
              <div className="flex items-center gap-2 mt-1">
                <Repeat className="h-4 w-4" />
                <p>Cada {recurringPayment.frequency_months} mes(es)</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Día del Mes</label>
              <p className="mt-1">Día {recurringPayment.day_of_month}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Próxima Generación
              </label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <p>
                  {recurringPayment.next_generation_date
                    ? formatDate(recurringPayment.next_generation_date)
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha de Inicio</label>
              <p className="mt-1">{formatDate(recurringPayment.start_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha de Fin</label>
              <p className="mt-1">
                {recurringPayment.end_date
                  ? formatDate(recurringPayment.end_date)
                  : 'Sin fecha de fin'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cuenta Bancaria</label>
              <p className="mt-1">{recurringPayment.account?.account_name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Método de Pago</label>
              <p className="mt-1">{recurringPayment.payment_method?.name || 'N/A'}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Total</label>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(recurringPayment.total_amount)}
            </p>
          </div>

          {recurringPayment.details && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Detalles</label>
              <p className="mt-1">{recurringPayment.details}</p>
            </div>
          )}

          {recurringPayment.items && recurringPayment.items.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Items
              </label>
              <div className="space-y-2">
                {recurringPayment.items.map((item, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {item.account?.account_name || item.description || `Item ${index + 1}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">
                          {formatCurrency(item.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recurringPayment.generations && recurringPayment.generations.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Historial de Generaciones
              </label>
              <div className="space-y-2">
                {recurringPayment.generations.slice(0, 5).map((generation) => (
                  <div key={generation.id} className="p-2 border rounded text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {formatDate(generation.scheduled_date)}
                        </p>
                        <p className="text-muted-foreground">
                          Estado: {generation.status}
                        </p>
                      </div>
                      {generation.payment && (
                        <Badge variant="outline">
                          Pago: {generation.payment.payment_number || 'N/A'}
                        </Badge>
                      )}
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





