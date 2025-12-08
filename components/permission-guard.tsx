'use client';

import { ReactNode } from 'react';
import { usePermission } from '@/lib/hooks/use-permissions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, Lock } from 'lucide-react';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  showFallback?: boolean;
}

export function PermissionGuard({
  permission,
  children,
  fallback,
  showFallback = true,
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermission(permission);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showFallback) {
      return (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Acceso Restringido</CardTitle>
            <CardDescription>
              No tienes permisos para acceder a esta funcionalidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Contacta al administrador para obtener los permisos necesarios.
            </p>
          </CardContent>
        </Card>
      );
    }

    return null;
  }

  return <>{children}</>;
}

interface ModulePermissionGuardProps {
  module: string;
  children: ReactNode;
  fallback?: ReactNode;
  showFallback?: boolean;
}

export function ModulePermissionGuard({
  module,
  children,
  fallback,
  showFallback = true,
}: ModulePermissionGuardProps) {
  const { hasPermission, loading } = usePermission(`${module}.read`);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showFallback) {
      return (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Módulo Restringido</CardTitle>
            <CardDescription>
              No tienes permisos para acceder al módulo de {module}.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Contacta al administrador para obtener acceso a este módulo.
            </p>
          </CardContent>
        </Card>
      );
    }

    return null;
  }

  return <>{children}</>;
}

interface ActionPermissionGuardProps {
  module: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
  showFallback?: boolean;
}

export function ActionPermissionGuard({
  module,
  action,
  children,
  fallback,
  showFallback = true,
}: ActionPermissionGuardProps) {
  const { hasPermission, loading } = usePermission(`${module}.${action}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showFallback) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span>
            No tienes permisos para {action} en {module}
          </span>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}
