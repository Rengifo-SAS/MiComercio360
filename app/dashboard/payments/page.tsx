import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { PaymentsPageClient } from '@/components/payments-page-client';
import { PaymentsService } from '@/lib/services/payments-service';

export default async function PaymentsPage() {
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

  // Obtener pagos iniciales
  const { payments } = await PaymentsService.getPayments(companyId, { limit: 50, page: 1 });

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
    .eq('document_type', 'payment')
    .order('name');

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('account_name');

  const { data: paymentMethods } = await supabase
    .from('payment_methods')
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
      <PaymentsPageClient
        companyId={companyId}
        initialPayments={payments}
        suppliers={suppliers || []}
        numerations={numerations || []}
        accounts={accounts || []}
        paymentMethods={paymentMethods || []}
        costCenters={costCenters || []}
      />
    </RouteGuard>
  );
}
