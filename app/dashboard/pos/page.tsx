import { Suspense } from 'react';
import { POSPageWrapper } from '@/components/pos-page-wrapper';

export default function POSPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          Cargando POS...
        </div>
      }
    >
      <POSPageWrapper />
    </Suspense>
  );
}