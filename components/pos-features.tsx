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
      'Procesa ventas de manera rápida y eficiente con interfaz intuitiva',
    icon: '🛒',
  },
  {
    title: 'Control de Inventario',
    description: 'Mantén un control preciso de tu stock y productos',
    icon: '📦',
  },
  {
    title: 'Reportes Detallados',
    description:
      'Genera reportes completos de ventas, inventario y rendimiento',
    icon: '📊',
  },
  {
    title: 'Múltiples Usuarios',
    description: 'Gestiona diferentes usuarios con permisos específicos',
    icon: '👥',
  },
  {
    title: 'Seguridad Avanzada',
    description:
      'Protege tu información con encriptación y autenticación robusta',
    icon: '🔒',
  },
  {
    title: 'Fácil de Usar',
    description: 'Interfaz moderna y sencilla para una experiencia fluida',
    icon: '✨',
  },
];

export function POSFeatures() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Características Principales
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Todo lo que necesitas para gestionar tu negocio de manera
            profesional
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="text-center hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="text-4xl mb-4">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
