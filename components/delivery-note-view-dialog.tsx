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
import { DeliveryNote } from '@/lib/types/delivery-notes';
import { formatCurrency, formatDate } from '@/lib/utils';
import { User, Calendar, FileText, CheckCircle, Truck, AlertCircle } from 'lucide-react';

interface DeliveryNoteViewDialogProps {
  deliveryNote: DeliveryNote;
  trigger?: React.ReactNode;
}

export function DeliveryNoteViewDialog({ deliveryNote, trigger }: DeliveryNoteViewDialogProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'partially_invoiced':
        return <Badge className="bg-yellow-600">Parcialmente Facturada</Badge>;
      case 'invoiced':
        return <Badge className="bg-green-600">Facturada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Anulada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    switch (type) {
      case 'DELIVERY_NOTE':
        return <Badge variant="outline">Remisión</Badge>;
      case 'SERVICE_ORDER':
        return <Badge variant="outline">Orden de Servicio</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <Dialog>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de Remisión</DialogTitle>
          <DialogDescription>
            Información completa de la remisión
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Número</label>
              <p className="font-medium mt-1">{deliveryNote.delivery_note_number || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <div className="mt-1">{getStatusBadge(deliveryNote.status)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo</label>
              <div className="mt-1">{getDocumentTypeBadge(deliveryNote.document_type)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cliente</label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                <p className="font-medium">
                  {deliveryNote.customer?.business_name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha de Entrega</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <p>{formatDate(deliveryNote.delivery_date)}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha de Vencimiento</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <p>
                  {deliveryNote.expiration_date
                    ? formatDate(deliveryNote.expiration_date)
                    : 'No definido'}
                </p>
              </div>
            </div>
          </div>

          {deliveryNote.warehouse && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Bodega</label>
              <div className="flex items-center gap-2 mt-1">
                <Truck className="h-4 w-4" />
                <p>{deliveryNote.warehouse.name}</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground">Monto Total</label>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(deliveryNote.total_amount)}
            </p>
          </div>

          {deliveryNote.notes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Notas</label>
              <p className="mt-1">{deliveryNote.notes}</p>
            </div>
          )}

          {deliveryNote.observations && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Observaciones</label>
              <p className="mt-1">{deliveryNote.observations}</p>
            </div>
          )}

          {deliveryNote.items && deliveryNote.items.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Items
              </label>
              <div className="space-y-2">
                {deliveryNote.items.map((item, index) => (
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
                        <div className="flex gap-4 mt-1">
                          <p className="text-sm text-muted-foreground">
                            Cantidad: {item.quantity}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Facturada: {item.quantity_invoiced}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Pendiente: {item.quantity_pending}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x {formatCurrency(item.unit_price)}
                          {item.discount_percentage > 0 && (
                            <span> (-{item.discount_percentage}%)</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">
                          {formatCurrency(item.total_price)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deliveryNote.status === 'invoiced' && deliveryNote.converted_to_sale && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <CheckCircle className="h-4 w-4" />
                <p className="font-medium">Remisión Facturada</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Convertida a venta: {deliveryNote.converted_to_sale.sale_number}
              </p>
            </div>
          )}

          {deliveryNote.is_cancelled && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <p className="font-medium">Remisión Anulada</p>
              </div>
              {deliveryNote.cancelled_reason && (
                <p className="text-sm text-muted-foreground mt-1">
                  Razón: {deliveryNote.cancelled_reason}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

