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
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from 'lucide-react';

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const params = searchParams;

  const getErrorMessage = (errorCode?: string) => {
    switch (errorCode) {
      case 'Configuration':
        return 'Hay un problema con la configuración del servidor.';
      case 'AccessDenied':
        return 'Acceso denegado. No tienes permisos para realizar esta acción.';
      case 'Verification':
        return 'El enlace de verificación ha expirado o ya ha sido usado.';
      case 'Default':
      default:
        return 'Ha ocurrido un error durante el proceso de autenticación.';
    }
  };

  const getErrorDescription = (errorCode?: string) => {
    switch (errorCode) {
      case 'Configuration':
        return 'Por favor, contacta al administrador del sistema.';
      case 'AccessDenied':
        return 'Verifica tus credenciales o contacta a un administrador.';
      case 'Verification':
        return 'Solicita un nuevo enlace de verificación o contacta al soporte.';
      case 'Default':
      default:
        return 'Por favor, intenta nuevamente o contacta al soporte si el problema persiste.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Error de Autenticación
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
            {getErrorMessage(params?.error)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {getErrorDescription(params?.error)}
            </p>
            {params?.error && (
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                Código de error: {params.error}
              </p>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              ¿Qué puedes hacer?
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Verifica que el enlace sea correcto</li>
              <li>• Asegúrate de que tu sesión no haya expirado</li>
              <li>• Intenta iniciar sesión nuevamente</li>
              <li>• Contacta al soporte si el problema persiste</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href="/auth/login">
                <RefreshCw className="mr-2 h-4 w-4" />
                Intentar de Nuevo
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Ir al Inicio
              </Link>
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              className="text-sm"
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
