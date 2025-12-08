'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredModule?: string;
  fallbackPath?: string;
}

export function RouteGuard({
  children,
  requiredPermission,
  requiredModule,
  fallbackPath = '/access-denied',
}: RouteGuardProps) {
  const { hasPermission, hasModulePermission, loading, permissions } =
    usePermissions();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Esperar a que termine de cargar y que haya permisos
    if (loading) {
      return;
    }

    // Si no hay permisos cargados aún, esperar un poco más
    if (permissions.length === 0) {
      return;
    }

    let authorized = false;

    if (requiredPermission) {
      authorized = hasPermission(requiredPermission);
    } else if (requiredModule) {
      authorized = hasModulePermission(requiredModule);
    } else {
      // Si no hay restricciones específicas, permitir acceso
      authorized = true;
    }

    setIsAuthorized(authorized);

    if (!authorized) {
      router.push(fallbackPath);
    } else {
    }
  }, [
    loading,
    hasPermission,
    hasModulePermission,
    requiredPermission,
    requiredModule,
    router,
    fallbackPath,
    permissions.length,
  ]);

  // Mostrar loading mientras se verifican los permisos
  if (loading || isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">
            Verificando permisos...
          </p>
        </div>
      </div>
    );
  }

  // Si no está autorizado, no renderizar nada (la redirección ya se hizo)
  if (!isAuthorized) {
    return null;
  }

  // Si está autorizado, renderizar el contenido
  return <>{children}</>;
}

// Hook para verificar permisos en componentes
export function useRoutePermission(
  requiredPermission?: string,
  requiredModule?: string
) {
  const { hasPermission, hasModulePermission, loading, permissions } =
    usePermissions();
  const router = useRouter();

  const checkPermission = () => {
    if (loading) return false;

    if (requiredPermission) {
      return hasPermission(requiredPermission);
    }

    if (requiredModule) {
      return hasModulePermission(requiredModule);
    }

    return true;
  };

  const redirectIfUnauthorized = (fallbackPath = '/access-denied') => {
    if (!loading && !checkPermission()) {
      router.push(fallbackPath);
    }
  };

  return {
    hasPermission: checkPermission(),
    loading,
    redirectIfUnauthorized,
  };
}
