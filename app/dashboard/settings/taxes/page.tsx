import { TaxesPageClient } from '@/components/taxes-page-client';
import { RouteGuard } from '@/components/route-guard';

export default function TaxesPage() {
  return (
    <RouteGuard requiredPermission="settings.taxes">
      <TaxesPageClient />
    </RouteGuard>
  );
}
