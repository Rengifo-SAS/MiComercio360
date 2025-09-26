'use client';

import { useState } from 'react';
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
import { AlertTriangle, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  is_main: boolean;
}

interface WarehouseDeleteDialogProps {
  warehouse: Warehouse;
  onDelete?: () => void;
  trigger?: React.ReactNode;
}

export function WarehouseDeleteDialog({
  warehouse,
  onDelete,
  trigger,
}: WarehouseDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Verificar si la bodega tiene inventario
      const { data: inventory, error: inventoryError } = await supabase
        .from('warehouse_inventory')
        .select('id, quantity')
        .eq('warehouse_id', warehouse.id);

      if (inventoryError) {
        throw new Error('Error verificando inventario');
      }

      if (inventory && inventory.length > 0) {
        const totalQuantity = inventory.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        if (totalQuantity > 0) {
          setError(
            `No se puede eliminar la bodega porque tiene ${totalQuantity} unidades en inventario. Primero debes transferir o ajustar el inventario.`
          );
          return;
        }
      }

      // Verificar si hay transferencias pendientes
      const { data: transfers, error: transfersError } = await supabase
        .from('warehouse_transfers')
        .select('id, status')
        .or(
          `from_warehouse_id.eq.${warehouse.id},to_warehouse_id.eq.${warehouse.id}`
        )
        .in('status', ['pending', 'approved']);

      if (transfersError) {
        throw new Error('Error verificando transferencias');
      }

      if (transfers && transfers.length > 0) {
        setError(
          'No se puede eliminar la bodega porque tiene transferencias pendientes o aprobadas. Primero debes completar o cancelar las transferencias.'
        );
        return;
      }

      // Eliminar movimientos de inventario
      await supabase
        .from('warehouse_movements')
        .delete()
        .eq('warehouse_id', warehouse.id);

      // Eliminar inventario de la bodega
      await supabase
        .from('warehouse_inventory')
        .delete()
        .eq('warehouse_id', warehouse.id);

      // Eliminar transferencias (solo las completadas o canceladas)
      await supabase
        .from('warehouse_transfers')
        .delete()
        .or(
          `from_warehouse_id.eq.${warehouse.id},to_warehouse_id.eq.${warehouse.id}`
        );

      // Eliminar la bodega
      const { error: deleteError } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', warehouse.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Cerrar el modal y notificar
      setOpen(false);
      onDelete?.();
      router.refresh();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" title="Eliminar bodega">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Eliminar Bodega
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente la
            bodega <strong>{warehouse.name}</strong> y todos sus datos
            asociados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Advertencia:</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Se eliminarán todos los movimientos de inventario</li>
                  <li>Se eliminarán todas las transferencias asociadas</li>
                  <li>Esta acción es irreversible</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Bodega:</strong> {warehouse.name} ({warehouse.code})
            </p>
            {warehouse.is_main && (
              <p className="text-red-600 font-medium mt-1">
                ⚠️ Esta es la bodega principal de la empresa
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? 'Eliminando...' : 'Eliminar Bodega'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
