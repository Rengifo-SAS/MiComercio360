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
          
          isAdminUser = profile?.role === 'admin' || profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN';
        } catch (err) {
          // Si no se puede obtener el perfil, continuar con la verificación por email
          console.log('No se pudo obtener el perfil del usuario, usando verificación por email');
        }
      }

      // Si es admin, usar los permisos de la base de datos (que ya están completos)
      if (isAdminUser) {
        // Si ya tenemos permisos de la base de datos, usarlos
        if (userPermissions.length > 0) {
          setPermissions(userPermissions);
          return;
        }
        
        // Si no hay permisos de la base de datos, intentar cargarlos nuevamente
        try {
          const dbPermissions = await UsersService.getUserPermissions(user.id);
          if (dbPermissions.length > 0) {
            setPermissions(dbPermissions);
        return;
          }
        } catch (err) {
          console.log('Error cargando permisos de admin desde BD:', err);
        }
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
