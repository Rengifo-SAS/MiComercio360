'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/contexts/sidebar-context';
import {
  ProtectedNavigation,
  HomeLink,
} from '@/components/protected-navigation';
import { UserPermissionsInfo } from '@/components/user-permissions-info';
import { Building2, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface DashboardSidebarProps {
  companyName?: string;
  userRole?: string;
  className?: string;
}

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
        <ProtectedNavigation
          isCollapsed={isCollapsed}
          onItemClick={() => setIsMobileOpen(false)}
        />

        {/* User Permissions Info */}
        <UserPermissionsInfo isCollapsed={isCollapsed} />

        {/* Footer */}
        <div className="p-4 border-t">
          <HomeLink isCollapsed={isCollapsed} />
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
