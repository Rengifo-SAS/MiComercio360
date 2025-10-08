import { Suspense } from 'react';
import { POSPageClient } from '@/components/pos-page-client';

export default function POSPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            Cargando POS...
          </div>
        }
      >
        <POSPageClient />
      </Suspense>
    </div>
  );
}