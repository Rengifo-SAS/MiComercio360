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
import { ShieldX, ArrowLeft, Home, UserCheck } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Acceso Denegado
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
            No tienes permisos para acceder a esta página. Contacta a tu
            administrador si crees que esto es un error.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tu rol actual no tiene los permisos necesarios para ver este
              contenido.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Si necesitas acceso, contacta a un administrador del sistema.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
              <UserCheck className="mr-2 h-4 w-4" />
              ¿Qué puedes hacer?
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Verifica que tengas los permisos necesarios</li>
              <li>• Contacta a un administrador para solicitar acceso</li>
              <li>• Regresa al dashboard y navega desde ahí</li>
              <li>• Revisa tu perfil de usuario y roles asignados</li>
            </ul>
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

          <div className="text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Si crees que esto es un error, por favor contacta al administrador
              del sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
