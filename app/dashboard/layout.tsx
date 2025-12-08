import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { DashboardLayoutClient } from '@/components/dashboard-layout-client';
import { RouteGuard } from '@/components/route-guard';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  let user: any = null;
  let authError: any = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    authError = error;
    user = data?.user ?? null;
  } catch (e) {
    authError = e;
  }

  // Si no hay usuario y no es un fallo de red, redirigir a login
  // En modo offline, evitamos forzar redirect al login para mantener el POS utilizable
  if (!user && !authError) {
    redirect('/auth/login');
  }

  let setupStatus: {
    isSetupComplete: boolean;
    company?: { name?: string };
    profile?: { role?: string };
  } | null = null;

  if (user) {
    try {
      setupStatus = await checkCompanySetup(user.id);
    } catch {
      // Si falla (posible offline), continuamos sin bloquear
      setupStatus = null;
    }
  }

  // Si pudimos verificar y no está configurado, redirigir a la configuración
  if (setupStatus && !setupStatus.isSetupComplete) {
    redirect('/protected');
  }

  return (
    <RouteGuard requiredModule="dashboard">
      <DashboardLayoutClient
        companyName={setupStatus?.company?.name}
        userRole={setupStatus?.profile?.role}
      >
        {children}
      </DashboardLayoutClient>
    </RouteGuard>
  );
}
