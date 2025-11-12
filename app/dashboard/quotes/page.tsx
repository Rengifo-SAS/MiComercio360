import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { QuotesPageClient } from '@/components/quotes-page-client';
import { QuotesService } from '@/lib/services/quotes-service';

export default async function QuotesPage() {
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

  // Obtener cotizaciones iniciales
  const { quotes } = await QuotesService.getQuotes(companyId, { limit: 50, page: 1 });

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
    .eq('document_type', 'quotation')
    .order('name');

  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('is_main', { ascending: false });

  const { data: products } = await supabase
    .from('products')
    .select('id, name, reference, sale_price, tax_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  const { data: taxes } = await supabase
    .from('taxes')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  // Obtener vendedores (perfiles de usuarios)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('full_name');

  return (
    <RouteGuard requiredPermission="sales.read">
      <QuotesPageClient
        companyId={companyId}
        initialQuotes={quotes}
        customers={customers || []}
        numerations={numerations || []}
        warehouses={warehouses || []}
        products={products || []}
        taxes={taxes || []}
        salespeople={profiles || []}
      />
    </RouteGuard>
  );
}
