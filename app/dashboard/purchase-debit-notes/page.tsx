import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { PurchaseDebitNotesPageClient } from '@/components/purchase-debit-notes-page-client';
import { PurchaseDebitNotesService } from '@/lib/services/purchase-debit-notes-service';

export default async function PurchaseDebitNotesPage() {
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

  // Obtener notas débito iniciales
  const { purchaseDebitNotes } = await PurchaseDebitNotesService.getPurchaseDebitNotes(
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
    .eq('document_type', 'debit_note')
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

  return (
    <RouteGuard requiredPermission="purchases.read">
      <PurchaseDebitNotesPageClient
        companyId={companyId}
        initialPurchaseDebitNotes={purchaseDebitNotes}
        suppliers={suppliers || []}
        numerations={numerations || []}
        warehouses={warehouses || []}
        products={products || []}
        accounts={accounts || []}
      />
    </RouteGuard>
  );
}
