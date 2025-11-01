import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { DailyReportClient } from '@/components/daily-report-client';

export const metadata = {
  title: 'Comprobante Informe Diario | POS-SRSAS',
  description: 'Comprobante de informe diario',
};

export default async function DailyReportPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');
  const setupStatus = await checkCompanySetup(user.id);
  if (!setupStatus.isSetupComplete || !setupStatus.company) redirect('/protected');
  return (
    <RouteGuard requiredPermission="reports.read">
      <DailyReportClient companyId={setupStatus.company.id} userId={user.id} />
    </RouteGuard>
  );
}

