import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export function POSCTA() {
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto text-center">
          <CardContent className="p-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              ¿Listo para modernizar tu negocio?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Únete a cientos de negocios que ya confían en nuestro sistema POS
              para gestionar sus operaciones de manera más eficiente.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link href="/auth/sign-up">Comenzar Ahora</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6"
              >
                <Link href="/auth/login">Ya tengo cuenta</Link>
              </Button>
            </div>

            <div className="mt-12 pt-8 border-t">
              <p className="text-sm text-muted-foreground">
                ✨ Configuración en minutos • 🚀 Sin instalación • 💳 Pago
                seguro
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
