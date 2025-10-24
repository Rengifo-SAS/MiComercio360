'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, FileText } from 'lucide-react';
import { Sale, formatCurrency, formatDateTime } from '@/lib/types/sales';

interface SalesDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  onConfirm: () => void;
}

export function SalesDeleteDialog({
  open,
  onOpenChange,
  sale,
  onConfirm,
}: SalesDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!sale) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error eliminando venta:', error);
    } finally {
      setLoading(false);
    }
  };

  const canDelete = sale.status === 'pending' || sale.status === 'cancelled';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Eliminar Venta
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente la
            venta y se revertirán los cambios en el inventario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la venta */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4" />
              <span className="font-medium">Venta #{sale.sale_number}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Fecha:</span>
                <div className="font-medium">
                  {formatDateTime(sale.created_at)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>
                <div className="font-medium">
                  {formatCurrency(sale.total_amount)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <div className="font-medium">
                  {sale.customer?.business_name || 'Sin cliente'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <div>
                  <Badge
                    variant={
                      sale.status === 'completed'
                        ? 'default'
                        : sale.status === 'cancelled'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {sale.status === 'completed'
                      ? 'Completada'
                      : sale.status === 'cancelled'
                      ? 'Cancelada'
                      : 'Pendiente'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Advertencia */}
          {!canDelete && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No se puede eliminar esta venta porque ya está completada. Solo
                se pueden eliminar ventas pendientes o canceladas.
              </AlertDescription>
            </Alert>
          )}

          {canDelete && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Al eliminar esta venta se revertirán automáticamente los cambios
                en el inventario de los productos incluidos.
              </AlertDescription>
            </Alert>
          )}

          {/* Items que se revertirán */}
          {sale.items && sale.items.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">
                Productos que se revertirán en inventario:
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {sale.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm border rounded p-2"
                  >
                    <div>
                      <span className="font-medium">
                        {item.product?.name || 'Producto no encontrado'}
                      </span>
                      {item.product?.sku && (
                        <span className="text-muted-foreground ml-2">
                          (SKU: {item.product.sku})
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      +{item.quantity} unidades
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!canDelete || loading}
            >
              {loading ? 'Eliminando...' : 'Eliminar Venta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
