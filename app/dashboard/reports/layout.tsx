import { ReactNode } from 'react';

// Este layout simplemente pasa los children sin añadir RouteGuard adicional
// El layout padre (dashboard/layout.tsx) ya maneja la autenticación
export default function ReportsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
