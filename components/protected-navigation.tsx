'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useNavigationRestrictions } from '@/lib/hooks/use-offline-restrictions';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Truck,
  Tag,
  FileText,
  Monitor,
  Wallet,
  TrendingUp,
  TrendingDown,
  UserCog,
  Warehouse,
  ChevronDown,
  ChevronRight,
  Clock,
  Repeat,
  DollarSign,
  RotateCcw,
  Receipt,
  FileCheck,
  CreditCard,
} from 'lucide-react';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string | null;
  permission?: string;
  module?: string;
  category?: string;
}

interface NavigationCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavigationItem[];
}

// Definir categorías de navegación
const navigationCategories: NavigationCategory[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        badge: null,
        permission: 'dashboard.view',
        module: 'dashboard',
        category: 'dashboard',
      },
    ],
  },
  {
    title: 'POS',
    icon: Monitor,
    items: [
      {
        title: 'POS',
        href: '/dashboard/pos',
        icon: Monitor,
        badge: null,
        permission: 'sales.read',
        module: 'pos',
        category: 'pos',
      },
    ],
  },
  {
    title: 'Ingresos',
    icon: TrendingUp,
    items: [
      {
        title: 'Ventas',
        href: '/dashboard/sales',
        icon: ShoppingCart,
        badge: null,
        permission: 'sales.read',
        module: 'sales',
        category: 'ventas',
      },
      {
        title: 'Facturación',
        href: '/dashboard/billing',
        icon: FileText,
        badge: null,
        permission: 'billing.read',
        module: 'billing',
        category: 'ventas',
      },
      {
        title: 'Facturas Recurrentes',
        href: '/dashboard/recurring-invoices',
        icon: Repeat,
        badge: null,
        permission: 'sales.read',
        module: 'sales',
        category: 'ventas',
      },
      {
        title: 'Pagos recibidos',
        href: '/dashboard/received-payments',
        icon: DollarSign,
        badge: null,
        permission: 'sales.read',
        module: 'sales',
        category: 'ventas',
      },
      {
        title: 'Devoluciones de venta',
        href: '/dashboard/sales-returns',
        icon: RotateCcw,
        badge: null,
        permission: 'sales.read',
        module: 'sales',
        category: 'ventas',
      },
      {
        title: 'Nota Débito',
        href: '/dashboard/debit-notes',
        icon: Receipt,
        badge: null,
        permission: 'sales.read',
        module: 'sales',
        category: 'ventas',
      },
      {
        title: 'Cotización',
        href: '/dashboard/quotes',
        icon: FileCheck,
        badge: null,
        permission: 'sales.read',
        module: 'sales',
        category: 'ventas',
      },
      {
        title: 'Remisión',
        href: '/dashboard/delivery-notes',
        icon: Truck,
        badge: null,
        permission: 'sales.read',
        module: 'sales',
        category: 'ventas',
      },
    ],
  },
  {
    title: 'Egresos',
    icon: TrendingDown,
    items: [
      {
        title: 'Factura de Compra',
        href: '/dashboard/purchase-invoices',
        icon: FileText,
        badge: null,
        permission: 'purchases.read',
        module: 'purchases',
        category: 'compras',
      },
      {
        title: 'Documento de soporte',
        href: '/dashboard/support-documents',
        icon: FileCheck,
        badge: null,
        permission: 'purchases.read',
        module: 'purchases',
        category: 'compras',
      },
      {
        title: 'Pagos',
        href: '/dashboard/payments',
        icon: CreditCard,
        badge: null,
        permission: 'purchases.read',
        module: 'purchases',
        category: 'compras',
      },
      {
        title: 'Pagos Recurrentes',
        href: '/dashboard/recurring-payments',
        icon: Repeat,
        badge: null,
        permission: 'purchases.read',
        module: 'purchases',
        category: 'compras',
      },
      {
        title: 'Notas Débito',
        href: '/dashboard/purchase-debit-notes',
        icon: Receipt,
        badge: null,
        permission: 'purchases.read',
        module: 'purchases',
        category: 'compras',
      },
    ],
  },
  {
    title: 'Inventario',
    icon: Package,
    items: [
      {
        title: 'Productos',
        href: '/dashboard/products',
        icon: Package,
        badge: null,
        permission: 'products.read',
        module: 'products',
        category: 'inventario',
      },
      {
        title: 'Inventario',
        href: '/dashboard/inventory',
        icon: Warehouse,
        badge: null,
        permission: 'inventory.read',
        module: 'inventory',
        category: 'inventario',
      },
      {
        title: 'Categorías',
        href: '/dashboard/categories',
        icon: Tag,
        badge: null,
        permission: 'categories.read',
        module: 'categories',
        category: 'inventario',
      },
      {
        title: 'Bodegas',
        href: '/dashboard/warehouses',
        icon: Building2,
        badge: null,
        permission: 'warehouses.read',
        module: 'warehouses',
        category: 'inventario',
      },
      {
        title: 'Proveedores',
        href: '/dashboard/suppliers',
        icon: Truck,
        badge: null,
        permission: 'suppliers.read',
        module: 'suppliers',
        category: 'inventario',
      },
    ],
  },
  {
    title: 'Gestión',
    icon: UserCog,
    items: [
      {
        title: 'Clientes',
        href: '/dashboard/customers',
        icon: Users,
        badge: null,
        permission: 'customers.read',
        module: 'customers',
        category: 'gestion',
      },
      {
        title: 'Usuarios',
        href: '/dashboard/settings/users',
        icon: UserCog,
        badge: null,
        permission: 'settings.users',
        module: 'settings',
        category: 'gestion',
      },
      {
        title: 'Turnos',
        href: '/dashboard/shifts',
        icon: Calendar,
        badge: null,
        permission: 'shifts.read',
        module: 'shifts',
        category: 'gestion',
      },
    ],
  },
  {
    title: 'Financiero',
    icon: Wallet,
    items: [
      {
        title: 'Cuentas',
        href: '/dashboard/accounts',
        icon: Wallet,
        badge: null,
        permission: 'accounts.read',
        module: 'accounts',
        category: 'financiero',
      },
    ],
  },
  {
    title: 'Reportes',
    icon: BarChart3,
    items: [
      {
        title: 'Reportes',
        href: '/dashboard/reports',
        icon: BarChart3,
        badge: null,
        permission: 'reports.read',
        module: 'reports',
        category: 'reportes',
      },
    ],
  },
  {
    title: 'Configuración',
    icon: Settings,
    items: [
      {
        title: 'Configuración',
        href: '/dashboard/settings',
        icon: Settings,
        badge: null,
        permission: 'settings.company',
        module: 'settings',
        category: 'configuracion',
      },
    ],
  },
];

