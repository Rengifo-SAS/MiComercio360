'use client';

import { ReactNode } from 'react';
import { RouteGuard } from './route-guard';

interface ProtectedPageProps {
  children: ReactNode;
  permission?: string;
  module?: string;
  fallbackPath?: string;
}

export function ProtectedPage({
  children,
  permission,
  module,
  fallbackPath = '/access-denied',
}: ProtectedPageProps) {
  return (
    <RouteGuard
      requiredPermission={permission}
      requiredModule={module}
      fallbackPath={fallbackPath}
    >
      {children}
    </RouteGuard>
  );
}

// Componentes específicos para cada módulo
export function ProductsPage({ children }: { children: ReactNode }) {
  return <ProtectedPage permission="products.read">{children}</ProtectedPage>;
}

export function SalesPage({ children }: { children: ReactNode }) {
  return <ProtectedPage permission="sales.read">{children}</ProtectedPage>;
}

export function CustomersPage({ children }: { children: ReactNode }) {
  return <ProtectedPage permission="customers.read">{children}</ProtectedPage>;
}

export function InventoryPage({ children }: { children: ReactNode }) {
  return <ProtectedPage permission="inventory.read">{children}</ProtectedPage>;
}

export function SuppliersPage({ children }: { children: ReactNode }) {
  return <ProtectedPage permission="suppliers.read">{children}</ProtectedPage>;
}

export function CategoriesPage({ children }: { children: ReactNode }) {
  return <ProtectedPage permission="categories.read">{children}</ProtectedPage>;
}

export function WarehousesPage({ children }: { children: ReactNode }) {
  return <ProtectedPage permission="warehouses.read">{children}</ProtectedPage>;
}

export function ReportsPage({ children }: { children: ReactNode }) {
  return <ProtectedPage permission="reports.read">{children}</ProtectedPage>;
}

export function AccountsPage({ children }: { children: ReactNode }) {
  return <ProtectedPage permission="accounts.read">{children}</ProtectedPage>;
}

export function SettingsPage({ children }: { children: ReactNode }) {
  return <ProtectedPage permission="settings.read">{children}</ProtectedPage>;
}

export function UsersPage({ children }: { children: ReactNode }) {
  return <ProtectedPage permission="settings.users">{children}</ProtectedPage>;
}

