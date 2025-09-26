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
import { Trash2, AlertTriangle, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Supplier {
  id: string;
  name: string;
}

interface SupplierDeleteDialogProps {
  supplier: Supplier;
  onDelete?: () => void;
  trigger?: React.ReactNode;
}

export function SupplierDeleteDialog({
  supplier,
  onDelete,
  trigger,
}: SupplierDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Verificar si hay productos asociados a este proveedor
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .eq('supplier_id', supplier.id);

      if (productsError) {
        throw new Error('Error verificando productos asociados');
      }

      if (products && products.length > 0) {
        throw new Error(
          `No se puede eliminar el proveedor porque tiene ${products.length} productos asociados. Primero debes cambiar o eliminar estos productos.`
        );
      }

      // Eliminar el proveedor
      const { error: deleteError } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplier.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Cerrar el modal y notificar
      setOpen(false);
      onDelete?.();
      router.refresh();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" title="Eliminar proveedor">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Proveedor
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el
            proveedor y todos sus datos asociados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del proveedor a eliminar */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-medium">{supplier.name}</p>
                <p className="text-sm text-muted-foreground">
                  ID: {supplier.id}
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
                  Si este proveedor tiene productos asociados, no se podrá
                  eliminar. Primero debes cambiar o eliminar todos los productos
                  de este proveedor.
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
            {isLoading ? 'Eliminando...' : 'Eliminar Proveedor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
