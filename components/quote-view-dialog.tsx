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
import { Quote } from '@/lib/types/quotes';
import { formatCurrency, formatDate } from '@/lib/utils';
import { User, Calendar, FileText, CheckCircle, X, Clock } from 'lucide-react';

interface QuoteViewDialogProps {
  quote: Quote;
  trigger?: React.ReactNode;
}

export function QuoteViewDialog({ quote, trigger }: QuoteViewDialogProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Borrador</Badge>;
      case 'sent':
        return <Badge variant="default">Enviada</Badge>;
      case 'accepted':
        return <Badge className="bg-green-600">Aceptada</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rechazada</Badge>;
      case 'expired':
        return <Badge variant="outline">Vencida</Badge>;
      case 'converted':
        return <Badge className="bg-blue-600">Convertida</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Dialog>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de Cotización</DialogTitle>
          <DialogDescription>
            Información completa de la cotización
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Número</label>
              <p className="font-medium mt-1">{quote.quote_number || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <div className="mt-1">{getStatusBadge(quote.status)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cliente</label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                <p className="font-medium">
                  {quote.customer?.business_name || 'N/A'}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <p>{formatDate(quote.quote_date)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Vencimiento</label>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4" />
                <p>
                  {quote.expiration_date
                    ? formatDate(quote.expiration_date)
                    : 'No definido'}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Plazo de Pago</label>
              <p className="mt-1">{quote.payment_terms} días</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Monto Total</label>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(quote.total_amount)}
            </p>
          </div>

          {quote.notes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Notas</label>
              <p className="mt-1">{quote.notes}</p>
            </div>
          )}

          {quote.items && quote.items.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Items
              </label>
              <div className="space-y-2">
                {quote.items.map((item, index) => (
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

          {quote.status === 'converted' && quote.converted_to_sale && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <CheckCircle className="h-4 w-4" />
                <p className="font-medium">Cotización Convertida</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Convertida a venta: {quote.converted_to_sale.sale_number}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}













