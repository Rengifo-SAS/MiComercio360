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
import { Trash2, AlertTriangle, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface ProductDeleteDialogProps {
  product: Product;
  onDelete?: () => void;
  trigger?: React.ReactNode;
}

export function ProductDeleteDialog({
  product,
  onDelete,
  trigger,
}: ProductDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Verificar si hay inventario asociado
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', product.id)
        .single();

      if (inventoryError && inventoryError.code !== 'PGRST116') {
        throw new Error('Error verificando inventario');
      }

      if (inventory && inventory.quantity > 0) {
        setError(
          `No se puede eliminar el producto porque tiene ${inventory.quantity} unidades en inventario. Primero debes ajustar el inventario a 0.`
        );
        return;
      }

      // Verificar si hay ventas asociadas
      const { data: sales, error: salesError } = await supabase
        .from('sale_items')
        .select('id')
        .eq('product_id', product.id)
        .limit(1);

      if (salesError) {
        throw new Error('Error verificando ventas asociadas');
      }

      if (sales && sales.length > 0) {
        setError(
          'No se puede eliminar el producto porque tiene ventas asociadas. Los productos con historial de ventas no pueden ser eliminados.'
        );
        return;
      }

      // Eliminar movimientos de inventario primero
      await supabase
        .from('inventory_movements')
        .delete()
        .eq('product_id', product.id);

      // Eliminar registro de inventario
      await supabase.from('inventory').delete().eq('product_id', product.id);

      // Eliminar el producto
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Cerrar el modal y notificar
      setOpen(false);
      onDelete?.();
      router.refresh();
    } catch (error) {
      console.error('Error deleting product:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" title="Eliminar producto">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md sm:w-[90vw] md:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Producto
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el
            producto y todos sus datos asociados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del producto a eliminar */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  SKU: {product.sku}
                </p>
                <p className="text-sm text-muted-foreground">
                  ID: {product.id}
                </p>
              </div>
            </div>
          </div>

          {/* Advertencia */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Advertencia:</p>
                <p className="text-red-700 mt-1">
                  Si este producto tiene inventario o ventas asociadas, no se
                  podrá eliminar. Primero debes ajustar el inventario a 0 y
                  asegurarte de que no tenga historial de ventas.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
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
            {isLoading ? 'Eliminando...' : 'Eliminar Producto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
