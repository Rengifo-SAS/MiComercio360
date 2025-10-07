'use client';

import { useState, useEffect } from 'react';
import { PrintTemplatesService } from '@/lib/services/print-templates-service';
import {
  PrintTemplate,
  PrintTemplateHistory,
  getDocumentTypeInfo,
  getPaperSizeInfo,
  getOrientationInfo,
} from '@/lib/types/print-templates';
import { PrintTemplatePreview } from './print-template-preview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  Edit,
  Trash2,
  Copy,
  Settings,
  CheckCircle,
  XCircle,
  Eye,
  History,
  Loader2,
  AlertCircle,
  Ruler,
  Type,
  Palette,
  Monitor,
  Smartphone,
  Calendar,
  User,
  Building2,
} from 'lucide-react';

interface PrintTemplateViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PrintTemplate | null;
  onEdit: (template: PrintTemplate) => void;
  onDelete: (template: PrintTemplate) => void;
  onDuplicate: (template: PrintTemplate) => void;
  onToggleStatus: (template: PrintTemplate) => void;
  onSetAsDefault: (template: PrintTemplate) => void;
}

export function PrintTemplateViewDialog({
  open,
  onOpenChange,
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
  onSetAsDefault,
}: PrintTemplateViewDialogProps) {
  const [history, setHistory] = useState<PrintTemplateHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (template && open) {
      loadHistory();
    }
  }, [template, open]);

  const loadHistory = async () => {
    if (!template) return;

    setLoadingHistory(true);
    try {
      const historyData = await PrintTemplatesService.getTemplateHistory(
        template.id
      );
      setHistory(historyData || []);
    } catch (error) {
      console.error('Error cargando historial:', error);
      // Mostrar mensaje de error más descriptivo
      const errorDetails = {
        errorMessage: (error as Error)?.message || 'Error desconocido',
        errorCode: (error as any)?.code || 'UNKNOWN',
        errorDetails: (error as any)?.details || 'Sin detalles',
        templateId: template.id,
      };
      console.error('Detalles del error:', errorDetails);
      // Establecer historial vacío en caso de error
      setHistory([]);
    } finally {
      setLoadingHistory(false);
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

  const getChangeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CREATED: 'Creado',
      UPDATED: 'Actualizado',
      ACTIVATED: 'Activado',
      DEACTIVATED: 'Desactivado',
      DELETED: 'Eliminado',
    };
    return labels[type] || type;
  };

  const getChangeTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      CREATED: 'bg-green-500',
      UPDATED: 'bg-blue-500',
      ACTIVATED: 'bg-emerald-500',
      DEACTIVATED: 'bg-orange-500',
      DELETED: 'bg-red-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      INVOICE: 'FACTURA DE VENTA',
      QUOTATION: 'COTIZACIÓN',
      RECEIPT: 'RECIBO DE CAJA',
      PURCHASE_ORDER: 'ORDEN DE COMPRA',
      DELIVERY_NOTE: 'REMISIÓN',
      CREDIT_NOTE: 'NOTA CRÉDITO',
      DEBIT_NOTE: 'NOTA DÉBITO',
      PAYMENT_VOUCHER: 'COMPROBANTE DE PAGO',
      EXPENSE_VOUCHER: 'COMPROBANTE DE EGRESO',
      INVENTORY_REPORT: 'REPORTE DE INVENTARIO',
      SALES_REPORT: 'REPORTE DE VENTAS',
      OTHER: 'DOCUMENTO',
    };
    return labels[type] || 'DOCUMENTO';
  };

  if (!template) return null;

  const typeInfo = getDocumentTypeInfo(template.document_type);
  const paperInfo = getPaperSizeInfo(template.paper_size);
  const orientationInfo = getOrientationInfo(template.page_orientation);
  const DocumentTypeIcon = getDocumentTypeIcon(template.document_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[85vw] lg:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DocumentTypeIcon className="h-5 w-5" />
            {template.name}
          </DialogTitle>
          <DialogDescription>
            {template.description || 'Plantilla de impresión'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="preview">Vista Previa</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Información Básica */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Información Básica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tipo:</span>
                    <div className="flex items-center gap-2">
                      <DocumentTypeIcon className="h-4 w-4" />
                      <span className="font-medium">
                        {typeInfo?.label || template.document_type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Estado:
                    </span>
                    <Badge
                      variant={template.is_active ? 'default' : 'secondary'}
                    >
                      {template.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Predeterminada:
                    </span>
                    <Badge
                      variant={template.is_default ? 'outline' : 'secondary'}
                    >
                      {template.is_default ? 'Sí' : 'No'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Creada:
                    </span>
                    <span className="text-sm">
                      {new Date(template.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Actualizada:
                    </span>
                    <span className="text-sm">
                      {new Date(template.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Configuración de Página */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Configuración de Página
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Tamaño:
                    </span>
                    <span className="font-medium">{paperInfo.label}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Dimensiones:
                    </span>
                    <span className="text-sm">{paperInfo.dimensions}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Orientación:
                    </span>
                    <div className="flex items-center gap-2">
                      {template.page_orientation === 'PORTRAIT' ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Monitor className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        {orientationInfo.label}
                      </span>
                    </div>
                  </div>

                  {template.paper_size === 'CUSTOM' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Ancho:
                        </span>
                        <span className="font-medium">
                          {template.custom_width} mm
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Alto:
                        </span>
                        <span className="font-medium">
                          {template.custom_height} mm
                        </span>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Márgenes (mm)</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Superior:</span>
                        <span>{template.margin_top}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Inferior:</span>
                        <span>{template.margin_bottom}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Izquierdo:
                        </span>
                        <span>{template.margin_left}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Derecho:</span>
                        <span>{template.margin_right}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Configuración de Fuente */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Configuración de Fuente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Familia:
                    </span>
                    <span className="font-medium">{template.font_family}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Tamaño:
                    </span>
                    <span className="font-medium">{template.font_size}px</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Interlineado:
                    </span>
                    <span className="font-medium">{template.line_height}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Elementos Mostrados */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Elementos Mostrados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      {template.show_company_logo ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Logo de Empresa</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {template.show_company_info ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Info de Empresa</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {template.show_document_number ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Número de Documento</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {template.show_document_date ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Fecha de Documento</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {template.show_customer_info ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Info del Cliente</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {template.show_items_table ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Tabla de Items</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {template.show_totals ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Totales</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {template.show_payment_info ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Info de Pago</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {template.show_notes ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Notas</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Vista Previa de la Plantilla
                </CardTitle>
                <CardDescription>
                  Vista previa de cómo se verá el documento impreso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Tipo de documento:
                      </span>
                      <Badge variant="outline">
                        {getDocumentTypeLabel(template.document_type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Tamaño:
                      </span>
                      <Badge variant="secondary">
                        {paperInfo.label} - {orientationInfo.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="text-center mb-4">
                      <Button
                        onClick={() => setShowPreview(true)}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Abrir Vista Previa Completa
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      <p>
                        Haz clic en el botón para ver una vista previa completa
                        e interactiva de cómo se verá el documento impreso.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historial de Cambios
                </CardTitle>
                <CardDescription>
                  Registro de todos los cambios realizados en esta plantilla
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Cargando historial...</span>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center text-muted-foreground p-4">
                    No hay historial disponible
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${getChangeTypeColor(
                            entry.change_type
                          )}`}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {getChangeTypeLabel(entry.change_type)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(entry.changed_at).toLocaleString()}
                            </span>
                          </div>
                          {entry.change_reason && (
                            <p className="text-sm text-muted-foreground">
                              {entry.change_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botones de Acción */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onToggleStatus(template)}>
              {template.is_active ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Desactivar
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activar
                </>
              )}
            </Button>

            {!template.is_default && (
              <Button
                variant="outline"
                onClick={() => onSetAsDefault(template)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Establecer como Predeterminada
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Vista Previa
            </Button>

            <Button variant="outline" onClick={() => onDuplicate(template)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </Button>

            <Button onClick={() => onEdit(template)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>

            {!template.is_default && (
              <Button variant="destructive" onClick={() => onDelete(template)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Vista Previa */}
      {template && (
        <PrintTemplatePreview
          template={template}
          open={showPreview}
          onOpenChange={setShowPreview}
        />
      )}
    </Dialog>
  );
}
