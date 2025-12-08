import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { CompanySetupForm } from '@/components/company-setup-form';
import { SetupProgress } from '@/components/setup-progress';
import { Building2 } from 'lucide-react';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect('/auth/login');
  }

  const userId = data.claims.sub;
  const userEmail = data.claims.email;
  const userName = data.claims.user_metadata?.full_name;

  // Si no hay email, redirigir al login
  if (!userEmail) {
    redirect('/auth/login');
  }

  // Verificar el estado de configuración de la compañía
  const setupStatus = await checkCompanySetup(userId);

  // Si ya está configurado, redirigir al dashboard
  if (setupStatus.isSetupComplete) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Configuración Inicial
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            ¡Bienvenido! Configuremos tu empresa para comenzar a usar el sistema
            POS
          </p>
        </div>

        {/* Progress Section */}
        <div className="mb-12">
          <SetupProgress
            hasProfile={setupStatus.hasProfile}
            hasCompany={setupStatus.hasCompany}
          />
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <CompanySetupForm userEmail={userEmail} userName={userName} />
        </div>
      </div>
    </div>
  );
}
