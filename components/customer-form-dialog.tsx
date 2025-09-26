'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, X } from 'lucide-react';
import { CIIU_CODES, TAX_REGIMES, DEPARTMENTS } from '@/lib/data/colombia-data';
import { getMunicipalitiesByDepartment } from '@/lib/data/municipalities-data';

interface Customer {
  id: string;
  identification_type: string;
  identification_number: string;
  business_name: string;
  person_type: 'NATURAL' | 'JURIDICA';
  tax_responsibility: string;
  department: string;
  municipality: string;
  address: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  credit_limit: number;
  payment_terms: number;
  discount_percentage: number;
  is_active: boolean;
  is_vip: boolean;
  created_at: string;
  updated_at: string;
}

interface Department {
  code: string;
  name: string;
}

interface CustomerFormDialogProps {
  customer?: Customer | null;
  departments: Department[];
  onSave: () => void;
  onClose: () => void;
}

const IDENTIFICATION_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PP', label: 'Pasaporte' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'RC', label: 'Registro Civil' },
  { value: 'PA', label: 'Permiso por Nacimiento' },
];

const TAX_RESPONSIBILITIES = [
  { value: 'RESPONSABLE_DE_IVA', label: 'Responsable de IVA' },
  { value: 'NO_RESPONSABLE_DE_IVA', label: 'No Responsable de IVA' },
  {
    value: 'RESPONSABLE_DE_IVA_REINCORPORADO',
    label: 'Responsable de IVA Reincorporado',
  },
  {
    value: 'NO_RESPONSABLE_DE_IVA_POR_ARTICULO_23',
    label: 'No Responsable de IVA por Artículo 23',
  },
  { value: 'REGIMEN_SIMPLIFICADO', label: 'Régimen Simplificado' },
  { value: 'REGIMEN_COMUN', label: 'Régimen Común' },
  { value: 'REGIMEN_ESPECIAL', label: 'Régimen Especial' },
  { value: 'AUTORRETENEDOR', label: 'Autoretenedor' },
  { value: 'AGENTE_RETENCION_IVA', label: 'Agente Retención IVA' },
  { value: 'AGENTE_RETENCION_ICA', label: 'Agente Retención ICA' },
  { value: 'AGENTE_RETENCION_FUENTE', label: 'Agente Retención Fuente' },
  { value: 'GRAN_CONTRIBUYENTE', label: 'Gran Contribuyente' },
  { value: 'AUTORRETENEDOR_ICA', label: 'Autoretenedor ICA' },
  { value: 'AUTORRETENEDOR_IVA', label: 'Autoretenedor IVA' },
  { value: 'AUTORRETENEDOR_FUENTE', label: 'Autoretenedor Fuente' },
  { value: 'NO_OBLIGADO_A_FACTURAR', label: 'No Obligado a Facturar' },
];

const ACCOUNT_TYPES = [
  { value: 'AHORROS', label: 'Ahorros' },
  { value: 'CORRIENTE', label: 'Corriente' },
  { value: 'FIDUCIARIA', label: 'Fiduciaria' },
];

