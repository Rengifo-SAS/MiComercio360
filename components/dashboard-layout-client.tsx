'use client';

import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { AuthButtonClient } from '@/components/auth-button-client';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { LogOut, User, Settings, Bell } from 'lucide-react';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  companyName?: string;
  userRole?: string;
}

function DashboardContent({
  children,
  companyName,
  userRole,
}: DashboardLayoutClientProps) {
  const { isCollapsed, isHovered } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar companyName={companyName} userRole={userRole} />

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          // En desktop, si está colapsada pero se hace hover, se expande el contenido
          // Si no está colapsada, siempre se mantiene expandido
          isCollapsed && !isHovered ? 'lg:pl-16' : 'lg:pl-64'
        )}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-6">
            {/* Left side - Page title and breadcrumb */}
            <div className="flex items-center gap-3">
              <PageTitle />
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

// Componente para mostrar el título de la página
function PageTitle() {
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      pos: 'Punto de Venta',
      sales: 'Ventas',
      products: 'Productos',
      inventory: 'Inventario',
      customers: 'Clientes',
      accounts: 'Cuentas',
      suppliers: 'Proveedores',
      categories: 'Categorías',
      warehouses: 'Bodegas',
      reports: 'Reportes',
      billing: 'Facturación',
      payments: 'Pagos',
      shifts: 'Turnos',
      settings: 'Configuración',
      users: 'Usuarios',
    };

    return titles[lastSegment] || 'Dashboard';
  };

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-lg font-semibold text-foreground">
        {getPageTitle(pathname)}
      </h1>
    </div>
  );
}

// Componente para el menú de usuario
function UserMenu() {
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUserAndCompany = async () => {
      const supabase = createClient();

      // Obtener usuario
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);

      if (userData.user) {
        // Obtener perfil del usuario
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', userData.user.id)
          .single();

        if (profile?.company_id) {
          // Obtener datos de la empresa incluyendo el logo
          const { data: companyData } = await supabase
            .from('companies')
            .select('name, logo_url')
            .eq('id', profile.company_id)
            .single();

          setCompany(companyData);
        }
      }

      setLoading(false);
    };

    getUserAndCompany();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  const handleProfileClick = () => {
    router.push('/dashboard/settings/company');
  };

  const handleSettingsClick = () => {
    router.push('/dashboard/settings');
  };

  if (loading) {
    return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;
  }

  if (!user) {
    return null;
  }

  const userInitials = user.email?.charAt(0).toUpperCase() || 'U';
  const companyInitials = company?.name?.charAt(0).toUpperCase() || 'E';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={company?.logo_url || user.user_metadata?.avatar_url}
              alt={company?.name || user.email}
            />
            <AvatarFallback className="text-xs">
              {company?.logo_url ? companyInitials : userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.email}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.user_metadata?.full_name || 'Usuario'}
            </p>
            {company?.name && (
              <p className="text-xs leading-none text-muted-foreground">
                {company.name}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleProfileClick}>
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSettingsClick}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configuración</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardLayoutClient({
  children,
  companyName,
  userRole,
}: DashboardLayoutClientProps) {
  return (
    <SidebarProvider>
      <DashboardContent companyName={companyName} userRole={userRole}>
        {children}
      </DashboardContent>
    </SidebarProvider>
  );
}
