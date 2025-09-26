import { Suspense } from 'react';
import { AccountsPageClient } from '@/components/accounts-page-client';

export default function AccountsPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Cuentas Bancarias
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus cuentas bancarias, cajas de efectivo y tarjetas de
            crédito
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Cargando...</div>}>
        <AccountsPageClient />
      </Suspense>
    </div>
  );
}