// Crear array plano para compatibilidad con el código existente
const navigationItems: NavigationItem[] = navigationCategories.flatMap(
  (category) => category.items
);

interface ProtectedNavigationProps {
  isCollapsed?: boolean;
  onItemClick?: () => void;
}

export function ProtectedNavigation({
  isCollapsed = false,
  onItemClick,
}: ProtectedNavigationProps) {
  const { hasPermission, hasModulePermission, loading } = usePermissions();
  const { isNavigationAllowed, getNavigationWarning, isOnline } =
    useNavigationRestrictions();
  const pathname = usePathname();
  const [openCategories, setOpenCategories] = React.useState<
    Record<string, boolean>
  >({});

  // Abrir automáticamente la categoría que contiene la página actual
  React.useEffect(() => {
    const currentCategory = navigationCategories.find((category) =>
      category.items.some((item) => isActive(item.href))
    );

    if (currentCategory) {
      setOpenCategories((prev) => {
        // Solo abrir si no hay ninguna categoría abierta actualmente
        const hasOpenCategory = Object.values(prev).some(Boolean);
        if (!hasOpenCategory) {
          const newState: Record<string, boolean> = {};
          navigationCategories.forEach((category) => {
            newState[category.title] = false;
          });
          newState[currentCategory.title] = true;
          return newState;
        }
        return prev;
      });
    }
  }, [pathname]);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const toggleCategory = (categoryTitle: string) => {
    setOpenCategories((prev) => {
      const isCurrentlyOpen = prev[categoryTitle];

      // Si la categoría está abierta, cerrarla
      if (isCurrentlyOpen) {
        return {
          ...prev,
          [categoryTitle]: false,
        };
      }

      // Si está cerrada, cerrar todas las demás y abrir solo esta
      const newState: Record<string, boolean> = {};
      navigationCategories.forEach((category) => {
        newState[category.title] = false;
      });
      newState[categoryTitle] = true;

      return newState;
    });
  };

  // Filtrar categorías basado en permisos y restricciones offline
  const filteredCategories = navigationCategories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        // Primero verificar restricciones offline
        if (!isNavigationAllowed(item.href, item.module)) {
          return false;
        }

        // Luego verificar permisos
        if (item.permission) {
          return hasPermission(item.permission);
        }

        if (item.module) {
          return hasModulePermission(item.module);
        }

        // Si no hay restricciones, mostrar el elemento
        return true;
      }),
    }))
    .filter((category) => category.items.length > 0);

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
    <div className="flex-1 flex flex-col">
      {/* Alerta de modo offline */}
      {!isOnline && (
        <div className="mx-4 mt-4 mb-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
            {!isCollapsed && (
              <div className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Modo Offline
              </div>
            )}
          </div>
          {!isCollapsed && (
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
              Solo POS disponible sin conexión
            </p>
          )}
        </div>
      )}

      <nav
        className="flex-1 p-4 space-y-2"
        role="navigation"
        aria-label="Navegación principal"
      >
        {filteredCategories.map((category) => {
          const CategoryIcon = category.icon;
          const isOpen = openCategories[category.title] || false;

          // Dashboard, POS y Configuración como elementos normales (sin acordeón)
          if (
            category.title === 'Dashboard' ||
            category.title === 'POS' ||
            category.title === 'Configuración'
          ) {
            const item = category.items[0];
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:outline-none',
                  'hover:bg-accent hover:text-accent-foreground',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                  isCollapsed && 'justify-center'
                )}
                aria-current={active ? 'page' : undefined}
                aria-label={`Navegar a ${item.title}`}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 flex-shrink-0',
                    isCollapsed && 'mx-auto'
                  )}
                  aria-hidden="true"
                />
                {!isCollapsed && (
                  <>
                    <span className="truncate">{item.title}</span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className="ml-auto text-xs"
                        aria-label={`Notificación: ${item.badge}`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            );
          }

          // Resto de categorías como acordeones
          return (
            <Collapsible
              key={category.title}
              open={isOpen}
              onOpenChange={() => toggleCategory(category.title)}
            >
              <div className="space-y-1">
                {/* Trigger del acordeón */}
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:outline-none',
                      'hover:bg-accent hover:text-accent-foreground',
                      'text-muted-foreground',
                      isCollapsed && 'justify-center'
                    )}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? 'Contraer' : 'Expandir'} sección ${
                      category.title
                    }`}
                  >
                    <CategoryIcon
                      className="h-4 w-4 flex-shrink-0"
                      aria-hidden="true"
                    />
                    {!isCollapsed && (
                      <>
                        <span className="text-xs font-medium uppercase tracking-wider flex-1 text-left">
                          {category.title}
                        </span>
                        {isOpen ? (
                          <ChevronDown className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ChevronRight
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                        )}
                      </>
                    )}
                  </button>
                </CollapsibleTrigger>

                {/* Contenido del acordeón */}
                {!isCollapsed && (
                  <CollapsibleContent
                    className="space-y-1"
                    role="group"
                    aria-label={`Enlaces de ${category.title}`}
                  >
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onItemClick}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ml-4 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:outline-none',
                            'hover:bg-accent hover:text-accent-foreground',
                            active
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground'
                          )}
                          aria-current={active ? 'page' : undefined}
                          aria-label={`Navegar a ${item.title}`}
                        >
                          <Icon
                            className="h-4 w-4 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className="ml-auto text-xs"
                              aria-label={`Notificación: ${item.badge}`}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                )}
              </div>
            </Collapsible>
          );
        })}
      </nav>
    </div>
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
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:outline-none',
        'hover:bg-accent hover:text-accent-foreground text-muted-foreground',
        isCollapsed && 'justify-center',
        isActive && 'bg-accent text-accent-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-label="Navegar al inicio"
    >
      <Home
        className={cn('h-4 w-4 flex-shrink-0', isCollapsed && 'mx-auto')}
        aria-hidden="true"
      />
      {!isCollapsed && <span className="truncate">Inicio</span>}
    </Link>
  );
}
