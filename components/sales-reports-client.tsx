'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Input,
} from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ChevronLeft,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Calendar,
  FileText,
  Star,
} from 'lucide-react';

interface SalesReportsClientProps {
  companyId: string;
  userId: string;
}

interface SalesReport {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  enabled: boolean;
  color: string;
  badge?: string;
}

export function SalesReportsClient({
  companyId,
  userId,
}: SalesReportsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const salesReports: SalesReport[] = [
    {
      id: 'general',
      title: 'Ventas generales',
      description:
        'Revisa el desempeño de tus ventas para crear estrategias comerciales.',
      icon: <TrendingUp className="h-5 w-5" />,
      href: '/dashboard/reports/sales/general',
      enabled: true,
      color: 'text-green-600 bg-green-100',
    },
    {
      id: 'items',
      title: 'Ventas por ítem',
      description:
        'Consulta tus ventas detalladas por cada ítem inventariable.',
      icon: <Package className="h-5 w-5" />,
      href: '/dashboard/reports/sales/items',
      enabled: true,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      id: 'customers',
      title: 'Ventas por clientes',
      description: 'Conoce las ventas asociadas a cada uno de tus clientes.',
      icon: <Users className="h-5 w-5" />,
      href: '/dashboard/reports/sales/customers',
      enabled: true,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      id: 'profitability',
      title: 'Rentabilidad por ítem',
      description: 'Conoce la utilidad que generan tus ítems inventariables.',
      icon: <DollarSign className="h-5 w-5" />,
      href: '/dashboard/reports/sales/profitability',
      enabled: true,
      color: 'text-emerald-600 bg-emerald-100',
    },
    {
      id: 'sellers',
      title: 'Ventas por vendedor',
      description:
        'Revisa el resumen de las ventas asociadas a cada vendedor/a.',
      icon: <Users className="h-5 w-5" />,
      href: '/dashboard/reports/sales/sellers',
      enabled: true,
      color: 'text-indigo-600 bg-indigo-100',
    },
    {
      id: 'customer-statement',
      title: 'Estado de cuenta cliente',
      description: 'Revisa el detalle de las ventas asociadas a cada cliente.',
      icon: <FileText className="h-5 w-5" />,
      href: '/dashboard/reports/sales/customer-statement',
      enabled: true,
      color: 'text-cyan-600 bg-cyan-100',
    },
    {
      id: 'daily',
      title: 'Ventas diarias',
      description:
        'Exporta tus ventas agrupadas por forma de pago y numeraciones.',
      icon: <Calendar className="h-5 w-5" />,
      href: '/dashboard/reports/sales/daily',
      enabled: true,
      color: 'text-orange-600 bg-orange-100',
      badge: 'Excel',
    },
  ];

  const filteredReports = salesReports.filter((report) =>
    report.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mapear colores para iconos (usar verde similar al ejemplo)
  const getIconColor = (colorClass: string) => {
    // Extraer el color base de la clase (ej: green-100, blue-100)
    if (colorClass.includes('green')) return 'bg-green-100 text-green-600';
    if (colorClass.includes('blue')) return 'bg-blue-100 text-blue-600';
    if (colorClass.includes('purple')) return 'bg-purple-100 text-purple-600';
    if (colorClass.includes('emerald')) return 'bg-emerald-100 text-emerald-600';
    if (colorClass.includes('indigo')) return 'bg-indigo-100 text-indigo-600';
    if (colorClass.includes('cyan')) return 'bg-cyan-100 text-cyan-600';
    if (colorClass.includes('orange')) return 'bg-orange-100 text-orange-600';
    return 'bg-green-100 text-green-600';
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Breadcrumb / Header */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/reports"
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Reportes
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Ventas</span>
      </div>

      {/* Título */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Ventas
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Monitorea la distribución de tus ventas y obtén información para
          gestionar tus operaciones comerciales.
        </p>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar reporte"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      {/* Tarjetas de reportes */}
      <div className="grid gap-4 pb-4 md:pb-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredReports.map((report) => {
          const iconColor = getIconColor(report.color);
          
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
              {/* Header con icono y favorito */}
              <div className="flex justify-between items-center p-3 w-full border-b border-slate-400/20 dark:border-slate-600/20">
                <div className="flex gap-2 items-center">
                  <div
                    className={`flex justify-center items-center w-8 h-6 rounded-lg ${iconColor}`}
                  >
                    <div className="scale-75">
                      {report.icon}
                    </div>
                  </div>
                  {report.badge && report.enabled && (
                    <Badge
                      variant="outline"
                      className="text-xs border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      {report.badge}
                    </Badge>
                  )}
                  {!report.enabled && (
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      Próximamente
                    </Badge>
                  )}
                </div>
                {report.enabled && (
                  <button
                    type="button"
                    className="z-50 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // TODO: Implementar favoritos
                    }}
                  >
                    <Star className="h-4 w-4 text-slate-900 dark:text-slate-100 hover:text-amber-400 transition-colors duration-300 ease-in-out" />
                  </button>
                )}
              </div>

              {/* Contenido */}
              <div className="flex flex-col gap-1.5 p-3 w-full">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200">
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