export function CustomerFormDialog({
  customer,
  onSave,
  onClose,
}: Omit<CustomerFormDialogProps, 'departments'>) {
  const [formData, setFormData] = useState({
    identification_type: 'CC',
    identification_number: '',
    business_name: '',
    person_type: 'NATURAL' as 'NATURAL' | 'JURIDICA',
    tax_responsibility: 'RESPONSABLE_DE_IVA',
    department: '',
    municipality: '',
    address: '',
    postal_code: '',
    email: '',
    phone: '',
    mobile_phone: '',
    website: '',
    tax_id: '',
    tax_regime: '',
    economic_activity_code: '',
    economic_activity_description: '',
    bank_name: '',
    account_type: 'AHORROS',
    account_number: '',
    credit_limit: 0,
    payment_terms: 0,
    discount_percentage: 0,
    is_active: true,
    is_vip: false,
    notes: '',
  });

  const [municipalities, setMunicipalities] = useState<
    { code: string; name: string; department_code: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (customer) {
      setFormData({
        identification_type: customer.identification_type,
        identification_number: customer.identification_number,
        business_name: customer.business_name,
        person_type: customer.person_type,
        tax_responsibility: customer.tax_responsibility,
        department: customer.department,
        municipality: customer.municipality,
        address: customer.address,
        postal_code: '',
        email: customer.email || '',
        phone: customer.phone || '',
        mobile_phone: customer.mobile_phone || '',
        website: '',
        tax_id: '',
        tax_regime: '',
        economic_activity_code: '',
        economic_activity_description: '',
        bank_name: '',
        account_type: 'AHORROS',
        account_number: '',
        credit_limit: customer.credit_limit,
        payment_terms: customer.payment_terms,
        discount_percentage: customer.discount_percentage,
        is_active: customer.is_active,
        is_vip: customer.is_vip,
        notes: '',
      });
    }
  }, [customer]);

  const loadMunicipalities = useCallback(async (departmentName: string) => {
    if (!departmentName) {
      setMunicipalities([]);
      return;
    }

    try {
      console.log('Cargando municipios para departamento:', departmentName);

      // Usar los datos locales en lugar de la función RPC
      const municipalitiesData = getMunicipalitiesByDepartment(departmentName);

      console.log('Municipios encontrados:', municipalitiesData.length);
      setMunicipalities(municipalitiesData);
    } catch (err) {
      console.error('Error cargando municipios:', err);
      setMunicipalities([]);
    }
  }, []);

  useEffect(() => {
    if (formData.department) {
      loadMunicipalities(formData.department);
    } else {
      setMunicipalities([]);
    }
  }, [formData.department, loadMunicipalities]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Compañía no encontrada');

      const customerData = {
        company_id: profile.company_id,
        identification_type: formData.identification_type,
        identification_number: formData.identification_number,
        business_name: formData.business_name,
        person_type: formData.person_type,
        tax_responsibility: formData.tax_responsibility,
        department: formData.department,
        municipality: formData.municipality,
        address: formData.address,
        postal_code: formData.postal_code || null,
        email: formData.email || null,
        phone: formData.phone || null,
        mobile_phone: formData.mobile_phone || null,
        website: formData.website || null,
        tax_id: formData.tax_id || null,
        tax_regime: formData.tax_regime || null,
        economic_activity_code: formData.economic_activity_code || null,
        economic_activity_description:
          formData.economic_activity_description || null,
        bank_name: formData.bank_name || null,
        account_type: formData.account_type || null,
        account_number: formData.account_number || null,
        credit_limit: formData.credit_limit,
        payment_terms: formData.payment_terms,
        discount_percentage: formData.discount_percentage,
        is_active: formData.is_active,
        is_vip: formData.is_vip,
        notes: formData.notes || null,
        created_by: user.id,
        updated_by: user.id,
      };

      if (customer) {
        // Actualizar cliente existente
        const { error: updateError } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customer.id);

        if (updateError) throw updateError;
      } else {
        // Crear nuevo cliente
        const { error: insertError } = await supabase
          .from('customers')
          .insert([customerData]);

        if (insertError) throw insertError;
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando cliente');
      console.error('Error guardando cliente:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[85vw] lg:w-[80vw]">
        <DialogHeader>
          <DialogTitle>
            {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {customer
              ? 'Modifica la información del cliente'
              : 'Agrega un nuevo cliente al sistema'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Información Básica</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="identification_type">
                  Tipo de Identificación *
                </Label>
                <Select
                  value={formData.identification_type}
                  onValueChange={(value) =>
                    handleInputChange('identification_type', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IDENTIFICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="identification_number">
                  Número de Identificación *
                </Label>
                <Input
                  id="identification_number"
                  value={formData.identification_number}
                  onChange={(e) =>
                    handleInputChange('identification_number', e.target.value)
                  }
                  placeholder="Ej: 12345678"
                  required
                />
              </div>

              <div>
                <Label htmlFor="person_type">Tipo de Persona *</Label>
                <Select
                  value={formData.person_type}
                  onValueChange={(value) =>
                    handleInputChange('person_type', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NATURAL">Persona Natural</SelectItem>
                    <SelectItem value="JURIDICA">Persona Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="business_name">
                Razón Social / Nombre Completo *
              </Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) =>
                  handleInputChange('business_name', e.target.value)
                }
                placeholder="Ej: Juan Pérez o Empresa ABC S.A.S."
                required
              />
            </div>
          </div>

          {/* Información Tributaria */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Información Tributaria</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax_responsibility">
                  Responsabilidad Tributaria *
                </Label>
                <Select
                  value={formData.tax_responsibility}
                  onValueChange={(value) =>
                    handleInputChange('tax_responsibility', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_RESPONSIBILITIES.map((resp) => (
                      <SelectItem key={resp.value} value={resp.value}>
                        {resp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tax_id">NIT (si aplica)</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => handleInputChange('tax_id', e.target.value)}
                  placeholder="Ej: 900123456-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="economic_activity_code">Código CIIU</Label>
                <Select
                  value={formData.economic_activity_code}
                  onValueChange={(value) =>
                    handleInputChange('economic_activity_code', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un código CIIU" />
                  </SelectTrigger>
                  <SelectContent>
                    {CIIU_CODES.map((ciiu) => (
                      <SelectItem key={ciiu.code} value={ciiu.code}>
                        {ciiu.code} - {ciiu.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tax_regime">Régimen Tributario</Label>
                <Select
                  value={formData.tax_regime}
                  onValueChange={(value) =>
                    handleInputChange('tax_regime', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un régimen tributario" />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_REGIMES.map((regime) => (
                      <SelectItem key={regime.value} value={regime.value}>
                        {regime.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="economic_activity_description">
                Descripción Actividad Económica
              </Label>
              <Textarea
                id="economic_activity_description"
                value={formData.economic_activity_description}
                onChange={(e) =>
                  handleInputChange(
                    'economic_activity_description',
                    e.target.value
                  )
                }
                placeholder="Descripción de la actividad económica principal"
                rows={2}
              />
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Ubicación</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Departamento *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => {
                    handleInputChange('department', value);
                    handleInputChange('municipality', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.code} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="municipality">Municipio *</Label>
                <Select
                  value={formData.municipality}
                  onValueChange={(value) =>
                    handleInputChange('municipality', value)
                  }
                  disabled={!formData.department}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar municipio" />
                  </SelectTrigger>
                  <SelectContent>
                    {municipalities.map((mun) => (
                      <SelectItem key={mun.code} value={mun.name}>
                        {mun.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address">Dirección *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Dirección completa"
                  rows={2}
                  required
                />
              </div>

              <div>
                <Label htmlFor="postal_code">Código Postal</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) =>
                    handleInputChange('postal_code', e.target.value)
                  }
                  placeholder="Ej: 110111"
                />
              </div>
            </div>
          </div>

          {/* Información de Contacto */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Información de Contacto</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="cliente@ejemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://www.ejemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Teléfono Fijo</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Ej: (1) 234-5678"
                />
              </div>

              <div>
                <Label htmlFor="mobile_phone">Teléfono Móvil</Label>
                <Input
                  id="mobile_phone"
                  value={formData.mobile_phone}
                  onChange={(e) =>
                    handleInputChange('mobile_phone', e.target.value)
                  }
                  placeholder="Ej: 300-123-4567"
                />
              </div>
            </div>
          </div>

          {/* Información Bancaria */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Información Bancaria</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bank_name">Banco</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) =>
                    handleInputChange('bank_name', e.target.value)
                  }
                  placeholder="Ej: Banco de Bogotá"
                />
              </div>

              <div>
                <Label htmlFor="account_type">Tipo de Cuenta</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) =>
                    handleInputChange('account_type', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="account_number">Número de Cuenta</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) =>
                    handleInputChange('account_number', e.target.value)
                  }
                  placeholder="Ej: 1234567890"
                />
              </div>
            </div>
          </div>

          {/* Información Comercial */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Información Comercial</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="credit_limit">Límite de Crédito</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  value={formData.credit_limit}
                  onChange={(e) =>
                    handleInputChange(
                      'credit_limit',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="payment_terms">Términos de Pago (días)</Label>
                <Input
                  id="payment_terms"
                  type="number"
                  value={formData.payment_terms}
                  onChange={(e) =>
                    handleInputChange(
                      'payment_terms',
                      parseInt(e.target.value) || 0
                    )
                  }
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="discount_percentage">Descuento (%)</Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  value={formData.discount_percentage}
                  onChange={(e) =>
                    handleInputChange(
                      'discount_percentage',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          {/* Configuración */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configuración</h3>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    handleInputChange('is_active', checked)
                  }
                />
                <Label htmlFor="is_active">Cliente Activo</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_vip"
                  checked={formData.is_vip}
                  onCheckedChange={(checked) =>
                    handleInputChange('is_vip', checked)
                  }
                />
                <Label htmlFor="is_vip">Cliente VIP</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notas adicionales sobre el cliente"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {customer ? 'Actualizar' : 'Crear'} Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
