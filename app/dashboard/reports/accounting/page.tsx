import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReportAccountingPageClient } from '@/components/report-accounting-page-client';

export const metadata: Metadata = {
  title: 'Reportes Contables',
  description: 'Análisis contable y financiero con gráficas y métricas',
};

export default async function AccountingReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Obtener perfil del usuario con información de la compañía
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'company_id, companies!profiles_company_id_fkey(business_name, tax_id)'
    )
    .eq('id', user.id)
    .single();

  // Log para debugging
  if (profileError) {
    console.error('Error fetching profile:', profileError);
  }

  if (!profile?.company_id) {
    console.error(
      'No company_id found for user:',
      user.id,
      'Profile:',
      profile
    );
    redirect('/dashboard');
  }

  const company = Array.isArray(profile.companies)
    ? profile.companies[0]
    : profile.companies;

  return (
    <ReportAccountingPageClient
      companyId={profile.company_id}
      userId={user.id}
      companyName={company?.business_name || 'Sin nombre'}
      companyNit={company?.tax_id || 'Sin NIT'}
    />
  );
}
