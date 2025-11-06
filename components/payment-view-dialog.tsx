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
import { Payment } from '@/lib/types/payments';
import { formatCurrency, formatDate } from '@/lib/utils';
import { User, DollarSign, Calendar, FileText, CheckCircle, X } from 'lucide-react';

interface PaymentViewDialogProps {
  receivedPayment: Payment;
  trigger?: React.ReactNode;
}

export function PaymentViewDialog({
  receivedPayment,
  trigger,
}: PaymentViewDialogProps) {
  const getStatusBadge = (status: string, isReconciled: boolean) => {
    if (isReconciled) {
      return <Badge variant="default" className="bg-green-600">Conciliado</Badge>;
    }
    switch (status) {
      case 'open':
        return <Badge variant="default">Abierto</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'reconciled':
        return <Badge variant="default" className="bg-green-600">Conciliado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'INVOICE_PAYMENT':
        return 'Pago a Factura';
      case 'ACCOUNT_PAYMENT':
        return 'Pago a Cuenta';
      default:
        return type;
    }
  };

  return (
    <Dialog>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Comprobante de Egreso</DialogTitle>
          <DialogDescription>
            Información completa del comprobante de egreso
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Número</label>
              <p className="font-medium mt-1">
                {receivedPayment.payment_number || 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <div className="mt-1">
                {getStatusBadge(receivedPayment.status, receivedPayment.is_reconciled)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Proveedor/Beneficiario</label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                <p className="font-medium">
                  {receivedPayment.supplier?.name || receivedPayment.contact_name || 'General'}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <p>{formatDate(receivedPayment.payment_date)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cuenta Bancaria</label>
              <p className="mt-1">{receivedPayment.account?.account_name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Método de Pago</label>
              <p className="mt-1">{receivedPayment.payment_method?.name || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo de Transacción</label>
              <p className="mt-1">{getTransactionTypeLabel(receivedPayment.transaction_type)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Moneda</label>
              <p className="mt-1">{receivedPayment.currency}</p>
            </div>
          </div>

          {receivedPayment.bank_reference && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Referencia Bancaria</label>
              <p className="mt-1">{receivedPayment.bank_reference}</p>
            </div>
          )}

          {receivedPayment.check_number && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Número de Cheque</label>
              <p className="mt-1">{receivedPayment.check_number}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground">Monto Total</label>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(receivedPayment.total_amount)}
            </p>
          </div>

          {receivedPayment.notes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Notas</label>
              <p className="mt-1">{receivedPayment.notes}</p>
            </div>
          )}

          {receivedPayment.items && receivedPayment.items.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Items del Pago
              </label>
              <div className="space-y-2">
                {receivedPayment.items.map((item, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {item.description || `Item ${index + 1}`}
                        </p>
                        {item.purchase_invoice && (
                          <p className="text-sm text-muted-foreground">
                            Factura: {item.purchase_invoice.invoice_number || item.purchase_invoice.supplier_invoice_number}
                          </p>
                        )}
                        {item.account && (
                          <p className="text-sm text-muted-foreground">
                            Cuenta: {item.account?.account_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">
                          {formatCurrency(item.amount_paid)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {receivedPayment.status === 'cancelled' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <X className="h-4 w-4" />
                <p className="font-medium">Pago Cancelado</p>
              </div>
              {receivedPayment.cancelled_at && (
                <p className="text-sm text-muted-foreground mt-1">
                  Fecha de cancelación: {formatDate(receivedPayment.cancelled_at)}
                </p>
              )}
              {receivedPayment.cancelled_reason && (
                <p className="text-sm text-muted-foreground mt-1">
                  Razón: {receivedPayment.cancelled_reason}
                </p>
              )}
            </div>
          )}

          {receivedPayment.is_reconciled && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <p className="font-medium">Pago Conciliado</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


