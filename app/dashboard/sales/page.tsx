import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { SalesService } from '@/lib/services/sales-service';
import { SalesPageClient } from '@/components/sales-page-client';

export default async function SalesPage() {
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

  // Obtener datos iniciales
  let initialSales: any[] = [];
  let initialStats: any = null;

  try {
    if (setupStatus.company?.id) {
      const salesResult = await SalesService.getSales(setupStatus.company.id, {
        limit: 20,
      });
      initialSales = salesResult.sales;

      initialStats = await SalesService.getSalesStats(setupStatus.company.id);
    }
  } catch (error) {
    console.error('Error cargando datos iniciales de ventas:', error);
    // Si no hay datos, inicializar con valores por defecto
    initialSales = [];
    initialStats = {
      total_sales: 0,
      total_amount: 0,
      average_sale: 0,
      total_items: 0,
      sales_today: 0,
      sales_this_month: 0,
      sales_this_year: 0,
      amount_today: 0,
      amount_this_month: 0,
      amount_this_year: 0,
    };
  }

  return (
    <RouteGuard requiredPermission="sales.read">
      <SalesPageClient
        companyId={setupStatus.company?.id || ''}
        initialSales={initialSales}
        initialStats={initialStats}
      />
    </RouteGuard>
  );
}
