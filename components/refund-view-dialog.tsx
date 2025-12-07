'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefundRequest } from '@/lib/types/refunds';
import { REFUND_STATUSES, REFUND_REQUEST_TYPES, REFUND_REASONS, REFUND_METHODS, PRODUCT_CONDITIONS } from '@/lib/types/refunds';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Package,
  User,
  Calendar,
} from 'lucide-react';

interface RefundViewDialogProps {
  refund: RefundRequest | any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export function RefundViewDialog({
  refund,
  open,
  onOpenChange,
  companyId,
}: RefundViewDialogProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; label: string }> = {
      PENDING: { variant: 'secondary', icon: Clock, label: REFUND_STATUSES.PENDING },
      APPROVED: { variant: 'default', icon: CheckCircle, label: REFUND_STATUSES.APPROVED },
      REJECTED: { variant: 'destructive', icon: XCircle, label: REFUND_STATUSES.REJECTED },
      PROCESSED: { variant: 'default', icon: CheckCircle, label: REFUND_STATUSES.PROCESSED },
    };
    const config = statusConfig[status] || { variant: 'outline' as const, icon: FileText, label: status };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const refundItems = (refund as any).refund_items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalles de Devolución</span>
            {getStatusBadge(refund.status)}
          </DialogTitle>
          <DialogDescription>
            Información completa de la solicitud de devolución
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información General */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Tipo:</span>
              </div>
              <Badge variant="outline">
                {REFUND_REQUEST_TYPES[refund.request_type as keyof typeof REFUND_REQUEST_TYPES] || refund.request_type}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Monto Solicitado:</span>
              </div>
              <div className="text-lg font-semibold">
                {formatCurrency(refund.requested_amount)}
              </div>
            </div>

            {refund.approved_amount !== null && refund.approved_amount !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>Monto Aprobado:</span>
                </div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(refund.approved_amount)}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Método de Reembolso:</span>
              </div>
              <Badge variant="outline">
                {REFUND_METHODS[refund.refund_method as keyof typeof REFUND_METHODS] || refund.refund_method}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Información de la Venta */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Información de la Venta
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Número de Venta</div>
                <div className="font-medium">{(refund as any).sale?.sale_number || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Cliente</div>
                <div className="font-medium">
                  {(refund as any).sale?.customer?.business_name || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total de Venta</div>
                <div className="font-medium">
                  {formatCurrency((refund as any).sale?.total_amount || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Fecha de Venta</div>
                <div className="font-medium">
                  {(refund as any).sale?.created_at
                    ? formatDate((refund as any).sale.created_at)
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Razón y Descripción */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Razón de Devolución
              </h3>
              <Badge variant="outline">
                {REFUND_REASONS[refund.reason as keyof typeof REFUND_REASONS] || refund.reason}
              </Badge>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Descripción</h3>
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                {refund.description || 'Sin descripción'}
              </div>
            </div>
          </div>

          <Separator />

          {/* Items Devueltos */}
          {refundItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                Items Devueltos
              </h3>
              <div className="border rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 text-left">Producto</th>
                        <th className="p-3 text-left">Cantidad</th>
                        <th className="p-3 text-left">Precio Unit.</th>
                        <th className="p-3 text-left">Condición</th>
                        <th className="p-3 text-left">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refundItems.map((item: any, index: number) => (
                        <tr key={index} className="border-t">
                          <td className="p-3">
                            <div>
                              <div className="font-medium">
                                {item.product?.name || 'N/A'}
                              </div>
                              {item.product?.sku && (
                                <div className="text-xs text-muted-foreground">
                                  SKU: {item.product.sku}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">{item.quantity}</td>
                          <td className="p-3">{formatCurrency(item.unit_price)}</td>
                          <td className="p-3">
                            <Badge variant="outline">
                              {PRODUCT_CONDITIONS[item.condition as keyof typeof PRODUCT_CONDITIONS] || item.condition}
                            </Badge>
                          </td>
                          <td className="p-3 font-medium">
                            {formatCurrency(item.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted">
                      <tr>
                        <td colSpan={4} className="p-3 text-right font-semibold">
                          Total:
                        </td>
                        <td className="p-3 font-bold">
                          {formatCurrency(
                            refundItems.reduce(
                              (sum: number, item: any) => sum + item.total_amount,
                              0
                            )
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Fechas */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fechas
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Fecha de Solicitud</div>
                <div className="font-medium">{formatDate(refund.request_date)}</div>
              </div>
              {refund.processed_date && (
                <div>
                  <div className="text-sm text-muted-foreground">Fecha de Procesamiento</div>
                  <div className="font-medium">{formatDate(refund.processed_date)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

