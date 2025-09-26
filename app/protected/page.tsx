import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { CompanySetupForm } from '@/components/company-setup-form';
import { InfoIcon, Building2, CheckCircle } from 'lucide-react';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect('/auth/login');
  }

  const userId = data.claims.sub;
  const userEmail = data.claims.email;
  const userName = data.claims.user_metadata?.full_name;

  // Verificar el estado de configuración de la compañía
  const setupStatus = await checkCompanySetup(userId);

  // Si ya está configurado, redirigir al dashboard
  if (setupStatus.isSetupComplete) {
    redirect('/dashboard');
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      <div className="w-full">
        <div className="bg-blue-50 dark:bg-blue-950 text-sm p-4 rounded-md text-blue-900 dark:text-blue-100 flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          <div>
            <p className="font-medium">¡Bienvenido al Sistema POS!</p>
            <p className="text-sm">
              Para comenzar, necesitas configurar los datos de tu empresa.
            </p>
          </div>
        </div>
      </div>

      {/* Estado de configuración */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-4 border rounded-lg">
          <div
            className={`p-2 rounded-full ${
              setupStatus.hasProfile
                ? 'bg-green-100 text-green-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <CheckCircle size="20" />
          </div>
          <div>
            <p className="font-medium">Perfil de Usuario</p>
            <p className="text-sm text-muted-foreground">
              {setupStatus.hasProfile ? 'Configurado' : 'Pendiente'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 border rounded-lg">
          <div
            className={`p-2 rounded-full ${
              setupStatus.hasCompany
                ? 'bg-green-100 text-green-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <Building2 size="20" />
          </div>
          <div>
            <p className="font-medium">Datos de Empresa</p>
            <p className="text-sm text-muted-foreground">
              {setupStatus.hasCompany ? 'Configurado' : 'Pendiente'}
            </p>
          </div>
        </div>
      </div>

      {/* Formulario de configuración */}
      <div className="max-w-4xl mx-auto w-full">
        <CompanySetupForm userEmail={userEmail} userName={userName} />
      </div>
    </div>
  );
}
