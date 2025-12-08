import { UsersPageClient } from '@/components/users-page-client';
import { RouteGuard } from '@/components/route-guard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Usuarios y Permisos',
  description:
    'Gestiona los usuarios, roles y permisos del sistema para controlar el acceso a las funcionalidades.',
};

export default function UsersPage() {
  return (
    <RouteGuard requiredPermission="settings.users">
      <UsersPageClient />
    </RouteGuard>
  );
}
