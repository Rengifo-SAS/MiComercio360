import { CompanySettingsClient } from '@/components/company-settings-client';
import { RouteGuard } from '@/components/route-guard';

export default function CompanySettingsPage() {
  return (
    <RouteGuard requiredPermission="settings.company">
      <CompanySettingsClient />
    </RouteGuard>
  );
}
