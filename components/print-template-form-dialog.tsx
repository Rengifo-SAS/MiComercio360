'use client';

import { useState, useEffect } from 'react';
import { PrintTemplatesService } from '@/lib/services/print-templates-service';
import {
  PrintTemplate,
  CreatePrintTemplateData,
  TemplateDocumentType,
  PrintDocumentTypeValues,
  PaperSize,
  PaperSizeValues,
  PageOrientation,
  PageOrientationValues,
  getDocumentTypeInfo,
  getPaperSizeInfo,
  getOrientationInfo,
  generateTemplateCode,
} from '@/lib/types/print-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertCircle,
  Settings,
  Monitor,
  Smartphone,
  Palette,
  Type,
  Ruler,
  Eye,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PrintTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: PrintTemplate | null;
  onSaved: () => void;
}

export function PrintTemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: PrintTemplateFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePrintTemplateData>({
    name: '',
    description: '',
    document_type: 'INVOICE',
    is_default: false,
    is_active: true,
    paper_size: 'A4',
    page_orientation: 'PORTRAIT',
    custom_width: undefined,
    custom_height: undefined,
    margin_top: 10.0,
    margin_bottom: 10.0,
    margin_left: 10.0,
    margin_right: 10.0,
    font_family: 'Arial',
    font_size: 12.0,
    line_height: 1.2,
    header_template: '',
    body_template: '',
    footer_template: '',
    css_styles: '',
    show_company_logo: true,
    show_company_info: true,
    show_document_number: true,
    show_document_date: true,
    show_customer_info: true,
    show_items_table: true,
    show_totals: true,
    show_payment_info: false,
    show_notes: false,
  });
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const supabase = createClient();

  // Resetear formulario cuando se abre/cierra
  useEffect(() => {
    if (open) {
      if (template) {
        setFormData({
          name: template.name,
          description: template.description || '',
          document_type: template.document_type,
          is_default: template.is_default,
          is_active: template.is_active,
          paper_size: template.paper_size,
          page_orientation: template.page_orientation,
          custom_width: template.custom_width || undefined,
          custom_height: template.custom_height || undefined,
          margin_top: template.margin_top,
          margin_bottom: template.margin_bottom,
          margin_left: template.margin_left,
          margin_right: template.margin_right,
          font_family: template.font_family,
          font_size: template.font_size,
          line_height: template.line_height,
          header_template: template.header_template || '',
          body_template: template.body_template,
          footer_template: template.footer_template || '',
          css_styles: template.css_styles || '',
          show_company_logo: template.show_company_logo,
          show_company_info: template.show_company_info,
          show_document_number: template.show_document_number,
          show_document_date: template.show_document_date,
          show_customer_info: template.show_customer_info,
          show_items_table: template.show_items_table,
          show_totals: template.show_totals,
          show_payment_info: template.show_payment_info,
          show_notes: template.show_notes,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          document_type: 'INVOICE',
          is_default: false,
          is_active: true,
          paper_size: 'A4',
          page_orientation: 'PORTRAIT',
          custom_width: undefined,
          custom_height: undefined,
          margin_top: 10.0,
          margin_bottom: 10.0,
          margin_left: 10.0,
          margin_right: 10.0,
          font_family: 'Arial',
          font_size: 12.0,
          line_height: 1.2,
          header_template: '',
          body_template: '',
          footer_template: '',
          css_styles: '',
          show_company_logo: true,
          show_company_info: true,
          show_document_number: true,
          show_document_date: true,
          show_customer_info: true,
          show_items_table: true,
          show_totals: true,
          show_payment_info: false,
          show_notes: false,
        });
      }
      setError(null);
      loadData();
    }
  }, [open, template]);

  const loadData = async () => {
    try {
      // Obtener company_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      // Cargar nombres existentes
      const templates = await PrintTemplatesService.getTemplates(
        profile.company_id
      );
      const names = templates.map((t) => t.name);
      setExistingNames(names);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre de la plantilla es requerido');
      return;
    }

    if (!formData.body_template.trim()) {
      setError('La plantilla del cuerpo es requerida');
      return;
    }

    if (
      formData.paper_size === 'CUSTOM' &&
      (!formData.custom_width || !formData.custom_height)
    ) {
      setError('Debe especificar el ancho y alto para tamaño personalizado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (template) {
        await PrintTemplatesService.updateTemplate(template.id, formData);
      } else {
        await PrintTemplatesService.createTemplate(formData);
      }

      onSaved();
    } catch (error: unknown) {
      console.error('Error guardando plantilla:', error);
      setError((error as Error)?.message || 'Error guardando la plantilla');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof CreatePrintTemplateData,
    value: unknown
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleDocumentTypeChange = (type: TemplateDocumentType) => {
    const typeInfo = getDocumentTypeInfo(type);
    setFormData((prev) => ({
      ...prev,
      document_type: type,
      paper_size: typeInfo.defaultPaperSize,
      page_orientation: typeInfo.defaultOrientation,
    }));
  };

  const getDocumentTypeIcon = (type: TemplateDocumentType) => {
    const typeInfo = getDocumentTypeInfo(type);
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
    return iconMap[typeInfo.icon] || FileText;
  };

  const DocumentTypeIcon = getDocumentTypeIcon(formData.document_type);
  const typeInfo = getDocumentTypeInfo(formData.document_type);
  const paperInfo = getPaperSizeInfo(formData.paper_size);
  const orientationInfo = getOrientationInfo(formData.page_orientation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[85vw] lg:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DocumentTypeIcon className="h-5 w-5" />
            {template ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? 'Modifica la configuración de la plantilla'
              : 'Crea una nueva plantilla de impresión para tu empresa'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="page">Página</TabsTrigger>
              <TabsTrigger value="template">Plantilla</TabsTrigger>
              <TabsTrigger value="elements">Elementos</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ej: Factura Estándar"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document_type">Tipo de Documento *</Label>
                  <Select
                    value={formData.document_type}
                    onValueChange={(value) =>
                      handleDocumentTypeChange(value as TemplateDocumentType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {PrintDocumentTypeValues.map((type) => {
                        const typeInfo = getDocumentTypeInfo(type);
                        const Icon = getDocumentTypeIcon(type);
                        return (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {typeInfo.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange('description', e.target.value)
                    }
                    placeholder="Descripción opcional de la plantilla"
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_active">Activa</Label>
                      <p className="text-sm text-muted-foreground">
                        La plantilla está disponible para usar
                      </p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        handleInputChange('is_active', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_default">Plantilla por Defecto</Label>
                      <p className="text-sm text-muted-foreground">
                        Usar como plantilla predeterminada para este tipo
                      </p>
                    </div>
                    <Switch
                      id="is_default"
                      checked={formData.is_default}
                      onCheckedChange={(checked) =>
                        handleInputChange('is_default', checked)
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="page" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paper_size">Tamaño de Papel *</Label>
                  <Select
                    value={formData.paper_size}
                    onValueChange={(value) =>
                      handleInputChange('paper_size', value as PaperSize)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tamaño" />
                    </SelectTrigger>
                    <SelectContent>
                      {PaperSizeValues.map((size) => {
                        const sizeInfo = getPaperSizeInfo(size);
                        return (
                          <SelectItem key={size} value={size}>
                            <div className="flex items-center gap-2">
                              <Ruler className="h-4 w-4" />
                              {sizeInfo.label} - {sizeInfo.dimensions}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="page_orientation">Orientación *</Label>
                  <Select
                    value={formData.page_orientation}
                    onValueChange={(value) =>
                      handleInputChange(
                        'page_orientation',
                        value as PageOrientation
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la orientación" />
                    </SelectTrigger>
                    <SelectContent>
                      {PageOrientationValues.map((orientation) => {
                        const orientationInfo = getOrientationInfo(orientation);
                        const Icon =
                          orientation === 'PORTRAIT' ? Smartphone : Monitor;
                        return (
                          <SelectItem key={orientation} value={orientation}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {orientationInfo.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {formData.paper_size === 'CUSTOM' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="custom_width">
                        Ancho Personalizado (mm) *
                      </Label>
                      <Input
                        id="custom_width"
                        type="number"
                        min="1"
                        step="0.1"
                        value={formData.custom_width || ''}
                        onChange={(e) =>
                          handleInputChange(
                            'custom_width',
                            parseFloat(e.target.value) || undefined
                          )
                        }
                        placeholder="210"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom_height">
                        Alto Personalizado (mm) *
                      </Label>
                      <Input
                        id="custom_height"
                        type="number"
                        min="1"
                        step="0.1"
                        value={formData.custom_height || ''}
                        onChange={(e) =>
                          handleInputChange(
                            'custom_height',
                            parseFloat(e.target.value) || undefined
                          )
                        }
                        placeholder="297"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-sm font-medium">Márgenes (mm)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="margin_top">Superior</Label>
                      <Input
                        id="margin_top"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.margin_top}
                        onChange={(e) =>
                          handleInputChange(
                            'margin_top',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="margin_bottom">Inferior</Label>
                      <Input
                        id="margin_bottom"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.margin_bottom}
                        onChange={(e) =>
                          handleInputChange(
                            'margin_bottom',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="margin_left">Izquierdo</Label>
                      <Input
                        id="margin_left"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.margin_left}
                        onChange={(e) =>
                          handleInputChange(
                            'margin_left',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="margin_right">Derecho</Label>
                      <Input
                        id="margin_right"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.margin_right}
                        onChange={(e) =>
                          handleInputChange(
                            'margin_right',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-sm font-medium">
                    Configuración de Fuente
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="font_family">Familia</Label>
                      <Select
                        value={formData.font_family}
                        onValueChange={(value) =>
                          handleInputChange('font_family', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Times New Roman">
                            Times New Roman
                          </SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                          <SelectItem value="Calibri">Calibri</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Verdana">Verdana</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="font_size">Tamaño (px)</Label>
                      <Input
                        id="font_size"
                        type="number"
                        min="8"
                        max="72"
                        step="0.1"
                        value={formData.font_size}
                        onChange={(e) =>
                          handleInputChange(
                            'font_size',
                            parseFloat(e.target.value) || 12
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="line_height">Interlineado</Label>
                      <Input
                        id="line_height"
                        type="number"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={formData.line_height}
                        onChange={(e) =>
                          handleInputChange(
                            'line_height',
                            parseFloat(e.target.value) || 1.2
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="template" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="header_template">
                    Plantilla de Encabezado (HTML)
                  </Label>
                  <Textarea
                    id="header_template"
                    value={formData.header_template}
                    onChange={(e) =>
                      handleInputChange('header_template', e.target.value)
                    }
                    placeholder="<div>Encabezado del documento</div>"
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body_template">
                    Plantilla del Cuerpo (HTML) *
                  </Label>
                  <Textarea
                    id="body_template"
                    value={formData.body_template}
                    onChange={(e) =>
                      handleInputChange('body_template', e.target.value)
                    }
                    placeholder="<div>Contenido principal del documento</div>"
                    rows={8}
                    className="font-mono text-sm"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footer_template">
                    Plantilla de Pie de Página (HTML)
                  </Label>
                  <Textarea
                    id="footer_template"
                    value={formData.footer_template}
                    onChange={(e) =>
                      handleInputChange('footer_template', e.target.value)
                    }
                    placeholder="<div>Pie de página del documento</div>"
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="css_styles">Estilos CSS Personalizados</Label>
                  <Textarea
                    id="css_styles"
                    value={formData.css_styles}
                    onChange={(e) =>
                      handleInputChange('css_styles', e.target.value)
                    }
                    placeholder=".custom-class { color: #333; }"
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="elements" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">
                    Elementos de la Empresa
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show_company_logo">Mostrar Logo</Label>
                        <p className="text-sm text-muted-foreground">
                          Incluir el logo de la empresa
                        </p>
                      </div>
                      <Switch
                        id="show_company_logo"
                        checked={formData.show_company_logo}
                        onCheckedChange={(checked) =>
                          handleInputChange('show_company_logo', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show_company_info">
                          Mostrar Info de Empresa
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Incluir datos de la empresa
                        </p>
                      </div>
                      <Switch
                        id="show_company_info"
                        checked={formData.show_company_info}
                        onCheckedChange={(checked) =>
                          handleInputChange('show_company_info', checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">
                    Elementos del Documento
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show_document_number">
                          Número de Documento
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Mostrar número del documento
                        </p>
                      </div>
                      <Switch
                        id="show_document_number"
                        checked={formData.show_document_number}
                        onCheckedChange={(checked) =>
                          handleInputChange('show_document_number', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show_document_date">
                          Fecha del Documento
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Mostrar fecha del documento
                        </p>
                      </div>
                      <Switch
                        id="show_document_date"
                        checked={formData.show_document_date}
                        onCheckedChange={(checked) =>
                          handleInputChange('show_document_date', checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Elementos del Cliente</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show_customer_info">
                          Info del Cliente
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Incluir datos del cliente
                        </p>
                      </div>
                      <Switch
                        id="show_customer_info"
                        checked={formData.show_customer_info}
                        onCheckedChange={(checked) =>
                          handleInputChange('show_customer_info', checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">
                    Elementos de Contenido
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show_items_table">Tabla de Items</Label>
                        <p className="text-sm text-muted-foreground">
                          Mostrar tabla de productos/servicios
                        </p>
                      </div>
                      <Switch
                        id="show_items_table"
                        checked={formData.show_items_table}
                        onCheckedChange={(checked) =>
                          handleInputChange('show_items_table', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show_totals">Totales</Label>
                        <p className="text-sm text-muted-foreground">
                          Mostrar totales y subtotales
                        </p>
                      </div>
                      <Switch
                        id="show_totals"
                        checked={formData.show_totals}
                        onCheckedChange={(checked) =>
                          handleInputChange('show_totals', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show_payment_info">Info de Pago</Label>
                        <p className="text-sm text-muted-foreground">
                          Mostrar información de pago
                        </p>
                      </div>
                      <Switch
                        id="show_payment_info"
                        checked={formData.show_payment_info}
                        onCheckedChange={(checked) =>
                          handleInputChange('show_payment_info', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show_notes">Notas</Label>
                        <p className="text-sm text-muted-foreground">
                          Mostrar notas adicionales
                        </p>
                      </div>
                      <Switch
                        id="show_notes"
                        checked={formData.show_notes}
                        onCheckedChange={(checked) =>
                          handleInputChange('show_notes', checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {template ? 'Actualizar Plantilla' : 'Crear Plantilla'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
