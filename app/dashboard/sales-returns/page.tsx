import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { SalesReturnsPageClient } from '@/components/sales-returns-page-client';
import { RefundsService } from '@/lib/services/refunds-service';
import { SalesService } from '@/lib/services/sales-service';

export default async function SalesReturnsPage() {
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

  const companyId = setupStatus.company!.id;

  // Obtener devoluciones iniciales
  const { refundRequests } = await RefundsService.getRefundRequests(companyId, {});

  // Obtener ventas completadas para el formulario directamente con el cliente del servidor
  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select(`
      id,
      sale_number,
      total_amount,
      created_at,
      status,
      customer:customers(
        id,
        business_name,
        identification_number
      )
    `)
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (salesError) {
    console.error('Error cargando ventas:', salesError);
  }

  const sales = salesData || [];

  // Obtener clientes
  const { data: customers } = await supabase
    .from('customers')
    .select('id, business_name, identification_number')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('business_name');

  // Obtener productos
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  return (
    <RouteGuard requiredPermission="sales.read">
      <SalesReturnsPageClient
        companyId={companyId}
        initialRefunds={refundRequests as any}
        sales={sales}
        customers={customers || []}
        products={products || []}
      />
    </RouteGuard>
  );
}

