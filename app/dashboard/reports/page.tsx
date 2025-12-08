import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { ReportsHomeClient } from '@/components/reports-home-client';

export const metadata = {
  title: 'Reportes | POS-SRSAS',
  description: 'Sistema de reportes y analítica empresarial',
};

export default async function ReportsHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  const setupStatus = await checkCompanySetup(user.id);

  if (!setupStatus.isSetupComplete) {
    redirect('/protected');
  }

  if (!setupStatus.company) {
    redirect('/protected');
  }

  return (
    <RouteGuard requiredPermission="reports.read">
      <ReportsHomeClient companyId={setupStatus.company.id} userId={user.id} />
    </RouteGuard>
  );
}
