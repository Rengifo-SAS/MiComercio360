import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { SalesReportsClient } from '@/components/sales-reports-client';

export const metadata = {
  title: 'Reportes de Ventas | POS-SRSAS',
  description: 'Reportes y análisis de ventas',
};

export default async function SalesReportsPage() {
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
      <SalesReportsClient companyId={setupStatus.company.id} userId={user.id} />
    </RouteGuard>
  );
}
