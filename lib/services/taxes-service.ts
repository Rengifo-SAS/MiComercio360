import { createClient } from '@/lib/supabase/client';
import { 
  Tax, 
  TaxHistory, 
  CreateTaxData, 
  UpdateTaxData, 
  TaxSummary,
  TaxType 
} from '@/lib/types/taxes';

export class TaxesService {
  private static supabase = createClient();
  // Obtener todos los impuestos de una empresa
  static async getTaxes(companyId: string): Promise<Tax[]> {
    const { data, error } = await this.supabase
      .from('taxes')
      .select('*')
      .eq('company_id', companyId)
      .order('tax_type')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Obtener un impuesto específico
  static async getTax(id: string): Promise<Tax> {
    const { data, error } = await this.supabase
      .from('taxes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Crear un nuevo impuesto
  static async createTax(taxData: CreateTaxData): Promise<Tax> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener company_id del perfil del usuario
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile?.company_id) throw new Error('Usuario no asociado a una empresa');

    const { data, error } = await this.supabase
      .from('taxes')
      .insert({
        ...taxData,
        company_id: profile.company_id,
        created_by: user.id,
        is_inclusive: taxData.is_inclusive || false,
        is_active: taxData.is_active !== false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Actualizar un impuesto
  static async updateTax(id: string, taxData: UpdateTaxData): Promise<Tax> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener el impuesto actual para registrar el cambio en el historial
    const currentTax = await this.getTax(id);

    const { data, error } = await this.supabase
      .from('taxes')
      .update({
        ...taxData,
        updated_by: user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Registrar cambio en el historial si cambió el porcentaje
    if (taxData.percentage !== undefined && taxData.percentage !== currentTax.percentage) {
      await this.recordTaxChange(id, currentTax.percentage, taxData.percentage, 'Actualización manual');
    }

    return data;
  }

  // Verificar si es el único impuesto que queda
  static async isOnlyTaxRemaining(id: string): Promise<boolean> {
    const tax = await this.getTax(id);
    
    const { data: otherTaxes, error } = await this.supabase
      .from('taxes')
      .select('id')
      .eq('company_id', tax.company_id)
      .neq('id', id);

    if (error) throw error;
    
    return !otherTaxes || otherTaxes.length === 0;
  }

  // Eliminar un impuesto
  static async deleteTax(id: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar si el impuesto es por defecto
      const tax = await this.getTax(id);
      
      if (tax.is_default) {
        return {
          success: false,
          message: 'No se puede eliminar un impuesto por defecto del sistema.'
        };
      }

      // Verificar si es el único impuesto que queda
      const isOnlyTax = await this.isOnlyTaxRemaining(id);
      if (isOnlyTax) {
        return {
          success: false,
          message: 'No se puede eliminar este impuesto porque es el único que queda en la empresa.'
        };
      }

      // Verificar si el impuesto está siendo usado en productos
      const { data: products, error: productsError } = await this.supabase
        .from('products')
        .select('id, name')
        .eq('tax_id', id)
        .limit(1);

      if (productsError) throw productsError;

      if (products && products.length > 0) {
        return {
          success: false,
          message: `No se puede eliminar este impuesto porque está siendo usado por el producto "${products[0].name}".`
        };
      }

      // Si se puede eliminar, proceder con la eliminación
      const { error } = await this.supabase
        .from('taxes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      return {
        success: true,
        message: 'Impuesto eliminado exitosamente'
      };
    } catch (error) {
      console.error('Error eliminando impuesto:', error);
      return {
        success: false,
        message: `Error al eliminar el impuesto: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Obtener historial de un impuesto
  static async getTaxHistory(taxId: string): Promise<TaxHistory[]> {
    const { data, error } = await this.supabase
      .from('tax_history')
      .select(`
        *,
        changed_by_user:profiles!tax_history_changed_by_fkey(
          first_name,
          last_name
        )
      `)
      .eq('tax_id', taxId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Registrar cambio en el historial
  static async recordTaxChange(
    taxId: string, 
    oldPercentage: number, 
    newPercentage: number, 
    reason: string = 'Cambio manual'
  ): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener company_id del impuesto
    const tax = await this.getTax(taxId);

    const { error } = await this.supabase
      .from('tax_history')
      .insert({
        tax_id: taxId,
        old_percentage: oldPercentage,
        new_percentage: newPercentage,
        change_reason: reason,
        changed_by: user.id,
        company_id: tax.company_id
      });

    if (error) throw error;
  }

  // Obtener resumen de impuestos
  static async getTaxesSummary(companyId: string): Promise<TaxSummary> {
    // Obtener todos los impuestos
    const taxes = await this.getTaxes(companyId);

    // Calcular estadísticas
    const totalTaxes = taxes.length;
    const activeTaxes = taxes.filter(t => t.is_active).length;

    // Agrupar por tipo de impuesto
    const taxTypes = taxes.reduce((acc, tax) => {
      const existing = acc.find(tt => tt.type === tax.tax_type);
      if (existing) {
        existing.count++;
        if (tax.is_active) existing.active_count++;
      } else {
        acc.push({
          type: tax.tax_type,
          count: 1,
          active_count: tax.is_active ? 1 : 0
        });
      }
      return acc;
    }, [] as Array<{ type: TaxType; count: number; active_count: number }>);

    return {
      total_taxes: totalTaxes,
      active_taxes: activeTaxes,
      tax_types: taxTypes
    };
  }

  // Activar/desactivar impuesto
  static async toggleTaxStatus(id: string): Promise<Tax> {
    const tax = await this.getTax(id);
    return this.updateTax(id, { is_active: !tax.is_active });
  }

  // Duplicar un impuesto
  static async duplicateTax(id: string, newName: string): Promise<Tax> {
    const originalTax = await this.getTax(id);
    
    const duplicateData: CreateTaxData = {
      name: newName,
      description: originalTax.description,
      tax_type: originalTax.tax_type,
      percentage: originalTax.percentage,
      is_inclusive: originalTax.is_inclusive,
      is_active: false // Inactivo por defecto
    };

    return this.createTax(duplicateData);
  }

  // Validar si existe un impuesto con el mismo nombre
  static async checkTaxExists(
    companyId: string, 
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = this.supabase
      .from('taxes')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', name);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data && data.length > 0);
  }

  // Obtener impuestos activos por tipo
  static async getActiveTaxesByType(
    companyId: string, 
    taxType: TaxType
  ): Promise<Tax[]> {
    const { data, error } = await this.supabase
      .from('taxes')
      .select('*')
      .eq('company_id', companyId)
      .eq('tax_type', taxType)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Obtener todos los impuestos activos
  static async getActiveTaxes(companyId: string): Promise<Tax[]> {
    const { data, error } = await this.supabase
      .from('taxes')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('tax_type')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Obtener información de validación para eliminación
  static async getDeletionValidationInfo(id: string): Promise<{
    canDelete: boolean;
    isDefault: boolean;
    isOnlyTax: boolean;
    isUsed: boolean;
    usedByProduct?: string;
    reason?: string;
  }> {
    try {
      const tax = await this.getTax(id);
      
      // Verificar si es por defecto
      if (tax.is_default) {
        return {
          canDelete: false,
          isDefault: true,
          isOnlyTax: false,
          isUsed: false,
          reason: 'No se puede eliminar un impuesto por defecto del sistema.'
        };
      }

      // Verificar si es el único impuesto
      const isOnlyTax = await this.isOnlyTaxRemaining(id);
      if (isOnlyTax) {
        return {
          canDelete: false,
          isDefault: false,
          isOnlyTax: true,
          isUsed: false,
          reason: 'No se puede eliminar este impuesto porque es el único que queda en la empresa.'
        };
      }

      // Verificar si está siendo usado
      const { data: products, error: productsError } = await this.supabase
        .from('products')
        .select('id, name')
        .eq('tax_id', id)
        .limit(1);

      if (productsError) throw productsError;

      if (products && products.length > 0) {
        return {
          canDelete: false,
          isDefault: false,
          isOnlyTax: false,
          isUsed: true,
          usedByProduct: products[0].name,
          reason: `No se puede eliminar este impuesto porque está siendo usado por el producto "${products[0].name}".`
        };
      }

      // Si pasa todas las validaciones, se puede eliminar
      return {
        canDelete: true,
        isDefault: false,
        isOnlyTax: false,
        isUsed: false
      };
    } catch (error) {
      console.error('Error validando eliminación:', error);
      return {
        canDelete: false,
        isDefault: false,
        isOnlyTax: false,
        isUsed: false,
        reason: 'Error al validar la eliminación'
      };
    }
  }

  // Crear impuestos por defecto para una empresa
  static async createDefaultTaxes(companyId: string): Promise<void> {
    const { error } = await this.supabase.rpc('create_default_taxes_for_company', {
      p_company_id: companyId
    });

    if (error) throw error;
  }
}
