import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { IncomeExpenseReportClient } from '@/components/income-expense-report-client';

export const metadata = {
  title: 'Ingresos y gastos | POS-SRSAS',
  description: 'Reporte de ingresos y gastos',
};

export default async function IncomeExpenseReportPage() {
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
      <IncomeExpenseReportClient
        companyId={setupStatus.company.id}
        userId={user.id}
      />
    </RouteGuard>
  );
}

