'use client';

import { useState, useEffect, useCallback } from 'react';
import { CostCentersService } from '@/lib/services/cost-centers-service';
import {
  CostCenter,
  CostCenterHistory,
  getCostCenterTypeInfo,
  formatCurrency,
  calculateBudgetUsage,
} from '@/lib/types/cost-centers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
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
  Edit,
  Trash2,
  Copy,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Target,
  Activity,
} from 'lucide-react';

interface CostCenterViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCenter: CostCenter | null;
  onEdit: (costCenter: CostCenter) => void;
  onDelete: (costCenter: CostCenter) => void;
  onDuplicate: (costCenter: CostCenter) => void;
  onToggleStatus: (costCenter: CostCenter) => void;
}

export function CostCenterViewDialog({
  open,
  onOpenChange,
  costCenter,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
}: CostCenterViewDialogProps) {
  const [history, setHistory] = useState<CostCenterHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!costCenter) return;

    try {
      setLoadingHistory(true);
      const historyData = await CostCentersService.getCostCenterHistory(
        costCenter.id
      );
      setHistory(historyData);
    } catch (error: unknown) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [costCenter]);

  // Cargar historial cuando se abre el diálogo
  useEffect(() => {
    if (open && costCenter) {
      loadHistory();
    }
  }, [open, costCenter, loadHistory]);

  const handleDuplicate = async () => {
    if (!costCenter) return;
    await onDuplicate(costCenter);
    onOpenChange(false);
  };

  const handleToggleStatus = async () => {
    if (!costCenter) return;
    await onToggleStatus(costCenter);
  };

  if (!costCenter) return null;

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const budgetUsage = costCenter.budget_limit
    ? calculateBudgetUsage(
        costCenter.total_assigned || 0,
        costCenter.budget_limit
      )
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[85vw] lg:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeInfo.color}`}>
              <CostCenterIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl">{costCenter.name}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {costCenter.code} • {typeInfo.label}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Información detallada del centro de costos
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="budget">Presupuesto</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Información básica */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información Básica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Código:
                      </span>
                      <span className="font-semibold">{costCenter.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Tipo:
                      </span>
                      <Badge variant="outline" className={typeInfo.color}>
                        {typeInfo.label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Estado:
                      </span>
                      <Badge
                        variant={costCenter.is_active ? 'default' : 'secondary'}
                      >
                        {costCenter.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    {costCenter.is_default && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Sistema:
                        </span>
                        <Badge variant="outline" className="text-blue-600">
                          Por defecto
                        </Badge>
                      </div>
                    )}
                    {costCenter.parent && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Centro Padre:
                        </span>
                        <span className="font-semibold">
                          {costCenter.parent.code} - {costCenter.parent.name}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Configuración */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuración</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Responsable:
                      </span>
                      <div className="flex items-center gap-2">
                        {costCenter.responsible_person ? (
                          <>
                            <User className="h-4 w-4 text-green-500" />
                            <span className="font-semibold">
                              {costCenter.responsible_person}
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-muted-foreground">
                              No asignado
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Creado:
                      </span>
                      <span className="text-sm">
                        {formatDate(costCenter.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Actualizado:
                      </span>
                      <span className="text-sm">
                        {formatDate(costCenter.updated_at)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Descripción */}
            {costCenter.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {costCenter.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Acciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acciones</CardTitle>
                <CardDescription>
                  Gestiona este centro de costos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onEdit(costCenter)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Centro de Costos
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleDuplicate}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar Centro de Costos
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleToggleStatus}
                >
                  {costCenter.is_active ? (
                    <XCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {costCenter.is_active ? 'Desactivar' : 'Activar'}
                </Button>

                {!costCenter.is_default && (
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => onDelete(costCenter)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Centro de Costos
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Información Presupuestaria
                </CardTitle>
                <CardDescription>
                  Control y seguimiento del presupuesto asignado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {costCenter.budget_limit && costCenter.budget_limit > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(costCenter.budget_limit)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Presupuesto Total
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(costCenter.total_assigned || 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Usado
                        </div>
                      </div>
                      <div className="text-center">
                        <div
                          className={`text-2xl font-bold ${
                            budgetUsage?.isOverBudget
                              ? 'text-red-600'
                              : 'text-orange-600'
                          }`}
                        >
                          {formatCurrency(budgetUsage?.remaining || 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Disponible
                        </div>
                      </div>
                    </div>

                    {budgetUsage && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Uso del presupuesto:
                          </span>
                          <span
                            className={`font-semibold ${
                              budgetUsage.isOverBudget ? 'text-red-600' : ''
                            }`}
                          >
                            {budgetUsage.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={budgetUsage.percentage}
                          className="h-3"
                        />
                        {budgetUsage.isOverBudget && (
                          <div className="flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>Presupuesto excedido</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Sin límite presupuestario
                    </h3>
                    <p className="text-muted-foreground">
                      Este centro de costos no tiene un límite presupuestario
                      establecido.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Historial de Cambios</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadHistory}
                disabled={loadingHistory}
              >
                {loadingHistory ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 mr-2" />
                )}
                Actualizar
              </Button>
            </div>

            {loadingHistory ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-200 rounded animate-pulse"
                  ></div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sin historial</h3>
                  <p className="text-muted-foreground text-center">
                    No hay cambios registrados para este centro de costos.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {history.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <Activity className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {record.change_type === 'CREATED' &&
                                'Centro de costos creado'}
                              {record.change_type === 'UPDATED' &&
                                'Centro de costos actualizado'}
                              {record.change_type === 'ACTIVATED' &&
                                'Centro de costos activado'}
                              {record.change_type === 'DEACTIVATED' &&
                                'Centro de costos desactivado'}
                              {record.change_type === 'BUDGET_CHANGED' &&
                                'Presupuesto modificado'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {record.change_reason}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(record.changed_at)}
                          </div>
                          {record.changed_by_user && (
                            <div className="flex items-center gap-1 mt-1">
                              <User className="h-3 w-3" />
                              {record.changed_by_user.first_name}{' '}
                              {record.changed_by_user.last_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
