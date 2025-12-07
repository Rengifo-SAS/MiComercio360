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
import { Trash2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CategoryDeleteDialogProps {
  category: Category;
  onDelete?: () => void;
  trigger?: React.ReactNode;
}

export function CategoryDeleteDialog({
  category,
  onDelete,
  trigger,
}: CategoryDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('delete_category', {
        p_category_id: category.id,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error eliminando categoría');
      }

      // Cerrar el modal y notificar
      setOpen(false);
      onDelete?.();
      router.refresh();
    } catch (error) {
      console.error('Error deleting category:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" title="Eliminar categoría">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md sm:w-[90vw] md:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Categoría
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente la
            categoría y todos sus datos asociados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la categoría a eliminar */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <div>
                <p className="font-medium">{category.name}</p>
                <p className="text-sm text-muted-foreground">
                  ID: {category.id}
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
                  Si esta categoría tiene productos asociados, no se podrá
                  eliminar. Primero debes mover o eliminar todos los productos
                  de esta categoría.
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
            {isLoading ? 'Eliminando...' : 'Eliminar Categoría'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
