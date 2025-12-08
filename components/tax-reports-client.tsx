'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  Search,
  FileText,
  Receipt,
  Download,
  FileSpreadsheet,
} from 'lucide-react';

interface TaxReportsClientProps {
  companyId: string;
  userId: string;
}

interface TaxReport {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  enabled: boolean;
  color: string;
  badge?: string;
}

export function TaxReportsClient({
  companyId,
  userId,
}: TaxReportsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const reports: TaxReport[] = [
    {
      id: 'tax-detail',
      title: 'Reporte detallado de impuestos',
      description: 'Revisa el detalle de tus impuestos generados por cada transacción.',
      icon: <FileText className="h-5 w-5" />,
      href: '/dashboard/reports/tax/tax-detail',
      enabled: true,
      color: 'text-blue-600',
    },
    {
      id: 'tax-withholdings',
      title: 'Impuestos y retenciones',
      description: 'Revisa los impuestos y retenciones asociados a tus ventas y compras.',
      icon: <Receipt className="h-5 w-5" />,
      href: '/dashboard/reports/tax/tax-withholdings',
      enabled: true,
      color: 'text-blue-600',
      badge: 'Excel',
    },
    {
      id: 'daily-report',
      title: 'Comprobante de informe diario',
      description: 'Exporta el resumen de tus facturas registradas en tu punto de venta.',
      icon: <Download className="h-5 w-5" />,
      href: '/dashboard/reports/tax/daily-report',
      enabled: true,
      color: 'text-blue-600',
      badge: 'Excel',
    },
    {
      id: 'form-350',
      title: 'Formulario 350',
      description: 'Declaración retenciones en la fuente.',
      icon: <FileSpreadsheet className="h-5 w-5" />,
      href: '/dashboard/reports/tax/form-350',
      enabled: true,
      color: 'text-blue-600',
      badge: 'Excel',
    },
  ];

  const filteredReports = reports.filter((report) =>
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIconColor = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      'text-blue-600': { bg: 'bg-blue-100', text: 'text-blue-600' },
      'text-green-600': { bg: 'bg-green-100', text: 'text-green-600' },
      'text-rose-600': { bg: 'bg-rose-100', text: 'text-rose-600' },
      'text-amber-400': { bg: 'bg-amber-100', text: 'text-amber-600' },
      'text-indigo-600': { bg: 'bg-indigo-100', text: 'text-indigo-600' },
      'text-purple-700': { bg: 'bg-purple-100', text: 'text-purple-700' },
    };
    return colorMap[color] || { bg: 'bg-slate-100', text: 'text-slate-600' };
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/reports"
          className="hover:text-foreground transition-colors"
        >
          Reportes
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Fiscales</span>
      </div>

      {/* Header con buscador */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            Fiscales
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Revisa el detalle de tus impuestos y retenciones para cumplir con tus obligaciones tributarias.
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
          const iconColors = getIconColor(report.color);
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
              <div className="flex items-center gap-4 p-4">
                {/* Icono */}
                <div
                  className={`flex-shrink-0 rounded-lg p-2 ${iconColors.bg} ${iconColors.text}`}
                >
                  {report.icon}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {report.title}
                    </h3>
                    {report.badge && (
                      <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {report.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {report.description}
                  </p>
                </div>
              </div>
            </div>
          );

          if (!report.enabled) {
            return <div key={report.id}>{content}</div>;
          }

          return (
            <Link key={report.id} href={report.href}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

