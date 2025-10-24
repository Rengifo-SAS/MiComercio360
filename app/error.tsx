'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, Home, RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            ¡Oops! Algo salió mal
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
            Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Error interno del servidor - Por favor, intenta de nuevo.
            </p>
            {error.digest && (
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                ID de error: {error.digest}
              </p>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              ¿Qué puedes hacer?
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Intenta recargar la página</li>
              <li>• Verifica tu conexión a internet</li>
              <li>• Regresa al dashboard y navega desde ahí</li>
              <li>• Si el problema persiste, contacta al soporte</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Intentar de Nuevo
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Ir al Dashboard
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

          {process.env.NODE_ENV === 'development' && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                Información de desarrollo:
              </h4>
              <pre className="text-xs text-red-700 dark:text-red-300 overflow-auto">
                {error.message}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
