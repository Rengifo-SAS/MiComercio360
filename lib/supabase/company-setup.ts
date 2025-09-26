import { createClient } from './server';

export interface CompanySetupStatus {
  hasProfile: boolean;
  hasCompany: boolean;
  isSetupComplete: boolean;
  profile?: {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    company_id: string;
  };
  company?: {
    id: string;
    name: string;
    business_name: string | null;
    tax_id: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string;
    regimen_tributario: string | null;
    codigo_ciiu: string | null;
    tipo_documento: string;
  };
}

/**
 * Verifica si el usuario tiene configurados los datos de compañía
 * @param userId ID del usuario autenticado
 * @returns Estado de configuración de la compañía
 */
export async function checkCompanySetup(userId: string): Promise<CompanySetupStatus> {
  const supabase = await createClient();

  try {
    console.log('Verificando configuración para usuario:', userId);
    
    // Verificar si el usuario tiene un perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('Resultado de perfil:', { profile, profileError });

    if (profileError || !profile) {
      console.log('No se encontró perfil');
      return {
        hasProfile: false,
        hasCompany: false,
        isSetupComplete: false,
      };
    }

    // Si tiene perfil, verificar si tiene compañía asociada
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();

    console.log('Resultado de compañía:', { company, companyError });

    if (companyError || !company) {
      console.log('No se encontró compañía');
      return {
        hasProfile: true,
        hasCompany: false,
        isSetupComplete: false,
        profile,
      };
    }

    // Verificar si la compañía tiene datos básicos completos
    const isCompanyComplete = !!(
      company.name &&
      company.business_name &&
      company.tax_id &&
      company.email &&
      company.phone &&
      company.address &&
      company.city &&
      company.state &&
      company.postal_code &&
      company.regimen_tributario &&
      company.tipo_documento
    );

    console.log('Estado de configuración:', {
      hasProfile: true,
      hasCompany: true,
      isSetupComplete: isCompanyComplete,
      companyFields: {
        name: !!company.name,
        business_name: !!company.business_name,
        tax_id: !!company.tax_id,
        email: !!company.email,
        phone: !!company.phone,
        address: !!company.address,
        city: !!company.city,
        state: !!company.state,
        postal_code: !!company.postal_code,
        regimen_tributario: !!company.regimen_tributario,
        tipo_documento: !!company.tipo_documento,
      }
    });

    return {
      hasProfile: true,
      hasCompany: true,
      isSetupComplete: isCompanyComplete,
      profile,
      company,
    };
  } catch (error) {
    console.error('Error checking company setup:', error);
    return {
      hasProfile: false,
      hasCompany: false,
      isSetupComplete: false,
    };
  }
}

/**
 * Crea un perfil básico para el usuario
 * @param userId ID del usuario
 * @param email Email del usuario
 * @param fullName Nombre completo del usuario
 * @returns Perfil creado
 */
export async function createUserProfile(
  userId: string,
  email: string,
  fullName?: string
) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName,
      role: 'admin', // El primer usuario es admin por defecto
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating profile: ${error.message}`);
  }

  return profile;
}

/**
 * Crea una nueva compañía
 * @param companyData Datos de la compañía
 * @param userId ID del usuario que crea la compañía
 * @returns Compañía creada
 */
export async function createCompany(companyData: {
  name: string;
  business_name: string;
  tax_id: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  regimen_tributario?: string;
  codigo_ciiu?: string;
  tipo_documento?: string;
}, userId: string) {
  const supabase = await createClient();

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      ...companyData,
      country: companyData.country || 'Colombia',
      regimen_tributario: companyData.regimen_tributario || 'Simplificado',
      tipo_documento: companyData.tipo_documento || 'NIT',
      is_active: true,
    })
    .select()
    .single();

  if (companyError) {
    throw new Error(`Error creating company: ${companyError.message}`);
  }

  // Actualizar el perfil del usuario con el company_id
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ company_id: company.id })
    .eq('id', userId);

  if (profileError) {
    throw new Error(`Error updating profile: ${profileError.message}`);
  }

  return company;
}
