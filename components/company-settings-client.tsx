'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  CompanyService,
  Company,
  UpdateCompanyData,
} from '@/lib/services/company-service';
import { CIIU_CODES, TAX_REGIMES, DEPARTMENTS } from '@/lib/data/colombia-data';
import { getMunicipalitiesByDepartment } from '@/lib/data/municipalities-data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Save,
  Upload,
  Trash2,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  FileText,
  Globe,
  Image,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { DefaultCompanyLogo } from '@/components/default-company-logo';

export function CompanySettingsClient() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [municipalities, setMunicipalities] = useState<
    Array<{ name: string; code: string }>
  >([]);

  // Form data
  const [formData, setFormData] = useState<UpdateCompanyData>({
    name: '',
    business_name: '',
    tax_id: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Colombia',
    logo_url: '',
    is_active: true,
    regimen_tributario: 'Simplificado',
    codigo_ciiu: '',
    tipo_documento: 'NIT',
  });

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (formData.state) {
      loadMunicipalities();
    }
  }, [formData.state]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener el usuario actual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener el company_id del perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.company_id)
        throw new Error('Usuario no asociado a una empresa');

      // Obtener los datos de la empresa
      const companyData = await CompanyService.getCompany(profile.company_id);
      setCompany(companyData);

      // Llenar el formulario con los datos de la empresa
      setFormData({
        name: companyData.name || '',
        business_name: companyData.business_name || '',
        tax_id: companyData.tax_id || '',
        email: companyData.email || '',
        phone: companyData.phone || '',
        address: companyData.address || '',
        city: companyData.city || '',
        state: companyData.state || '',
        postal_code: companyData.postal_code || '',
        country: companyData.country || 'Colombia',
        logo_url: companyData.logo_url || '',
        is_active: companyData.is_active,
        regimen_tributario: companyData.regimen_tributario || 'Simplificado',
        codigo_ciiu: companyData.codigo_ciiu || '',
        tipo_documento: companyData.tipo_documento || 'NIT',
      });
    } catch (error: any) {
      console.error('Error cargando empresa:', error);
      setError(error?.message || 'Error cargando información de la empresa');
    } finally {
      setLoading(false);
    }
  };

  const loadMunicipalities = async () => {
    if (!formData.state) return;

    try {
      const municipalitiesData = getMunicipalitiesByDepartment(formData.state);
      setMunicipalities(municipalitiesData);
    } catch (error) {
      console.error('Error cargando municipios:', error);
    }
  };

  const handleInputChange = (field: keyof UpdateCompanyData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Limpiar ciudad cuando cambie el departamento
    if (field === 'state') {
      setFormData((prev) => ({ ...prev, city: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Limpiar campos vacíos
      const cleanedData = {
        ...formData,
        business_name: formData.business_name || undefined,
        tax_id: formData.tax_id || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postal_code: formData.postal_code || undefined,
        logo_url: formData.logo_url || undefined,
        codigo_ciiu: formData.codigo_ciiu || undefined,
      };

      await CompanyService.updateCompany(company.id, cleanedData);

      // Recargar datos de la empresa
      await loadCompany();

      setSuccess('Información de la empresa actualizada correctamente');
    } catch (error: any) {
      console.error('Error actualizando empresa:', error);
      setError(
        error?.message || 'Error actualizando la información de la empresa'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    try {
      setSaving(true);
      setError(null);

      const logoUrl = await CompanyService.uploadLogo(company.id, file);
      setFormData((prev) => ({ ...prev, logo_url: logoUrl }));
      setSuccess('Logo actualizado correctamente');
    } catch (error: any) {
      console.error('Error subiendo logo:', error);
      if (
        error?.message?.includes('bucket de almacenamiento no está configurado')
      ) {
        setError(
          'El almacenamiento de archivos no está configurado. Contacta al administrador o revisa la documentación de configuración.'
        );
      } else {
        setError(error?.message || 'Error subiendo el logo');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!company) return;

    try {
      setSaving(true);
      setError(null);

      await CompanyService.deleteLogo(company.id);
      setFormData((prev) => ({ ...prev, logo_url: '' }));
      setSuccess('Logo eliminado correctamente');
    } catch (error: any) {
      console.error('Error eliminando logo:', error);
      if (
        error?.message?.includes(
          'almacenamiento esté configurado correctamente'
        )
      ) {
        setError(
          'El almacenamiento de archivos no está configurado. Contacta al administrador o revisa la documentación de configuración.'
        );
      } else {
        setError(error?.message || 'Error eliminando el logo');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-64 bg-gray-200 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-8 p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error cargando empresa
          </h3>
          <p className="text-gray-500 mb-4">
            No se pudo cargar la información de la empresa
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Configuración de Empresa
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestiona la información y configuración de tu empresa
            </p>
          </div>
        </div>
        <Badge variant={company.is_active ? 'default' : 'secondary'}>
          {company.is_active ? 'Activa' : 'Inactiva'}
        </Badge>
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Éxito</h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Información Básica */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Información Básica
              </CardTitle>
              <CardDescription className="text-sm">
                Datos principales de identificación de la empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la Empresa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Mi Empresa S.A.S."
                  required
                />
              </div>

              <div>
                <Label htmlFor="business_name">Razón Social</Label>
                <Input
                  id="business_name"
                  value={formData.business_name || ''}
                  onChange={(e) =>
                    handleInputChange('business_name', e.target.value)
                  }
                  placeholder="Ej: Mi Empresa Sociedad por Acciones Simplificada"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo_documento">Tipo de Documento</Label>
                  <Select
                    value={formData.tipo_documento || 'NIT'}
                    onValueChange={(value) =>
                      handleInputChange('tipo_documento', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NIT">NIT</SelectItem>
                      <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                      <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                      <SelectItem value="PP">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tax_id">Número de Identificación</Label>
                  <Input
                    id="tax_id"
                    value={formData.tax_id || ''}
                    onChange={(e) =>
                      handleInputChange('tax_id', e.target.value)
                    }
                    placeholder="Ej: 900123456-7"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="regimen_tributario">Régimen Tributario</Label>
                <Select
                  value={formData.regimen_tributario || 'Simplificado'}
                  onValueChange={(value) =>
                    handleInputChange('regimen_tributario', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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

              <div>
                <Label htmlFor="codigo_ciiu">Código CIIU</Label>
                <Select
                  value={formData.codigo_ciiu || ''}
                  onValueChange={(value) =>
                    handleInputChange('codigo_ciiu', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar código CIIU" />
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
            </CardContent>
          </Card>

          {/* Información de Contacto */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="h-5 w-5" />
                Información de Contacto
              </CardTitle>
              <CardDescription className="text-sm">
                Datos de contacto y ubicación de la empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="empresa@ejemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+57 (1) 234 5678"
                />
              </div>

              <div>
                <Label htmlFor="address">Dirección</Label>
                <Textarea
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Calle 123 #45-67"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">Departamento</Label>
                  <Select
                    value={formData.state || ''}
                    onValueChange={(value) => handleInputChange('state', value)}
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
                  <Label htmlFor="city">Ciudad</Label>
                  <Select
                    value={formData.city || ''}
                    onValueChange={(value) => handleInputChange('city', value)}
                    disabled={!formData.state}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ciudad" />
                    </SelectTrigger>
                    <SelectContent>
                      {municipalities.map((municipality) => (
                        <SelectItem
                          key={municipality.code}
                          value={municipality.name}
                        >
                          {municipality.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postal_code">Código Postal</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code || ''}
                    onChange={(e) =>
                      handleInputChange('postal_code', e.target.value)
                    }
                    placeholder="110111"
                  />
                </div>

                <div>
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country || 'Colombia'}
                    onChange={(e) =>
                      handleInputChange('country', e.target.value)
                    }
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logo y Configuración */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Image className="h-5 w-5" />
                Logo de la Empresa
              </CardTitle>
              <CardDescription className="text-sm">
                Sube el logo de tu empresa para personalizar la aplicación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.logo_url ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 border rounded-lg overflow-hidden">
                      <img
                        src={formData.logo_url}
                        alt="Logo de la empresa"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          // Si falla la carga, mostrar logo por defecto
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                          if (fallback) {
                            fallback.style.display = 'block';
                          }
                        }}
                      />
                      <div className="logo-fallback hidden h-full w-full absolute top-0 left-0">
                        <DefaultCompanyLogo className="h-full w-full" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Logo actual</p>
                      <p className="text-xs text-muted-foreground">
                        Haz clic en "Cambiar" para subir una nueva imagen
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById('logo-upload')?.click()
                      }
                      disabled={saving}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Cambiar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLogoDelete}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="h-24 w-24 mx-auto mb-4">
                    <DefaultCompanyLogo className="h-full w-full" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2 font-medium">
                    Logo por defecto
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Sube tu logo para personalizar la aplicación
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById('logo-upload')?.click()
                    }
                    disabled={saving}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Logo
                  </Button>
                </div>
              )}

              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5" />
                Configuración
              </CardTitle>
              <CardDescription className="text-sm">
                Configuración general de la empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Empresa Activa</Label>
                  <p className="text-sm text-muted-foreground">
                    La empresa estará disponible para operaciones
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    handleInputChange('is_active', checked)
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Información del Sistema
                </Label>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>ID de Empresa: {company.id}</p>
                  <p>
                    Creada:{' '}
                    {new Date(company.created_at).toLocaleDateString('es-CO')}
                  </p>
                  <p>
                    Actualizada:{' '}
                    {new Date(company.updated_at).toLocaleDateString('es-CO')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
