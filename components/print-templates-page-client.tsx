'use client';

import { useState, useEffect, useRef } from 'react';
import { PrintTemplatesService } from '@/lib/services/print-templates-service';
import {
  PrintTemplate,
  TemplateDocumentType,
  PrintDocumentTypeValues,
  getDocumentTypeInfo,
  getPaperSizeInfo,
  getOrientationInfo,
} from '@/lib/types/print-templates';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Copy,
  Settings,
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
  MoreHorizontal,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { PrintTemplateFormDialog } from './print-template-form-dialog';
import { PrintTemplateViewDialog } from './print-template-view-dialog';
import { PrintTemplateDeleteDialog } from './print-template-delete-dialog';
import { TemplateEditor, TemplateConfig } from './template-editor';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PrintTemplatesPageClientProps {
  companyId: string;
  initialTemplates?: PrintTemplate[];
}

export function PrintTemplatesPageClient({
  companyId,
  initialTemplates = [],
}: PrintTemplatesPageClientProps) {
  const [templates, setTemplates] = useState<PrintTemplate[]>(initialTemplates);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TemplateDocumentType | 'all'>(
    'all'
  );
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PrintTemplate | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] =
    useState<TemplateDocumentType>('INVOICE');
  const [isHydrated, setIsHydrated] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedTemplates = await PrintTemplatesService.getTemplates(
        companyId
      );
      setTemplates(fetchedTemplates);
    } catch (err) {
      console.error('Error al cargar plantillas:', err);
      setError(
        (err as Error).message || 'Error al cargar plantillas de impresión'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyData = async () => {
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (company) {
        setCompanyData(company);
      }
    } catch (error) {
      console.error('Error cargando datos de la empresa:', error);
    }
  };

  useEffect(() => {
    setIsHydrated(true);
    // Cargar datos de la empresa
    loadCompanyData();
    // Solo cargar si no tenemos datos iniciales
    if (initialTemplates.length === 0) {
      loadTemplates();
    }
  }, []);

  // Efecto para limpiar atributos de extensiones del navegador
  useEffect(() => {
    if (!isHydrated || !searchContainerRef.current) return;

    const cleanupExtensions = () => {
      if (searchContainerRef.current) {
        // Remover atributos que pueden ser agregados por extensiones
        const elements = searchContainerRef.current.querySelectorAll(
          '[data-protonpass-form]'
        );
        elements.forEach((el) => {
          el.removeAttribute('data-protonpass-form');
        });
      }
    };

    // Limpiar inmediatamente
    cleanupExtensions();

    // Limpiar periódicamente para manejar extensiones que se cargan después
    const interval = setInterval(cleanupExtensions, 1000);

    return () => clearInterval(interval);
  }, [isHydrated]);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description &&
        template.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      filterType === 'all' || template.document_type === filterType;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && template.is_active) ||
      (filterStatus === 'inactive' && !template.is_active);

    // Solo mostrar plantillas con tipos de documentos válidos
    const isValidDocumentType = PrintDocumentTypeValues.includes(
      template.document_type
    );

    return matchesSearch && matchesType && matchesStatus && isValidDocumentType;
  });

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setIsFormDialogOpen(true);
  };

  const handleEditTemplate = (template: PrintTemplate) => {
    setSelectedTemplate(template);
    setIsFormDialogOpen(true);
  };

  const handleViewTemplate = (template: PrintTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const handleDeleteTemplate = (template: PrintTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const handleDuplicateTemplate = async (template: PrintTemplate) => {
    try {
      const newName = `${template.name} (Copia)`;
      await PrintTemplatesService.duplicateTemplate(template.id, newName);
      loadTemplates();
    } catch (error) {
      console.error('Error duplicando plantilla:', error);
      setError('Error al duplicar la plantilla');
    }
  };

  const handleToggleStatus = async (template: PrintTemplate) => {
    try {
      await PrintTemplatesService.toggleTemplateStatus(template.id);
      loadTemplates();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      setError('Error al cambiar el estado de la plantilla');
    }
  };

  const handleSetAsDefault = async (template: PrintTemplate) => {
    try {
      await PrintTemplatesService.setAsDefault(template.id);
      loadTemplates();
    } catch (error) {
      console.error('Error estableciendo como predeterminada:', error);
      setError('Error al establecer como plantilla predeterminada');
    }
  };

  const handleOpenTemplateEditor = async (
    documentType: TemplateDocumentType
  ) => {
    setSelectedDocumentType(documentType);

    // Buscar si ya existe una plantilla para este tipo de documento
    try {
      const existingTemplates = await PrintTemplatesService.getTemplates(
        companyId
      );
      const template = existingTemplates.find(
        (t) => t.document_type === documentType
      );
      setSelectedTemplate(template || null);
    } catch (error) {
      console.error('Error buscando plantilla existente:', error);
      setSelectedTemplate(null);
    }

    setIsTemplateEditorOpen(true);
  };

  const handleCloseTemplateEditor = () => {
    setIsTemplateEditorOpen(false);
    setSelectedTemplate(null);
  };

  const handleSaveTemplateConfig = async (config: TemplateConfig) => {
    try {
      setLoading(true);
      setError(null);

      // Guardar la configuración usando el servicio
      await PrintTemplatesService.createOrUpdateTemplateConfig(
        selectedDocumentType,
        {
          templateStyle: config.templateStyle,
          fontType: config.fontType,
          fontSizePreset: config.fontSizePreset,
          itemSpacing: config.itemSpacing,
          showTotalItems: config.showTotalItems,
          thirdPartyIncome: config.thirdPartyIncome,
          taxesIncluded: config.taxesIncluded,
          showDiscountColumn: config.showDiscountColumn,
          showTaxValueColumn: config.showTaxValueColumn,
          showTaxPercentageColumn: config.showTaxPercentageColumn,
          showUnitMeasureColumn: config.showUnitMeasureColumn,
        }
      );

      setIsTemplateEditorOpen(false);
      loadTemplates();
    } catch (error) {
      console.error('Error guardando configuración:', error);
      setError('Error al guardar la configuración de la plantilla');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeIcon = (type: TemplateDocumentType) => {
    const typeInfo = getDocumentTypeInfo(type);
    if (!typeInfo) {
      console.warn(
        `No se encontró información para el tipo de documento: ${type}`
      );
      return FileText;
    }
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

  // No renderizar hasta que esté hidratado para evitar errores de hidratación
  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Plantillas de Impresión</h2>
          <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="h-6 w-96 bg-muted animate-pulse rounded"></div>
        <div className="h-12 w-full bg-muted animate-pulse rounded"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Plantillas de Impresión</h2>
        <div className="flex gap-2">
          <Button onClick={handleNewTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground">
        Gestiona las plantillas de impresión para diferentes tipos de documentos
        de tu empresa.
      </p>

      {/* Document Type Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {PrintDocumentTypeValues.map((type) => {
          const typeInfo = getDocumentTypeInfo(type);
          const Icon = getDocumentTypeIcon(type);
          if (!typeInfo) return null;
          return (
            <Button
              key={type}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-muted"
              onClick={() => handleOpenTemplateEditor(type)}
            >
              <div className={`p-2 rounded-lg ${typeInfo.color} text-white`}>
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">{typeInfo.label}</span>
            </Button>
          );
        })}
      </div>

      <div
        ref={searchContainerRef}
        className="flex flex-wrap items-center gap-4"
        suppressHydrationWarning
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filterType}
          onValueChange={(value: TemplateDocumentType | 'all') =>
            setFilterType(value)
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {PrintDocumentTypeValues.map((type) => {
              const typeInfo = getDocumentTypeInfo(type);
              const Icon = getDocumentTypeIcon(type);
              if (!typeInfo) return null;
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

        <Select
          value={filterStatus}
          onValueChange={(value: 'all' | 'active' | 'inactive') =>
            setFilterStatus(value)
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="inactive">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-lg text-muted-foreground">
            Cargando plantillas...
          </span>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && filteredTemplates.length === 0 && (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-lg text-muted-foreground">
            No se encontraron plantillas que coincidan con los criterios.
          </p>
          <Button onClick={handleNewTemplate} className="mt-4">
            Crear Nueva Plantilla
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => {
          const typeInfo = getDocumentTypeInfo(template.document_type);
          const paperInfo = getPaperSizeInfo(template.paper_size);
          const orientationInfo = getOrientationInfo(template.page_orientation);
          const Icon = getDocumentTypeIcon(template.document_type);
          if (!typeInfo) return null;

          return (
            <Card key={template.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${typeInfo.color} text-white`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {typeInfo.label}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleViewTemplate(template)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDuplicateTemplate(template)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleToggleStatus(template)}
                    >
                      {template.is_active ? (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Activar
                        </>
                      )}
                    </DropdownMenuItem>
                    {!template.is_default && (
                      <DropdownMenuItem
                        onClick={() => handleSetAsDefault(template)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Establecer como Predeterminada
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteTemplate(template)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description || 'Sin descripción.'}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Papel:</span>
                    <span className="font-medium">{paperInfo.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Orientación:</span>
                    <span className="font-medium">{orientationInfo.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Fuente:</span>
                    <span className="font-medium">
                      {template.font_family} {template.font_size}px
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>
                    {template.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                  {template.is_default && (
                    <Badge variant="outline">Predeterminada</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PrintTemplateFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        template={selectedTemplate}
        onSaved={() => {
          setIsFormDialogOpen(false);
          loadTemplates();
        }}
      />
      <PrintTemplateViewDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        template={selectedTemplate}
        onEdit={handleEditTemplate}
        onDelete={handleDeleteTemplate}
        onDuplicate={handleDuplicateTemplate}
        onToggleStatus={handleToggleStatus}
        onSetAsDefault={handleSetAsDefault}
      />
      <PrintTemplateDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        template={selectedTemplate}
        onDelete={() => {
          setIsDeleteDialogOpen(false);
          loadTemplates();
        }}
      />

      <TemplateEditor
        documentType={selectedDocumentType}
        isOpen={isTemplateEditorOpen}
        onClose={handleCloseTemplateEditor}
        onSave={handleSaveTemplateConfig}
        loading={loading}
        existingTemplate={selectedTemplate}
        companyData={companyData}
      />
    </div>
  );
}
