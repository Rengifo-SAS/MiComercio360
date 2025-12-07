import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { AccountMovementsReportClient } from '@/components/account-movements-report-client';

export const metadata = {
  title: 'Movimientos por Cuenta | POS-SRSAS',
  description: 'Movimientos por cuenta contable',
};

export default async function AccountMovementsReportPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');
  const setupStatus = await checkCompanySetup(user.id);
  if (!setupStatus.isSetupComplete || !setupStatus.company) redirect('/protected');
  return (
    <RouteGuard requiredPermission="reports.read">
      <AccountMovementsReportClient companyId={setupStatus.company.id} userId={user.id} />
    </RouteGuard>
  );
}

