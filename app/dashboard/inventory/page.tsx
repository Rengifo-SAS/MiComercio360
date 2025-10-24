import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
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

  // Los datos iniciales ahora los maneja el hook useInventorySearch

  return (


    <RouteGuard requiredPermission="inventory.read">
    <InventoryPageClient
      warehouses={warehouses || []}
      categories={categories || []}
      companyId={setupStatus.company!.id}
      initialData={[]}
      initialStats={{
        total_products: 0,
        in_stock_count: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
        total_value: 0,
      }}
    />
    </RouteGuard>

  );
}