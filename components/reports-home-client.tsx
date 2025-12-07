'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  Search,
  DollarSign,
  BarChart3,
  FileText,
  Receipt,
  Briefcase,
  FileSpreadsheet,
} from 'lucide-react';

interface ReportsHomeClientProps {
  companyId: string;
  userId: string;
}

interface ReportCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  href: string;
  enabled: boolean;
  color: string;
}

export function ReportsHomeClient({
  companyId,
  userId,
}: ReportsHomeClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const categories: ReportCategory[] = [
    {
      id: 'sales',
      title: 'Ventas',
      description:
        'Monitorea la distribución de tus ventas y obtén información para gestionar tus operaciones comerciales.',
      icon: <DollarSign className="h-5 w-5" />,
      count: 7,
      href: '/dashboard/reports/sales',
      enabled: true,
      color: 'text-green-600',
    },
    {
      id: 'administrative',
      title: 'Administrativos',
      description:
        'Haz seguimiento a tus transacciones y obtén información para controlar la salud financiera de tu empresa.',
      icon: <BarChart3 className="h-5 w-5" />,
      count: 7,
      href: '/dashboard/reports/administrative',
      enabled: true,
      color: 'text-blue-600',
    },
    {
      id: 'accounting',
      title: 'Contables',
      description:
        'Conoce el desempeño contable y el estado económico de tu empresa en todo momento.',
      icon: <FileText className="h-5 w-5" />,
      count: 7,
      href: '/dashboard/reports/accounting',
      enabled: true,
      color: 'text-amber-400',
    },
    {
      id: 'fiscal',
      title: 'Fiscales',
      description:
        'Revisa el detalle de tus impuestos y retenciones para cumplir con tus obligaciones tributarias.',
      icon: <Receipt className="h-5 w-5" />,
      count: 4,
      href: '/dashboard/reports/tax',
      enabled: true,
      color: 'text-rose-600',
    },
    {
      id: 'work',
      title: 'Para trabajar',
      description:
        'Exporta la información clave de tu negocio para realizar análisis adicionales.',
      icon: <Briefcase className="h-5 w-5" />,
      count: 3,
      href: '#',
      enabled: false,
      color: 'text-indigo-600',
    },
    {
      id: 'exogenous',
      title: 'Información exógena',
      description:
        'Gestiona tus formatos de información exógena para presentarlos ante la DIAN.',
      icon: <FileSpreadsheet className="h-5 w-5" />,
      count: 8,
      href: '#',
      enabled: false,
      color: 'text-purple-700',
    },
  ];

  const filteredCategories = categories.filter((category) =>
    category.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header con buscador */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            Reportes
          </h1>
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

      {/* Título de sección */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700 dark:text-slate-200">
          Clasificación por categoría
        </h2>
      </div>

      {/* Tarjetas de categorías */}
      <div className="grid gap-4 pb-4 md:pb-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredCategories.map((category) => {
          const content = (
            <div
              className={`
                w-full bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-500 ease-in-out
                border-slate-400/20 dark:border-slate-600/20
                ${category.enabled 
                  ? 'cursor-pointer hover:border-slate-400/40 dark:hover:border-slate-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/50' 
                  : 'opacity-60 cursor-not-allowed'
                }
                ${!category.enabled ? 'bg-muted/50 dark:bg-muted/30' : ''}
                flex items-center gap-4 p-4
              `}
            >
              {/* Icono */}
              <div className={`flex-shrink-0 ${category.color} opacity-100`}>
                {category.icon}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 translate-y-0">
                  {category.title}
                </h4>
                <div className="flex items-center gap-2 opacity-100">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {category.count} reportes
                  </span>
                </div>
                {category.description && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 translate-y-0 opacity-0 hidden">
                    {category.description}
                  </span>
                )}
              </div>
            </div>
          );

          if (category.enabled) {
            return (
              <Link key={category.id} href={category.href} className="block">
                {content}
              </Link>
            );
          }

          return <div key={category.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}
