'use client';

import { useState, useEffect } from 'react';
import { TaxesService } from '@/lib/services/taxes-service';
import { Tax, getTaxTypeInfo, formatPercentage } from '@/lib/types/taxes';
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
  Receipt,
  MinusCircle,
  ShoppingCart,
  Building2,
  FileText,
} from 'lucide-react';

interface TaxDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tax: Tax | null;
  onDelete: () => void;
}

export function TaxDeleteDialog({
  open,
  onOpenChange,
  tax,
  onDelete,
}: TaxDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationInfo, setValidationInfo] = useState<{
    canDelete: boolean;
    isDefault: boolean;
    isOnlyTax: boolean;
    isUsed: boolean;
    usedByProduct?: string;
    reason?: string;
  } | null>(null);
  const [loadingValidation, setLoadingValidation] = useState(false);

  // Cargar información de validación cuando se abre el diálogo
  useEffect(() => {
    const loadValidationInfo = async () => {
      if (!tax || !open) return;

      try {
        setLoadingValidation(true);
        const info = await TaxesService.getDeletionValidationInfo(tax.id);
        setValidationInfo(info);
      } catch (error) {
        console.error('Error cargando validación:', error);
        setValidationInfo({
          canDelete: false,
          isDefault: false,
          isOnlyTax: false,
          isUsed: false,
          reason: 'Error al validar la eliminación',
        });
      } finally {
        setLoadingValidation(false);
      }
    };

    loadValidationInfo();
  }, [tax, open]);

  const handleDelete = async () => {
    if (!tax) return;

    try {
      setLoading(true);
      setError(null);

      const result = await TaxesService.deleteTax(tax.id);

      if (result.success) {
        onOpenChange(false);
        onDelete();
      } else {
        setError(result.message);
      }
    } catch (error: unknown) {
      console.error('Error eliminando impuesto:', error);
      setError(
        (error as Error)?.message || 'Error inesperado eliminando el impuesto'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!tax) return null;

  // Obtener información del tipo de impuesto
  const typeInfo = getTaxTypeInfo(tax.tax_type);
  const TaxIcon = (() => {
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      Receipt,
      MinusCircle,
      ShoppingCart,
      Building2,
      FileText,
    };
    return iconMap[typeInfo.icon] || FileText;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:w-[90vw] md:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Impuesto
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el
            impuesto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del impuesto a eliminar */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <TaxIcon className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <div className="font-semibold">{tax.name}</div>
                <div className="text-sm text-muted-foreground">
                  {typeInfo.label}
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Porcentaje:</span>
                <span className="font-semibold">
                  {formatPercentage(tax.percentage)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <span
                  className={
                    tax.is_active ? 'text-green-600' : 'text-muted-foreground'
                  }
                >
                  {tax.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              {tax.is_default && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sistema:</span>
                  <span className="text-blue-600 font-semibold">
                    Por defecto
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Información de validación */}
          {loadingValidation ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verificando si se puede eliminar...</span>
                </div>
              </AlertDescription>
            </Alert>
          ) : validationInfo ? (
            <Alert
              variant={validationInfo.canDelete ? 'default' : 'destructive'}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
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

                  {!validationInfo.canDelete && validationInfo.reason && (
                    <div className="text-sm text-red-600 font-medium">
                      {validationInfo.reason}
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Es por defecto:
                      </span>
                      <span
                        className={
                          validationInfo.isDefault
                            ? 'text-red-600 font-semibold'
                            : 'text-green-600'
                        }
                      >
                        {validationInfo.isDefault ? 'Sí' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Es el único impuesto:
                      </span>
                      <span
                        className={
                          validationInfo.isOnlyTax
                            ? 'text-red-600 font-semibold'
                            : 'text-green-600'
                        }
                      >
                        {validationInfo.isOnlyTax ? 'Sí' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Está siendo usado:
                      </span>
                      <span
                        className={
                          validationInfo.isUsed
                            ? 'text-red-600 font-semibold'
                            : 'text-green-600'
                        }
                      >
                        {validationInfo.isUsed
                          ? `Sí (${validationInfo.usedByProduct})`
                          : 'No'}
                      </span>
                    </div>
                  </div>

                  {validationInfo.canDelete && (
                    <div className="text-sm text-orange-600">
                      <strong>Advertencia:</strong> Esta acción no se puede
                      deshacer.
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}
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
              (validationInfo !== null && !validationInfo.canDelete)
            }
            title={
              validationInfo !== null && !validationInfo.canDelete
                ? validationInfo.reason || 'No se puede eliminar este impuesto'
                : 'Eliminar el impuesto'
            }
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Trash2 className="h-4 w-4 mr-2" />
            {validationInfo !== null && !validationInfo.canDelete
              ? 'No se puede eliminar'
              : 'Eliminar Impuesto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
