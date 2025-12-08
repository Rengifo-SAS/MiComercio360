'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ChevronLeft,
  FileText,
  Receipt,
  TrendingUp,
  Package,
  CreditCard,
  Lock,
  Star,
} from 'lucide-react';

interface AdministrativeReportsClientProps {
  companyId: string;
  userId: string;
}

interface AdministrativeReport {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  enabled: boolean;
  color: string;
  badge?: string;
}

export function AdministrativeReportsClient({
  companyId,
  userId,
}: AdministrativeReportsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const administrativeReports: AdministrativeReport[] = [
    {
      id: 'accounts-receivable',
      title: 'Cuentas por cobrar',
      description: 'Controla el vencimiento y cobro de tus facturas a crédito.',
      icon: <FileText className="h-5 w-5" />,
      href: '/dashboard/reports/administrative/accounts-receivable',
      enabled: true,
      color: 'bg-blue-100 text-blue-600',
      badge: 'Excel',
    },
    {
      id: 'accounts-payable',
      title: 'Cuentas por pagar',
      description: 'Controla tus deudas registradas y pagos pendientes a proveedores.',
      icon: <Receipt className="h-5 w-5" />,
      href: '/dashboard/reports/administrative/accounts-payable',
      enabled: true,
      color: 'bg-blue-100 text-blue-600',
      badge: 'Excel',
    },
    {
      id: 'income-expense',
      title: 'Ingresos y gastos',
      description: 'Conoce los valores asociados a tus cuentas de ingresos y egresos.',
      icon: <TrendingUp className="h-5 w-5" />,
      href: '/dashboard/reports/administrative/income-expense',
      enabled: true,
      color: 'bg-blue-100 text-blue-600',
      badge: 'Excel',
    },
    {
      id: 'inventory-value',
      title: 'Valor de inventario',
      description: 'Consulta el valor actual, cantidad y costo promedio de tu inventario.',
      icon: <Package className="h-5 w-5" />,
      href: '/dashboard/reports/administrative/inventory-value',
      enabled: true,
      color: 'bg-blue-100 text-blue-600',
      badge: 'Excel',
    },
    {
      id: 'transactions',
      title: 'Transacciones',
      description: 'Consulta los movimientos de dinero registrados en tu contabilidad.',
      icon: <CreditCard className="h-5 w-5" />,
      href: '/dashboard/reports/administrative/transactions',
      enabled: true,
      color: 'bg-blue-100 text-blue-600',
      badge: 'Excel',
    },
    {
      id: 'purchases',
      title: 'Compras',
      description: 'Consulta las facturas de compra que tienes registradas en tu cuenta.',
      icon: <FileText className="h-5 w-5" />,
      href: '/dashboard/reports/administrative/purchases',
      enabled: true,
      color: 'bg-blue-100 text-blue-600',
      badge: 'Excel',
    },
    {
      id: 'annual',
      title: 'Reporte anual',
      description: 'Conoce el rendimiento que ha tenido tu negocio en cada año.',
      icon: <Lock className="h-5 w-5" />,
      href: '#',
      enabled: false,
      color: 'bg-slate-200/40 text-slate-400',
    },
  ];

  const filteredReports = administrativeReports.filter((report) =>
    report.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/reports"
          className="hover:text-foreground transition-colors"
        >
          Reportes
        </Link>
        <ChevronLeft className="h-4 w-4 rotate-180" />
        <span className="text-foreground font-medium">Administrativos</span>
      </div>

      {/* Header con buscador */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            Reportes Administrativos
          </h1>
          <p className="text-sm text-muted-foreground">
            Haz seguimiento a tus transacciones y obtén información para controlar la
            salud financiera de tu empresa.
          </p>
        </div>
        <div className="relative w-full md:w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar reporte"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
      </div>

      {/* Tarjetas de reportes */}
      <div className="grid gap-4 pb-4 md:pb-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredReports.map((report) => {
          const content = (
            <div
              className={`
                w-full bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-500 ease-in-out
                border-slate-400/20 dark:border-slate-600/20
                ${report.enabled
                  ? 'cursor-pointer hover:border-slate-400/40 dark:hover:border-slate-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  : 'opacity-60 cursor-not-allowed'
                }
                ${!report.enabled ? 'bg-muted/50 dark:bg-muted/30' : ''}
              `}
            >
              {/* Header con icono y badge */}
              <div className="flex justify-between items-center p-3 w-full border-b border-slate-400/20">
                <div className="flex gap-2 items-center">
                  <div className={`flex justify-center items-center w-8 h-6 rounded-lg ${report.color}`}>
                    <div className="scale-75">
                      {report.icon}
                    </div>
                  </div>
                </div>
                {report.enabled && (
                  <button
                    type="button"
                    className="z-50"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // TODO: Implementar favoritos
                    }}
                  >
                    <Star className="h-4 w-4 text-slate-900 dark:text-slate-100 hover:text-amber-400 transition-colors duration-300 ease-in-out cursor-pointer" />
                  </button>
                )}
                {!report.enabled && (
                  <Star className="h-4 w-4 text-slate-400" />
                )}
              </div>

              {/* Contenido */}
              <div className="flex flex-col gap-1.5 p-3 w-full">
                <h4
                  className={`text-sm font-medium ${
                    report.enabled
                      ? 'text-slate-700 dark:text-slate-200'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {report.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {report.description}
                </p>
              </div>
            </div>
          );

          if (report.enabled) {
            return (
              <Link key={report.id} href={report.href} className="block">
                {content}
              </Link>
            );
          }

          return <div key={report.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}

