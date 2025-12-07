// Tipos para el módulo de usuarios y permisos
// lib/types/users.ts

export type UserRole = 'admin' | 'manager' | 'employee' | 'cashier';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

export interface Permission {
  id: string;
  name: string;
  description?: string;
  module: string;
  action: string;
  resource: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  permissions?: Permission[];
  user_count?: number;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by?: string;
  expires_at?: string;
  is_active: boolean;
  role?: Role;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: Record<string, any>;
  is_active: boolean;
  last_activity: string;
  created_at: string;
  expires_at: string;
}

export interface UserAuditLog {
  id: string;
  user_id: string;
  action: string;
  resource?: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company_id: string;
  phone?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  last_login?: string;
  login_count: number;
  status: UserStatus;
  two_factor_enabled: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  notes?: string;
  timezone: string;
  language: string;
  date_format: string;
  currency: string;
  created_by?: string;
  updated_by?: string;
  roles?: UserRoleAssignment[];
  permissions?: Permission[];
}

export interface CreateUserData {
  email: string;
  full_name: string;
  role: UserRole;
  password?: string;
  phone?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  notes?: string;
  timezone?: string;
  language?: string;
  date_format?: string;
  currency?: string;
  role_ids?: string[];
}

export interface UpdateUserData {
  full_name?: string;
  role?: UserRole;
  phone?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  notes?: string;
  timezone?: string;
  language?: string;
  date_format?: string;
  currency?: string;
  status?: UserStatus;
  two_factor_enabled?: boolean;
  role_ids?: string[];
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permission_ids: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permission_ids?: string[];
  is_active?: boolean;
}

export interface UserFilters {
  search?: string;
  status?: UserStatus;
  role?: UserRole;
  department?: string;
  position?: string;
  is_active?: boolean;
  created_from?: string;
  created_to?: string;
  last_login_from?: string;
  last_login_to?: string;
}

export interface RoleFilters {
  search?: string;
  is_system_role?: boolean;
  is_active?: boolean;
}

export interface PermissionFilters {
  search?: string;
  module?: string;
  action?: string;
  resource?: string;
  is_active?: boolean;
}

// Constantes para módulos del sistema
export const SYSTEM_MODULES = [
  'products',
  'customers',
  'sales',
  'inventory',
  'suppliers',
  'purchases',
  'reports',
  'settings',
  'dashboard',
  'audit'
] as const;

export const SYSTEM_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'export',
  'print',
  'adjust',
  'transfer',
  'manage'
] as const;

// Constantes para roles
export const USER_ROLES: Record<UserRole, { label: string; description: string; color: string }> = {
  admin: {
    label: 'Administrador',
    description: 'Administración de la empresa',
    color: 'bg-purple-500'
  },
  manager: {
    label: 'Gerente',
    description: 'Gestión operativa',
    color: 'bg-blue-500'
  },
  employee: {
    label: 'Empleado',
    description: 'Operaciones básicas',
    color: 'bg-green-500'
  },
  cashier: {
    label: 'Cajero',
    description: 'Punto de venta',
    color: 'bg-orange-500'
  }
};

// Constantes para estados
export const USER_STATUSES: Record<UserStatus, { label: string; description: string; color: string }> = {
  ACTIVE: {
    label: 'Activo',
    description: 'Usuario activo en el sistema',
    color: 'bg-green-100 text-green-800'
  },
  INACTIVE: {
    label: 'Inactivo',
    description: 'Usuario inactivo',
    color: 'bg-gray-100 text-gray-800'
  },
  SUSPENDED: {
    label: 'Suspendido',
    description: 'Usuario suspendido temporalmente',
    color: 'bg-red-100 text-red-800'
  },
  PENDING: {
    label: 'Pendiente',
    description: 'Pendiente de activación',
    color: 'bg-yellow-100 text-yellow-800'
  }
};

// Funciones de utilidad
export function getUserRoleInfo(role: UserRole) {
  return USER_ROLES[role] || { label: role, description: '', color: 'bg-gray-500' };
}

export function getUserStatusInfo(status: UserStatus) {
  return USER_STATUSES[status] || { label: status, description: '', color: 'bg-gray-100 text-gray-800' };
}

export function getRoleIcon(role: UserRole) {
  const icons = {
    admin: 'Shield',
    manager: 'UserCheck',
    employee: 'User',
    cashier: 'CreditCard'
  };
  return icons[role] || 'User';
}

export function getPermissionIcon(module: string) {
  const icons = {
    products: 'Package',
    customers: 'Users',
    sales: 'ShoppingCart',
    inventory: 'Warehouse',
    suppliers: 'Truck',
    purchases: 'ShoppingBag',
    reports: 'BarChart3',
    settings: 'Settings',
    dashboard: 'LayoutDashboard',
    audit: 'Shield'
  };
  return icons[module as keyof typeof icons] || 'File';
}

// Validaciones
export function validateUserData(data: CreateUserData): string[] {
  const errors: string[] = [];

  if (!data.email || !data.email.includes('@')) {
    errors.push('El email es requerido y debe ser válido');
  }

  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.push('El nombre completo es requerido (mínimo 2 caracteres)');
  }

  if (!data.role) {
    errors.push('El rol es requerido');
  }

  if (data.phone && !/^[\d\s\-\+\(\)]+$/.test(data.phone)) {
    errors.push('El teléfono debe contener solo números y caracteres válidos');
  }

  return errors;
}

export function validateRoleData(data: CreateRoleData): string[] {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('El nombre del rol es requerido (mínimo 2 caracteres)');
  }

  if (!data.permission_ids || data.permission_ids.length === 0) {
    errors.push('Debe asignar al menos un permiso al rol');
  }

  return errors;
}

// Tipos para estadísticas
export interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  suspended_users: number;
  pending_users: number;
  users_by_role: Record<UserRole, number>;
  users_by_department: Record<string, number>;
  recent_logins: number;
  new_users_this_month: number;
}

export interface RoleStats {
  total_roles: number;
  system_roles: number;
  custom_roles: number;
  active_roles: number;
  inactive_roles: number;
  roles_with_users: number;
  empty_roles: number;
}

// Tipos para exportación
export interface UserExportData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  phone?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  last_login?: string;
  created_at: string;
}

export interface RoleExportData {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  is_active: boolean;
  permission_count: number;
  user_count: number;
  created_at: string;
}
