'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSidebar } from '@/contexts/sidebar-context';
import {
  Building2,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  CreditCard,
  Truck,
  Store,
  Tag,
} from 'lucide-react';

interface DashboardSidebarProps {
  companyName?: string;
  userRole?: string;
  className?: string;
}

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    title: 'Ventas',
    href: '/dashboard/sales',
    icon: ShoppingCart,
    badge: null,
  },
  {
    title: 'Productos',
    href: '/dashboard/products',
    icon: Package,
    badge: null,
  },
  {
    title: 'Inventario',
    href: '/dashboard/inventory',
    icon: Store,
    badge: null,
  },
  {
    title: 'Clientes',
    href: '/dashboard/customers',
    icon: Users,
    badge: null,
  },
  {
    title: 'Cuentas',
    href: '/dashboard/accounts',
    icon: CreditCard,
    badge: null,
  },
  {
    title: 'Proveedores',
    href: '/dashboard/suppliers',
    icon: Truck,
    badge: null,
  },
  {
    title: 'Categorías',
    href: '/dashboard/categories',
    icon: Tag,
    badge: null,
  },
  {
    title: 'Bodegas',
    href: '/dashboard/warehouses',
    icon: Building2,
    badge: null,
  },
  {
    title: 'Reportes',
    href: '/dashboard/reports',
    icon: BarChart3,
    badge: null,
  },
  {
    title: 'Facturación',
    href: '/dashboard/billing',
    icon: FileText,
    badge: null,
  },
  {
    title: 'Pagos',
    href: '/dashboard/payments',
    icon: CreditCard,
    badge: null,
  },
  {
    title: 'Turnos',
    href: '/dashboard/shifts',
    icon: Calendar,
    badge: null,
  },
  {
    title: 'Configuración',
    href: '/dashboard/settings',
    icon: Settings,
    badge: null,
  },
];

export function DashboardSidebar({
  companyName = 'Mi Empresa',
  userRole = 'admin',
  className,
}: DashboardSidebarProps) {
  const {
    isCollapsed,
    isMobileOpen,
    toggleSidebar,
    toggleMobileSidebar,
    setIsMobileOpen,
  } = useSidebar();
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 z-50 h-full bg-background border-r transition-all duration-300 ease-in-out',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <div className="flex flex-col">
                <span className="font-semibold text-sm truncate">
                  {companyName}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {userRole}
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <Building2 className="h-6 w-6 text-primary mx-auto" />
          )}

          {/* Toggle buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="hidden lg:flex h-8 w-8 p-0"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileSidebar}
              className="lg:hidden h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
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
                  className={cn(
                    'h-4 w-4 flex-shrink-0',
                    isCollapsed && 'mx-auto'
                  )}
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

        {/* Footer */}
        <div className="p-4 border-t">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground text-muted-foreground',
              isCollapsed && 'justify-center'
            )}
          >
            <Home
              className={cn('h-4 w-4 flex-shrink-0', isCollapsed && 'mx-auto')}
            />
            {!isCollapsed && <span className="truncate">Inicio</span>}
          </Link>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleMobileSidebar}
        className="fixed top-4 left-4 z-40 lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </Button>
    </>
  );
}
