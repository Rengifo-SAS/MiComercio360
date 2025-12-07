// Hook temporal para permisos de admin
// lib/hooks/use-admin-permissions.ts

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export function useAdminPermissions() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verificar si el usuario es admin
  const checkAdminStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }

      // Verificar si es admin por email
      const isAdminUser = user.email === 'johanrengifo78@gmail.com' || 
                         user.email?.includes('admin') ||
                         user.email?.includes('administrator');

      setIsAdmin(!!isAdminUser);
    } catch (err) {
      console.error('Error verificando admin status:', err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar si el usuario tiene un permiso específico
  const hasPermission = useCallback((permissionName: string): boolean => {
    // Si está cargando, asumir que no tiene permisos temporalmente
    if (loading) return false;
    
    // Si es admin, tiene todos los permisos
    if (isAdmin) return true;
    
    // Para otros usuarios, por ahora no tienen permisos
    return false;
  }, [isAdmin, loading]);

  // Verificar si el usuario es administrador
  const isAdminUser = useCallback((): boolean => {
    return isAdmin;
  }, [isAdmin]);

  // Verificar si el usuario es super administrador
  const isSuperAdmin = useCallback((): boolean => {
    return isAdmin;
  }, [isAdmin]);

  // Cargar estado de admin al montar el componente
  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  return {
    isAdmin: isAdminUser,
    isSuperAdmin,
    hasPermission,
    loading,
    reloadPermissions: checkAdminStatus,
  };
}
