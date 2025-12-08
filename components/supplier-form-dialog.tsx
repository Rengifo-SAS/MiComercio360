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

interface Supplier {
  id?: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  tax_id?: string;
  is_active: boolean;
}

interface SupplierFormDialogProps {
  supplier?: Supplier | null;
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function SupplierFormDialog({
  supplier,
  onSave,
  trigger,
}: SupplierFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Supplier>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Colombia',
    tax_id: '',
    is_active: true,
  });

  const router = useRouter();
  const supabase = createClient();

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (open) {
      if (supplier) {
        setFormData({
          ...supplier,
          contact_person: supplier.contact_person || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: supplier.address || '',
          city: supplier.city || '',
          state: supplier.state || '',
          postal_code: supplier.postal_code || '',
          tax_id: supplier.tax_id || '',
        });
      } else {
        setFormData({
          name: '',
          contact_person: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'Colombia',
          tax_id: '',
          is_active: true,
        });
      }
    }
  }, [open, supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (supplier?.id) {
        // Actualizar proveedor existente
        const { data, error: rpcError } = await supabase.rpc(
          'update_supplier',
          {
            p_supplier_id: supplier.id,
            p_name: formData.name,
            p_contact_person: formData.contact_person || null,
            p_email: formData.email || null,
            p_phone: formData.phone || null,
            p_address: formData.address || null,
            p_city: formData.city || null,
            p_state: formData.state || null,
            p_postal_code: formData.postal_code || null,
            p_country: formData.country,
            p_tax_id: formData.tax_id || null,
            p_is_active: formData.is_active,
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Error actualizando proveedor');
        }
      } else {
        // Crear nuevo proveedor
        const { data, error: rpcError } = await supabase.rpc(
          'create_supplier',
          {
            p_name: formData.name,
            p_contact_person: formData.contact_person || null,
            p_email: formData.email || null,
            p_phone: formData.phone || null,
            p_address: formData.address || null,
            p_city: formData.city || null,
            p_state: formData.state || null,
            p_postal_code: formData.postal_code || null,
            p_country: formData.country,
            p_tax_id: formData.tax_id || null,
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Error creando proveedor');
        }
      }

      // Cerrar el modal y limpiar
      setOpen(false);
      onSave?.();
      router.refresh();
    } catch (error) {
      console.error('Error saving supplier:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Supplier, value: any) => {
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
            Nuevo Proveedor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <DialogTitle>
            {supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </DialogTitle>
          <DialogDescription>
            {supplier
              ? 'Modifica la información del proveedor'
              : 'Añade un nuevo proveedor a tu lista'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Información básica */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Proveedor *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Distribuidora ABC S.A.S"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Persona de Contacto</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) =>
                    handleInputChange('contact_person', e.target.value)
                  }
                  placeholder="Ej: Juan Pérez"
                />
              </div>
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="proveedor@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+57 300 123 4567"
                />
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Calle 123 #45-67"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Bogotá"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Departamento</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="Cundinamarca"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Código Postal</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) =>
                    handleInputChange('postal_code', e.target.value)
                  }
                  placeholder="110111"
                />
              </div>
            </div>

            {/* País y NIT */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="Colombia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">NIT / RUT</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => handleInputChange('tax_id', e.target.value)}
                  placeholder="900123456-7"
                />
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
              <Label htmlFor="is_active">Proveedor activo</Label>
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
              {supplier ? (
                <Edit className="h-4 w-4 mr-2" />
              ) : (
                <Building2 className="h-4 w-4 mr-2" />
              )}
              {isLoading
                ? 'Guardando...'
                : supplier
                ? 'Actualizar'
                : 'Crear Proveedor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
