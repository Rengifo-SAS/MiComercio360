'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

interface InsufficientPermissionsProps {
  requiredPermission?: string;
  requiredModule?: string;
  action?: string;
  resource?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

export function InsufficientPermissions({
  requiredPermission,
  requiredModule,
  action,
  resource,
  showBackButton = true,
  showHomeButton = true,
}: InsufficientPermissionsProps) {
  const getPermissionDescription = () => {
    if (requiredPermission) {
      const [module, action] = requiredPermission.split('.');
      return `Necesitas el permiso "${action}" en el módulo "${module}"`;
    }

    if (requiredModule) {
      return `Necesitas acceso al módulo "${requiredModule}"`;
    }

    return 'No tienes los permisos necesarios para realizar esta acción';
  };

  const getActionDescription = () => {
    if (action && resource) {
      return `No puedes ${action} ${resource}`;
    }

    if (action) {
      return `No puedes ${action}`;
    }

    return 'No tienes permisos para realizar esta acción';
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <Lock className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            Permisos Insuficientes
          </CardTitle>
          <CardDescription className="text-gray-600">
            {getActionDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">
              {getPermissionDescription()}
            </p>

            {(requiredPermission || requiredModule) && (
              <div className="flex justify-center">
                <Badge variant="outline" className="text-xs">
                  {requiredPermission || requiredModule}
                </Badge>
              </div>
            )}

            <p className="text-sm text-gray-500">
              Contacta a tu administrador si necesitas acceso a esta
              funcionalidad.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {showHomeButton && (
              <Button asChild className="flex-1">
                <Link href="/dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  Ir al Dashboard
                </Link>
              </Button>
            )}
            {showBackButton && (
              <Button variant="outline" asChild className="flex-1">
                <Link href="javascript:history.back()">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver Atrás
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para mostrar en lugar de botones deshabilitados
export function PermissionDeniedButton({
  children,
  requiredPermission,
  requiredModule,
  action,
  resource,
  ...props
}: React.ComponentProps<typeof Button> & InsufficientPermissionsProps) {
  return (
    <Button
      {...props}
      disabled
      variant="outline"
      className="opacity-50 cursor-not-allowed"
      title={`No tienes permisos para ${action || 'realizar esta acción'}`}
    >
      <Lock className="mr-2 h-4 w-4" />
      {children}
    </Button>
  );
}
