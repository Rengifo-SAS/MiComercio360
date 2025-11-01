import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { RouteGuard } from '@/components/route-guard';
import { Form350ReportClient } from '@/components/form-350-report-client';

export const metadata = {
  title: 'Formulario 350 | POS-SRSAS',
  description: 'Formulario 350 - Declaración retenciones',
};

export default async function Form350ReportPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');
  const setupStatus = await checkCompanySetup(user.id);
  if (!setupStatus.isSetupComplete || !setupStatus.company) redirect('/protected');
  return (
    <RouteGuard requiredPermission="reports.read">
      <Form350ReportClient companyId={setupStatus.company.id} userId={user.id} />
    </RouteGuard>
  );
}

