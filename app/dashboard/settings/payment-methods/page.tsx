import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { PaymentMethodsService } from '@/lib/services/payment-methods-service';
import { PaymentMethodsPageClient } from '@/components/payment-methods-page-client';
import { RouteGuard } from '@/components/route-guard';

export default async function PaymentMethodsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect('/auth/login');
  }

  const userId = user.id;
  const setupStatus = await checkCompanySetup(userId);

  if (!setupStatus.isSetupComplete) {
    redirect('/protected');
  }

  // Cargar métodos de pago existentes de la empresa
  let paymentMethods: any[] = [];
  let paymentGateways: any[] = [];
  try {
    paymentMethods = await PaymentMethodsService.getPaymentMethods(
      setupStatus.company!.id
    );
    paymentGateways = await PaymentMethodsService.getPaymentGateways(
      setupStatus.company!.id
    );
  } catch (error) {
    console.error('Error cargando métodos de pago:', error);
  }

  return (
    <RouteGuard requiredPermission="settings.payment_methods">
      <PaymentMethodsPageClient
        companyId={setupStatus.company!.id}
        initialPaymentMethods={paymentMethods}
        initialPaymentGateways={paymentGateways}
      />
    </RouteGuard>
  );
}
