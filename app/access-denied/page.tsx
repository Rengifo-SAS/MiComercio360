'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Acceso Denegado
          </CardTitle>
          <CardDescription className="text-gray-600">
            No tienes permisos para acceder a esta página. Contacta a tu
            administrador si crees que esto es un error.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">
              Tu rol actual no tiene los permisos necesarios para ver este
              contenido.
            </p>
            <p className="text-sm text-gray-500">
              Si necesitas acceso, contacta a un administrador del sistema.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Ir al Dashboard
              </Link>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver Atrás
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
