import { useMemo } from 'react';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';

// Módulos que requieren conexión para funcionar correctamente
const ONLINE_REQUIRED_MODULES = [
  'dashboard',
  'sales',
  'billing',
  'products',
  'inventory',
  'categories',
  'warehouses',
  'suppliers',
  'customers',
  'financial',
  'users',
  'shifts',
  'reports',
  'settings',
  'companies'
];

// Módulos que pueden funcionar offline
const OFFLINE_ALLOWED_MODULES = [
  'pos',
  'dashboard' // Permitir ver dashboard (solo lectura) offline
];

export function useOfflineModuleRestrictions() {
  const { isOnline } = useOnlineStatus();

  const restrictions = useMemo(() => {
    if (isOnline) {
      return {
        isModuleEnabled: () => true,
        getDisabledReason: () => null,
        offlineModules: [],
        onlineOnlyModules: [],
      };
    }

    return {
      isModuleEnabled: (module: string) => {
        return OFFLINE_ALLOWED_MODULES.includes(module);
      },
      getDisabledReason: (module: string) => {
        if (ONLINE_REQUIRED_MODULES.includes(module)) {
          return 'Este módulo requiere conexión a internet';
        }
        return null;
      },
      offlineModules: OFFLINE_ALLOWED_MODULES,
      onlineOnlyModules: ONLINE_REQUIRED_MODULES,
    };
  }, [isOnline]);

  return {
    isOnline,
    ...restrictions,
  };
}

// Hook específico para navegación
export function useNavigationRestrictions() {
  const { isOnline, isModuleEnabled, getDisabledReason } = useOfflineModuleRestrictions();

  const isNavigationAllowed = (href: string, module?: string) => {
    // Siempre permitir home/dashboard base
    if (href === '/dashboard' && !module) {
      return true;
    }

    // Si tiene módulo, verificar si está permitido
    if (module) {
      return isModuleEnabled(module);
    }

    // Por defecto, si estamos offline, solo permitir POS
    if (!isOnline) {
      return href.includes('/pos') || href === '/dashboard';
    }

    return true;
  };

  const getNavigationWarning = (href: string, module?: string) => {
    if (isNavigationAllowed(href, module)) {
      return null;
    }

    return module ? getDisabledReason(module) : 'Funcionalidad no disponible sin conexión';
  };

  return {
    isOnline,
    isNavigationAllowed,
    getNavigationWarning,
    isModuleEnabled,
  };
}