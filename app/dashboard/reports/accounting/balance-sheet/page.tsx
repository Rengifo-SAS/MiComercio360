import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { BalanceSheetReportClient } from '@/components/balance-sheet-report-client';

export const metadata = {
  title: 'Estado de Situación Financiera | POS-SRSAS',
  description: 'Estado de situación financiera',
};

export default async function BalanceSheetReportPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');
  const setupStatus = await checkCompanySetup(user.id);
  if (!setupStatus.isSetupComplete || !setupStatus.company) redirect('/protected');
  return (
    <RouteGuard requiredPermission="reports.read">
      <BalanceSheetReportClient companyId={setupStatus.company.id} userId={user.id} />
    </RouteGuard>
  );
}

