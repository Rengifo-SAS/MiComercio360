import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { ProfitLossReportClient } from '@/components/profit-loss-report-client';

export const metadata = {
  title: 'Estado de Resultados | POS-SRSAS',
  description: 'Estado de resultados',
};

export default async function ProfitLossReportPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');
  const setupStatus = await checkCompanySetup(user.id);
  if (!setupStatus.isSetupComplete || !setupStatus.company) redirect('/protected');
  return (
    <RouteGuard requiredPermission="reports.read">
      <ProfitLossReportClient companyId={setupStatus.company.id} userId={user.id} />
    </RouteGuard>
  );
}

