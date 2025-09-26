'use client';

import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { CIIU_CODES, TAX_REGIMES, DEPARTMENTS } from '@/lib/data/colombia-data';
import { getMunicipalitiesByDepartment } from '@/lib/data/municipalities-data';
import {
  Wallet,
  Building2,
  CreditCard,
  FileText,
  Receipt,
  Calculator,
} from 'lucide-react';

interface CompanySetupFormProps {
  className?: string;
  userEmail: string;
  userName?: string;
}

export function CompanySetupForm({
  className,
  userEmail,
  userName,
  ...props
}: CompanySetupFormProps & React.ComponentPropsWithoutRef<'div'>) {
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    tax_id: '',
    email: userEmail,
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Colombia',
    regimen_tributario: 'SIMPLIFICADO',
    codigo_ciiu: '',
    tipo_documento: 'NIT',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [municipalities, setMunicipalities] = useState<
    Array<{ code: string; name: string; department: string }>
  >([]);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const loadMunicipalities = (departmentName: string) => {
    if (!departmentName) {
      setMunicipalities([]);
      return;
    }

    try {
      console.log('Cargando municipios para departamento:', departmentName);
      const municipalitiesData = getMunicipalitiesByDepartment(departmentName);
      console.log('Municipios encontrados:', municipalitiesData.length);
      setMunicipalities(municipalitiesData);
    } catch (err) {
      console.error('Error cargando municipios:', err);
      setMunicipalities([]);
    }
  };

  // Cargar municipios cuando cambie el departamento
  useEffect(() => {
    if (formData.state) {
      loadMunicipalities(formData.state);
    } else {
      setMunicipalities([]);
    }
  }, [formData.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // Obtener el usuario actual
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Usar la función RPC para crear compañía y perfil en una transacción
      console.log('Iniciando configuración de compañía...', {
        user: user.id,
        formData,
      });

      const { data: company, error: companyError } = await supabase.rpc(
        'setup_company_and_profile_final',
        {
          p_user_id: user.id,
          p_user_email: userEmail,
          p_user_name: userName || null,
          p_company_name: formData.name,
          p_business_name: formData.business_name,
          p_tax_id: formData.tax_id,
          p_email: formData.email,
          p_phone: formData.phone,
          p_address: formData.address,
          p_city: formData.city,
          p_state: formData.state,
          p_postal_code: formData.postal_code,
          p_country: formData.country,
          p_regimen_tributario: formData.regimen_tributario,
          p_codigo_ciiu: formData.codigo_ciiu || null,
          p_tipo_documento: formData.tipo_documento,
        }
      );

      console.log('Resultado de configuración de compañía:', {
        company,
        companyError,
      });

      // Debug: mostrar el contenido completo de la respuesta
      console.log(
        'Contenido completo de company:',
        JSON.stringify(company, null, 2)
      );

      if (companyError) {
        console.error('Error creando compañía:', companyError);
        throw new Error(
          `Error creando compañía: ${JSON.stringify(companyError)}`
        );
      }

      if (!company) {
        throw new Error('No se pudo crear la compañía. Intenta nuevamente.');
      }

      // Verificar si la respuesta indica éxito
      if (company.success === false) {
        throw new Error(
          company.error || 'Error desconocido al crear la compañía'
        );
      }

      console.log('Compañía y perfil creados exitosamente:', company);

      // Redirigir al dashboard
      console.log('Redirigiendo al dashboard...');
      router.push('/dashboard');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Ocurrió un error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Configuración Inicial</CardTitle>
          <CardDescription>
            Configura los datos de tu empresa para comenzar a usar el sistema
            POS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {/* Información básica de la empresa */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Información de la Empresa
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre de la Empresa *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Mi Empresa S.A.S"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business_name">Razón Social *</Label>
                    <Input
                      id="business_name"
                      name="business_name"
                      value={formData.business_name}
                      onChange={handleInputChange}
                      placeholder="Mi Empresa Sociedad por Acciones Simplificada"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">NIT/RUT *</Label>
                    <Input
                      id="tax_id"
                      name="tax_id"
                      value={formData.tax_id}
                      onChange={handleInputChange}
                      placeholder="900123456-7"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email de la Empresa *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="empresa@ejemplo.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+57 300 123 4567"
                    required
                  />
                </div>
              </div>

              {/* Información fiscal */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Información Fiscal</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="regimen_tributario">
                      Régimen Tributario *
                    </Label>
                    <select
                      id="regimen_tributario"
                      name="regimen_tributario"
                      value={formData.regimen_tributario}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          regimen_tributario: e.target.value,
                        }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      {TAX_REGIMES.map((regime) => (
                        <option key={regime.value} value={regime.value}>
                          {regime.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="codigo_ciiu">Código CIIU</Label>
                    <select
                      id="codigo_ciiu"
                      name="codigo_ciiu"
                      value={formData.codigo_ciiu}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          codigo_ciiu: e.target.value,
                        }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Seleccione un código CIIU</option>
                      {CIIU_CODES.map((ciiu) => (
                        <option key={ciiu.code} value={ciiu.code}>
                          {ciiu.code} - {ciiu.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_documento">Tipo de Documento *</Label>
                  <select
                    id="tipo_documento"
                    name="tipo_documento"
                    value={formData.tipo_documento}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tipo_documento: e.target.value,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="NIT">NIT</option>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="PP">Pasaporte</option>
                  </select>
                </div>
              </div>

              {/* Información de ubicación */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Ubicación</h3>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección *</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Calle 123 #45-67"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad *</Label>
                    <select
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">Seleccione un municipio</option>
                      {municipalities.map((municipality) => (
                        <option
                          key={municipality.code}
                          value={municipality.name}
                        >
                          {municipality.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Departamento *</Label>
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          state: e.target.value,
                          city: '', // Limpiar ciudad cuando cambie el departamento
                        }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">Seleccione un departamento</option>
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept.code} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Código Postal *</Label>
                    <Input
                      id="postal_code"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleInputChange}
                      placeholder="110111"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="Colombia"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              {/* Sección de cuentas por defecto */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Cuentas por Defecto</h3>
                  <p className="text-sm text-muted-foreground">
                    Se crearán automáticamente las siguientes cuentas para tu
                    empresa:
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Wallet className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-green-900">
                            Caja Chica
                          </h4>
                          <p className="text-sm text-green-700">
                            Gastos menores y cambio
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-900">
                            Caja General
                          </h4>
                          <p className="text-sm text-blue-700">
                            Operaciones diarias
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200 bg-purple-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <CreditCard className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-purple-900">
                            Efectivo POS
                          </h4>
                          <p className="text-sm text-purple-700">
                            Transacciones del punto de venta
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Sección de numeraciones por defecto */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">
                    Numeraciones por Defecto
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Se crearán automáticamente las siguientes numeraciones para
                    tu empresa:
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <FileText className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-green-900">
                            Facturas de Venta
                          </h4>
                          <p className="text-sm text-green-700">
                            FAC000001 - FAC999999
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Receipt className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-900">
                            Recibos de Caja
                          </h4>
                          <p className="text-sm text-blue-700">
                            REC000001 - REC999999
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200 bg-purple-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Calculator className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-purple-900">
                            Cotizaciones
                          </h4>
                          <p className="text-sm text-purple-700">
                            COT000001 - COT999999
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong>Nota:</strong> También se crearán numeraciones para
                    Comprobantes de Egreso, Notas Crédito, Notas Débito, Órdenes
                    de Compra, Remisiones, Comprobantes de Pago y Notas de
                    Ajuste. Todas iniciarán en 1 y podrás personalizarlas
                    después.
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Configurando...' : 'Configurar Empresa'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
