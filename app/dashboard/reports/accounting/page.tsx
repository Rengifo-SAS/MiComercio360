import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { AccountingReportsClient } from '@/components/accounting-reports-client';

export const metadata = {
  title: 'Reportes Contables | POS-SRSAS',
  description: 'Reportes contables',
};

export default async function AccountingReportsPage() {
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
      <AccountingReportsClient
        companyId={setupStatus.company.id}
        userId={user.id}
      />
    </RouteGuard>
  );
}
