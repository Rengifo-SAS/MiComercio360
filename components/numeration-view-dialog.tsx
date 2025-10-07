'use client';

import { useState, useEffect, useCallback } from 'react';
import { NumerationsService } from '@/lib/services/numerations-service';
import {
  Numeration,
  NumerationHistory,
  getDocumentTypeInfo,
} from '@/lib/types/numerations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
// import { Separator } from '@/components/ui/separator';
import {
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
  Edit,
  Trash2,
  RotateCcw,
  Copy,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

interface NumerationViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeration: Numeration | null;
  onEdit: (numeration: Numeration) => void;
  onDelete: (numeration: Numeration) => void;
}

export function NumerationViewDialog({
  open,
  onOpenChange,
  numeration,
  onEdit,
  onDelete,
}: NumerationViewDialogProps) {
  const [history, setHistory] = useState<NumerationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{
    isUsed: boolean;
    totalUses: number;
    lastUsed?: string;
    canReset: boolean;
  } | null>(null);
  const [deletionInfo, setDeletionInfo] = useState<{
    canDelete: boolean;
    isUsed: boolean;
    isOnlyForType: boolean;
    totalUses: number;
    lastUsed?: string;
    reason?: string;
  } | null>(null);

  const loadHistory = useCallback(async () => {
    if (!numeration) return;

    try {
      setLoadingHistory(true);
      const historyData = await NumerationsService.getNumerationHistory(
        numeration.id
      );
      setHistory(historyData);
    } catch (error: unknown) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [numeration]);

  const loadUsageInfo = useCallback(async () => {
    if (!numeration) return;

    try {
      const info = await NumerationsService.getNumerationUsageInfo(
        numeration.id
      );
      setUsageInfo(info);
    } catch (error: unknown) {
      console.error('Error cargando información de uso:', error);
    }
  }, [numeration]);

  const loadDeletionInfo = useCallback(async () => {
    if (!numeration) return;

    try {
      const info = await NumerationsService.getDeletionValidationInfo(
        numeration.id
      );
      setDeletionInfo(info);
    } catch (error: unknown) {
      console.error('Error cargando información de eliminación:', error);
    }
  }, [numeration]);

  // Cargar historial e información de uso cuando se abre el diálogo
  useEffect(() => {
    if (open && numeration) {
      loadHistory();
      loadUsageInfo();
      loadDeletionInfo();
    }
  }, [open, numeration, loadHistory, loadUsageInfo, loadDeletionInfo]);

  const handleReset = async () => {
    if (!numeration) return;

    try {
      setResetting(true);
      const newNumber = 0;
      const reason = 'Reseteo manual desde vista detallada';
      const result = await NumerationsService.resetNumeration(
        numeration.id,
        newNumber,
        reason
      );

      if (result.success) {
        await loadHistory();
        // Aquí podrías mostrar un toast de éxito si tienes un sistema de notificaciones
        console.log('Numeración reseteada exitosamente');
      } else {
        // Mostrar error al usuario
        alert(result.message);
      }
    } catch (error: unknown) {
      console.error('Error reseteando numeración:', error);
      alert('Error inesperado al resetear la numeración');
    } finally {
      setResetting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!numeration) return;

    try {
      const newName = `${numeration.name} (Copia)`;
      await NumerationsService.duplicateNumeration(numeration.id, newName);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error duplicando numeración:', error);
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

  // Formatear próximo número
  const formatNextNumber = () => {
    const nextNumber = numeration.current_number + 1;
    const formattedNumber = nextNumber
      .toString()
      .padStart(numeration.number_length, '0');
    return `${numeration.prefix}${formattedNumber}${numeration.suffix}`;
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[85vw] lg:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DocumentIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-xl">{numeration.name}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {typeInfo?.label}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Información detallada y historial de la numeración
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
            <TabsTrigger value="actions">Acciones</TabsTrigger>
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
                        Estado:
                      </span>
                      <Badge
                        variant={numeration.is_active ? 'default' : 'secondary'}
                      >
                        {numeration.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Prefijo:
                      </span>
                      <span className="font-mono">{numeration.prefix}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Sufijo:
                      </span>
                      <span className="font-mono">
                        {numeration.suffix || 'Ninguno'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Longitud:
                      </span>
                      <span>{numeration.number_length} dígitos</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Numeración actual */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Numeración Actual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Número actual:
                      </span>
                      <span className="font-mono text-lg font-semibold">
                        {numeration.current_number}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Formato actual:
                      </span>
                      <span className="font-mono text-lg font-semibold text-primary">
                        {formatCurrentNumber()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Próximo número:
                      </span>
                      <span className="font-mono text-lg font-semibold text-green-600">
                        {formatNextNumber()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Información de uso */}
              {usageInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Estado de Uso
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          Ha sido utilizada:
                        </span>
                        <div className="flex items-center gap-2">
                          {usageInfo.isUsed ? (
                            <CheckCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-green-500" />
                          )}
                          <Badge
                            variant={
                              usageInfo.isUsed ? 'destructive' : 'default'
                            }
                          >
                            {usageInfo.isUsed ? 'Sí' : 'No'}
                          </Badge>
                        </div>
                      </div>

                      {usageInfo.isUsed && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              Total de usos:
                            </span>
                            <span className="font-semibold text-red-600">
                              {usageInfo.totalUses}
                            </span>
                          </div>
                          {usageInfo.lastUsed && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-muted-foreground">
                                Último uso:
                              </span>
                              <span className="text-sm">
                                {formatDate(usageInfo.lastUsed)}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          Puede resetearse:
                        </span>
                        <div className="flex items-center gap-2">
                          {usageInfo.canReset ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <Badge
                            variant={
                              usageInfo.canReset ? 'default' : 'destructive'
                            }
                          >
                            {usageInfo.canReset ? 'Sí' : 'No'}
                          </Badge>
                        </div>
                      </div>

                      {!usageInfo.canReset && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700">
                            <strong>Advertencia:</strong> Esta numeración ya ha
                            sido utilizada y no puede ser reseteada para evitar
                            números de documento duplicados que afectarían la
                            integridad contable.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Descripción */}
            {numeration.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {numeration.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Información del sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Información del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono text-xs">{numeration.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Creada:</span>
                  <span>{formatDate(numeration.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actualizada:</span>
                  <span>{formatDate(numeration.updated_at)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
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
                    No hay cambios registrados para esta numeración
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
                            <RotateCcw className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">
                              Número {record.old_number} → {record.new_number}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {record.change_reason || 'Cambio manual'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(record.changed_at)}
                          </div>
                          {record.changed_by && (
                            <div className="flex items-center gap-1 mt-1">
                              <User className="h-3 w-3" />
                              Usuario
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

          <TabsContent value="actions" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Acciones principales */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Acciones Principales
                  </CardTitle>
                  <CardDescription>
                    Gestiona la numeración directamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onEdit(numeration)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Numeración
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleDuplicate}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar Numeración
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleReset}
                    disabled={
                      resetting || (usageInfo !== null && !usageInfo.canReset)
                    }
                    title={
                      usageInfo !== null && !usageInfo.canReset
                        ? 'Esta numeración ya ha sido utilizada y no puede ser reseteada para evitar duplicados'
                        : 'Resetear la numeración a 0'
                    }
                  >
                    {resetting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : usageInfo !== null && !usageInfo.canReset ? (
                      <XCircle className="h-4 w-4 mr-2 text-red-500" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    {usageInfo !== null && !usageInfo.canReset
                      ? 'No se puede resetear'
                      : 'Resetear a 0'}
                  </Button>
                </CardContent>
              </Card>

              {/* Acciones de peligro */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-destructive">
                    Zona de Peligro
                  </CardTitle>
                  <CardDescription>
                    Acciones que no se pueden deshacer
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => onDelete(numeration)}
                    disabled={deletionInfo !== null && !deletionInfo.canDelete}
                    title={
                      deletionInfo !== null && !deletionInfo.canDelete
                        ? 'No se puede eliminar esta numeración'
                        : 'Eliminar la numeración'
                    }
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deletionInfo !== null && !deletionInfo.canDelete
                      ? 'No se puede eliminar'
                      : 'Eliminar Numeración'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Información adicional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información Adicional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Reseteo de Numeración</div>
                    <div className="text-muted-foreground">
                      Al resetear, el número actual volverá a 0 y se registrará
                      en el historial.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Duplicación</div>
                    <div className="text-muted-foreground">
                      Se creará una copia exacta con el número actual en 0 y
                      estado inactivo.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Eliminación</div>
                    <div className="text-muted-foreground">
                      {deletionInfo && !deletionInfo.canDelete ? (
                        <div className="space-y-1">
                          <div>No se puede eliminar esta numeración:</div>
                          <div className="text-red-600 font-medium">
                            {deletionInfo.reason}
                          </div>
                        </div>
                      ) : (
                        'Se eliminará permanentemente la numeración y todo su historial.'
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
