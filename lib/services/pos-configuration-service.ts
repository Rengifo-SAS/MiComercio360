import { createClient } from '@/lib/supabase/client';

export interface POSConfiguration {
  id?: string;
  company_id: string;
  user_id: string;
  terminal_name: string;
  default_account_id?: string;
  default_customer_id?: string;
  default_numeration_id?: string;
  print_paper_size?: 'letter' | 'thermal-80mm';
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreatePOSConfigurationData {
  company_id: string;
  terminal_name: string;
  default_account_id?: string | null;
  default_customer_id?: string | null;
  default_numeration_id?: string | null;
  print_paper_size?: 'letter' | 'thermal-80mm';
}

export interface UpdatePOSConfigurationData {
  terminal_name?: string;
  default_account_id?: string | null;
  default_customer_id?: string | null;
  default_numeration_id?: string | null;
  print_paper_size?: 'letter' | 'thermal-80mm';
}

export class POSConfigurationService {
  private static supabase = createClient();

  // Obtener configuración del POS para un usuario y empresa
  static async getConfiguration(companyId: string): Promise<POSConfiguration | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await this.supabase
      .from('pos_configurations')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error obteniendo configuración POS:', error);
      throw new Error('Error al obtener la configuración del POS');
    }

    return data;
  }

  // Crear configuración del POS
  static async createConfiguration(configData: CreatePOSConfigurationData): Promise<POSConfiguration> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await this.supabase
      .from('pos_configurations')
      .insert({
        ...configData,
        user_id: user.id,
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando configuración POS:', error);
      throw new Error('Error al crear la configuración del POS');
    }

    return data;
  }

  // Actualizar configuración del POS
  static async updateConfiguration(configId: string, configData: UpdatePOSConfigurationData): Promise<POSConfiguration> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await this.supabase
      .from('pos_configurations')
      .update({
        ...configData,
        updated_by: user.id
      })
      .eq('id', configId)
      .eq('user_id', user.id) // Asegurar que solo el usuario propietario puede actualizar
      .select()
      .single();

    if (error) {
      console.error('Error actualizando configuración POS:', error);
      throw new Error('Error al actualizar la configuración del POS');
    }

    return data;
  }

  // Crear o actualizar configuración del POS (upsert)
  static async saveConfiguration(companyId: string, configData: UpdatePOSConfigurationData): Promise<POSConfiguration> {
    try {
      // Intentar obtener la configuración existente
      const existingConfig = await this.getConfiguration(companyId);

      if (existingConfig) {
        // Si existe, actualizarla
        return await this.updateConfiguration(existingConfig.id!, configData);
      } else {
        // Si no existe, crearla
        return await this.createConfiguration({
          company_id: companyId,
          terminal_name: configData.terminal_name || 'Terminal Principal',
          default_account_id: configData.default_account_id,
          default_customer_id: configData.default_customer_id,
          default_numeration_id: configData.default_numeration_id,
          print_paper_size: configData.print_paper_size || 'thermal-80mm'
        });
      }
    } catch (error) {
      console.error('Error guardando configuración POS:', error);
      throw new Error('Error al guardar la configuración del POS');
    }
  }

  // Eliminar configuración del POS
  static async deleteConfiguration(configId: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase
      .from('pos_configurations')
      .delete()
      .eq('id', configId)
      .eq('user_id', user.id); // Asegurar que solo el usuario propietario puede eliminar

    if (error) {
      console.error('Error eliminando configuración POS:', error);
      throw new Error('Error al eliminar la configuración del POS');
    }
  }

  // Obtener configuraciones de todos los usuarios de una empresa (solo para admins/managers)
  static async getCompanyConfigurations(companyId: string): Promise<POSConfiguration[]> {
    const { data, error } = await this.supabase
      .from('pos_configurations')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo configuraciones POS de la empresa:', error);
      throw new Error('Error al obtener las configuraciones del POS');
    }

    return data || [];
  }
}
