'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Error Crítico
              </CardTitle>
              <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
                Ha ocurrido un error crítico en la aplicación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  La aplicación no puede continuar debido a un error interno.
                </p>
                {error.digest && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                    ID de error: {error.digest}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Acciones recomendadas:
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Recarga la página completamente</li>
                  <li>• Limpia la caché del navegador</li>
                  <li>• Verifica tu conexión a internet</li>
                  <li>• Contacta al soporte técnico si el problema persiste</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={reset} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reiniciar Aplicación
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => (window.location.href = '/')}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Ir al Inicio
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Si el problema persiste, por favor contacta al soporte técnico
                  con el ID de error mostrado arriba.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                    Información de desarrollo:
                  </h4>
                  <pre className="text-xs text-red-700 dark:text-red-300 overflow-auto">
                    {error.message}
                    {error.stack && `\n\nStack trace:\n${error.stack}`}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
