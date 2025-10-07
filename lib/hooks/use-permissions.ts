// Hook para manejo de permisos
// lib/hooks/use-permissions.ts

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UsersService } from '@/lib/services/users-service';
import { Permission } from '@/lib/types/users';

const supabase = createClient();

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar permisos del usuario actual
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPermissions([]);
        return;
      }

      // Primero intentar cargar permisos desde la base de datos
      let userPermissions: Permission[] = [];
      try {
        userPermissions = await UsersService.getUserPermissions(user.id);
      } catch (err) {
        console.log('Error cargando permisos desde BD:', err);
      }

      // Verificar si el usuario es admin por email o por rol en la base de datos
      let isAdminUser = user.email === 'johanrengifo78@gmail.com' || 
                       user.email?.includes('admin') ||
                       user.email?.includes('administrator');

      // También verificar en la base de datos si el usuario tiene rol de admin
      if (!isAdminUser) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          isAdminUser = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN';
        } catch (err) {
          // Si no se puede obtener el perfil, continuar con la verificación por email
          console.log('No se pudo obtener el perfil del usuario, usando verificación por email');
        }
      }

      // Si es admin, dar permisos completos siempre
      if (isAdminUser) {
        const adminPermissions: Permission[] = [
          // Configuración y administración
          { id: '1', name: 'settings.users', module: 'settings', action: 'users', resource: '*', description: 'Gestión de usuarios', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '2', name: 'settings.roles', module: 'settings', action: 'roles', resource: '*', description: 'Gestión de roles', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '3', name: 'settings.permissions', module: 'settings', action: 'permissions', resource: '*', description: 'Gestión de permisos', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '4', name: 'settings.company', module: 'settings', action: 'company', resource: '*', description: 'Configuración de empresa', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '5', name: 'settings.numerations', module: 'settings', action: 'numerations', resource: '*', description: 'Gestión de numeraciones', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '6', name: 'settings.taxes', module: 'settings', action: 'taxes', resource: '*', description: 'Gestión de impuestos', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '7', name: 'settings.cost_centers', module: 'settings', action: 'cost_centers', resource: '*', description: 'Gestión de centros de costo', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                        { id: '8', name: 'settings.print_templates', module: 'settings', action: 'print_templates', resource: '*', description: 'Gestión de plantillas de impresión', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                        { id: '9', name: 'settings.payment_methods', module: 'settings', action: 'payment_methods', resource: '*', description: 'Gestión de métodos de pago', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          
          // Productos
          { id: '9', name: 'products.read', module: 'products', action: 'read', resource: '*', description: 'Ver productos', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '10', name: 'products.create', module: 'products', action: 'create', resource: '*', description: 'Crear productos', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '11', name: 'products.update', module: 'products', action: 'update', resource: '*', description: 'Actualizar productos', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '12', name: 'products.delete', module: 'products', action: 'delete', resource: '*', description: 'Eliminar productos', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '13', name: 'products.export', module: 'products', action: 'export', resource: '*', description: 'Exportar productos', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          
          // Ventas
          { id: '14', name: 'sales.read', module: 'sales', action: 'read', resource: '*', description: 'Ver ventas', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '15', name: 'sales.create', module: 'sales', action: 'create', resource: '*', description: 'Crear ventas', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '16', name: 'sales.update', module: 'sales', action: 'update', resource: '*', description: 'Actualizar ventas', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '17', name: 'sales.delete', module: 'sales', action: 'delete', resource: '*', description: 'Eliminar ventas', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '18', name: 'sales.export', module: 'sales', action: 'export', resource: '*', description: 'Exportar ventas', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          
          // Clientes
          { id: '19', name: 'customers.read', module: 'customers', action: 'read', resource: '*', description: 'Ver clientes', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '20', name: 'customers.create', module: 'customers', action: 'create', resource: '*', description: 'Crear clientes', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '21', name: 'customers.update', module: 'customers', action: 'update', resource: '*', description: 'Actualizar clientes', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '22', name: 'customers.delete', module: 'customers', action: 'delete', resource: '*', description: 'Eliminar clientes', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '23', name: 'customers.export', module: 'customers', action: 'export', resource: '*', description: 'Exportar clientes', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          
          // Inventario
          { id: '24', name: 'inventory.read', module: 'inventory', action: 'read', resource: '*', description: 'Ver inventario', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '25', name: 'inventory.create', module: 'inventory', action: 'create', resource: '*', description: 'Crear inventario', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '26', name: 'inventory.update', module: 'inventory', action: 'update', resource: '*', description: 'Actualizar inventario', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '27', name: 'inventory.delete', module: 'inventory', action: 'delete', resource: '*', description: 'Eliminar inventario', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '28', name: 'inventory.export', module: 'inventory', action: 'export', resource: '*', description: 'Exportar inventario', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '29', name: 'inventory.adjust', module: 'inventory', action: 'adjust', resource: '*', description: 'Ajustar inventario', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          
          // Categorías
          { id: '30', name: 'categories.read', module: 'categories', action: 'read', resource: '*', description: 'Ver categorías', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '31', name: 'categories.create', module: 'categories', action: 'create', resource: '*', description: 'Crear categorías', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '32', name: 'categories.update', module: 'categories', action: 'update', resource: '*', description: 'Actualizar categorías', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '33', name: 'categories.delete', module: 'categories', action: 'delete', resource: '*', description: 'Eliminar categorías', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          
          // Proveedores
          { id: '34', name: 'suppliers.read', module: 'suppliers', action: 'read', resource: '*', description: 'Ver proveedores', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '35', name: 'suppliers.create', module: 'suppliers', action: 'create', resource: '*', description: 'Crear proveedores', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '36', name: 'suppliers.update', module: 'suppliers', action: 'update', resource: '*', description: 'Actualizar proveedores', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '37', name: 'suppliers.delete', module: 'suppliers', action: 'delete', resource: '*', description: 'Eliminar proveedores', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          
          // Almacenes
          { id: '38', name: 'warehouses.read', module: 'warehouses', action: 'read', resource: '*', description: 'Ver almacenes', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '39', name: 'warehouses.create', module: 'warehouses', action: 'create', resource: '*', description: 'Crear almacenes', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '40', name: 'warehouses.update', module: 'warehouses', action: 'update', resource: '*', description: 'Actualizar almacenes', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '41', name: 'warehouses.delete', module: 'warehouses', action: 'delete', resource: '*', description: 'Eliminar almacenes', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '42', name: 'warehouses.transfer', module: 'warehouses', action: 'transfer', resource: '*', description: 'Transferir entre almacenes', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          
          // Cuentas
          { id: '43', name: 'accounts.read', module: 'accounts', action: 'read', resource: '*', description: 'Ver cuentas', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '44', name: 'accounts.create', module: 'accounts', action: 'create', resource: '*', description: 'Crear cuentas', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '45', name: 'accounts.update', module: 'accounts', action: 'update', resource: '*', description: 'Actualizar cuentas', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '46', name: 'accounts.delete', module: 'accounts', action: 'delete', resource: '*', description: 'Eliminar cuentas', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          
          // Reportes
          { id: '47', name: 'reports.read', module: 'reports', action: 'read', resource: '*', description: 'Ver reportes', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '48', name: 'reports.export', module: 'reports', action: 'export', resource: '*', description: 'Exportar reportes', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          
          // Dashboard
          { id: '49', name: 'dashboard.read', module: 'dashboard', action: 'read', resource: '*', description: 'Ver dashboard', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ];
        setPermissions(adminPermissions);
        return;
      }

      // Usar los permisos cargados desde la base de datos
      setPermissions(userPermissions);
    } catch (err) {
      console.error('Error cargando permisos:', err);
      setError('Error al cargar permisos');
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar si el usuario tiene un permiso específico
  const hasPermission = useCallback((permissionName: string): boolean => {
    // Si está cargando, asumir que no tiene permisos temporalmente
    if (loading) return false;
    
    // Si no hay permisos cargados, asumir que no tiene permisos
    if (permissions.length === 0) return false;
    
    return permissions.some(p => p.name === permissionName && p.is_active);
  }, [permissions, loading]);

  // Verificar si el usuario tiene algún permiso de un módulo
  const hasModulePermission = useCallback((module: string): boolean => {
    return permissions.some(p => p.module === module && p.is_active);
  }, [permissions]);

  // Verificar si el usuario tiene un permiso específico de acción en un módulo
  const hasActionPermission = useCallback((module: string, action: string): boolean => {
    return permissions.some(p => 
      p.module === module && 
      p.action === action && 
      p.is_active
    );
  }, [permissions]);

  // Verificar si el usuario tiene un permiso específico de recurso
  const hasResourcePermission = useCallback((module: string, action: string, resource: string): boolean => {
    return permissions.some(p => 
      p.module === module && 
      p.action === action && 
      p.resource === resource && 
      p.is_active
    );
  }, [permissions]);

  // Obtener todos los permisos de un módulo
  const getModulePermissions = useCallback((module: string): Permission[] => {
    return permissions.filter(p => p.module === module && p.is_active);
  }, [permissions]);

  // Obtener todos los permisos de una acción específica
  const getActionPermissions = useCallback((action: string): Permission[] => {
    return permissions.filter(p => p.action === action && p.is_active);
  }, [permissions]);

  // Verificar si el usuario es administrador
  const isAdmin = useCallback((): boolean => {
    return hasPermission('settings.users') || hasPermission('settings.roles');
  }, [hasPermission]);

  // Verificar si el usuario es super administrador
  const isSuperAdmin = useCallback((): boolean => {
    return hasPermission('settings.permissions');
  }, [hasPermission]);

  // Cargar permisos al montar el componente
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  return {
    permissions,
    loading,
    error,
    hasPermission,
    hasModulePermission,
    hasActionPermission,
    hasResourcePermission,
    getModulePermissions,
    getActionPermissions,
    isAdmin,
    isSuperAdmin,
    reloadPermissions: loadPermissions,
  };
}

// Hook para verificar un permiso específico
export function usePermission(permissionName: string) {
  const { hasPermission, loading } = usePermissions();
  
  return {
    hasPermission: hasPermission(permissionName),
    loading,
  };
}

// Hook para verificar permisos de módulo
export function useModulePermissions(module: string) {
  const { hasModulePermission, getModulePermissions, loading } = usePermissions();
  
  return {
    hasPermission: hasModulePermission(module),
    permissions: getModulePermissions(module),
    loading,
  };
}

// Hook para verificar permisos de acción
export function useActionPermission(module: string, action: string) {
  const { hasActionPermission, loading } = usePermissions();
  
  return {
    hasPermission: hasActionPermission(module, action),
    loading,
  };
}

// Hook para verificar permisos de recurso
export function useResourcePermission(module: string, action: string, resource: string) {
  const { hasResourcePermission, loading } = usePermissions();
  
  return {
    hasPermission: hasResourcePermission(module, action, resource),
    loading,
  };
}
