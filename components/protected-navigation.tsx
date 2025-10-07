'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/lib/hooks/use-permissions';
import {
  Building2,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  Home,
  Calendar,
  CreditCard,
  Truck,
  Tag,
  FileText,
} from 'lucide-react';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string | null;
  permission?: string;
  module?: string;
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: null,
    permission: 'dashboard.read',
    module: 'dashboard',
  },
  {
    title: 'Ventas',
    href: '/dashboard/sales',
    icon: ShoppingCart,
    badge: null,
    permission: 'sales.read',
    module: 'sales',
  },
  {
    title: 'Productos',
    href: '/dashboard/products',
    icon: Package,
    badge: null,
    permission: 'products.read',
    module: 'products',
  },
  {
    title: 'Inventario',
    href: '/dashboard/inventory',
    icon: Building2,
    badge: null,
    permission: 'inventory.read',
    module: 'inventory',
  },
  {
    title: 'Clientes',
    href: '/dashboard/customers',
    icon: Users,
    badge: null,
    permission: 'customers.read',
    module: 'customers',
  },
  {
    title: 'Cuentas',
    href: '/dashboard/accounts',
    icon: CreditCard,
    badge: null,
    permission: 'accounts.read',
    module: 'accounts',
  },
  {
    title: 'Proveedores',
    href: '/dashboard/suppliers',
    icon: Truck,
    badge: null,
    permission: 'suppliers.read',
    module: 'suppliers',
  },
  {
    title: 'Categorías',
    href: '/dashboard/categories',
    icon: Tag,
    badge: null,
    permission: 'categories.read',
    module: 'categories',
  },
  {
    title: 'Bodegas',
    href: '/dashboard/warehouses',
    icon: Building2,
    badge: null,
    permission: 'warehouses.read',
    module: 'warehouses',
  },
  {
    title: 'Reportes',
    href: '/dashboard/reports',
    icon: BarChart3,
    badge: null,
    permission: 'reports.read',
    module: 'reports',
  },
  {
    title: 'Facturación',
    href: '/dashboard/billing',
    icon: FileText,
    badge: null,
    permission: 'billing.read',
    module: 'billing',
  },
  {
    title: 'Pagos',
    href: '/dashboard/payments',
    icon: CreditCard,
    badge: null,
    permission: 'payments.read',
    module: 'payments',
  },
  {
    title: 'Turnos',
    href: '/dashboard/shifts',
    icon: Calendar,
    badge: null,
    permission: 'shifts.read',
    module: 'shifts',
  },
  {
    title: 'Usuarios',
    href: '/dashboard/settings/users',
    icon: Users,
    badge: null,
    permission: 'settings.users',
    module: 'settings',
  },
  {
    title: 'Configuración',
    href: '/dashboard/settings',
    icon: Settings,
    badge: null,
    permission: 'settings.company',
    module: 'settings',
  },
];

interface ProtectedNavigationProps {
  isCollapsed?: boolean;
  onItemClick?: () => void;
}

export function ProtectedNavigation({
  isCollapsed = false,
  onItemClick,
}: ProtectedNavigationProps) {
  const { hasPermission, hasModulePermission, loading } = usePermissions();
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Filtrar elementos de navegación basado en permisos
  const filteredItems = navigationItems.filter((item) => {
    // Si no hay permiso específico, verificar por módulo
    if (item.permission) {
      return hasPermission(item.permission);
    }

    if (item.module) {
      return hasModulePermission(item.module);
    }

    // Si no hay restricciones, mostrar el elemento
    return true;
  });

  // Si está cargando, mostrar skeleton o elementos básicos
  if (loading) {
    return (
      <nav className="flex-1 p-4 space-y-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md',
              isCollapsed && 'justify-center'
            )}
          >
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            {!isCollapsed && (
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            )}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex-1 p-4 space-y-1">
      {filteredItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground',
              isCollapsed && 'justify-center'
            )}
          >
            <Icon
              className={cn('h-4 w-4 flex-shrink-0', isCollapsed && 'mx-auto')}
            />
            {!isCollapsed && (
              <>
                <span className="truncate">{item.title}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// Componente para el enlace de inicio (siempre visible)
export function HomeLink({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === '/';

  return (
    <Link
      href="/"
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground text-muted-foreground',
        isCollapsed && 'justify-center',
        isActive && 'bg-accent text-accent-foreground'
      )}
    >
      <Home className={cn('h-4 w-4 flex-shrink-0', isCollapsed && 'mx-auto')} />
      {!isCollapsed && <span className="truncate">Inicio</span>}
    </Link>
  );
}
