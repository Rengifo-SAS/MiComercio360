'use client';

import { useSidebar } from '@/contexts/sidebar-context';
import { lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';

// Lazy load el componente POS pesado
const POSPageClient = lazy(() => import('@/components/pos-page-client').then(mod => ({ default: mod.POSPageClient })));

export function POSPageWrapper() {
  const { isCollapsed, isHovered } = useSidebar();

  return (
    <div
      className={cn(
        'fixed inset-0 top-14 transition-all duration-300 ease-in-out overflow-hidden',
        // Ajustar el left según el estado de la barra lateral
        // En móviles siempre left-0, en desktop ajustar según sidebar
        isCollapsed && !isHovered ? 'left-0 lg:left-16' : 'left-0 lg:left-64'
      )}
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Cargando POS...</p>
          </div>
        </div>
      }>
        <POSPageClient />
      </Suspense>
    </div>
  );
}
