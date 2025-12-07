import { supabase } from '@/lib/supabase';

export interface Company {
  id: string;
  name: string;
  business_name?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  logo_url?: string;
  is_active: boolean;
  regimen_tributario?: string;
  codigo_ciiu?: string;
  tipo_documento?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateCompanyData {
  name?: string;
  business_name?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  logo_url?: string;
  is_active?: boolean;
  regimen_tributario?: string;
  codigo_ciiu?: string;
  tipo_documento?: string;
}

export class CompanyService {
  static async getCompany(companyId: string): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCompany(companyId: string, companyData: UpdateCompanyData): Promise<Company> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('companies')
      .update({
        ...companyData,
        updated_by: user.id
      })
      .eq('id', companyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async uploadLogo(companyId: string, file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}-logo-${Date.now()}.${fileExt}`;
    const filePath = `company-logos/${fileName}`;

    try {
      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // Si el bucket no existe, crear un enlace temporal o usar una alternativa
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('El bucket de almacenamiento no está configurado. Contacta al administrador.');
        }
        throw uploadError;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      // Actualizar logo_url en la empresa
      await this.updateCompany(companyId, { logo_url: publicUrl });

      return publicUrl;
    } catch (error: any) {
      console.error('Error subiendo logo:', error);
      throw new Error('No se pudo subir el logo. Verifica que el almacenamiento esté configurado correctamente.');
    }
  }

  static async deleteLogo(companyId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    try {
      // Obtener la empresa para obtener la URL del logo
      const company = await this.getCompany(companyId);
      
      if (company.logo_url) {
        // Extraer el path del archivo de la URL
        const url = new URL(company.logo_url);
        const filePath = url.pathname.split('/').slice(3).join('/'); // Remover /storage/v1/object/company-assets/

        // Eliminar archivo del storage
        const { error: deleteError } = await supabase.storage
          .from('company-assets')
          .remove([filePath]);

        if (deleteError) {
          console.warn('Error eliminando logo del storage:', deleteError);
          // Continuar con la eliminación del campo logo_url aunque falle el storage
        }
      }

      // Actualizar empresa para remover logo_url
      await this.updateCompany(companyId, { logo_url: undefined });
    } catch (error: any) {
      console.error('Error eliminando logo:', error);
      // Aún así, intentar remover el logo_url de la empresa
      try {
        await this.updateCompany(companyId, { logo_url: undefined });
      } catch (updateError) {
        throw new Error('No se pudo eliminar el logo. Verifica que el almacenamiento esté configurado correctamente.');
      }
    }
  }
}
