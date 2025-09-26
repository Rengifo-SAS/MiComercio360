import { supabase } from '@/lib/supabase';
import { 
  Numeration, 
  NumerationHistory, 
  CreateNumerationData, 
  UpdateNumerationData, 
  NumerationSummary,
  DocumentType 
} from '@/lib/types/numerations';

export class NumerationsService {
  // Obtener todas las numeraciones de una empresa
  static async getNumerations(companyId: string): Promise<Numeration[]> {
    const { data, error } = await supabase
      .from('numerations')
      .select('*')
      .eq('company_id', companyId)
      .order('document_type')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Obtener una numeración específica
  static async getNumeration(id: string): Promise<Numeration> {
    const { data, error } = await supabase
      .from('numerations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Crear una nueva numeración
  static async createNumeration(numerationData: CreateNumerationData): Promise<Numeration> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener company_id del perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile?.company_id) throw new Error('Usuario no asociado a una empresa');

    const { data, error } = await supabase
      .from('numerations')
      .insert({
        ...numerationData,
        company_id: profile.company_id,
        created_by: user.id,
        current_number: numerationData.current_number || 0,
        number_length: numerationData.number_length || 6,
        suffix: numerationData.suffix || '',
        is_active: numerationData.is_active !== false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Actualizar una numeración
  static async updateNumeration(id: string, numerationData: UpdateNumerationData): Promise<Numeration> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('numerations')
      .update({
        ...numerationData,
        updated_by: user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Verificar si una numeración es la única disponible para su tipo de documento
  static async isOnlyNumerationForType(id: string): Promise<boolean> {
    try {
      // Obtener la numeración para conocer su tipo y empresa
      const { data: numeration, error: numerationError } = await supabase
        .from('numerations')
        .select('document_type, company_id')
        .eq('id', id)
        .single();

      if (numerationError) throw numerationError;

      // Contar cuántas numeraciones existen para este tipo de documento en la empresa
      const { data: count, error: countError } = await supabase
        .from('numerations')
        .select('id', { count: 'exact' })
        .eq('company_id', numeration.company_id)
        .eq('document_type', numeration.document_type);

      if (countError) throw countError;

      return (count?.length || 0) <= 1;
    } catch (error) {
      console.error('Error verificando si es la única numeración:', error);
      return false;
    }
  }

  // Obtener información completa para validar eliminación
  static async getDeletionValidationInfo(id: string): Promise<{
    canDelete: boolean;
    isUsed: boolean;
    isOnlyForType: boolean;
    totalUses: number;
    lastUsed?: string;
    reason?: string;
  }> {
    try {
      const [isUsed, isOnlyForType, usageInfo] = await Promise.all([
        this.isNumerationUsed(id),
        this.isOnlyNumerationForType(id),
        this.getNumerationUsageInfo(id)
      ]);

      let canDelete = true;
      let reason = '';

      if (isUsed) {
        canDelete = false;
        reason = 'No se puede eliminar una numeración que ya ha sido utilizada. Esto podría afectar la integridad de los documentos existentes.';
      } else if (isOnlyForType) {
        canDelete = false;
        reason = 'No se puede eliminar la única numeración disponible para este tipo de documento. Debe existir al menos una numeración por tipo.';
      }

      return {
        canDelete,
        isUsed,
        isOnlyForType,
        totalUses: usageInfo.totalUses,
        lastUsed: usageInfo.lastUsed,
        reason
      };
    } catch (error) {
      console.error('Error obteniendo información de validación de eliminación:', error);
      return {
        canDelete: false,
        isUsed: false,
        isOnlyForType: false,
        totalUses: 0,
        reason: 'Error al validar la eliminación de la numeración'
      };
    }
  }

  // Eliminar una numeración (con validaciones)
  static async deleteNumeration(id: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validar si se puede eliminar
      const validation = await this.getDeletionValidationInfo(id);
      
      if (!validation.canDelete) {
        return {
          success: false,
          message: validation.reason || 'No se puede eliminar esta numeración'
        };
      }

      // Si se puede eliminar, proceder con la eliminación
      const { error } = await supabase
        .from('numerations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      return {
        success: true,
        message: 'Numeración eliminada exitosamente'
      };
    } catch (error) {
      console.error('Error eliminando numeración:', error);
      return {
        success: false,
        message: `Error al eliminar la numeración: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Obtener el siguiente número de una numeración
  static async getNextNumber(
    companyId: string, 
    documentType: DocumentType, 
    name?: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('get_next_number', {
      p_company_id: companyId,
      p_document_type: documentType,
      p_name: name || null
    });

    if (error) throw error;
    return data;
  }

  // Verificar si una numeración ha sido utilizada (tiene historial de uso)
  static async isNumerationUsed(id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('numeration_history')
      .select('id')
      .eq('numeration_id', id)
      .neq('change_reason', 'Creación automática de numeración por defecto')
      .limit(1);

    if (error) throw error;
    return (data && data.length > 0);
  }

  // Obtener información de uso de una numeración
  static async getNumerationUsageInfo(id: string): Promise<{
    isUsed: boolean;
    totalUses: number;
    lastUsed?: string;
    canReset: boolean;
  }> {
    try {
      // Obtener historial de uso (excluyendo la creación automática)
      const { data: usageHistory, error: historyError } = await supabase
        .from('numeration_history')
        .select('changed_at, change_reason')
        .eq('numeration_id', id)
        .neq('change_reason', 'Creación automática de numeración por defecto')
        .order('changed_at', { ascending: false });

      if (historyError) throw historyError;

      const isUsed = (usageHistory && usageHistory.length > 0);
      const totalUses = usageHistory?.length || 0;
      const lastUsed = isUsed ? usageHistory[0].changed_at : undefined;

      return {
        isUsed,
        totalUses,
        lastUsed,
        canReset: !isUsed
      };
    } catch (error) {
      console.error('Error obteniendo información de uso de numeración:', error);
      return {
        isUsed: false,
        totalUses: 0,
        canReset: false
      };
    }
  }

  // Resetear una numeración (solo si no ha sido utilizada)
  static async resetNumeration(
    id: string, 
    newNumber: number = 0, 
    reason: string = 'Reseteo manual'
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar si la numeración ha sido utilizada
      const isUsed = await this.isNumerationUsed(id);
      
      if (isUsed) {
        return {
          success: false,
          message: 'No se puede resetear una numeración que ya ha sido utilizada. Esto podría causar números de documento duplicados y afectar la integridad contable.'
        };
      }

      // Si no ha sido utilizada, proceder con el reseteo
      const { data, error } = await supabase.rpc('reset_numeration', {
        p_numeration_id: id,
        p_new_number: newNumber,
        p_reason: reason
      });

      if (error) throw error;
      
      return {
        success: data,
        message: data ? 'Numeración reseteada exitosamente' : 'Error al resetear la numeración'
      };
    } catch (error) {
      console.error('Error reseteando numeración:', error);
      return {
        success: false,
        message: `Error al resetear la numeración: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Obtener historial de una numeración
  static async getNumerationHistory(numerationId: string): Promise<NumerationHistory[]> {
    const { data, error } = await supabase
      .from('numeration_history')
      .select(`
        *,
        changed_by_user:profiles!numeration_history_changed_by_fkey(
          first_name,
          last_name
        )
      `)
      .eq('numeration_id', numerationId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Obtener resumen de numeraciones
  static async getNumerationsSummary(companyId: string): Promise<NumerationSummary> {
    // Obtener todas las numeraciones
    const numerations = await this.getNumerations(companyId);

    // Calcular estadísticas
    const totalNumerations = numerations.length;
    const activeNumerations = numerations.filter(n => n.is_active).length;

    // Agrupar por tipo de documento
    const documentTypes = numerations.reduce((acc, numeration) => {
      const existing = acc.find(dt => dt.type === numeration.document_type);
      if (existing) {
        existing.count++;
        if (numeration.is_active) existing.active_count++;
      } else {
        acc.push({
          type: numeration.document_type,
          count: 1,
          active_count: numeration.is_active ? 1 : 0
        });
      }
      return acc;
    }, [] as Array<{ type: DocumentType; count: number; active_count: number }>);

    return {
      total_numerations: totalNumerations,
      active_numerations: activeNumerations,
      document_types: documentTypes
    };
  }

  // Activar/desactivar numeración
  static async toggleNumerationStatus(id: string): Promise<Numeration> {
    const numeration = await this.getNumeration(id);
    return this.updateNumeration(id, { is_active: !numeration.is_active });
  }

  // Obtener numeraciones activas por tipo de documento
  static async getActiveNumerationsByType(
    companyId: string, 
    documentType: DocumentType
  ): Promise<Numeration[]> {
    const { data, error } = await supabase
      .from('numerations')
      .select('*')
      .eq('company_id', companyId)
      .eq('document_type', documentType)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Duplicar una numeración
  static async duplicateNumeration(id: string, newName: string): Promise<Numeration> {
    const originalNumeration = await this.getNumeration(id);
    
    const duplicateData: CreateNumerationData = {
      document_type: originalNumeration.document_type,
      name: newName,
      prefix: originalNumeration.prefix,
      current_number: 0, // Resetear a 0
      number_length: originalNumeration.number_length,
      suffix: originalNumeration.suffix,
      is_active: false, // Inactiva por defecto
      description: originalNumeration.description
    };

    return this.createNumeration(duplicateData);
  }

  // Validar si existe una numeración con el mismo nombre y tipo
  static async checkNumerationExists(
    companyId: string, 
    documentType: DocumentType, 
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('numerations')
      .select('id')
      .eq('company_id', companyId)
      .eq('document_type', documentType)
      .eq('name', name);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data && data.length > 0);
  }

  // Crear numeraciones por defecto para una empresa
  static async createDefaultNumerations(companyId: string): Promise<void> {
    const { error } = await supabase.rpc('create_default_numerations_for_company', {
      p_company_id: companyId
    });

    if (error) throw error;
  }

  // Obtener numeraciones por defecto de una empresa
  static async getDefaultNumerations(companyId: string): Promise<Numeration[]> {
    if (!companyId) {
      console.error('Company ID is required for getDefaultNumerations');
      return [];
    }

    console.log(`Buscando numeraciones por defecto para companyId: ${companyId}`);

    try {
      // Primero verificar si existen numeraciones para esta empresa
      const { data: allNumerations, error: allError } = await supabase
        .from('numerations')
        .select('id, name, document_type, is_active')
        .eq('company_id', companyId);

      if (allError) {
        console.error('Error verificando numeraciones existentes:', {
          error: allError,
          errorMessage: allError.message,
          errorCode: allError.code,
          errorDetails: allError.details,
          errorHint: allError.hint,
          companyId
        });
        return [];
      }

      console.log(`Numeraciones encontradas para la empresa:`, allNumerations);

      // Buscar la numeración específica "Facturas de Venta Principal"
      const specificNumeration = allNumerations?.find(n => n.name === 'Facturas de Venta Principal');
      
      if (specificNumeration) {
        console.log('Encontrada numeración específica:', specificNumeration);
        
        // Obtener los datos completos de la numeración específica
        const { data: fullData, error: fullError } = await supabase
          .from('numerations')
          .select('*')
          .eq('id', specificNumeration.id)
          .single();

        if (fullError) {
          console.error('Error obteniendo datos completos de numeración específica:', {
            error: fullError,
            errorMessage: fullError.message,
            errorCode: fullError.code,
            companyId
          });
          return [];
        }

        return [fullData];
      }

      // Si no se encuentra la numeración específica, buscar cualquier numeración activa
      console.log('No se encontró numeración "Facturas de Venta Principal", buscando numeraciones activas...');
      
      const activeNumerations = allNumerations?.filter(n => n.is_active) || [];
      
      if (activeNumerations.length > 0) {
        console.log('Numeraciones activas encontradas:', activeNumerations);
        
        // Obtener los datos completos de la primera numeración activa
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('numerations')
          .select('*')
          .eq('id', activeNumerations[0].id)
          .single();

        if (fallbackError) {
          console.error('Error obteniendo datos completos de numeración activa:', {
            error: fallbackError,
            errorMessage: fallbackError.message,
            errorCode: fallbackError.code,
            companyId
          });
          return [];
        }

        return [fallbackData];
      }

      console.log('No se encontraron numeraciones activas para la empresa');
      return [];
    } catch (error) {
      console.error('Error in getDefaultNumerations:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        companyId
      });
      return [];
    }
  }

  // Obtener estadísticas de uso de numeraciones
  static async getUsageStatistics(companyId: string): Promise<{
    total_numbers_generated: number;
    most_used_type: DocumentType | null;
    least_used_type: DocumentType | null;
    recent_activity: Array<{
      type: DocumentType;
      name: string;
      last_used: string;
      numbers_generated: number;
    }>;
  }> {
    // Obtener historial de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: history, error: historyError } = await supabase
      .from('numeration_history')
      .select(`
        numeration_id,
        new_number,
        changed_at,
        numerations!inner(
          document_type,
          name
        )
      `)
      .eq('company_id', companyId)
      .gte('changed_at', thirtyDaysAgo.toISOString())
      .order('changed_at', { ascending: false });

    if (historyError) throw historyError;

    // Calcular estadísticas
    const totalNumbersGenerated = history?.length || 0;
    
    // Agrupar por tipo de documento
    const typeStats = history?.reduce((acc, record) => {
      const numeration = Array.isArray(record.numerations) ? record.numerations[0] : record.numerations;
      const type = numeration?.document_type;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          last_used: record.changed_at,
          name: numeration?.name || 'Desconocido'
        };
      }
      acc[type].count++;
      if (record.changed_at > acc[type].last_used) {
        acc[type].last_used = record.changed_at;
      }
      return acc;
    }, {} as Record<string, { count: number; last_used: string; name: string }>) || {};

    const typeEntries = Object.entries(typeStats);
    const mostUsedType = typeEntries.reduce((max, [type, stats]) => 
      stats.count > max.count ? { type: type as DocumentType, ...stats } : max, 
      { type: null as DocumentType | null, count: 0, last_used: '', name: '' }
    );

    const leastUsedType = typeEntries.reduce((min, [type, stats]) => 
      stats.count < min.count ? { type: type as DocumentType, ...stats } : min, 
      { type: null as DocumentType | null, count: Infinity, last_used: '', name: '' }
    );

    const recentActivity = typeEntries
      .map(([type, stats]) => ({
        type: type as DocumentType,
        name: stats.name,
        last_used: stats.last_used,
        numbers_generated: stats.count
      }))
      .sort((a, b) => new Date(b.last_used).getTime() - new Date(a.last_used).getTime())
      .slice(0, 5);

    return {
      total_numbers_generated: totalNumbersGenerated,
      most_used_type: mostUsedType.type,
      least_used_type: leastUsedType.count === Infinity ? null : leastUsedType.type,
      recent_activity: recentActivity
    };
  }
}
