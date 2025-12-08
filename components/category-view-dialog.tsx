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
import { Eye, Tag, Package, Calendar, Palette } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryViewDialogProps {
  category: Category;
  trigger?: React.ReactNode;
}

export function CategoryViewDialog({
  category,
  trigger,
}: CategoryViewDialogProps) {
  const [open, setOpen] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Cargar información adicional cuando se abre el modal
  useEffect(() => {
    if (open) {
      const loadProductCount = async () => {
        setIsLoading(true);
        try {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id);

          setProductCount(count || 0);
        } catch (error) {
          console.error('Error loading product count:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadProductCount();
    }
  }, [open, category.id, supabase]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" title="Ver detalles">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg sm:w-[90vw] md:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {category.name}
          </DialogTitle>
          <DialogDescription>Detalles de la categoría</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado:</span>
              <Badge variant={category.is_active ? 'default' : 'secondary'}>
                {category.is_active ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>

            {category.description && (
              <div>
                <span className="text-sm font-medium">Descripción:</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {category.description}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Color:</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm font-mono">{category.color}</span>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Estadísticas</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {isLoading ? '...' : productCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Productos</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {new Date(category.created_at).toLocaleDateString('es-CO')}
                  </p>
                  <p className="text-xs text-muted-foreground">Creada</p>
                </div>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Información Adicional</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono text-xs">{category.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creada:</span>
                <span>
                  {new Date(category.created_at).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actualizada:</span>
                <span>
                  {new Date(category.updated_at).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>
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
