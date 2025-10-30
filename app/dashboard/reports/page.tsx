import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { ReportsPageClient } from '@/components/reports-page-client';
import { ReportsService } from '@/lib/services/reports-service';

export const metadata = {
  title: 'Reportes | POS-SRSAS',
  description: 'Gestión de reportes del sistema',
};

export default async function ReportsPage() {
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

  // Obtener datos iniciales
  try {
    const { reports, total } = await ReportsService.getReports(setupStatus.company.id, {
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'desc',
    });

    const { history } = await ReportsService.getReportHistory(setupStatus.company.id, {
      page: 1,
      limit: 10,
      sort_by: 'generated_at',
      sort_order: 'desc',
    });

    return (
      <RouteGuard requiredPermission="reports.read">
        <ReportsPageClient
          initialReports={reports}
          initialHistory={history}
          companyId={setupStatus.company.id}
          userId={user.id}
        />
      </RouteGuard>
    );
  } catch (error) {
    console.error('Error loading reports data:', error);
    return (
      <RouteGuard requiredPermission="reports.read">
        <ReportsPageClient
          initialReports={[]}
          initialHistory={[]}
          companyId={setupStatus.company.id}
          userId={user.id}
        />
      </RouteGuard>
    );
  }
}
