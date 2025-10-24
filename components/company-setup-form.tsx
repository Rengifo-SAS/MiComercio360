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
import { COUNTRIES } from '@/lib/data/countries-data';
import { Building2, FileText } from 'lucide-react';

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
  const [selectedCountry, setSelectedCountry] = useState('CO');
  const [phoneNumber, setPhoneNumber] = useState('');
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

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const country = COUNTRIES.find((c) => c.code === countryCode);
    if (country) {
      setFormData((prev) => ({
        ...prev,
        country: country.name,
      }));
    }
    // Actualizar el teléfono completo
    updateFullPhone(countryCode, phoneNumber);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    updateFullPhone(selectedCountry, value);
  };

  const updateFullPhone = (countryCode: string, phone: string) => {
    const country = COUNTRIES.find((c) => c.code === countryCode);
    if (country) {
      const fullPhone = `${country.phoneCode} ${phone}`;
      setFormData((prev) => ({
        ...prev,
        phone: fullPhone,
      }));
    }
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
    <div className={cn('flex flex-col gap-8', className)} {...props}>
      <Card className="shadow-xl border-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mb-4">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              Información de la Empresa
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300 mt-2">
              Complete los datos básicos de su empresa para continuar
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-8">
              {/* Información básica de la empresa */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Información Básica
                  </h3>
                </div>

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
                  <div className="flex gap-2">
                    <select
                      value={selectedCountry}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.phoneCode}
                        </option>
                      ))}
                    </select>
                    <Input
                      id="phone"
                      name="phone"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="300 123 4567"
                      className="flex-1"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Información fiscal */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Información Fiscal
                  </h3>
                </div>

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
              <div className="space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-purple-600 dark:text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Ubicación
                  </h3>
                </div>

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

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-red-600 dark:text-red-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Configurando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-5 h-5" />
                      <span>Configurar Empresa</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
