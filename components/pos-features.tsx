import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const features = [
  {
    title: 'Gestión de Ventas',
    description:
      'Procesa ventas de manera rápida y eficiente con interfaz intuitiva optimizada para agilizar tu operación diaria',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    color: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'Control de Inventario',
    description: 'Mantén un control preciso de tu stock, productos y movimientos en tiempo real con alertas automáticas',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    color: 'from-purple-500 to-pink-500',
  },
  {
    title: 'Reportes Detallados',
    description:
      'Genera reportes completos de ventas, inventario y rendimiento con análisis avanzados y visualizaciones',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'from-green-500 to-emerald-500',
  },
  {
    title: 'Múltiples Usuarios',
    description: 'Gestiona diferentes usuarios con roles y permisos específicos para cada miembro de tu equipo',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    color: 'from-orange-500 to-red-500',
  },
  {
    title: 'Seguridad Avanzada',
    description:
      'Protege tu información con encriptación de nivel empresarial y autenticación robusta multi-factor',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: 'from-indigo-500 to-purple-500',
  },
  {
    title: 'Fácil de Usar',
    description: 'Interfaz moderna y sencilla diseñada para una experiencia fluida sin curva de aprendizaje',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'from-yellow-500 to-orange-500',
  },
];

export function POSFeatures() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <div className="inline-block mb-4">
            <span className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
              Características
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Herramientas profesionales diseñadas para impulsar el crecimiento de tu negocio
            con tecnología de vanguardia
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

              <CardHeader className="relative">
                {/* Icon container with gradient */}
                <div className="mb-6 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300`} />
                  <div className={`relative w-16 h-16 mx-auto bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    {feature.icon}
                  </div>
                </div>

                <CardTitle className="text-2xl mb-3 group-hover:text-primary transition-colors duration-300">
                  {feature.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="relative">
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>

                {/* Learn more link */}
                <div className="mt-4 flex items-center gap-2 text-primary font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Explorar más</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </CardContent>

              {/* Decorative corner element */}
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-300`} />
            </Card>
          ))}
        </div>

        {/* Additional features list */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="bg-muted/50 rounded-2xl p-8 md:p-12 border">
            <h3 className="text-2xl font-bold mb-8 text-center">Y mucho más incluido</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { text: 'Facturación electrónica integrada', icon: '📄' },
                { text: 'Sincronización en tiempo real', icon: '🔄' },
                { text: 'Modo offline disponible', icon: '📱' },
                { text: 'Exportación de datos en múltiples formatos', icon: '💾' },
                { text: 'Integraciones con sistemas contables', icon: '🔗' },
                { text: 'Actualizaciones automáticas sin costo', icon: '🚀' },
                { text: 'Backup automático diario', icon: '☁️' },
                { text: 'Soporte técnico prioritario', icon: '🎯' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <span className="text-base">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
