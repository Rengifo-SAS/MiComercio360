'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  History,
} from 'lucide-react';
import {
  ProductsImportService,
  ProductImportData,
  ImportResult,
  ImportConfig,
} from '@/lib/services/products-import-service';
import { ProductsImportHistory } from './products-import-history';

interface ProductsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  userId: string;
  onImportComplete?: () => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'completed';

export function ProductsImportDialog({
  open,
  onOpenChange,
  companyId,
  userId,
  onImportComplete,
}: ProductsImportDialogProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ProductImportData[]>([]);
  const [validationResult, setValidationResult] = useState<ImportResult | null>(
    null
  );
  const [importProgress, setImportProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    companyId,
    userId,
    updateExistingProducts: false,
    createMissingCategories: true,
    createMissingWarehouses: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetDialog = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setImportData([]);
    setValidationResult(null);
    setImportProgress(0);
    setIsProcessing(false);
    setShowHistory(false);
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const handleDownloadTemplate = () => {
    try {
      const template = ProductsImportService.generateTemplate();
      const url = URL.createObjectURL(template);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plantilla_importacion_productos.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Plantilla descargada exitosamente');
    } catch (error) {
      console.error('Error descargando plantilla:', error);
      toast.error('Error al descargar la plantilla');
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Solo se permiten archivos Excel (.xlsx o .xls)');
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede ser mayor a 10MB');
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);

    try {
      // Procesar archivo Excel
      const data = await ProductsImportService.parseExcelFile(file);
      setImportData(data);

      if (data.length === 0) {
        toast.error('No se encontraron datos válidos en el archivo');
        setIsProcessing(false);
        return;
      }

      // Validar datos
      const validation = await ProductsImportService.validateImportData(data, {
        companyId,
        userId,
        updateExistingProducts: importConfig.updateExistingProducts,
        createMissingCategories: importConfig.createMissingCategories,
        createMissingWarehouses: importConfig.createMissingWarehouses,
      });
      setValidationResult(validation);

      setCurrentStep('preview');
      setIsProcessing(false);

      if (validation.errors.length > 0) {
        toast.error(
          `Se encontraron ${validation.errors.length} errores en los datos`
        );
      } else {
        toast.success(
          `Archivo procesado correctamente. ${data.length} productos listos para importar.`
        );
      }
    } catch (error) {
      console.error('Error procesando archivo:', error);
      toast.error('Error al procesar el archivo Excel');
      setIsProcessing(false);
    }
  };

  const handleStartImport = async () => {
    if (!selectedFile || !validationResult) return;

    setIsProcessing(true);
    setCurrentStep('importing');
    setImportProgress(0);

    try {
      // Importar productos con callback de progreso
      const result = await ProductsImportService.importProducts(
        importData,
        {
          companyId,
          userId,
          updateExistingProducts: importConfig.updateExistingProducts,
          createMissingCategories: importConfig.createMissingCategories,
          createMissingWarehouses: importConfig.createMissingWarehouses,
        },
        (progress) => {
          setImportProgress(progress);
        }
      );

      setCurrentStep('completed');

      if (result.success) {
        const newProducts = result.imported - (result.updated || 0);
        const message =
          result.updated && result.updated > 0
            ? `Importación completada: ${newProducts} productos nuevos, ${result.updated} productos actualizados`
            : `Importación completada: ${result.imported} productos importados exitosamente`;

        toast.success(message);
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        const newProducts = result.imported - (result.updated || 0);
        const message =
          result.updated && result.updated > 0
            ? `Importación completada con errores: ${newProducts} productos nuevos, ${result.updated} productos actualizados, ${result.errors.length} errores`
            : `Importación completada con errores: ${result.imported} productos importados, ${result.errors.length} errores`;

        toast.error(message);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('Error en importación:', error);
      toast.error(
        `Error durante la importación: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`
      );
      setIsProcessing(false);
      setCurrentStep('preview');
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileSpreadsheet className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          Importar Productos desde Excel
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Sube un archivo Excel con los datos de los productos que deseas
          importar
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar Plantilla
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            Ver Historial
          </Button>
        </div>

        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <Label htmlFor="file-upload" className="cursor-pointer">
            <span className="text-lg font-medium">
              Seleccionar archivo Excel
            </span>
            <p className="text-sm text-muted-foreground mt-2">
              Arrastra y suelta tu archivo aquí o haz clic para seleccionar
            </p>
          </Label>
          <Input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            ref={fileInputRef}
          />
        </div>

        {selectedFile && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Badge variant="secondary">
                  {selectedFile.name.split('.').pop()?.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!validationResult) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">
            Vista Previa de Importación
          </h3>
          <p className="text-sm text-muted-foreground">
            Revisa los datos antes de proceder con la importación
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">
                {importData.length}
              </div>
              <p className="text-sm text-muted-foreground">
                Productos en archivo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                <CheckCircle className="h-5 w-5" />
                {validationResult.imported}
              </div>
              <p className="text-sm text-muted-foreground">Productos válidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
                <XCircle className="h-5 w-5" />
                {validationResult.errors.length}
              </div>
              <p className="text-sm text-muted-foreground">
                Errores encontrados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Configuración de Importación */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Configuración de Importación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update-existing"
                checked={importConfig.updateExistingProducts}
                onCheckedChange={(checked) =>
                  setImportConfig((prev) => ({
                    ...prev,
                    updateExistingProducts: !!checked,
                  }))
                }
              />
              <Label htmlFor="update-existing" className="text-sm">
                Actualizar productos existentes
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Si está marcado, los productos que ya existen serán actualizados
              con los nuevos datos. Si no está marcado, los productos existentes
              serán omitidos.
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="create-categories"
                checked={importConfig.createMissingCategories}
                onCheckedChange={(checked) =>
                  setImportConfig((prev) => ({
                    ...prev,
                    createMissingCategories: !!checked,
                  }))
                }
              />
              <Label htmlFor="create-categories" className="text-sm">
                Crear categorías que no existen
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Si está marcado, se crearán automáticamente las categorías que no
              existen en el sistema.
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="create-warehouses"
                checked={importConfig.createMissingWarehouses}
                onCheckedChange={(checked) =>
                  setImportConfig((prev) => ({
                    ...prev,
                    createMissingWarehouses: !!checked,
                  }))
                }
              />
              <Label htmlFor="create-warehouses" className="text-sm">
                Crear bodegas que no existen
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Si está marcado, se crearán automáticamente las bodegas que no
              existen en el sistema.
            </p>
          </CardContent>
        </Card>

        {validationResult.errors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Errores encontrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {validationResult.errors.slice(0, 10).map((error, index) => (
                  <div
                    key={index}
                    className="text-sm p-2 bg-red-50 dark:bg-red-950/30 rounded border-l-4 border-red-400 dark:border-red-500"
                  >
                    <span className="font-medium">Fila {error.row}:</span>{' '}
                    {error.message}
                  </div>
                ))}
                {validationResult.errors.length > 10 && (
                  <p className="text-sm text-muted-foreground">
                    ... y {validationResult.errors.length - 10} errores más
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {validationResult.warnings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Advertencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {validationResult.warnings.slice(0, 5).map((warning, index) => (
                  <div
                    key={index}
                    className="text-sm p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded border-l-4 border-yellow-400 dark:border-yellow-500"
                  >
                    <span className="font-medium">Fila {warning.row}:</span>{' '}
                    {warning.message}
                  </div>
                ))}
                {validationResult.warnings.length > 5 && (
                  <p className="text-sm text-muted-foreground">
                    ... y {validationResult.warnings.length - 5} advertencias
                    más
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="bg-muted/50 p-4 rounded-lg border">
          <h4 className="font-medium text-foreground mb-2">
            Información importante:
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Solo se importarán los productos sin errores</li>
            <li>
              • SKU y Código de Barras se generarán automáticamente si están
              vacíos
            </li>
            <li>
              • Los productos existentes se detectan por nombre, SKU o código de
              barras
            </li>
            <li>
              • Si "Actualizar productos existentes" está marcado, se
              actualizarán los productos que ya existen
            </li>
            <li>
              • Si "Actualizar productos existentes" no está marcado, los
              productos existentes serán omitidos
            </li>
            <li>
              • Las categorías se crearán automáticamente si la opción está
              habilitada
            </li>
            <li>
              • Si la categoría está vacía, se usará "General" por defecto
            </li>
            <li>
              • Los impuestos se validan contra los configurados en el sistema
            </li>
            <li>• Si un impuesto no existe, se usará 0% automáticamente</li>
            <li>
              • Las cantidades negativas se convertirán automáticamente a 0
            </li>
            <li>
              • Las bodegas se crearán automáticamente si la opción está
              habilitada
            </li>
            <li>
              • Si no se especifica bodega, se asignará automáticamente a la
              bodega principal del usuario
            </li>
            <li>
              • El archivo se guardará en el historial para futuras consultas
            </li>
          </ul>
        </div>
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Importando Productos</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Por favor espera mientras se procesan los productos...
        </p>
        <Progress value={importProgress} className="w-full max-w-md mx-auto" />
        <p className="text-xs text-muted-foreground mt-2">
          {importProgress}% completado
        </p>
      </div>
    </div>
  );

  const renderCompletedStep = () => {
    if (!validationResult) return null;

    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2 text-green-600 dark:text-green-400">
            Importación Completada
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            La importación de productos ha finalizado
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {validationResult.imported - (validationResult.updated || 0)}
              </div>
              <p className="text-sm text-muted-foreground">Productos nuevos</p>
            </CardContent>
          </Card>

          {validationResult.updated && validationResult.updated > 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {validationResult.updated}
                </div>
                <p className="text-sm text-muted-foreground">
                  Productos actualizados
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {validationResult.errors.length}
              </div>
              <p className="text-sm text-muted-foreground">Errores</p>
            </CardContent>
          </Card>
        </div>

        {validationResult.warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="inline h-4 w-4 mr-1" />
              {validationResult.warnings.length} advertencias durante la
              importación
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importación Masiva de Productos
            </DialogTitle>
            <DialogDescription>
              Importa múltiples productos desde un archivo Excel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {currentStep === 'upload' && renderUploadStep()}
            {currentStep === 'preview' && renderPreviewStep()}
            {currentStep === 'importing' && renderImportingStep()}
            {currentStep === 'completed' && renderCompletedStep()}

            {isProcessing && currentStep === 'upload' && (
              <div className="text-center py-8">
                <div className="mx-auto w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-muted-foreground">
                  Procesando archivo...
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {currentStep === 'upload' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  Cancelar
                </Button>
              </>
            )}

            {currentStep === 'preview' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep('upload')}
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  onClick={handleStartImport}
                  disabled={
                    validationResult?.errors.length ===
                    validationResult?.imported
                  }
                >
                  {validationResult?.errors.length ===
                  validationResult?.imported
                    ? 'No hay productos válidos'
                    : `Importar ${validationResult?.imported} productos`}
                </Button>
              </>
            )}

            {currentStep === 'completed' && (
              <Button type="button" onClick={handleClose}>
                Cerrar
              </Button>
            )}

            {currentStep === 'importing' && (
              <Button type="button" variant="outline" disabled>
                Importando...
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showHistory && (
        <ProductsImportHistory
          open={showHistory}
          onOpenChange={setShowHistory}
          companyId={companyId}
        />
      )}
    </>
  );
}
