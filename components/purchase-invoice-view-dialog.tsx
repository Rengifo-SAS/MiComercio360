'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PurchaseInvoice } from '@/lib/types/purchase-invoices';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Building2, Calendar, DollarSign, FileText, X, CheckCircle, CreditCard } from 'lucide-react';
import { PurchaseInvoicePaymentDialog } from './purchase-invoice-payment-dialog';

interface PurchaseInvoiceViewDialogProps {
  purchaseInvoice: PurchaseInvoice;
  companyId: string;
  trigger?: React.ReactNode;
  onUpdate?: () => void;
}

export function PurchaseInvoiceViewDialog({
  purchaseInvoice,
  companyId,
  trigger,
  onUpdate,
}: PurchaseInvoiceViewDialogProps) {
  const [open, setOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'partially_paid':
        return <Badge variant="default">Parcial</Badge>;
      case 'paid':
        return <Badge className="bg-green-600">Pagada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const remainingAmount = purchaseInvoice.total_amount - (purchaseInvoice.paid_amount || 0);
  const canRegisterPayment = 
    purchaseInvoice.status === 'active' && 
    !purchaseInvoice.is_cancelled && 
    remainingAmount > 0;

  const handlePaymentRegistered = () => {
    onUpdate?.();
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de Factura de Compra</DialogTitle>
          <DialogDescription>
            Información completa de la factura de compra
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Número Proveedor</label>
              <p className="font-medium mt-1">{purchaseInvoice.supplier_invoice_number}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado de Pago</label>
              <div className="mt-1">{getPaymentStatusBadge(purchaseInvoice.payment_status)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Proveedor</label>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4" />
                <p className="font-medium">{purchaseInvoice.supplier?.name || 'N/A'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <p>{formatDate(purchaseInvoice.invoice_date)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Vencimiento</label>
              <p className="mt-1">
                {purchaseInvoice.due_date ? formatDate(purchaseInvoice.due_date) : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Bodega</label>
              <p className="mt-1">{purchaseInvoice.warehouse?.name || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Subtotal</label>
              <p className="mt-1">{formatCurrency(purchaseInvoice.subtotal)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Descuentos</label>
              <p className="mt-1">{formatCurrency(purchaseInvoice.discount_amount)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Retenciones</label>
              <p className="mt-1">{formatCurrency(purchaseInvoice.withholding_amount)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total</label>
              <p className="mt-1 text-2xl font-bold">
                {formatCurrency(purchaseInvoice.total_amount)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Pagado</label>
              <p className="mt-1">{formatCurrency(purchaseInvoice.paid_amount)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Pendiente</label>
              <p className="mt-1 font-medium text-lg">
                {formatCurrency(purchaseInvoice.pending_amount)}
              </p>
            </div>
          </div>

          {purchaseInvoice.observations && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Observaciones</label>
              <p className="mt-1">{purchaseInvoice.observations}</p>
            </div>
          )}

          {purchaseInvoice.items && purchaseInvoice.items.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Items
              </label>
              <div className="space-y-2">
                {purchaseInvoice.items.map((item, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {item.item_type === 'PRODUCT'
                            ? item.product?.name || item.description || `Producto ${index + 1}`
                            : item.account?.account_name || item.description || `Cuenta ${index + 1}`}
                        </p>
                        {item.item_type === 'PRODUCT' && item.quantity && item.unit_cost && (
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} x {formatCurrency(item.unit_cost)}
                            {item.discount_percentage > 0 && (
                              <span> (-{item.discount_percentage}%)</span>
                            )}
                          </p>
                        )}
                        {item.item_type === 'ACCOUNT' && (
                          <p className="text-sm text-muted-foreground">
                            Cuenta contable
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">
                          {formatCurrency(
                            item.item_type === 'PRODUCT'
                              ? item.total_cost || 0
                              : item.account_amount || 0
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {purchaseInvoice.withholdings && purchaseInvoice.withholdings.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Retenciones
              </label>
              <div className="space-y-2">
                {purchaseInvoice.withholdings.map((withholding, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{withholding.withholding_type}</p>
                        {withholding.description && (
                          <p className="text-sm text-muted-foreground">
                            {withholding.description}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Base: {formatCurrency(withholding.base_amount)} -{' '}
                          {withholding.percentage}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">
                          {formatCurrency(withholding.withholding_amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {purchaseInvoice.status === 'cancelled' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <X className="h-4 w-4" />
                <p className="font-medium">Factura Cancelada</p>
              </div>
              {purchaseInvoice.cancelled_at && (
                <p className="text-sm text-muted-foreground mt-1">
                  Fecha de cancelación: {formatDate(purchaseInvoice.cancelled_at)}
                </p>
              )}
              {purchaseInvoice.cancelled_reason && (
                <p className="text-sm text-muted-foreground mt-1">
                  Razón: {purchaseInvoice.cancelled_reason}
                </p>
              )}
            </div>
          )}

          {canRegisterPayment && (
            <div className="pt-4 border-t">
              <Button
                onClick={() => {
                  setOpen(false);
                  setPaymentDialogOpen(true);
                }}
                className="w-full"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Registrar Pago
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <PurchaseInvoicePaymentDialog
      open={paymentDialogOpen}
      onOpenChange={setPaymentDialogOpen}
      purchaseInvoice={purchaseInvoice}
      companyId={companyId}
      onPaymentRegistered={handlePaymentRegistered}
    />
    </>
  );
}




