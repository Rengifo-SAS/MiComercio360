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

  return (
    <RouteGuard requiredPermission="products.read">
      <ProductsPageClient
        initialProducts={[]}
        companyId={setupStatus.company!.id}
        userId={userId}
      />
    </RouteGuard>
  );
}
