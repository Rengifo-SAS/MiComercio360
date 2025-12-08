/**
 * Servicio de caché para configuración por defecto
 * Almacena numeraciones, clientes y configuración para uso offline
 */

import { offlineStorage } from './offline-storage-service';

export interface DefaultConfig {
  company_id: string;
  default_numeration_id?: string;
  default_numeration_name?: string;
  default_customer_id?: string;
  default_customer_name?: string;
  cash_account_id?: string;
  updated_at: string;
}

class ConfigCacheService {
  private CACHE_KEY = 'default_config';
  private CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

  /**
   * Guarda la configuración por defecto en caché
   */
  async saveDefaultConfig(config: DefaultConfig): Promise<void> {
    const cacheData = {
      ...config,
      updated_at: new Date().toISOString(),
    };
    await offlineStorage.saveMetadata(this.CACHE_KEY, cacheData);
  }

  /**
   * Obtiene la configuración por defecto del caché
   */
  async getDefaultConfig(companyId: string): Promise<DefaultConfig | null> {
    const cached = await offlineStorage.getMetadata(this.CACHE_KEY);
    
    if (!cached || cached.company_id !== companyId) {
      return null;
    }

    // Verificar si el caché ha expirado
    const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
    if (cacheAge > this.CACHE_TTL) {
      return null;
    }

    return cached;
  }

  /**
   * Actualiza la configuración por defecto desde el servidor
   */
  async refreshDefaultConfig(
    companyId: string,
    supabase: any
  ): Promise<DefaultConfig> {
    try {
      // Obtener numeración por defecto
      const { data: numerations } = await supabase
        .from('numerations')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('document_type', 'invoice')
        .eq('is_active', true)
        .order('name')
        .limit(1)
        .maybeSingle();

      // Obtener cliente "Contado" o primer cliente genérico
      const { data: customers } = await supabase
        .from('customers')
        .select('id, business_name')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .or('business_name.ilike.%contado%,business_name.ilike.%generico%')
        .limit(1)
        .maybeSingle();

      // Obtener cuenta de caja por defecto
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .or('account_name.ilike.%efectivo%,account_name.ilike.%caja%,account_name.ilike.%pos%')
        .limit(1)
        .maybeSingle();

      const config: DefaultConfig = {
        company_id: companyId,
        default_numeration_id: numerations?.id,
        default_numeration_name: numerations?.name || 'Facturas de Venta Principal',
        default_customer_id: customers?.id,
        default_customer_name: customers?.business_name || 'Cliente Contado',
        cash_account_id: accounts?.id,
        updated_at: new Date().toISOString(),
      };

      await this.saveDefaultConfig(config);
      return config;
    } catch (error) {
      console.error('Error refreshing default config:', error);
      
      // Intentar devolver caché antiguo si existe
      const cached = await offlineStorage.getMetadata(this.CACHE_KEY);
      if (cached && cached.company_id === companyId) {
        return cached;
      }

      // Fallback a valores por defecto
      return {
        company_id: companyId,
        default_numeration_name: 'Facturas de Venta Principal',
        default_customer_name: 'Cliente Contado',
        updated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Obtiene o actualiza la configuración por defecto
   */
  async getOrRefreshConfig(
    companyId: string,
    supabase: any,
    forceRefresh: boolean = false
  ): Promise<DefaultConfig> {
    if (!forceRefresh) {
      const cached = await this.getDefaultConfig(companyId);
      if (cached) {
        return cached;
      }
    }

    return await this.refreshDefaultConfig(companyId, supabase);
  }

  /**
   * Limpia la caché de configuración
   */
  async clearCache(): Promise<void> {
    await offlineStorage.saveMetadata(this.CACHE_KEY, null);
  }
}

// Exportar instancia singleton
export const configCache = new ConfigCacheService();
