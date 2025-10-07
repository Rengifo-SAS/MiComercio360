// Servicio para gestión de usuarios y permisos
// lib/services/users-service.ts

import { createClient } from '@/lib/supabase/client';
import {
  UserProfile,
  CreateUserData,
  UpdateUserData,
  UserFilters,
  UserStats,
  UserExportData,
  validateUserData,
  UserRole,
  UserStatus
} from '@/lib/types/users';
import {
  Role,
  CreateRoleData,
  UpdateRoleData,
  RoleFilters,
  RoleStats,
  RoleExportData,
  validateRoleData
} from '@/lib/types/users';
import {
  Permission,
  PermissionFilters
} from '@/lib/types/users';

const supabase = createClient();

export class UsersService {
  // ===== GESTIÓN DE USUARIOS =====

  // Obtener todos los usuarios de la empresa
  static async getUsers(filters?: UserFilters): Promise<UserProfile[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se encontró la compañía del usuario');
      }

      let query = supabase
        .from('profiles')
        .select(`
          *,
          roles:user_roles(
            id,
            role_id,
            assigned_at,
            expires_at,
            is_active,
            role:roles(
              id,
              name,
              description,
              is_system_role
            )
          )
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      if (filters?.department) {
        query = query.eq('department', filters.department);
      }

      if (filters?.position) {
        query = query.eq('position', filters.position);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.created_from) {
        query = query.gte('created_at', filters.created_from);
      }

      if (filters?.created_to) {
        query = query.lte('created_at', filters.created_to);
      }

      if (filters?.last_login_from) {
        query = query.gte('last_login', filters.last_login_from);
      }

      if (filters?.last_login_to) {
        query = query.lte('last_login', filters.last_login_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Obtener permisos para cada usuario
      const usersWithPermissions = await Promise.all(
        (data || []).map(async (user) => {
          const { data: permissions } = await supabase
            .rpc('get_user_permissions', { p_user_id: user.id });

          return {
            ...user,
            permissions: permissions || []
          };
        })
      );

      return usersWithPermissions;
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
    }
  }

  // Obtener un usuario por ID
  static async getUser(id: string): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          roles:user_roles(
            id,
            role_id,
            assigned_at,
            expires_at,
            is_active,
            role:roles(
              id,
              name,
              description,
              is_system_role
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Obtener permisos del usuario
      const { data: permissions } = await supabase
        .rpc('get_user_permissions', { p_user_id: id });

      return {
        ...data,
        permissions: permissions || []
      };
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  // Crear nuevo usuario
  static async createUser(userData: CreateUserData): Promise<UserProfile> {
    try {
      // Validar datos
      const errors = validateUserData(userData);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se encontró la compañía del usuario');
      }

      // Verificar si el email ya existe en la tabla profiles
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', userData.email)
        .single();

      // Si encuentra un usuario existente, lanzar error
      if (existingUser && !checkError) {
        throw new Error(`Ya existe un usuario con el email: ${userData.email}`);
      }

      // Si hay un error que no sea "no encontrado", lanzarlo
      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Error verificando email: ${checkError.message}`);
      }

      // En desarrollo local, crear solo el perfil con un ID temporal
      // El usuario deberá registrarse manualmente con el email proporcionado
      const tempUserId = crypto.randomUUID();
      
      console.log('Creando usuario con ID temporal:', tempUserId);
      console.log('Datos del usuario:', {
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role
      });

      // Crear perfil usando inserción directa (solo para desarrollo)
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: tempUserId, // Usar ID temporal
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          phone: userData.phone || null,
          position: userData.position || null,
          department: userData.department || null,
          hire_date: userData.hire_date && userData.hire_date.trim() !== '' ? userData.hire_date : null,
          notes: userData.notes || null,
          timezone: userData.timezone || 'America/Bogota',
          language: userData.language || 'es',
          date_format: userData.date_format || 'DD/MM/YYYY',
          currency: userData.currency || 'COP',
          company_id: profile.company_id,
          created_by: user.id,
          updated_by: user.id,
          status: 'PENDING' // Estado pendiente hasta que se registre en auth
        })
        .select()
        .single();

      if (createError) throw createError;
      
      if (!newUser) throw new Error('No se pudo crear el usuario');

      // Asignar roles si se proporcionaron
      if (userData.role_ids && userData.role_ids.length > 0) {
        await this.assignRolesToUser(newUser.id, userData.role_ids);
      } else {
        // Asignar rol por defecto
        await supabase.rpc('assign_default_role_to_user', {
          p_user_id: newUser.id,
          p_company_id: profile.company_id
        });
      }

      // Registrar en auditoría
      await this.logUserAction(newUser.id, 'CREATE', 'user', newUser.id, null, userData);

      // Agregar información sobre cómo completar el registro
      const userWithRegistrationInfo = {
        ...newUser,
        registration_info: {
          needs_registration: true,
          registration_url: `/auth/register-existing`,
          message: 'El usuario debe completar su registro para poder hacer login'
        }
      };

      return userWithRegistrationInfo;
    } catch (error) {
      const errorInfo = {
        errorMessage: (error as Error)?.message || 'Error desconocido',
        errorCode: (error as any)?.code || 'UNKNOWN',
        errorDetails: (error as any)?.details || 'Sin detalles',
        errorHint: (error as any)?.hint || 'Sin sugerencias',
        errorStack: (error as Error)?.stack || 'Sin stack trace',
        userData: userData ? {
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role
        } : 'Sin datos de usuario',
        timestamp: new Date().toISOString()
      };
      
      console.error('Error creando usuario:', errorInfo);
      console.error('Error original:', error);
      
      // Crear un error más descriptivo
      const descriptiveError = new Error(
        `Error creando usuario: ${errorInfo.errorMessage} (Código: ${errorInfo.errorCode})`
      );
      (descriptiveError as any).originalError = error;
      (descriptiveError as any).errorInfo = errorInfo;
      
      throw descriptiveError;
    }
  }

  // Actualizar usuario
  static async updateUser(id: string, userData: UpdateUserData): Promise<UserProfile> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener datos actuales para auditoría
      const { data: currentUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      const { data: updatedUser, error } = await supabase
        .from('profiles')
        .update({
          ...userData,
          updated_by: user.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Actualizar roles si se proporcionaron
      if (userData.role_ids) {
        await this.updateUserRoles(id, userData.role_ids);
      }

      // Registrar en auditoría
      await this.logUserAction(id, 'UPDATE', 'user', id, currentUser, userData);

      return updatedUser;
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  // Eliminar usuario (soft delete)
  static async deleteUser(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener datos actuales para auditoría
      const { data: currentUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: false,
          status: 'INACTIVE',
          updated_by: user.id
        })
        .eq('id', id);

      if (error) throw error;

      // Registrar en auditoría
      await this.logUserAction(id, 'DELETE', 'user', id, currentUser, null);
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  }

  // ===== GESTIÓN DE ROLES =====

  // Obtener todos los roles de la empresa
  static async getRoles(filters?: RoleFilters): Promise<Role[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se encontró la compañía del usuario');
      }

      let query = supabase
        .from('roles')
        .select(`
          *,
          permissions:role_permissions(
            permission:permissions(*)
          )
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.is_system_role !== undefined) {
        query = query.eq('is_system_role', filters.is_system_role);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Obtener conteo de usuarios para cada rol
      const rolesWithUserCount = await Promise.all(
        (data || []).map(async (role) => {
          const { count } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .eq('role_id', role.id)
            .eq('is_active', true);

          return {
            ...role,
            user_count: count || 0
          };
        })
      );

      return rolesWithUserCount;
    } catch (error) {
      console.error('Error obteniendo roles:', error);
      throw error;
    }
  }

  // Crear nuevo rol
  static async createRole(roleData: CreateRoleData): Promise<Role> {
    try {
      // Validar datos
      const errors = validateRoleData(roleData);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se encontró la compañía del usuario');
      }

      // Crear rol
      const { data: newRole, error } = await supabase
        .from('roles')
        .insert({
          name: roleData.name,
          description: roleData.description,
          company_id: profile.company_id,
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Asignar permisos al rol
      if (roleData.permission_ids.length > 0) {
        await this.assignPermissionsToRole(newRole.id, roleData.permission_ids);
      }

      return newRole;
    } catch (error) {
      console.error('Error creando rol:', error);
      throw error;
    }
  }

  // Actualizar rol
  static async updateRole(id: string, roleData: UpdateRoleData): Promise<Role> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: updatedRole, error } = await supabase
        .from('roles')
        .update({
          ...roleData,
          updated_by: user.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Actualizar permisos si se proporcionaron
      if (roleData.permission_ids) {
        await this.assignPermissionsToRole(id, roleData.permission_ids);
      }

      return updatedRole;
    } catch (error) {
      console.error('Error actualizando rol:', error);
      throw error;
    }
  }

  // Eliminar rol
  static async deleteRole(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('roles')
        .update({
          is_active: false,
          updated_by: user.id
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error eliminando rol:', error);
      throw error;
    }
  }

  // ===== GESTIÓN DE PERMISOS =====

  // Obtener todos los permisos
  static async getPermissions(filters?: PermissionFilters): Promise<Permission[]> {
    try {
      let query = supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true })
        .order('action', { ascending: true })
        .order('resource', { ascending: true });

      // Aplicar filtros
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.module) {
        query = query.eq('module', filters.module);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.resource) {
        query = query.eq('resource', filters.resource);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo permisos:', error);
      throw error;
    }
  }

  // Crear nuevo permiso
  static async createPermission(permissionData: {
    name: string;
    description?: string;
    module: string;
    action: string;
    resource: string;
    is_active?: boolean;
  }): Promise<Permission> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: newPermission, error } = await supabase
        .from('permissions')
        .insert({
          ...permissionData,
          is_active: permissionData.is_active ?? true
        })
        .select()
        .single();

      if (error) throw error;
      return newPermission;
    } catch (error) {
      console.error('Error creando permiso:', error);
      throw error;
    }
  }

  // Actualizar permiso
  static async updatePermission(id: string, permissionData: {
    name?: string;
    description?: string;
    module?: string;
    action?: string;
    resource?: string;
    is_active?: boolean;
  }): Promise<Permission> {
    try {
      const { data: updatedPermission, error } = await supabase
        .from('permissions')
        .update(permissionData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedPermission;
    } catch (error) {
      console.error('Error actualizando permiso:', error);
      throw error;
    }
  }

  // Eliminar permiso
  static async deletePermission(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('permissions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error eliminando permiso:', error);
      throw error;
    }
  }

  // ===== FUNCIONES DE UTILIDAD =====

  // Asignar roles a usuario
  static async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Eliminar roles actuales
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Asignar nuevos roles
      if (roleIds.length > 0) {
        const userRoles = roleIds.map(roleId => ({
          user_id: userId,
          role_id: roleId,
          assigned_by: user.id
        }));

        const { error } = await supabase
          .from('user_roles')
          .insert(userRoles);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error asignando roles:', error);
      throw error;
    }
  }

  // Actualizar roles de usuario
  static async updateUserRoles(userId: string, roleIds: string[]): Promise<void> {
    await this.assignRolesToUser(userId, roleIds);
  }

  // Asignar permisos a rol
  static async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Eliminar permisos actuales
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      // Asignar nuevos permisos
      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId,
          granted_by: user.id
        }));

        const { error } = await supabase
          .from('role_permissions')
          .insert(rolePermissions);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error asignando permisos:', error);
      throw error;
    }
  }

  // Verificar si usuario tiene permiso
  static async userHasPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('user_has_permission', {
          p_user_id: userId,
          p_permission_name: permissionName
        });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error verificando permiso:', error);
      return false;
    }
  }

  // Obtener permisos de usuario
  static async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_permissions', { p_user_id: userId });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo permisos de usuario:', error);
      return [];
    }
  }

  // Registrar acción en auditoría
  static async logUserAction(
    userId: string,
    action: string,
    resource?: string,
    resourceId?: string,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // No registrar si no hay usuario autenticado

      await supabase
        .from('user_audit_log')
        .insert({
          user_id: userId,
          action,
          resource,
          resource_id: resourceId,
          old_values: oldValues,
          new_values: newValues
        });
    } catch (error) {
      console.error('Error registrando auditoría:', error);
      // No lanzar error para no afectar la operación principal
    }
  }

  // ===== ESTADÍSTICAS =====

  // Obtener estadísticas de usuarios
  static async getUserStats(): Promise<UserStats> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se encontró la compañía del usuario');
      }

      // Obtener estadísticas básicas
      const { data: users } = await supabase
        .from('profiles')
        .select('status, role, department, last_login, created_at')
        .eq('company_id', profile.company_id);

      if (!users) return this.getEmptyUserStats();

      const stats: UserStats = {
        total_users: users.length,
        active_users: users.filter(u => u.status === 'ACTIVE').length,
        inactive_users: users.filter(u => u.status === 'INACTIVE').length,
        suspended_users: users.filter(u => u.status === 'SUSPENDED').length,
        pending_users: users.filter(u => u.status === 'PENDING').length,
        users_by_role: {} as Record<UserRole, number>,
        users_by_department: {},
        recent_logins: users.filter(u => u.last_login && new Date(u.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        new_users_this_month: users.filter(u => new Date(u.created_at) > new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length
      };

      // Contar por rol
      users.forEach(user => {
        if (user.role) {
          stats.users_by_role[user.role as UserRole] = (stats.users_by_role[user.role as UserRole] || 0) + 1;
        }
        if (user.department) {
          stats.users_by_department[user.department] = (stats.users_by_department[user.department] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return this.getEmptyUserStats();
    }
  }

  private static getEmptyUserStats(): UserStats {
    return {
      total_users: 0,
      active_users: 0,
      inactive_users: 0,
      suspended_users: 0,
      pending_users: 0,
      users_by_role: {} as Record<UserRole, number>,
      users_by_department: {},
      recent_logins: 0,
      new_users_this_month: 0
    };
  }

  // ===== EXPORTACIÓN =====

  // Exportar usuarios
  static async exportUsers(filters?: UserFilters): Promise<UserExportData[]> {
    try {
      const users = await this.getUsers(filters);
      
      return users.map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name || '',
        role: user.role,
        status: user.status,
        phone: user.phone || '',
        position: user.position || '',
        department: user.department || '',
        hire_date: user.hire_date || '',
        last_login: user.last_login || '',
        created_at: user.created_at
      }));
    } catch (error) {
      console.error('Error exportando usuarios:', error);
      throw error;
    }
  }
}
