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
import { Plus, Edit, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Warehouse {
  id?: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_main?: boolean;
}

interface WarehouseFormDialogProps {
  warehouse?: Warehouse;
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function WarehouseFormDialog({
  warehouse,
  onSave,
  trigger,
}: WarehouseFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Warehouse>({
    name: '',
    code: '',
    description: '',
    address: '',
    city: '',
    state: '',
    country: 'Colombia',
    phone: '',
    email: '',
    is_active: true,
    is_main: false,
  });

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (open && warehouse) {
      setFormData({
        ...warehouse,
        description: warehouse.description || '',
        address: warehouse.address || '',
        city: warehouse.city || '',
        state: warehouse.state || '',
        country: warehouse.country || 'Colombia',
        phone: warehouse.phone || '',
        email: warehouse.email || '',
      });
    } else if (open && !warehouse) {
      setFormData({
        name: '',
        code: '',
        description: '',
        address: '',
        city: '',
        state: '',
        country: 'Colombia',
        phone: '',
        email: '',
        is_active: true,
        is_main: false,
      });
    }
  }, [open, warehouse]);

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (warehouse) {
        // Actualizar bodega existente
        const { error: updateError } = await supabase
          .from('warehouses')
          .update({
            name: formData.name,
            code: formData.code,
            description: formData.description || null,
            address: formData.address || null,
            city: formData.city || null,
            state: formData.state || null,
            country: formData.country,
            phone: formData.phone || null,
            email: formData.email || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
            updated_by: (await supabase.auth.getUser()).data.user?.id,
          })
          .eq('id', warehouse.id);

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        // Crear nueva bodega usando función RPC
        const { data, error: rpcError } = await supabase.rpc(
          'create_warehouse',
          {
            p_name: formData.name,
            p_code: formData.code,
            p_description: formData.description || null,
            p_is_main: formData.is_main || false,
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Error creando bodega');
        }

        // Si se creó exitosamente, actualizar con información adicional
        if (data.warehouse_id) {
          const { error: updateError } = await supabase
            .from('warehouses')
            .update({
              address: formData.address || null,
              city: formData.city || null,
              state: formData.state || null,
              country: formData.country,
              phone: formData.phone || null,
              email: formData.email || null,
              is_active: formData.is_active,
              updated_at: new Date().toISOString(),
              updated_by: (await supabase.auth.getUser()).data.user?.id,
            })
            .eq('id', data.warehouse_id);

          if (updateError) {
            console.warn(
              'Error actualizando información adicional:',
              updateError
            );
            // No lanzar error aquí, la bodega ya se creó
          }
        }
      }

      // Cerrar el modal y limpiar
      setOpen(false);
      onSave?.();
      router.refresh();
    } catch (error) {
      console.error('Error saving warehouse:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Warehouse, value: any) => {
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
            Nueva Bodega
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {warehouse ? 'Editar Bodega' : 'Nueva Bodega'}
          </DialogTitle>
          <DialogDescription>
            {warehouse
              ? 'Modifica la información de la bodega'
              : 'Crea una nueva bodega para gestionar inventario'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Información Básica */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Información Básica
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Bodega Central"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    handleInputChange('code', e.target.value.toUpperCase())
                  }
                  placeholder="Ej: BOD01"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) =>
                  handleInputChange('description', e.target.value)
                }
                placeholder="Descripción de la bodega"
                rows={3}
              />
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Ubicación
            </h4>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Dirección completa"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Ciudad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Departamento</Label>
                <Input
                  id="state"
                  value={formData.state || ''}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="Departamento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={formData.country || 'Colombia'}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="País"
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Información de Contacto
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Número de teléfono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="email@ejemplo.com"
                />
              </div>
            </div>
          </div>

          {/* Configuración */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Configuración
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Bodega Activa</Label>
                  <p className="text-sm text-muted-foreground">
                    La bodega puede recibir y enviar productos
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked: boolean) =>
                    handleInputChange('is_active', checked)
                  }
                />
              </div>

              {!warehouse && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_main">Bodega Principal</Label>
                    <p className="text-sm text-muted-foreground">
                      Marcar como bodega principal de la empresa
                    </p>
                  </div>
                  <Switch
                    id="is_main"
                    checked={formData.is_main}
                    onCheckedChange={(checked: boolean) =>
                      handleInputChange('is_main', checked)
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : warehouse ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
