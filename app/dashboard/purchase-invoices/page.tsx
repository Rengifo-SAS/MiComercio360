import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { PurchaseInvoicesPageClient } from '@/components/purchase-invoices-page-client';
import { PurchaseInvoicesService } from '@/lib/services/purchase-invoices-service';

export default async function PurchaseInvoicesPage() {
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

  // Obtener facturas de compra iniciales
  const { purchaseInvoices } = await PurchaseInvoicesService.getPurchaseInvoices(
    companyId,
    { limit: 50, page: 1 }
  );

  // Obtener datos relacionados para formularios
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name, tax_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  const { data: numerations } = await supabase
    .from('numerations')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .eq('document_type', 'purchase_invoice')
    .order('name');

  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('is_main', { ascending: false });

  const { data: products } = await supabase
    .from('products')
    .select('id, name, reference, cost_price, tax_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  const { data: taxes } = await supabase
    .from('taxes')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  const { data: costCenters } = await supabase
    .from('cost_centers')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  return (
    <RouteGuard requiredPermission="purchases.read">
      <PurchaseInvoicesPageClient
        companyId={companyId}
        initialPurchaseInvoices={purchaseInvoices}
        suppliers={suppliers || []}
        numerations={numerations || []}
        warehouses={warehouses || []}
        products={products || []}
        accounts={accounts || []}
        taxes={taxes || []}
        costCenters={costCenters || []}
      />
    </RouteGuard>
  );
}
