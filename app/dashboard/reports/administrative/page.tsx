import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { AdministrativeReportsClient } from '@/components/administrative-reports-client';

export const metadata = {
  title: 'Reportes Administrativos | POS-SRSAS',
  description: 'Reportes administrativos y contables',
};

export default async function AdministrativeReportsPage() {
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
      <AdministrativeReportsClient
        companyId={setupStatus.company.id}
        userId={user.id}
      />
    </RouteGuard>
  );
}

