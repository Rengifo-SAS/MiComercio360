'use client';

import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { AuthButtonClient } from '@/components/auth-button-client';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { OfflineNavigationGuard } from '@/components/offline-navigation-guard';
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
import { LogOut, User, Settings, Building2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DefaultCompanyLogo } from '@/components/default-company-logo';
import { POSShiftIndicator } from '@/components/pos-shift-indicator';
import { POSConfigurationDialog } from '@/components/pos-configuration-dialog';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  companyName?: string;
  userRole?: string;
}

// Componente para las acciones específicas del módulo POS
function POSHeaderActions() {
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [configuration, setConfiguration] = useState<any>({
    defaultAccountId: '',
    defaultCustomerId: '',
    terminalName: 'Terminal Principal',
    printPaperSize: 'thermal-80mm',
  });
  const [companyId, setCompanyId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [numerations, setNumerations] = useState<any[]>([]);

  useEffect(() => {
    loadPOSData();
  }, []);

  const loadPOSData = async () => {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (userData?.user) {
        setUserId(userData.user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', userData.user.id)
          .single();

        if (profile?.company_id) {
          setCompanyId(profile.company_id);

          // Cargar configuración guardada
          const savedConfig = localStorage.getItem('pos-configuration');
          if (savedConfig) {
            setConfiguration(JSON.parse(savedConfig));
          }
        }
      }
    } catch (error) {
      console.error('Error cargando datos POS:', error);
    }
  };

  return (
    <>
      {/* Indicador de turno */}
      <POSShiftIndicator companyId={companyId} userId={userId} />

      {/* Botón de configuración */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfiguration(true)}
        className="h-9"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {/* Diálogo de configuración */}
      <POSConfigurationDialog
        open={showConfiguration}
        onOpenChange={setShowConfiguration}
        configuration={configuration}
        onConfigurationChange={(newConfig) => {
          setConfiguration(newConfig);
          localStorage.setItem('pos-configuration', JSON.stringify(newConfig));
        }}
        accounts={accounts}
        customers={customers}
        numerations={numerations}
        companyId={companyId}
      />
    </>
  );
}

function DashboardContent({
  children,
  companyName,
  userRole,
}: DashboardLayoutClientProps) {
  const { isCollapsed, isHovered } = useSidebar();
  const pathname = usePathname();

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
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            {/* Left side - Page title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <PageTitle />
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              {/* Botones específicos para el módulo POS */}
              {pathname === '/dashboard/pos' && <POSHeaderActions />}

              <ThemeSwitcher />
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
          <OfflineNavigationGuard currentPath={pathname} />
        </main>
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
    <h1 className="text-lg font-semibold text-foreground truncate">
      {getPageTitle(pathname)}
    </h1>
  );
}

// Componente para el menú de usuario
function UserMenu() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
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
        // Obtener perfil del usuario con más información
        const { data: profileData } = await supabase
          .from('profiles')
          .select('company_id, full_name, role')
          .eq('id', userData.user.id)
          .single();

        setProfile(profileData);

        if (profileData?.company_id) {
          // Obtener datos de la empresa incluyendo el logo
          const { data: companyData } = await supabase
            .from('companies')
            .select('name, logo_url, tax_id')
            .eq('id', profileData.company_id)
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
    return <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />;
  }

  if (!user) {
    return null;
  }

  const userName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      admin: { label: 'Administrador', variant: 'default' },
      manager: { label: 'Gerente', variant: 'secondary' },
      employee: { label: 'Empleado', variant: 'outline' },
    };
    return roles[role] || { label: 'Usuario', variant: 'outline' };
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 gap-2 px-2 hover:bg-accent">
          <Avatar className="h-8 w-8 border-2 border-primary/20">
            <AvatarImage
              src={user.user_metadata?.avatar_url}
              alt={userName}
            />
            <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium">{userName}</span>
            <span className="text-xs text-muted-foreground">
              {profile?.role ? getRoleBadge(profile.role).label : 'Usuario'}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 p-2">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage
                src={user.user_metadata?.avatar_url}
                alt={userName}
              />
              <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1 flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none truncate">
                {userName}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
              {profile?.role && (
                <Badge
                  variant={getRoleBadge(profile.role).variant}
                  className="w-fit text-xs mt-1"
                >
                  {getRoleBadge(profile.role).label}
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        {company && (
          <>
            <DropdownMenuSeparator />
            <div className="px-4 py-2 bg-muted/50">
              <div className="flex items-center gap-2">
                {company.logo_url ? (
                  <div className="relative h-8 w-8 rounded overflow-hidden bg-background border">
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        // Si falla la carga, mostrar logo por defecto
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.parentElement?.querySelector('.company-logo-fallback') as HTMLElement;
                        if (fallback) {
                          fallback.style.display = 'block';
                        }
                      }}
                    />
                    <div className="company-logo-fallback hidden h-full w-full absolute top-0 left-0">
                      <DefaultCompanyLogo className="h-full w-full" />
                    </div>
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded overflow-hidden">
                    <DefaultCompanyLogo className="h-full w-full" />
                  </div>
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{company.name}</p>
                  {company.tax_id && (
                    <p className="text-xs text-muted-foreground">
                      NIT: {company.tax_id}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleProfileClick}>
          <User className="mr-2 h-4 w-4" />
          <span>Mi Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSettingsClick}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configuración</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
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
