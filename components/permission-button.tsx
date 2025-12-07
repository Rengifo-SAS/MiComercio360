'use client';

import { ReactNode } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { usePermission } from '@/lib/hooks/use-permissions';
import { Lock } from 'lucide-react';

interface PermissionButtonProps extends ButtonProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  showLockIcon?: boolean;
  disabledMessage?: string;
}

export function PermissionButton({
  permission,
  children,
  fallback,
  showLockIcon = true,
  disabledMessage,
  ...props
}: PermissionButtonProps) {
  const { hasPermission, loading } = usePermission(permission);

  if (loading) {
    return (
      <Button {...props} disabled>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        Cargando...
      </Button>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Button
        {...props}
        disabled
        title={disabledMessage || `No tienes permisos para ${permission}`}
        className={`${props.className} opacity-50 cursor-not-allowed`}
      >
        {showLockIcon && <Lock className="h-4 w-4 mr-2" />}
        {children}
      </Button>
    );
  }

  return <Button {...props}>{children}</Button>;
}

interface ModulePermissionButtonProps extends ButtonProps {
  module: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
  showLockIcon?: boolean;
  disabledMessage?: string;
}

export function ModulePermissionButton({
  module,
  action,
  children,
  fallback,
  showLockIcon = true,
  disabledMessage,
  ...props
}: ModulePermissionButtonProps) {
  const { hasPermission, loading } = usePermission(`${module}.${action}`);

  if (loading) {
    return (
      <Button {...props} disabled>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        Cargando...
      </Button>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Button
        {...props}
        disabled
        title={
          disabledMessage || `No tienes permisos para ${action} en ${module}`
        }
        className={`${props.className} opacity-50 cursor-not-allowed`}
      >
        {showLockIcon && <Lock className="h-4 w-4 mr-2" />}
        {children}
      </Button>
    );
  }

  return <Button {...props}>{children}</Button>;
}
