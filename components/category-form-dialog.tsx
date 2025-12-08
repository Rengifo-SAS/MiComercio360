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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Tag, Palette } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Category {
  id?: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
}

interface CategoryFormDialogProps {
  category?: Category | null;
  onSave?: () => void;
  trigger?: React.ReactNode;
}

const predefinedColors = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6B7280', // Gray
  '#14B8A6', // Teal
  '#A855F7', // Violet
];

export function CategoryFormDialog({
  category,
  onSave,
  trigger,
}: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Category>({
    name: '',
    description: '',
    color: '#3B82F6',
    is_active: true,
  });

  const router = useRouter();
  const supabase = createClient();

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (open) {
      if (category) {
        setFormData({
          ...category,
          description: category.description || '',
        });
      } else {
        setFormData({
          name: '',
          description: '',
          color: '#3B82F6',
          is_active: true,
        });
      }
    }
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (category?.id) {
        // Actualizar categoría existente
        const { data, error: rpcError } = await supabase.rpc(
          'update_category',
          {
            p_category_id: category.id,
            p_name: formData.name,
            p_description: formData.description || null,
            p_color: formData.color,
            p_is_active: formData.is_active,
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Error actualizando categoría');
        }
      } else {
        // Crear nueva categoría
        const { data, error: rpcError } = await supabase.rpc(
          'create_category',
          {
            p_name: formData.name,
            p_description: formData.description || null,
            p_color: formData.color,
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Error creando categoría');
        }
      }

      // Cerrar el modal y limpiar
      setOpen(false);
      onSave?.();
      router.refresh();
    } catch (error) {
      console.error('Error saving category:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Category, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg sm:w-[90vw] md:w-[80vw]">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
          <DialogDescription>
            {category
              ? 'Modifica la información de la categoría'
              : 'Crea una nueva categoría para organizar tus productos'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Categoría *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ej: Bebidas, Snacks, Limpieza"
                required
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange('description', e.target.value)
                }
                placeholder="Descripción de la categoría"
                rows={3}
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-gray-300"
                    style={{ backgroundColor: formData.color }}
                  />
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    placeholder="#3B82F6"
                    className="w-24"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Colores predefinidos:
                  </span>
                </div>
              </div>

              {/* Paleta de colores predefinidos */}
              <div className="grid grid-cols-6 gap-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                      formData.color === color
                        ? 'border-gray-900 ring-2 ring-gray-300'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleInputChange('color', color)}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Estado activo */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked: boolean) =>
                  handleInputChange('is_active', checked)
                }
              />
              <Label htmlFor="is_active">Categoría activa</Label>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {category ? (
                <Edit className="h-4 w-4 mr-2" />
              ) : (
                <Tag className="h-4 w-4 mr-2" />
              )}
              {isLoading
                ? 'Guardando...'
                : category
                ? 'Actualizar'
                : 'Crear Categoría'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
