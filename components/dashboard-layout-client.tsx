'use client';

import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { AuthButtonClient } from '@/components/auth-button-client';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { cn } from '@/lib/utils';

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
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar companyName={companyName} userRole={userRole} />

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          isCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              {/* Mobile menu button is handled by the sidebar component */}
            </div>

            <div className="flex items-center gap-4">
              <ThemeSwitcher />
              <AuthButtonClient />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
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
