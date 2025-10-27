import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileQuestion, Home, ArrowLeft, Search } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="flex-1 w-full flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <FileQuestion className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Página No Encontrada
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
            La página del dashboard que buscas no existe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Error 404 - La página solicitada no se pudo encontrar en el
              dashboard.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Utiliza el menú de navegación para encontrar lo que buscas.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Páginas disponibles:
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>
                •{' '}
                <Link
                  href="/dashboard"
                  className="text-blue-600 hover:underline"
                >
                  Dashboard principal
                </Link>
              </li>
              <li>
                •{' '}
                <Link
                  href="/dashboard/products"
                  className="text-blue-600 hover:underline"
                >
                  Productos
                </Link>
              </li>
              <li>
                •{' '}
                <Link
                  href="/dashboard/sales"
                  className="text-blue-600 hover:underline"
                >
                  Ventas
                </Link>
              </li>
              <li>
                •{' '}
                <Link
                  href="/dashboard/customers"
                  className="text-blue-600 hover:underline"
                >
                  Clientes
                </Link>
              </li>
              <li>
                •{' '}
                <Link
                  href="/dashboard/inventory"
                  className="text-blue-600 hover:underline"
                >
                  Inventario
                </Link>
              </li>
              <li>
                •{' '}
                <Link
                  href="/dashboard/settings"
                  className="text-blue-600 hover:underline"
                >
                  Configuración
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Ir al Dashboard
              </Link>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <Link href="javascript:history.back()">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver Atrás
              </Link>
            </Button>
          </div>

          <div className="text-center">
            <Button variant="ghost" asChild className="text-sm">
              <Link href="/dashboard/products">
                <Search className="mr-2 h-4 w-4" />
                Buscar Productos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
