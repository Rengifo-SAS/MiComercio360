'use client';

import { useState } from 'react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Shield } from 'lucide-react';

interface UserPermissionsInfoProps {
  isCollapsed?: boolean;
}

export function UserPermissionsInfo({
  isCollapsed = false,
}: UserPermissionsInfoProps) {
  const { permissions, loading, isAdmin, isSuperAdmin } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          {!isCollapsed && <span>Cargando permisos...</span>}
        </div>
      </div>
    );
  }

  // Agrupar permisos por módulo
  const permissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const moduleLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    products: 'Productos',
    sales: 'Ventas',
    customers: 'Clientes',
    inventory: 'Inventario',
    suppliers: 'Proveedores',
    categories: 'Categorías',
    warehouses: 'Bodegas',
    accounts: 'Cuentas',
    reports: 'Reportes',
    settings: 'Configuración',
  };

  const actionLabels: Record<string, string> = {
    read: 'Ver',
    create: 'Crear',
    update: 'Editar',
    delete: 'Eliminar',
    export: 'Exportar',
    import: 'Importar',
  };

  return (
    <div className="p-4 border-t">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start text-sm',
              isCollapsed ? 'justify-center px-2' : ''
            )}
          >
            <Shield className="h-4 w-4 mr-2" />
            {!isCollapsed && (
              <>
                <span>Permisos</span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronRight className="h-4 w-4 ml-auto" />
                )}
              </>
            )}
          </Button>
        </CollapsibleTrigger>

        {!isCollapsed && (
          <CollapsibleContent className="mt-2">
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Permisos del Usuario
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAdmin() && (
                    <Badge variant="default" className="text-xs">
                      {isSuperAdmin() ? 'Super Admin' : 'Administrador'}
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {Object.entries(permissionsByModule).map(
                    ([module, modulePermissions]) => (
                      <div key={module} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {moduleLabels[module] || module}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {modulePermissions.length}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 ml-2">
                          {modulePermissions.map((permission) => (
                            <Badge
                              key={permission.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {actionLabels[permission.action] ||
                                permission.action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
