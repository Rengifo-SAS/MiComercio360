'use client';

import { useState, useEffect } from 'react';
import { CostCentersService } from '@/lib/services/cost-centers-service';
import {
  CostCenter,
  getCostCenterTypeInfo,
  formatCurrency,
} from '@/lib/types/cost-centers';
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
  Building2,
  TrendingUp,
  Cog,
  Megaphone,
  Users,
  Monitor,
  Calculator,
  Truck,
  FolderOpen,
  FileText,
} from 'lucide-react';

interface CostCenterDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCenter: CostCenter | null;
  onDelete: () => void;
}

export function CostCenterDeleteDialog({
  open,
  onOpenChange,
  costCenter,
  onDelete,
}: CostCenterDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationInfo, setValidationInfo] = useState<{
    canDelete: boolean;
    isDefault: boolean;
    hasChildren: boolean;
    hasAssignments: boolean;
    reason?: string;
  } | null>(null);
  const [loadingValidation, setLoadingValidation] = useState(false);

  // Cargar información de validación cuando se abre el diálogo
  useEffect(() => {
    const loadValidationInfo = async () => {
      if (!costCenter || !open) return;

      try {
        setLoadingValidation(true);

        // Verificar si es por defecto
        const isDefault = costCenter.is_default;

        // Verificar si tiene centros de costos hijos
        const children = await CostCentersService.getCostCenters(
          costCenter.company_id
        );
        const hasChildren = children.some(
          (cc) => cc.parent_id === costCenter.id
        );

        // Verificar si tiene asignaciones (simulado por ahora)
        const hasAssignments = false; // TODO: Implementar verificación real

        const canDelete = !isDefault && !hasChildren && !hasAssignments;

        let reason = '';
        if (isDefault) {
          reason =
            'No se puede eliminar un centro de costos por defecto del sistema.';
        } else if (hasChildren) {
          reason =
            'No se puede eliminar este centro de costos porque tiene centros de costos dependientes.';
        } else if (hasAssignments) {
          reason =
            'No se puede eliminar este centro de costos porque tiene asignaciones de gastos o ingresos.';
        }

        setValidationInfo({
          canDelete,
          isDefault,
          hasChildren,
          hasAssignments,
          reason,
        });
      } catch (error) {
        console.error('Error cargando validación:', error);
        setValidationInfo({
          canDelete: false,
          isDefault: false,
          hasChildren: false,
          hasAssignments: false,
          reason: 'Error al validar la eliminación',
        });
      } finally {
        setLoadingValidation(false);
      }
    };

    loadValidationInfo();
  }, [costCenter, open]);

  const handleDelete = async () => {
    if (!costCenter) return;

    try {
      setLoading(true);
      setError(null);

      const result = await CostCentersService.deleteCostCenter(costCenter.id);

      if (result.success) {
        onOpenChange(false);
        onDelete();
      } else {
        setError(result.message);
      }
    } catch (error: unknown) {
      console.error('Error eliminando centro de costos:', error);
      setError(
        (error as Error)?.message ||
          'Error inesperado eliminando el centro de costos'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!costCenter) return null;

  // Obtener información del tipo de centro de costos
  const typeInfo = getCostCenterTypeInfo(costCenter.cost_center_type);
  const CostCenterIcon = (() => {
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      Building2,
      TrendingUp,
      Cog,
      Megaphone,
      Users,
      Monitor,
      Calculator,
      Truck,
      FolderOpen,
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
            Eliminar Centro de Costos
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el
            centro de costos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del centro de costos a eliminar */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <CostCenterIcon className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <div className="font-semibold">{costCenter.name}</div>
                <div className="text-sm text-muted-foreground">
                  {costCenter.code} • {typeInfo.label}
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <span
                  className={
                    costCenter.is_active
                      ? 'text-green-600'
                      : 'text-muted-foreground'
                  }
                >
                  {costCenter.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              {costCenter.is_default && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sistema:</span>
                  <span className="text-blue-600 font-semibold">
                    Por defecto
                  </span>
                </div>
              )}
              {costCenter.budget_limit && costCenter.budget_limit > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Presupuesto:</span>
                  <span className="font-semibold">
                    {formatCurrency(costCenter.budget_limit)}
                  </span>
                </div>
              )}
              {costCenter.responsible_person && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Responsable:</span>
                  <span className="font-semibold">
                    {costCenter.responsible_person}
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
                        Tiene centros dependientes:
                      </span>
                      <span
                        className={
                          validationInfo.hasChildren
                            ? 'text-red-600 font-semibold'
                            : 'text-green-600'
                        }
                      >
                        {validationInfo.hasChildren ? 'Sí' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tiene asignaciones:
                      </span>
                      <span
                        className={
                          validationInfo.hasAssignments
                            ? 'text-red-600 font-semibold'
                            : 'text-green-600'
                        }
                      >
                        {validationInfo.hasAssignments ? 'Sí' : 'No'}
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
                ? validationInfo.reason ||
                  'No se puede eliminar este centro de costos'
                : 'Eliminar el centro de costos'
            }
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Trash2 className="h-4 w-4 mr-2" />
            {validationInfo !== null && !validationInfo.canDelete
              ? 'No se puede eliminar'
              : 'Eliminar Centro de Costos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
