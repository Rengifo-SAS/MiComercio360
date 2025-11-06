import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Receipt, Clock } from 'lucide-react';

export default function DebitNotesPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
          <Receipt className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Nota Débito</h1>
          <p className="text-muted-foreground">
            Gestión de notas débito para ajustes y correcciones de facturación
          </p>
        </div>
      </div>

      {/* Próximamente Card */}
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">Próximamente</CardTitle>
            <CardDescription className="text-lg">
              El módulo de notas débito estará disponible próximamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Este módulo incluirá:
            </p>
            <ul className="text-sm text-muted-foreground mt-4 space-y-2 text-left">
              <li>• Generación de notas débito</li>
              <li>• Vinculación con facturas</li>
              <li>• Validación fiscal</li>
              <li>• Envío automático por email</li>
              <li>• Reportes de notas débito</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

