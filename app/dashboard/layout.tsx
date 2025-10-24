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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect('/auth/login');
  }

  const userId = user.id;
  const setupStatus = await checkCompanySetup(userId);

  // Si no está configurado, redirigir a la configuración
  if (!setupStatus.isSetupComplete) {
    redirect('/protected');
  }

  return (
    <RouteGuard requiredModule="dashboard">
      <DashboardLayoutClient
        companyName={setupStatus.company?.name}
        userRole={setupStatus.profile?.role}
      >
        {children}
      </DashboardLayoutClient>
    </RouteGuard>
  );
}
