import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function POSHero() {
  return (
    <div className="flex flex-col gap-16 items-center text-center">
      <div className="flex flex-col gap-8 items-center">
        <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
          Sistema POS
          <span className="block text-primary">Moderno y Eficiente</span>
        </h1>

        <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl leading-relaxed">
          Gestiona tu negocio con nuestro sistema de punto de venta completo.
          Control de inventario, ventas, reportes y mucho más en una sola
          plataforma.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button asChild size="lg" className="text-lg px-8 py-6">
            <Link href="/auth/login">Iniciar Sesión</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="text-lg px-8 py-6"
          >
            <Link href="/auth/sign-up">Crear Cuenta</Link>
          </Button>
        </div>
      </div>

      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
    </div>
  );
}
