'use client';

import { useSidebar } from '@/contexts/sidebar-context';
import { POSPageClient } from '@/components/pos-page-client';
import { cn } from '@/lib/utils';

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
      <POSPageClient />
    </div>
  );
}
