'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefundsService } from '@/lib/services/refunds-service';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface RefundsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
}

export function RefundsManagementDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess,
}: RefundsManagementDialogProps) {
  const [refundRequests, setRefundRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadRefundRequests();
    }
  }, [open, companyId]);

  const loadRefundRequests = async () => {
    setLoading(true);
    try {
      const result = await RefundsService.getRefundRequests(companyId, {
        status: ['PENDING', 'APPROVED', 'PROCESSED', 'REJECTED'],
      });
      setRefundRequests(result.refundRequests);
    } catch (error) {
      console.error('Error cargando solicitudes de reembolso:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await RefundsService.approveRefundRequest(id);
      await loadRefundRequests();
      onSuccess();
    } catch (error) {
      console.error('Error aprobando solicitud:', error);
      alert('Error al aprobar la solicitud');
    } finally {
      setProcessing(null);
    }
  };

  const handleProcess = async (id: string) => {
    setProcessing(id);
    try {
      await RefundsService.processRefundRequest(id);
      await loadRefundRequests();
      onSuccess();
    } catch (error) {
      console.error('Error procesando solicitud:', error);
      alert('Error al procesar la solicitud');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Ingrese la razón del rechazo:');
    if (!reason) return;

    setProcessing(id);
    try {
      await RefundsService.rejectRefundRequest(id, reason);
      await loadRefundRequests();
      onSuccess();
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      alert('Error al rechazar la solicitud');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: 'secondary',
      APPROVED: 'default',
      PROCESSED: 'default',
      REJECTED: 'destructive',
    } as const;

    const icons = {
      PENDING: <Clock className="h-3 w-3" />,
      APPROVED: <CheckCircle className="h-3 w-3" />,
      PROCESSED: <CheckCircle className="h-3 w-3" />,
      REJECTED: <XCircle className="h-3 w-3" />,
    };

    const labels = {
      PENDING: 'Pendiente',
      APPROVED: 'Aprobada',
      PROCESSED: 'Procesada',
      REJECTED: 'Rechazada',
    };

    return (
      <Badge
        variant={variants[status as keyof typeof variants]}
        className="flex items-center gap-1"
      >
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusCounts = () => {
    const counts = {
      pending: 0,
      approved: 0,
      processed: 0,
      rejected: 0,
    };

    refundRequests.forEach((request) => {
      switch (request.status) {
        case 'PENDING':
          counts.pending++;
          break;
        case 'APPROVED':
          counts.approved++;
          break;
        case 'PROCESSED':
          counts.processed++;
          break;
        case 'REJECTED':
          counts.rejected++;
          break;
      }
    });

    return counts;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestión de Reembolsos y Anulaciones</DialogTitle>
          <DialogDescription>
            Administra las solicitudes de reembolso y anulación
          </DialogDescription>
        </DialogHeader>

        {/* Estadísticas */}
        {refundRequests.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <div>
                  <div className="text-lg font-semibold">
                    {getStatusCounts().pending}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Pendientes
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-lg font-semibold">
                    {getStatusCounts().approved}
                  </div>
                  <div className="text-xs text-muted-foreground">Aprobadas</div>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-lg font-semibold">
                    {getStatusCounts().processed}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Procesadas
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <div>
                  <div className="text-lg font-semibold">
                    {getStatusCounts().rejected}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Rechazadas
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Cargando solicitudes...</span>
            </div>
          ) : refundRequests.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No hay solicitudes de reembolso
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {refundRequests.map((request) => (
                <Card key={request.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span>Venta #{request.sale?.sale_number}</span>
                          {getStatusBadge(request.status)}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {request.sale?.customer?.business_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(request.request_date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-lg font-semibold">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(request.requested_amount)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {request.request_type === 'CANCELLATION'
                            ? 'Anulación'
                            : 'Reembolso'}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">
                          Información de la Solicitud
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="font-medium">Tipo:</span>{' '}
                            {request.request_type === 'CANCELLATION'
                              ? 'Anulación'
                              : 'Reembolso'}
                          </div>
                          <div>
                            <span className="font-medium">Razón:</span>{' '}
                            {request.reason}
                          </div>
                          <div>
                            <span className="font-medium">Método:</span>{' '}
                            {request.refund_method}
                          </div>
                          {request.description && (
                            <div>
                              <span className="font-medium">Descripción:</span>{' '}
                              {request.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2">Productos</h4>
                        <div className="space-y-1">
                          {request.refund_items?.map(
                            (item: any, index: number) => (
                              <div
                                key={index}
                                className="text-sm flex justify-between"
                              >
                                <span>
                                  {item.product?.name} (x{item.quantity})
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(item.total_amount)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {request.status === 'PENDING' && 'Requiere aprobación'}
                        {request.status === 'APPROVED' && 'Lista para procesar'}
                        {request.status === 'PROCESSED' &&
                          'Procesada exitosamente'}
                        {request.status === 'REJECTED' && 'Rechazada'}
                      </div>

                      <div className="flex items-center gap-2">
                        {request.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(request.id)}
                              disabled={processing === request.id}
                            >
                              {processing === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                              disabled={processing === request.id}
                            >
                              {processing === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              Aprobar
                            </Button>
                          </>
                        )}

                        {request.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            onClick={() => handleProcess(request.id)}
                            disabled={processing === request.id}
                          >
                            {processing === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Procesar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
