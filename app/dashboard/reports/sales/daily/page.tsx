import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { DailySalesReportClient } from '@/components/daily-sales-report-client';

export const metadata = {
  title: 'Ventas Diarias | Reportes',
  description: 'Reporte de ventas agrupadas por forma de pago y numeraciones',
};

export default async function DailySalesReportPage() {
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
      <DailySalesReportClient
        companyId={setupStatus.company.id}
        userId={user.id}
      />
    </RouteGuard>
  );
}
