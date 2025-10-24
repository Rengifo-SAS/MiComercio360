'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  ArrowUpDown,
  Package,
  Building2,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Transfer {
  id: string;
  transfer_number: string;
  from_warehouse: {
    name: string;
    code: string;
  };
  to_warehouse: {
    name: string;
    code: string;
  };
  product: {
    name: string;
    sku: string;
  };
  quantity: number;
  reason?: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  completed_at?: string;
  created_by?: {
    full_name?: string;
    email?: string;
  };
  completed_by?: {
    full_name?: string;
    email?: string;
  };
}

interface WarehouseHistoryDialogProps {
  trigger?: React.ReactNode;
}

export function WarehouseHistoryDialog({
  trigger,
}: WarehouseHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (open) {
      loadTransfers();
    }
  }, [open]);

  const loadTransfers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_warehouse_transfers', {
        p_limit: 50,
        p_offset: 0,
        p_warehouse_id: null,
        p_product_id: null,
        p_date_from: null,
        p_date_to: null,
      });

      if (error) throw error;

      if (data?.success) {
        setTransfers(data.transfers || []);
      } else {
        throw new Error(data?.error || 'Error cargando transferencias');
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
      setError(
        error instanceof Error ? error.message : 'Error cargando historial'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      completed: 'default',
      cancelled: 'destructive',
    } as const;

    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            Historial
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[85vw] lg:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Transferencias
          </DialogTitle>
          <DialogDescription>
            Últimas transferencias entre bodegas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">
                Cargando historial...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{error}</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowUpDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay transferencias registradas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(transfer.status)}
                      <span className="font-medium">
                        {transfer.transfer_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(transfer.status)}
                      <span className="text-sm text-muted-foreground">
                        {new Date(transfer.created_at).toLocaleDateString(
                          'es-CO'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Producto */}
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{transfer.product.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({transfer.product.sku})
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {transfer.quantity} unidades
                    </Badge>
                  </div>

                  {/* Transferencia */}
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {transfer.from_warehouse.name}
                    </span>
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {transfer.to_warehouse.name}
                    </span>
                  </div>

                  {/* Motivo */}
                  {transfer.reason && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Motivo:</strong> {transfer.reason}
                    </div>
                  )}

                  {/* Notas */}
                  {transfer.notes && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Notas:</strong> {transfer.notes}
                    </div>
                  )}

                  {/* Usuarios */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>
                        Creado por:{' '}
                        {transfer.created_by?.full_name ||
                          transfer.created_by?.email ||
                          'Desconocido'}
                      </span>
                    </div>
                    {transfer.completed_by && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>
                          Completado por:{' '}
                          {transfer.completed_by.full_name ||
                            transfer.completed_by.email}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Fechas */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Creado:{' '}
                        {new Date(transfer.created_at).toLocaleString('es-CO')}
                      </span>
                    </div>
                    {transfer.completed_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Completado:{' '}
                          {new Date(transfer.completed_at).toLocaleString(
                            'es-CO'
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
