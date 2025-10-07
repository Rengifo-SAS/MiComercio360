import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { CustomersPageClient } from '@/components/customers-page-client';
import { CustomersService } from '@/lib/services/customers-service';

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect('/auth/login');
  }

  const userId = data.claims.sub;
  const setupStatus = await checkCompanySetup(userId);

  if (!setupStatus.isSetupComplete) {
    redirect('/protected');
  }

  // Obtener datos iniciales para el componente cliente
  const result = await CustomersService.getCustomers(setupStatus.company!.id, {
    limit: 50,
    offset: 0,
  });

  // Obtener estadísticas
  const initialStats = await CustomersService.getCustomerStats(
    setupStatus.company!.id
  );

  // Obtener departamentos de Colombia
  const { data: departments } = await supabase.rpc('get_colombian_departments');

  return (
    <RouteGuard requiredPermission="customers.read">
      <CustomersPageClient
        companyId={setupStatus.company!.id}
        initialData={result.customers}
        initialStats={initialStats}
        departments={departments || []}
      />
    </RouteGuard>
  );
}
