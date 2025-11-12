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
import { PurchaseDebitNote } from '@/lib/types/purchase-debit-notes';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Building2, Calendar, DollarSign, FileText, X, CheckCircle } from 'lucide-react';

interface PurchaseDebitNoteViewDialogProps {
  purchaseInvoice: PurchaseDebitNote;
  trigger?: React.ReactNode;
}

export function PurchaseDebitNoteViewDialog({
  purchaseInvoice,
  trigger,
}: PurchaseDebitNoteViewDialogProps) {

  return (
    <Dialog>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
          <DialogTitle>Detalles de Nota Débito de Compra</DialogTitle>
          <DialogDescription>
            Información completa de la nota débito de compra
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Número</label>
              <p className="font-medium mt-1">{purchaseInvoice.debit_note_number || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <div className="mt-1">
                {purchaseInvoice.status === 'open' && <Badge variant="default">Abierto</Badge>}
                {purchaseInvoice.status === 'cancelled' && <Badge variant="destructive">Cancelado</Badge>}
                {purchaseInvoice.status === 'reconciled' && <Badge className="bg-green-600">Conciliado</Badge>}
                {purchaseInvoice.is_reconciled && <Badge className="bg-green-600">Conciliado</Badge>}
              </div>
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
                <p>{formatDate(purchaseInvoice.debit_note_date)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Bodega</label>
              <p className="mt-1">{purchaseInvoice.warehouse?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Moneda</label>
              <p className="mt-1">{purchaseInvoice.currency}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Subtotal</label>
              <p className="mt-1">{formatCurrency(purchaseInvoice.subtotal)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Impuestos</label>
              <p className="mt-1">{formatCurrency(purchaseInvoice.tax_amount)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total</label>
              <p className="mt-1 text-2xl font-bold">
                {formatCurrency(purchaseInvoice.total_amount)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Devolución en Efectivo</label>
              <p className="mt-1">{formatCurrency(purchaseInvoice.cash_refund_amount)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Crédito a Factura</label>
              <p className="mt-1">{formatCurrency(purchaseInvoice.invoice_credit_amount)}</p>
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
                              ? ((item.unit_cost || 0) * (item.quantity || 0))
                              : (item.account_amount || 0)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {purchaseInvoice.settlements && purchaseInvoice.settlements.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Liquidaciones
              </label>
              <div className="space-y-2">
                {purchaseInvoice.settlements.map((settlement, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {settlement.settlement_type === 'CASH_REFUND' ? 'Devolución en Efectivo' : 'Crédito a Factura'}
                        </p>
                        {settlement.settlement_type === 'CASH_REFUND' && (
                          <>
                            {settlement.refund_date && (
                              <p className="text-sm text-muted-foreground">
                                Fecha: {formatDate(settlement.refund_date)}
                              </p>
                            )}
                            {settlement.refund_account && (
                              <p className="text-sm text-muted-foreground">
                                Cuenta: {settlement.refund_account.account_name}
                              </p>
                            )}
                            {settlement.refund_observations && (
                              <p className="text-sm text-muted-foreground">
                                {settlement.refund_observations}
                              </p>
                            )}
                          </>
                        )}
                        {settlement.settlement_type === 'INVOICE_CREDIT' && (
                          <p className="text-sm text-muted-foreground">
                            Compra ID: {settlement.purchase_id}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">
                          {formatCurrency(
                            settlement.settlement_type === 'CASH_REFUND'
                              ? (settlement.refund_amount || 0)
                              : (settlement.credit_amount || 0)
                          )}
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
                <p className="font-medium">Nota Débito Cancelada</p>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}


