'use client';

import { useState, useEffect } from 'react';
import { NumerationsService } from '@/lib/services/numerations-service';
import { Numeration, getDocumentTypeInfo } from '@/lib/types/numerations';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Trash2,
  Loader2,
  FileText,
  Receipt,
  CreditCard,
  PlusCircle,
  MinusCircle,
  ShoppingCart,
  Calculator,
  Truck,
  DollarSign,
  Settings,
} from 'lucide-react';

interface NumerationDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeration: Numeration | null;
  onDelete: () => void;
}

export function NumerationDeleteDialog({
  open,
  onOpenChange,
  numeration,
  onDelete,
}: NumerationDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationInfo, setValidationInfo] = useState<{
    canDelete: boolean;
    isUsed: boolean;
    isOnlyForType: boolean;
    totalUses: number;
    lastUsed?: string;
    reason?: string;
  } | null>(null);
  const [loadingValidation, setLoadingValidation] = useState(false);

  // Cargar información de validación cuando se abre el diálogo
  useEffect(() => {
    const loadValidationInfo = async () => {
      if (!numeration || !open) return;

      try {
        setLoadingValidation(true);
        const info = await NumerationsService.getDeletionValidationInfo(
          numeration.id
        );
        setValidationInfo(info);
      } catch (error) {
        console.error('Error cargando información de validación:', error);
        setValidationInfo({
          canDelete: false,
          isUsed: false,
          isOnlyForType: false,
          totalUses: 0,
          reason: 'Error al validar la eliminación',
        });
      } finally {
        setLoadingValidation(false);
      }
    };

    loadValidationInfo();
  }, [numeration, open]);

  const handleDelete = async () => {
    if (!numeration) return;

    try {
      setLoading(true);
      setError(null);

      const result = await NumerationsService.deleteNumeration(numeration.id);

      if (result.success) {
        onOpenChange(false);
        onDelete();
      } else {
        setError(result.message);
      }
    } catch (error: unknown) {
      console.error('Error eliminando numeración:', error);
      setError(
        (error as Error)?.message || 'Error inesperado eliminando la numeración'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!numeration) return null;

  // Obtener información del tipo de documento
  const typeInfo = getDocumentTypeInfo(numeration.document_type);
  const DocumentIcon = typeInfo
    ? (() => {
        const iconMap: Record<
          string,
          React.ComponentType<{ className?: string }>
        > = {
          FileText,
          Receipt,
          CreditCard,
          PlusCircle,
          MinusCircle,
          ShoppingCart,
          Calculator,
          Truck,
          DollarSign,
          Settings,
        };
        return iconMap[typeInfo.icon] || FileText;
      })()
    : FileText;

  // Formatear número actual
  const formatCurrentNumber = () => {
    const formattedNumber = numeration.current_number
      .toString()
      .padStart(numeration.number_length, '0');
    return `${numeration.prefix}${formattedNumber}${numeration.suffix}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:w-[90vw] md:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Numeración
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente la
            numeración y todo su historial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la numeración a eliminar */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <DocumentIcon className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <div className="font-semibold">{numeration.name}</div>
                <div className="text-sm text-muted-foreground">
                  {typeInfo?.label}
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Formato actual:</span>
                <span className="font-mono font-semibold">
                  {formatCurrentNumber()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Número actual:</span>
                <span className="font-semibold">
                  {numeration.current_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <span
                  className={
                    numeration.is_active
                      ? 'text-green-600'
                      : 'text-muted-foreground'
                  }
                >
                  {numeration.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
          </div>

          {/* Información de validación */}
          {loadingValidation ? (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  Verificando si se puede eliminar...
                </span>
              </div>
            </div>
          ) : validationInfo ? (
            <div className="p-4 bg-muted rounded-lg">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Estado de eliminación:
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      validationInfo.canDelete
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {validationInfo.canDelete
                      ? 'Se puede eliminar'
                      : 'No se puede eliminar'}
                  </span>
                </div>

                {validationInfo.isUsed && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Ha sido utilizada:
                      </span>
                      <span className="text-sm font-semibold text-red-600">
                        Sí ({validationInfo.totalUses} veces)
                      </span>
                    </div>
                    {validationInfo.lastUsed && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Último uso:
                        </span>
                        <span className="text-sm">
                          {new Date(validationInfo.lastUsed).toLocaleDateString(
                            'es-ES',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {validationInfo.isOnlyForType && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Es la única numeración para este tipo:
                    </span>
                    <span className="text-sm font-semibold text-red-600">
                      Sí
                    </span>
                  </div>
                )}

                {!validationInfo.canDelete && validationInfo.reason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      <strong>Razón:</strong> {validationInfo.reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Advertencias */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-semibold">Advertencias importantes:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Se eliminará permanentemente la numeración</li>
                  <li>Se perderá todo el historial de cambios</li>
                  <li>Los documentos ya generados no se verán afectados</li>
                  <li>Esta acción no se puede deshacer</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Mensaje de error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={
              loading ||
              loadingValidation ||
              (validationInfo && !validationInfo.canDelete)
            }
            title={
              validationInfo && !validationInfo.canDelete
                ? 'No se puede eliminar esta numeración'
                : 'Eliminar la numeración'
            }
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Trash2 className="h-4 w-4 mr-2" />
            {validationInfo && !validationInfo.canDelete
              ? 'No se puede eliminar'
              : 'Eliminar Numeración'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
