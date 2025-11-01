import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { GeneralSalesReportClient } from '@/components/general-sales-report-client';

export const metadata = {
  title: 'Ventas Generales | Reportes',
  description: 'Reporte general de ventas',
};

export default async function GeneralSalesReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  const setupStatus = await checkCompanySetup(user.id);

  if (!setupStatus.isSetupComplete || !setupStatus.company) {
    redirect('/protected');
  }

  return (
    <RouteGuard requiredPermission="reports.read">
      <GeneralSalesReportClient
        companyId={setupStatus.company.id}
        userId={user.id}
      />
    </RouteGuard>
  );
}
