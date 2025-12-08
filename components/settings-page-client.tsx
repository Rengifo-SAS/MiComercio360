'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Settings,
  FileText,
  Percent,
  Printer,
  Building2,
  Layers,
  Users,
  Shield,
  Bell,
  Database,
  Globe,
  CreditCard,
  BarChart3,
  Palette,
  Zap,
} from 'lucide-react';

interface SettingsCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge?: string;
  status: 'active' | 'inactive' | 'coming-soon';
  route?: string;
}

export function SettingsPageClient() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const settingsCategories: SettingsCategory[] = [
    {
      id: 'company',
      title: 'Empresa',
      description:
        'Información general de la empresa, datos fiscales y configuración básica',
      icon: Building2,
      color: 'bg-blue-500',
      status: 'active',
      route: '/dashboard/settings/company',
    },
    {
      id: 'numerations',
      title: 'Numeraciones',
      description:
        'Configuración de secuencias para facturas, recibos, órdenes y documentos',
      icon: FileText,
      color: 'bg-green-500',
      status: 'active',
      route: '/dashboard/settings/numerations',
    },
    {
      id: 'taxes',
      title: 'Impuestos',
      description: 'Configuración de impuestos, retenciones y tasas aplicables',
      icon: Percent,
      color: 'bg-red-500',
      status: 'active',
      route: '/dashboard/settings/taxes',
    },
    {
      id: 'templates',
      title: 'Plantillas de Impresión',
      description:
        'Diseño y configuración de plantillas para facturas, recibos y reportes',
      icon: Printer,
      color: 'bg-purple-500',
      status: 'coming-soon',
      badge: 'Próximamente',
      route: '/dashboard/settings/templates',
    },
    {
      id: 'cost-centers',
      title: 'Centros de Costos',
      description: 'Gestión de centros de costos y categorías contables',
      icon: Layers,
      color: 'bg-orange-500',
      status: 'active',
      route: '/dashboard/settings/cost-centers',
    },
    {
      id: 'users',
      title: 'Usuarios y Permisos',
      description: 'Gestión de usuarios, roles y permisos del sistema',
      icon: Users,
      color: 'bg-indigo-500',
      status: 'active',
      route: '/dashboard/settings/users',
    },
    {
      id: 'security',
      title: 'Seguridad',
      description: 'Configuración de seguridad, autenticación y auditoría',
      icon: Shield,
      color: 'bg-gray-700',
      status: 'coming-soon',
      badge: 'Próximamente',
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      description:
        'Configuración de alertas, emails y notificaciones del sistema',
      icon: Bell,
      color: 'bg-yellow-500',
      status: 'coming-soon',
      badge: 'Próximamente',
    },
    {
      id: 'backup',
      title: 'Respaldo y Datos',
      description:
        'Configuración de respaldos, exportación e importación de datos',
      icon: Database,
      color: 'bg-teal-500',
      status: 'coming-soon',
      badge: 'Próximamente',
    },
    {
      id: 'integrations',
      title: 'Integraciones',
      description: 'Conexiones con servicios externos, APIs y plataformas',
      icon: Globe,
      color: 'bg-cyan-500',
      status: 'coming-soon',
      badge: 'Próximamente',
    },
    {
      id: 'payments',
      title: 'Métodos de Pago',
      description: 'Configuración de pasarelas de pago y métodos de cobro',
      icon: CreditCard,
      color: 'bg-pink-500',
      status: 'active',
      route: '/dashboard/settings/payment-methods',
    },
    {
      id: 'reports',
      title: 'Reportes y Análisis',
      description: 'Configuración de reportes personalizados y dashboards',
      icon: BarChart3,
      color: 'bg-emerald-500',
      status: 'coming-soon',
      badge: 'Próximamente',
    },
    {
      id: 'appearance',
      title: 'Apariencia',
      description: 'Personalización de colores, logos y tema del sistema',
      icon: Palette,
      color: 'bg-rose-500',
      status: 'coming-soon',
      badge: 'Próximamente',
    },
    {
      id: 'automation',
      title: 'Automatización',
      description: 'Reglas de negocio, workflows y automatizaciones',
      icon: Zap,
      color: 'bg-violet-500',
      status: 'coming-soon',
      badge: 'Próximamente',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'coming-soon':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Disponible';
      case 'inactive':
        return 'Inactivo';
      case 'coming-soon':
        return 'Próximamente';
      default:
        return status;
    }
  };

  const handleCategoryClick = (category: SettingsCategory) => {
    if (category.status === 'coming-soon') {
      return; // No hacer nada para categorías próximamente
    }

    setSelectedCategory(category.id);
    // Navegar al submodulo correspondiente
    if (category.route) {
      router.push(category.route);
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-100 dark:bg-slate-900/20 rounded-lg">
            <Settings className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona la configuración del sistema y personaliza tu experiencia
            </p>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">
              Configuraciones Activas
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {settingsCategories.filter((c) => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Módulos disponibles</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Próximamente</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {
                settingsCategories.filter((c) => c.status === 'coming-soon')
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Nuevas funcionalidades
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">
              Última Actualización
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">Hoy</div>
            <p className="text-xs text-muted-foreground">Sistema actualizado</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">
              Estado del Sistema
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-green-600">Operativo</div>
            <p className="text-xs text-muted-foreground">
              Todos los servicios funcionando
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Categorías de configuración */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight pb-1">
            Categorías de Configuración
          </h2>
          <p className="text-sm text-muted-foreground">
            Selecciona una categoría para acceder a su configuración específica
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settingsCategories.map((category) => {
            const IconComponent = category.icon;
            const isDisabled = category.status === 'coming-soon';

            return (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                  isDisabled
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:scale-[1.02]'
                } ${
                  selectedCategory === category.id
                    ? 'ring-2 ring-blue-500 shadow-md'
                    : ''
                }`}
                onClick={() => handleCategoryClick(category)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`p-3 rounded-lg ${category.color} text-white`}
                    >
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusColor(category.status)}>
                        {category.badge || getStatusLabel(category.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardTitle className="text-lg mb-2">
                    {category.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {category.description}
                  </CardDescription>

                  {!isDisabled && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryClick(category);
                        }}
                      >
                        Configurar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Información adicional */}
      <Card className="shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                ¿Necesitas ayuda con la configuración?
              </h3>
              <p className="text-blue-700 mb-4">
                Nuestro equipo de soporte está disponible para ayudarte a
                configurar el sistema según las necesidades de tu negocio.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm">
                  Ver Documentación
                </Button>
                <Button variant="outline" size="sm">
                  Contactar Soporte
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
