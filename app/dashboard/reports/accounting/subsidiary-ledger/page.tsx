import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { SubsidiaryLedgerReportClient } from '@/components/subsidiary-ledger-report-client';

export const metadata = {
  title: 'Auxiliar por Tercero | POS-SRSAS',
  description: 'Auxiliar por tercero',
};

export default async function SubsidiaryLedgerReportPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');
  const setupStatus = await checkCompanySetup(user.id);
  if (!setupStatus.isSetupComplete || !setupStatus.company) redirect('/protected');
  return (
    <RouteGuard requiredPermission="reports.read">
      <SubsidiaryLedgerReportClient companyId={setupStatus.company.id} userId={user.id} />
    </RouteGuard>
  );
}

