import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { ReceivedPaymentsPageClient } from '@/components/received-payments-page-client';
import { ReceivedPaymentsService } from '@/lib/services/received-payments-service';

export default async function ReceivedPaymentsPage() {
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

  // Obtener pagos recibidos iniciales
  const { receivedPayments } = await ReceivedPaymentsService.getReceivedPayments(
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
    <RouteGuard requiredPermission="sales.read">
      <ReceivedPaymentsPageClient
        companyId={companyId}
        initialReceivedPayments={receivedPayments}
        customers={customers || []}
        numerations={numerations || []}
        accounts={accounts || []}
        paymentMethods={paymentMethods || []}
        costCenters={costCenters || []}
      />
    </RouteGuard>
  );
}
