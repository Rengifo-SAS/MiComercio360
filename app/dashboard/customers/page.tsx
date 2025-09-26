import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { CustomersPageClient } from '@/components/customers-page-client';

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
  const { data: initialCustomersData } = await supabase.rpc(
    'search_customers',
    {
      p_company_id: setupStatus.company!.id,
      p_search_term: '',
      p_person_type: null,
      p_tax_responsibility: null,
      p_department: null,
      p_municipality: null,
      p_is_active: null,
      p_sort_by: 'business_name',
      p_sort_order: 'asc',
      p_limit: 50,
      p_offset: 0,
    }
  );

  // Obtener departamentos de Colombia
  const { data: departments } = await supabase.rpc('get_colombian_departments');

  const initialStats = {
    total_customers: initialCustomersData?.length || 0,
    natural_persons:
      initialCustomersData?.filter((c) => c.person_type === 'NATURAL').length ||
      0,
    juridical_persons:
      initialCustomersData?.filter((c) => c.person_type === 'JURIDICA')
        .length || 0,
    active_customers:
      initialCustomersData?.filter((c) => c.is_active).length || 0,
    vip_customers: initialCustomersData?.filter((c) => c.is_vip).length || 0,
  };

  return (
    <CustomersPageClient
      companyId={setupStatus.company!.id}
      initialData={initialCustomersData || []}
      initialStats={initialStats}
      departments={departments || []}
    />
  );
}
