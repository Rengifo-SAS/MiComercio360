import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { PrintTemplatesService } from '@/lib/services/print-templates-service';
import { PrintTemplatesPageClient } from '@/components/print-templates-page-client';
import { RouteGuard } from '@/components/route-guard';

export default async function PrintTemplatesPage() {
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

  // Cargar plantillas existentes de la empresa
  let templates: any[] = [];
  try {
    templates = await PrintTemplatesService.getTemplates(
      setupStatus.company!.id
    );
  } catch (error) {
    console.error('Error cargando plantillas:', error);
  }

  return (
    <RouteGuard requiredPermission="settings.print_templates">
      <PrintTemplatesPageClient
        companyId={setupStatus.company!.id}
        initialTemplates={templates}
      />
    </RouteGuard>
  );
}
