'use client';

import { useState, useEffect } from 'react';
import { PrintTemplatesService } from '@/lib/services/print-templates-service';
import { PrintTemplate } from '@/lib/types/print-templates';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Calculator,
  Receipt,
  ShoppingCart,
  Truck,
  ArrowUpCircle,
  ArrowDownCircle,
  CreditCard,
  ArrowRightCircle,
  Package,
  TrendingUp,
  File,
  Loader2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

interface PrintTemplateDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PrintTemplate | null;
  onDelete: () => void;
}

export function PrintTemplateDeleteDialog({
  open,
  onOpenChange,
  template,
  onDelete,
}: PrintTemplateDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationInfo, setValidationInfo] = useState<{
    canDelete: boolean;
    isDefault: boolean;
    reason?: string;
  } | null>(null);
  const [loadingValidation, setLoadingValidation] = useState(false);

  useEffect(() => {
    const loadValidationInfo = async () => {
      if (!template || !open) return;

      try {
        setLoadingValidation(true);
        const info = await PrintTemplatesService.getDeletionValidationInfo(
          template.id
        );
        setValidationInfo(info);
      } catch (error) {
        console.error('Error cargando información de validación:', error);
        setError('Error al validar la eliminación');
      } finally {
        setLoadingValidation(false);
      }
    };

    loadValidationInfo();
  }, [template, open]);

  const handleDelete = async () => {
    if (!template || !validationInfo?.canDelete) return;

    try {
      setLoading(true);
      setError(null);
      await PrintTemplatesService.deleteTemplate(template.id);
      onDelete();
    } catch (error: unknown) {
      console.error('Error eliminando plantilla:', error);
      setError((error as Error)?.message || 'Error al eliminar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      FileText,
      Calculator,
      Receipt,
      ShoppingCart,
      Truck,
      ArrowUpCircle,
      ArrowDownCircle,
      CreditCard,
      ArrowRightCircle,
      Package,
      TrendingUp,
      File,
    };
    return iconMap[type] || FileText;
  };

  if (!template) return null;

  const DocumentTypeIcon = getDocumentTypeIcon(template.document_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:w-[90vw] md:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Eliminar Plantilla
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. La plantilla será eliminada
            permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la plantilla */}
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="p-2 bg-muted rounded-lg">
              <DocumentTypeIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{template.name}</div>
              <div className="text-sm text-muted-foreground">
                {template.document_type}
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loadingValidation ? (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Validando información de eliminación...
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
                        Es plantilla por defecto:
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

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Información adicional:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>La plantilla será eliminada permanentemente</li>
              <li>No se podrá recuperar la información</li>
              <li>
                Si es la plantilla por defecto, se deberá seleccionar otra
              </li>
              <li>Los documentos ya impresos no se verán afectados</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
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
                ? validationInfo.reason || 'No se puede eliminar esta plantilla'
                : 'Eliminar la plantilla'
            }
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Trash2 className="h-4 w-4 mr-2" />
            {validationInfo !== null && !validationInfo.canDelete
              ? 'No se puede eliminar'
              : 'Eliminar Plantilla'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
