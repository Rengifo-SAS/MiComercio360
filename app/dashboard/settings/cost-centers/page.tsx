import { CostCentersPageClient } from '@/components/cost-centers-page-client';
import { RouteGuard } from '@/components/route-guard';

export default function CostCentersPage() {
  return (
    <RouteGuard requiredPermission="settings.cost_centers">
      <CostCentersPageClient />
    </RouteGuard>
  );
}
