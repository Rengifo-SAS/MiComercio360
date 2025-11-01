import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { SalesService } from '@/lib/services/sales-service';
import { SaleDetailPageClient } from '@/components/sale-detail-page-client';

interface SaleDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
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

  if (!setupStatus.company?.id) {
    redirect('/protected');
  }

  // Await params in Next.js 15+
  const { id } = await params;

  // Fetch sale data using server-side client
  const sale = await SalesService.getSaleById(id, supabase);

  if (!sale) {
    notFound();
  }

  // Verify the sale belongs to the company
  if (sale.company_id !== setupStatus.company.id) {
    notFound();
  }

  return (
    <RouteGuard requiredPermission="sales.read">
      <SaleDetailPageClient
        sale={sale}
        companyId={setupStatus.company.id}
      />
    </RouteGuard>
  );
}

