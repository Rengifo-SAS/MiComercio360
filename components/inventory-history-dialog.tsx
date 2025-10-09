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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Filter,
  Check,
  X,
  Play,
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

interface InventoryMovement {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  movement_type: 'adjustment' | 'in' | 'out' | 'transfer';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string;
  created_at: string;
  created_by?: {
    full_name?: string;
    email?: string;
  };
  warehouse_name?: string;
  reference_type?: string;
  reference_id?: string;
}

interface InventoryHistoryDialogProps {
  trigger?: React.ReactNode;
  onTransferComplete?: () => void;
}

export function InventoryHistoryDialog({
  trigger,
  onTransferComplete,
}: InventoryHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const supabase = createClient();

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, activeTab]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Cargar transferencias
      const { data: transfersData, error: transfersError } = await supabase.rpc(
        'get_warehouse_transfers',
        {
          p_limit: 50,
          p_offset: 0,
          p_warehouse_id: null,
          p_product_id: null,
          p_date_from: null,
          p_date_to: null,
        }
      );

      if (transfersError) {
        console.error('Error loading transfers:', transfersError);
      } else if (transfersData?.success) {
        setTransfers(transfersData.transfers || []);
      }

      // Cargar movimientos de inventario
      const { data: movementsData, error: movementsError } = await supabase
        .from('inventory_movements')
        .select(
          `
          id,
          product_id,
          movement_type,
          quantity,
          previous_quantity,
          new_quantity,
          reason,
          created_at,
          created_by,
          reference_type,
          reference_id,
          products!inner(
            name,
            sku
          )
        `
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (movementsError) {
        console.error('Error loading movements:', movementsError);
      } else {
        const formattedMovements: InventoryMovement[] =
          movementsData?.map((movement: any) => ({
            id: movement.id,
            product_id: movement.product_id,
            product_name: movement.products?.name || 'Producto desconocido',
            product_sku: movement.products?.sku || 'N/A',
            movement_type: movement.movement_type,
            quantity: movement.quantity,
            previous_quantity: movement.previous_quantity,
            new_quantity: movement.new_quantity,
            reason: movement.reason,
            created_at: movement.created_at,
            created_by: movement.created_by,
            reference_type: movement.reference_type,
            reference_id: movement.reference_id,
          })) || [];

        setMovements(formattedMovements);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setError(
        error instanceof Error ? error.message : 'Error cargando historial'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTransfer = async (transferId: string) => {
    try {
      const { data, error } = await supabase.rpc('approve_warehouse_transfer', {
        p_transfer_id: transferId,
      });

      if (error) throw error;

      if (data?.success) {
        // Recargar el historial para mostrar los cambios
        await loadHistory();
        // Notificar al componente padre que debe refrescar el inventario
        onTransferComplete?.();
      } else {
        throw new Error(data?.error || 'Error aprobando transferencia');
      }
    } catch (error) {
      console.error('Error approving transfer:', error);
      setError(
        error instanceof Error ? error.message : 'Error aprobando transferencia'
      );
    }
  };

  const handleCompleteTransfer = async (transferId: string) => {
    try {
      const { data, error } = await supabase.rpc(
        'complete_warehouse_transfer',
        {
          p_transfer_id: transferId,
        }
      );

      if (error) throw error;

      if (data?.success) {
        // Recargar el historial para mostrar los cambios
        await loadHistory();
        // Notificar al componente padre que debe refrescar el inventario
        onTransferComplete?.();
      } else {
        throw new Error(data?.error || 'Error completando transferencia');
      }
    } catch (error) {
      console.error('Error completing transfer:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Error completando transferencia'
      );
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    try {
      const { data, error } = await supabase.rpc('cancel_warehouse_transfer', {
        p_transfer_id: transferId,
        p_reason: 'Cancelada por el usuario',
      });

      if (error) throw error;

      if (data?.success) {
        // Recargar el historial para mostrar los cambios
        await loadHistory();
      } else {
        throw new Error(data?.error || 'Error cancelando transferencia');
      }
    } catch (error) {
      console.error('Error canceling transfer:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Error cancelando transferencia'
      );
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'adjustment':
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      case 'in':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'out':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'transfer':
        return <ArrowUpDown className="h-4 w-4 text-purple-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementBadge = (type: string) => {
    const variants = {
      adjustment: 'secondary',
      in: 'default',
      out: 'destructive',
      transfer: 'outline',
    } as const;

    const labels = {
      adjustment: 'Ajuste',
      in: 'Entrada',
      out: 'Salida',
      transfer: 'Transferencia',
    };

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'secondary'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
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

  const filteredMovements = movements.filter((movement) => {
    if (activeTab === 'all') return true;
    return movement.movement_type === activeTab;
  });

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
            Historial de Inventario
          </DialogTitle>
          <DialogDescription>
            Transferencias, ajustes y movimientos de inventario
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Todo</TabsTrigger>
            <TabsTrigger value="transfer">Transferencias</TabsTrigger>
            <TabsTrigger value="adjustment">Ajustes</TabsTrigger>
            <TabsTrigger value="in">Entradas</TabsTrigger>
            <TabsTrigger value="out">Salidas</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
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
            ) : (
              <div className="space-y-4">
                {/* Transferencias */}
                {transfers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <ArrowUpDown className="h-5 w-5" />
                      Transferencias
                    </h3>
                    <div className="space-y-3">
                      {transfers.map((transfer) => (
                        <div
                          key={`transfer-${transfer.id}`}
                          className="border rounded-lg p-4 space-y-3"
                        >
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
                                {new Date(
                                  transfer.created_at
                                ).toLocaleDateString('es-CO')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {transfer.product.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({transfer.product.sku})
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {transfer.quantity} unidades
                            </Badge>
                          </div>

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

                          {transfer.reason && (
                            <div className="text-sm text-muted-foreground">
                              <strong>Motivo:</strong> {transfer.reason}
                            </div>
                          )}

                          {/* Botones de acción según el estado */}
                          <div className="flex items-center gap-2 mt-3">
                            {transfer.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() =>
                                    handleApproveTransfer(transfer.id)
                                  }
                                  className="text-xs"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    handleCancelTransfer(transfer.id)
                                  }
                                  className="text-xs"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Cancelar
                                </Button>
                              </>
                            )}
                            {transfer.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() =>
                                  handleCompleteTransfer(transfer.id)
                                }
                                className="text-xs"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Completar
                              </Button>
                            )}
                            {transfer.status === 'completed' && (
                              <div className="text-xs text-green-600 font-medium">
                                ✅ Transferencia completada
                              </div>
                            )}
                            {transfer.status === 'cancelled' && (
                              <div className="text-xs text-red-600 font-medium">
                                ❌ Transferencia cancelada
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Movimientos */}
                {movements.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Movimientos de Inventario
                    </h3>
                    <div className="space-y-3">
                      {movements.map((movement) => (
                        <div
                          key={`movement-${movement.id}`}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getMovementIcon(movement.movement_type)}
                              <span className="font-medium">
                                {movement.product_name}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                ({movement.product_sku})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getMovementBadge(movement.movement_type)}
                              <span className="text-sm text-muted-foreground">
                                {new Date(
                                  movement.created_at
                                ).toLocaleDateString('es-CO')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                Anterior:
                              </span>
                              <Badge variant="outline">
                                {movement.previous_quantity}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                Cantidad:
                              </span>
                              <Badge
                                variant={
                                  movement.quantity > 0
                                    ? 'default'
                                    : 'destructive'
                                }
                              >
                                {movement.quantity > 0 ? '+' : ''}
                                {movement.quantity}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                Nuevo:
                              </span>
                              <Badge variant="outline">
                                {movement.new_quantity}
                              </Badge>
                            </div>
                          </div>

                          {movement.reason && (
                            <div className="text-sm text-muted-foreground">
                              <strong>Motivo:</strong> {movement.reason}
                            </div>
                          )}

                          <div className="text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            {new Date(movement.created_at).toLocaleString(
                              'es-CO'
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {transfers.length === 0 && movements.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay historial registrado</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            {transfers.length === 0 ? (
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

                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {transfer.product.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({transfer.product.sku})
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {transfer.quantity} unidades
                      </Badge>
                    </div>

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

                    {transfer.reason && (
                      <div className="text-sm text-muted-foreground">
                        <strong>Motivo:</strong> {transfer.reason}
                      </div>
                    )}

                    {/* Botones de acción según el estado */}
                    <div className="flex items-center gap-2 mt-3">
                      {transfer.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApproveTransfer(transfer.id)}
                            className="text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelTransfer(transfer.id)}
                            className="text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                        </>
                      )}
                      {transfer.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleCompleteTransfer(transfer.id)}
                          className="text-xs"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Completar
                        </Button>
                      )}
                      {transfer.status === 'completed' && (
                        <div className="text-xs text-green-600 font-medium">
                          ✅ Transferencia completada
                        </div>
                      )}
                      {transfer.status === 'cancelled' && (
                        <div className="text-xs text-red-600 font-medium">
                          ❌ Transferencia cancelada
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="adjustment" className="space-y-4">
            {movements.filter((m) => m.movement_type === 'adjustment')
              .length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay ajustes registrados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {movements
                  .filter((m) => m.movement_type === 'adjustment')
                  .map((movement) => (
                    <div
                      key={movement.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.movement_type)}
                          <span className="font-medium">
                            {movement.product_name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({movement.product_sku})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getMovementBadge(movement.movement_type)}
                          <span className="text-sm text-muted-foreground">
                            {new Date(movement.created_at).toLocaleDateString(
                              'es-CO'
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Anterior:
                          </span>
                          <Badge variant="outline">
                            {movement.previous_quantity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Cantidad:
                          </span>
                          <Badge
                            variant={
                              movement.quantity > 0 ? 'default' : 'destructive'
                            }
                          >
                            {movement.quantity > 0 ? '+' : ''}
                            {movement.quantity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Nuevo:</span>
                          <Badge variant="outline">
                            {movement.new_quantity}
                          </Badge>
                        </div>
                      </div>

                      {movement.reason && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Motivo:</strong> {movement.reason}
                        </div>
                      )}

                      <div className="text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {new Date(movement.created_at).toLocaleString('es-CO')}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="in" className="space-y-4">
            {movements.filter((m) => m.movement_type === 'in').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay entradas registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {movements
                  .filter((m) => m.movement_type === 'in')
                  .map((movement) => (
                    <div
                      key={movement.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.movement_type)}
                          <span className="font-medium">
                            {movement.product_name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({movement.product_sku})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getMovementBadge(movement.movement_type)}
                          <span className="text-sm text-muted-foreground">
                            {new Date(movement.created_at).toLocaleDateString(
                              'es-CO'
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Cantidad:
                          </span>
                          <Badge variant="default">+{movement.quantity}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Total:</span>
                          <Badge variant="outline">
                            {movement.new_quantity}
                          </Badge>
                        </div>
                      </div>

                      {movement.reason && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Motivo:</strong> {movement.reason}
                        </div>
                      )}

                      <div className="text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {new Date(movement.created_at).toLocaleString('es-CO')}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="out" className="space-y-4">
            {movements.filter((m) => m.movement_type === 'out').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay salidas registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {movements
                  .filter((m) => m.movement_type === 'out')
                  .map((movement) => (
                    <div
                      key={movement.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.movement_type)}
                          <span className="font-medium">
                            {movement.product_name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({movement.product_sku})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getMovementBadge(movement.movement_type)}
                          <span className="text-sm text-muted-foreground">
                            {new Date(movement.created_at).toLocaleDateString(
                              'es-CO'
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Cantidad:
                          </span>
                          <Badge variant="destructive">
                            {movement.quantity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Total:</span>
                          <Badge variant="outline">
                            {movement.new_quantity}
                          </Badge>
                        </div>
                      </div>

                      {movement.reason && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Motivo:</strong> {movement.reason}
                        </div>
                      )}

                      <div className="text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {new Date(movement.created_at).toLocaleString('es-CO')}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
