// Tipos para el módulo de centros de costos

export type CostCenterType = 
  | 'ADMINISTRATIVE'  // Administrativo
  | 'SALES'          // Ventas
  | 'PRODUCTION'     // Producción
  | 'MARKETING'      // Marketing
  | 'HUMAN_RESOURCES' // Recursos Humanos
  | 'IT'             // Tecnología
  | 'FINANCE'        // Finanzas
  | 'LOGISTICS'      // Logística
  | 'PROJECT'        // Proyecto específico
  | 'OTHER';         // Otros

export type ChangeType = 
  | 'CREATED'
  | 'UPDATED'
  | 'ACTIVATED'
  | 'DEACTIVATED'
  | 'BUDGET_CHANGED';

export type TransactionType = 
  | 'SALE'
  | 'PURCHASE'
  | 'EXPENSE'
  | 'INCOME'
  | 'ADJUSTMENT';

export interface CostCenter {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description?: string;
  cost_center_type: CostCenterType;
  parent_id?: string;
  is_active: boolean;
  is_default: boolean;
  budget_limit?: number;
  responsible_person?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Relaciones
  parent?: CostCenter;
  children?: CostCenter[];
  assignments_count?: number;
  total_assigned?: number;
}

export interface CostCenterHistory {
  id: string;
  cost_center_id: string;
  change_type: ChangeType;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  change_reason?: string;
  changed_by?: string;
  changed_at: string;
  company_id: string;
  changed_by_user?: {
    first_name: string;
    last_name: string;
  };
}

export interface CostCenterAssignment {
  id: string;
  cost_center_id: string;
  transaction_type: TransactionType;
  transaction_id: string;
  amount: number;
  percentage: number;
  description?: string;
  assigned_at: string;
  assigned_by?: string;
  company_id: string;
  assigned_by_user?: {
    first_name: string;
    last_name: string;
  };
  cost_center?: CostCenter;
}

export interface CreateCostCenterData {
  code: string;
  name: string;
  description?: string;
  cost_center_type: CostCenterType;
  parent_id?: string;
  is_active?: boolean;
  budget_limit?: number;
  responsible_person?: string;
}

export interface UpdateCostCenterData {
  code?: string;
  name?: string;
  description?: string;
  cost_center_type?: CostCenterType;
  parent_id?: string;
  is_active?: boolean;
  budget_limit?: number;
  responsible_person?: string;
}

export interface CostCenterSummary {
  total_cost_centers: number;
  active_cost_centers: number;
  cost_center_types: Array<{
    type: CostCenterType;
    count: number;
    active_count: number;
  }>;
  total_budget: number;
  used_budget: number;
}

// Información de tipos de centros de costos para la UI
export interface CostCenterTypeInfo {
  type: CostCenterType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const getCostCenterTypeInfo = (type: CostCenterType): CostCenterTypeInfo => {
  const typeMap: Record<CostCenterType, CostCenterTypeInfo> = {
    ADMINISTRATIVE: {
      type: 'ADMINISTRATIVE',
      label: 'Administrativo',
      description: 'Gastos administrativos generales',
      icon: 'Building2',
      color: 'bg-blue-100 text-blue-800'
    },
    SALES: {
      type: 'SALES',
      label: 'Ventas',
      description: 'Actividades de ventas y comercialización',
      icon: 'TrendingUp',
      color: 'bg-green-100 text-green-800'
    },
    PRODUCTION: {
      type: 'PRODUCTION',
      label: 'Producción',
      description: 'Actividades de producción y manufactura',
      icon: 'Cog',
      color: 'bg-orange-100 text-orange-800'
    },
    MARKETING: {
      type: 'MARKETING',
      label: 'Marketing',
      description: 'Actividades de marketing y publicidad',
      icon: 'Megaphone',
      color: 'bg-purple-100 text-purple-800'
    },
    HUMAN_RESOURCES: {
      type: 'HUMAN_RESOURCES',
      label: 'Recursos Humanos',
      description: 'Actividades de RRHH y nómina',
      icon: 'Users',
      color: 'bg-pink-100 text-pink-800'
    },
    IT: {
      type: 'IT',
      label: 'Tecnología',
      description: 'Gastos de tecnología e informática',
      icon: 'Monitor',
      color: 'bg-cyan-100 text-cyan-800'
    },
    FINANCE: {
      type: 'FINANCE',
      label: 'Finanzas',
      description: 'Actividades financieras y contables',
      icon: 'Calculator',
      color: 'bg-emerald-100 text-emerald-800'
    },
    LOGISTICS: {
      type: 'LOGISTICS',
      label: 'Logística',
      description: 'Actividades de logística y almacén',
      icon: 'Truck',
      color: 'bg-amber-100 text-amber-800'
    },
    PROJECT: {
      type: 'PROJECT',
      label: 'Proyecto',
      description: 'Proyecto específico',
      icon: 'FolderOpen',
      color: 'bg-indigo-100 text-indigo-800'
    },
    OTHER: {
      type: 'OTHER',
      label: 'Otros',
      description: 'Otros centros de costos',
      icon: 'FileText',
      color: 'bg-gray-100 text-gray-800'
    }
  };

  return typeMap[type] || typeMap.OTHER;
};

// Función para formatear moneda
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Función para calcular porcentaje de uso del presupuesto
export const calculateBudgetUsage = (used: number, limit: number): {
  percentage: number;
  remaining: number;
  isOverBudget: boolean;
} => {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const remaining = Math.max(0, limit - used);
  const isOverBudget = used > limit;

  return {
    percentage: Math.round(percentage * 100) / 100,
    remaining,
    isOverBudget
  };
};

// Función para generar código automático
export const generateCostCenterCode = (type: CostCenterType, existingCodes: string[]): string => {
  const prefix = type.substring(0, 3).toUpperCase();
  let counter = 1;
  let code = `${prefix}${counter.toString().padStart(3, '0')}`;
  
  while (existingCodes.includes(code)) {
    counter++;
    code = `${prefix}${counter.toString().padStart(3, '0')}`;
  }
  
  return code;
};
