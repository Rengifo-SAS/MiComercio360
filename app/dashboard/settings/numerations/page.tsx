import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import { NumerationsPageClient } from '@/components/numerations-page-client';
import { DocumentType } from '@/lib/types/numerations';

export default async function NumerationsPage() {
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

  // Obtener numeraciones iniciales
  const { data: numerations } = await supabase
    .from('numerations')
    .select('*')
    .eq('company_id', setupStatus.company!.id)
    .order('document_type')
    .order('name');

  // Obtener resumen de numeraciones (comentado por ahora)
  // const { data: summary } = await supabase
  //   .from('numerations')
  //   .select('document_type, is_active')
  //   .eq('company_id', setupStatus.company!.id);

  // Calcular estadísticas
  const totalNumerations = numerations?.length || 0;
  const activeNumerations = numerations?.filter((n) => n.is_active).length || 0;

  const documentTypeStats =
    numerations?.reduce((acc, numeration) => {
      const type = numeration.document_type;
      if (!acc[type]) {
        acc[type] = { total: 0, active: 0 };
      }
      acc[type].total++;
      if (numeration.is_active) acc[type].active++;
      return acc;
    }, {} as Record<string, { total: number; active: number }>) || {};

  const initialData = {
    numerations: numerations || [],
    summary: {
      total_numerations: totalNumerations,
      active_numerations: activeNumerations,
      document_types: Object.entries(documentTypeStats).map(
        ([type, stats]) => ({
          type: type as DocumentType,
          count: stats.total,
          active_count: stats.active,
        })
      ),
    },
  };

  return (
    <NumerationsPageClient
      companyId={setupStatus.company!.id}
      initialData={initialData}
    />
  );
}
