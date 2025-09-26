import { supabase } from '@/lib/supabase';
import { 
  CostCenter, 
  CostCenterHistory, 
  CostCenterAssignment,
  CreateCostCenterData, 
  UpdateCostCenterData, 
  CostCenterSummary,
  CostCenterType,
  ChangeType,
  TransactionType
} from '@/lib/types/cost-centers';

export class CostCentersService {
  // Obtener todos los centros de costos de una empresa
  static async getCostCenters(companyId: string): Promise<CostCenter[]> {
    const { data, error } = await supabase
      .from('cost_centers')
      .select(`
        *,
        parent:cost_centers!parent_id(*),
        children:cost_centers!parent_id(*)
      `)
      .eq('company_id', companyId)
      .order('cost_center_type')
      .order('code');

    if (error) throw error;
    return data || [];
  }

  // Obtener un centro de costos específico
  static async getCostCenter(id: string): Promise<CostCenter> {
    const { data, error } = await supabase
      .from('cost_centers')
      .select(`
        *,
        parent:cost_centers!parent_id(*),
        children:cost_centers!parent_id(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Crear un nuevo centro de costos
  static async createCostCenter(costCenterData: CreateCostCenterData): Promise<CostCenter> {
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
      .from('cost_centers')
      .insert({
        ...costCenterData,
        company_id: profile.company_id,
        created_by: user.id,
        is_active: costCenterData.is_active !== false
      })
      .select(`
        *,
        parent:cost_centers!parent_id(*),
        children:cost_centers!parent_id(*)
      `)
      .single();

    if (error) throw error;

    // Registrar en el historial
    await this.recordCostCenterChange(data.id, 'CREATED', null, {
      code: data.code,
      name: data.name,
      cost_center_type: data.cost_center_type
    }, 'Creación manual');

    return data;
  }

  // Actualizar un centro de costos
  static async updateCostCenter(id: string, costCenterData: UpdateCostCenterData): Promise<CostCenter> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener el centro de costos actual para el historial
    const currentCostCenter = await this.getCostCenter(id);

    const { data, error } = await supabase
      .from('cost_centers')
      .update({
        ...costCenterData,
        updated_by: user.id
      })
      .eq('id', id)
      .select(`
        *,
        parent:cost_centers!parent_id(*),
        children:cost_centers!parent_id(*)
      `)
      .single();

    if (error) throw error;

    // Registrar cambio en el historial
    await this.recordCostCenterChange(id, 'UPDATED', {
      code: currentCostCenter.code,
      name: currentCostCenter.name,
      cost_center_type: currentCostCenter.cost_center_type,
      is_active: currentCostCenter.is_active,
      budget_limit: currentCostCenter.budget_limit
    }, {
      code: data.code,
      name: data.name,
      cost_center_type: data.cost_center_type,
      is_active: data.is_active,
      budget_limit: data.budget_limit
    }, 'Actualización manual');

    return data;
  }

  // Eliminar un centro de costos
  static async deleteCostCenter(id: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar si el centro de costos es por defecto
      const costCenter = await this.getCostCenter(id);
      
      if (costCenter.is_default) {
        return {
          success: false,
          message: 'No se puede eliminar un centro de costos por defecto del sistema.'
        };
      }

      // Verificar si tiene centros de costos hijos
      const { data: children, error: childrenError } = await supabase
        .from('cost_centers')
        .select('id, name')
        .eq('parent_id', id)
        .limit(1);

      if (childrenError) throw childrenError;

      if (children && children.length > 0) {
        return {
          success: false,
          message: `No se puede eliminar este centro de costos porque tiene centros de costos dependientes: "${children[0].name}".`
        };
      }

      // Verificar si tiene asignaciones
      const { data: assignments, error: assignmentsError } = await supabase
        .from('cost_center_assignments')
        .select('id')
        .eq('cost_center_id', id)
        .limit(1);

      if (assignmentsError) throw assignmentsError;

      if (assignments && assignments.length > 0) {
        return {
          success: false,
          message: 'No se puede eliminar este centro de costos porque tiene asignaciones de gastos o ingresos.'
        };
      }

      // Si se puede eliminar, proceder con la eliminación
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      return {
        success: true,
        message: 'Centro de costos eliminado exitosamente'
      };
    } catch (error) {
      console.error('Error eliminando centro de costos:', error);
      return {
        success: false,
        message: `Error al eliminar el centro de costos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Obtener historial de un centro de costos
  static async getCostCenterHistory(costCenterId: string): Promise<CostCenterHistory[]> {
    const { data, error } = await supabase
      .from('cost_center_history')
      .select(`
        *,
        changed_by_user:profiles!cost_center_history_changed_by_fkey(
          first_name,
          last_name
        )
      `)
      .eq('cost_center_id', costCenterId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Registrar cambio en el historial
  static async recordCostCenterChange(
    costCenterId: string, 
    changeType: ChangeType,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    reason: string = 'Cambio manual'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener company_id del centro de costos
    const costCenter = await this.getCostCenter(costCenterId);

    const { error } = await supabase
      .from('cost_center_history')
      .insert({
        cost_center_id: costCenterId,
        change_type: changeType,
        old_values: oldValues,
        new_values: newValues,
        change_reason: reason,
        changed_by: user.id,
        company_id: costCenter.company_id
      });

    if (error) throw error;
  }

  // Obtener resumen de centros de costos
  static async getCostCentersSummary(companyId: string): Promise<CostCenterSummary> {
    // Obtener todos los centros de costos
    const costCenters = await this.getCostCenters(companyId);

    // Calcular estadísticas
    const totalCostCenters = costCenters.length;
    const activeCostCenters = costCenters.filter(cc => cc.is_active).length;

    // Agrupar por tipo de centro de costos
    const costCenterTypes = costCenters.reduce((acc, cc) => {
      const existing = acc.find(cct => cct.type === cc.cost_center_type);
      if (existing) {
        existing.count++;
        if (cc.is_active) existing.active_count++;
      } else {
        acc.push({
          type: cc.cost_center_type,
          count: 1,
          active_count: cc.is_active ? 1 : 0
        });
      }
      return acc;
    }, [] as Array<{ type: CostCenterType; count: number; active_count: number }>);

    // Calcular presupuesto total y usado
    const totalBudget = costCenters.reduce((sum, cc) => sum + (cc.budget_limit || 0), 0);
    const usedBudget = costCenters.reduce((sum, cc) => sum + (cc.total_assigned || 0), 0);

    return {
      total_cost_centers: totalCostCenters,
      active_cost_centers: activeCostCenters,
      cost_center_types: costCenterTypes,
      total_budget: totalBudget,
      used_budget: usedBudget
    };
  }

  // Activar/desactivar centro de costos
  static async toggleCostCenterStatus(id: string): Promise<CostCenter> {
    const costCenter = await this.getCostCenter(id);
    const newStatus = !costCenter.is_active;
    
    const result = await this.updateCostCenter(id, { is_active: newStatus });
    
    // Registrar cambio de estado en el historial
    await this.recordCostCenterChange(
      id, 
      newStatus ? 'ACTIVATED' : 'DEACTIVATED',
      { is_active: costCenter.is_active },
      { is_active: newStatus },
      newStatus ? 'Activación manual' : 'Desactivación manual'
    );

    return result;
  }

  // Duplicar un centro de costos
  static async duplicateCostCenter(id: string, newCode: string, newName: string): Promise<CostCenter> {
    const originalCostCenter = await this.getCostCenter(id);
    
    const duplicateData: CreateCostCenterData = {
      code: newCode,
      name: newName,
      description: originalCostCenter.description,
      cost_center_type: originalCostCenter.cost_center_type,
      parent_id: originalCostCenter.parent_id,
      is_active: false, // Inactivo por defecto
      budget_limit: originalCostCenter.budget_limit,
      responsible_person: originalCostCenter.responsible_person
    };

    return this.createCostCenter(duplicateData);
  }

  // Validar si existe un centro de costos con el mismo código
  static async checkCostCenterExists(
    companyId: string, 
    code: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('cost_centers')
      .select('id')
      .eq('company_id', companyId)
      .eq('code', code);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data && data.length > 0);
  }

  // Obtener centros de costos activos por tipo
  static async getActiveCostCentersByType(
    companyId: string, 
    costCenterType: CostCenterType
  ): Promise<CostCenter[]> {
    const { data, error } = await supabase
      .from('cost_centers')
      .select(`
        *,
        parent:cost_centers!parent_id(*),
        children:cost_centers!parent_id(*)
      `)
      .eq('company_id', companyId)
      .eq('cost_center_type', costCenterType)
      .eq('is_active', true)
      .order('code');

    if (error) throw error;
    return data || [];
  }

  // Obtener todos los centros de costos activos
  static async getActiveCostCenters(companyId: string): Promise<CostCenter[]> {
    const { data, error } = await supabase
      .from('cost_centers')
      .select(`
        *,
        parent:cost_centers!parent_id(*),
        children:cost_centers!parent_id(*)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('cost_center_type')
      .order('code');

    if (error) throw error;
    return data || [];
  }

  // Obtener asignaciones de un centro de costos
  static async getCostCenterAssignments(costCenterId: string): Promise<CostCenterAssignment[]> {
    const { data, error } = await supabase
      .from('cost_center_assignments')
      .select(`
        *,
        assigned_by_user:profiles!cost_center_assignments_assigned_by_fkey(
          first_name,
          last_name
        ),
        cost_center:cost_centers(*)
      `)
      .eq('cost_center_id', costCenterId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Crear asignación de gasto/ingreso a centro de costos
  static async createAssignment(
    costCenterId: string,
    transactionType: TransactionType,
    transactionId: string,
    amount: number,
    percentage: number = 100,
    description?: string
  ): Promise<CostCenterAssignment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener company_id del centro de costos
    const costCenter = await this.getCostCenter(costCenterId);

    const { data, error } = await supabase
      .from('cost_center_assignments')
      .insert({
        cost_center_id: costCenterId,
        transaction_type: transactionType,
        transaction_id: transactionId,
        amount,
        percentage,
        description,
        assigned_by: user.id,
        company_id: costCenter.company_id
      })
      .select(`
        *,
        assigned_by_user:profiles!cost_center_assignments_assigned_by_fkey(
          first_name,
          last_name
        ),
        cost_center:cost_centers(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Crear centros de costos por defecto para una empresa
  static async createDefaultCostCenters(companyId: string): Promise<void> {
    const { error } = await supabase.rpc('create_default_cost_centers_for_company', {
      p_company_id: companyId
    });

    if (error) throw error;
  }
}
