import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RecurringInvoicesPageClient } from '@/components/recurring-invoices-page-client';
import { RecurringInvoicesService } from '@/lib/services/recurring-invoices-service';

export default async function RecurringInvoicesPage() {
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

  // Obtener facturas recurrentes iniciales
  const { recurringInvoices } = await RecurringInvoicesService.getRecurringInvoices(
    companyId,
    { limit: 50, page: 1 }
  );

  // Obtener datos relacionados para formularios
  const { data: customers } = await supabase
    .from('customers')
    .select('id, business_name, tax_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('business_name');

  const { data: numerations } = await supabase
    .from('numerations')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .eq('document_type', 'invoice')
    .order('name');

  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('is_main', { ascending: false });

  // Obtener productos - consulta directa con límite alto para obtener todos
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, sku, selling_price, tax_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name')
    .limit(1000);

  if (productsError) {
    console.error('Error cargando productos:', productsError);
  }

  // Mapear productos para usar sku como reference y selling_price como sale_price
  const productsMapped = (products || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    reference: p.sku || '',
    sale_price: p.selling_price || 0,
    tax_id: p.tax_id,
  }));

  const { data: taxes } = await supabase
    .from('taxes')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  return (
    <RouteGuard requiredPermission="sales.read">
      <RecurringInvoicesPageClient
        companyId={companyId}
        initialRecurringInvoices={recurringInvoices}
        customers={customers || []}
        numerations={numerations || []}
        warehouses={warehouses || []}
        products={productsMapped}
        taxes={taxes || []}
      />
    </RouteGuard>
  );
}
