import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { ProductsPageClient } from '@/components/products-page-client';

export default async function ProductsPage() {
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

  // Obtener productos con información de inventario y categorías
  const { data: products } = await supabase
    .from('products')
    .select(
      `
      *,
      categories (
        id,
        name,
        color
      ),
      suppliers (
        id,
        name
      ),
      warehouses (
        id,
        name,
        code
      ),
      inventory (
        id,
        quantity,
        location
      )
    `
    )
    .eq('company_id', setupStatus.company!.id)
    .order('created_at', { ascending: false });

  return (
    <RouteGuard requiredPermission="products.read">
      <ProductsPageClient
        initialProducts={products || []}
        companyId={setupStatus.company!.id}
      />
    </RouteGuard>
  );
}
