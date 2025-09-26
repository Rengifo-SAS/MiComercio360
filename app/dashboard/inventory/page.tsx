import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { InventoryPageClient } from '@/components/inventory-page-client';

export default async function InventoryPage() {
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

  // Obtener bodegas
  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('*')
    .eq('company_id', setupStatus.company!.id)
    .eq('is_active', true)
    .order('is_main', { ascending: false });

  // Obtener categorías para filtros
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('company_id', setupStatus.company!.id)
    .order('name');

  // Obtener datos iniciales para el componente cliente
  const { data: initialInventoryData } = await supabase.rpc(
    'search_products_advanced',
    {
      p_company_id: setupStatus.company!.id,
      p_search_term: '',
      p_category_id: null,
      p_supplier_id: null,
      p_warehouse_id: null,
      p_stock_status: '',
      p_sort_by: 'name',
      p_sort_order: 'asc',
      p_limit: 100,
      p_offset: 0,
    }
  );

  const { data: initialStatsData } = await supabase.rpc('get_search_stats', {
    p_company_id: setupStatus.company!.id,
    p_search_term: '',
    p_category_id: null,
    p_supplier_id: null,
    p_warehouse_id: null,
    p_stock_status: '',
  });

  const initialStats = initialStatsData?.[0] || {
    total_products: 0,
    in_stock_count: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    total_value: 0,
  };

  return (
    <InventoryPageClient
      warehouses={warehouses || []}
      categories={categories || []}
      companyId={setupStatus.company!.id}
      initialData={initialInventoryData || []}
      initialStats={initialStats}
    />
  );
}
