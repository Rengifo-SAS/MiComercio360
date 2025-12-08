'use client';

import { useState, useEffect, useCallback } from 'react';
import { TaxesService } from '@/lib/services/taxes-service';
import {
  Tax,
  TaxHistory,
  getTaxTypeInfo,
  formatPercentage,
  calculateTax,
} from '@/lib/types/taxes';
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
import {
  Receipt,
  MinusCircle,
  ShoppingCart,
  Building2,
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
  Calculator,
} from 'lucide-react';

interface TaxViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tax: Tax | null;
  onEdit: (tax: Tax) => void;
  onDelete: (tax: Tax) => void;
  onDuplicate: (tax: Tax) => void;
  onToggleStatus: (tax: Tax) => void;
}

export function TaxViewDialog({
  open,
  onOpenChange,
  tax,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
}: TaxViewDialogProps) {
  const [history, setHistory] = useState<TaxHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [testAmount, setTestAmount] = useState<number>(100000);

  const loadHistory = useCallback(async () => {
    if (!tax) return;

    try {
      setLoadingHistory(true);
      const historyData = await TaxesService.getTaxHistory(tax.id);
      setHistory(historyData);
    } catch (error: unknown) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [tax]);

  // Cargar historial cuando se abre el diálogo
  useEffect(() => {
    if (open && tax) {
      loadHistory();
    }
  }, [open, tax, loadHistory]);

  const handleDuplicate = async () => {
    if (!tax) return;
    await onDuplicate(tax);
    onOpenChange(false);
  };

  const handleToggleStatus = async () => {
    if (!tax) return;
    await onToggleStatus(tax);
  };

  if (!tax) return null;

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const testCalculation = calculateTax(
    testAmount,
    tax.percentage,
    tax.is_inclusive
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[85vw] lg:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeInfo.color}`}>
              <TaxIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl">{tax.name}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {typeInfo.label}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Información detallada del impuesto
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="calculator">Calculadora</TabsTrigger>
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
                        Nombre:
                      </span>
                      <span className="font-semibold">{tax.name}</span>
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
                        Porcentaje:
                      </span>
                      <span className="font-semibold text-lg">
                        {formatPercentage(tax.percentage)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Estado:
                      </span>
                      <Badge variant={tax.is_active ? 'default' : 'secondary'}>
                        {tax.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    {tax.is_default && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Sistema:
                        </span>
                        <Badge variant="outline" className="text-blue-600">
                          Por defecto
                        </Badge>
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
                        Incluido en precio:
                      </span>
                      <div className="flex items-center gap-2">
                        {tax.is_inclusive ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-semibold">
                          {tax.is_inclusive ? 'Sí' : 'No'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Creado:
                      </span>
                      <span className="text-sm">
                        {formatDate(tax.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Actualizado:
                      </span>
                      <span className="text-sm">
                        {formatDate(tax.updated_at)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Descripción */}
            {tax.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{tax.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Acciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acciones</CardTitle>
                <CardDescription>Gestiona este impuesto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onEdit(tax)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Impuesto
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleDuplicate}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar Impuesto
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleToggleStatus}
                >
                  {tax.is_active ? (
                    <XCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {tax.is_active ? 'Desactivar' : 'Activar'}
                </Button>

                {!tax.is_default && (
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => onDelete(tax)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Impuesto
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Calculadora de Impuestos
                </CardTitle>
                <CardDescription>
                  Prueba cómo se calcula este impuesto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Monto base (COP)
                  </label>
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) =>
                      setTestAmount(parseFloat(e.target.value) || 0)
                    }
                    className="w-full p-2 border rounded-md"
                    placeholder="100000"
                  />
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h4 className="font-semibold">Resultado del cálculo:</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto base:</span>
                      <span className="font-semibold">
                        ${testCalculation.baseAmount.toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {tax.name} ({formatPercentage(tax.percentage)}):
                      </span>
                      <span className="font-semibold text-red-600">
                        ${testCalculation.taxAmount.toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span className="text-green-600">
                        ${testCalculation.totalAmount.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong>Nota:</strong>{' '}
                    {tax.is_inclusive
                      ? 'El impuesto está incluido en el monto base.'
                      : 'El impuesto se agrega al monto base.'}
                  </p>
                </div>
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
                    No hay cambios registrados para este impuesto.
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
                            <Calculator className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">
                              Cambio de{' '}
                              {formatPercentage(record.old_percentage)} a{' '}
                              {formatPercentage(record.new_percentage)}
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
