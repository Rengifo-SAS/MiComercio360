'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Printer,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  FileText,
  Receipt,
} from 'lucide-react';
import { Sale } from '@/lib/types/sales';
import { SalesPrintService } from '@/lib/services/sales-print-service';
import { formatCurrency } from '@/lib/types/sales';

interface SalesPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  companyId: string;
}

type PaperSize = 'letter' | 'thermal-80mm' | 'half-letter';

export function SalesPrintDialog({
  open,
  onOpenChange,
  sale,
  companyId,
}: SalesPrintDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paperSize, setPaperSize] = useState<PaperSize>('thermal-80mm');

  if (!sale) return null;

  const handlePrint = async () => {
    if (!sale) return;

    setIsLoading(true);
    setError(null);

    try {
      await SalesPrintService.printSale(sale, companyId, paperSize);
      // Cerrar el diálogo después de imprimir exitosamente
      onOpenChange(false);
    } catch (err) {
      console.error('Error imprimiendo venta:', err);
      setError(
        err instanceof Error ? err.message : 'Error al imprimir la venta'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!sale) return;

    setIsLoading(true);
    setError(null);

    try {
      const html = await SalesPrintService.generatePrintHTML(
        sale,
        companyId,
        paperSize
      );

      // Crear ventana de vista previa
      const previewWindow = window.open(
        '',
        '_blank',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      );
      if (!previewWindow) {
        throw new Error(
          'No se pudo abrir la ventana de vista previa. Verifique que los pop-ups estén habilitados.'
        );
      }

      previewWindow.document.write(html);
      previewWindow.document.close();
    } catch (err) {
      console.error('Error generando vista previa:', err);
      setError(
        err instanceof Error ? err.message : 'Error al generar la vista previa'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!sale) return;

    setIsLoading(true);
    setError(null);

    try {
      await SalesPrintService.generatePDF(sale, companyId, paperSize);
      // Cerrar el diálogo después de descargar exitosamente
      onOpenChange(false);
    } catch (err) {
      console.error('Error descargando factura:', err);
      setError(
        err instanceof Error ? err.message : 'Error al descargar la factura'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimir Venta
          </DialogTitle>
          <DialogDescription>
            Selecciona una opción para imprimir o exportar la factura de venta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la venta */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Información de la Venta</h3>
              <Badge variant="outline">{sale.sale_number}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Fecha:</span>
                <p className="text-muted-foreground">
                  {new Date(sale.created_at).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div>
                <span className="font-medium">Cliente:</span>
                <p className="text-muted-foreground">
                  {sale.customer?.business_name || 'Consumidor Final'}
                </p>
              </div>
              <div>
                <span className="font-medium">Total:</span>
                <p className="text-muted-foreground font-semibold">
                  {formatCurrency(sale.total_amount)}
                </p>
              </div>
              <div>
                <span className="font-medium">Estado:</span>
                <p className="text-muted-foreground">
                  {sale.status === 'completed' ? 'Completada' : 'Pendiente'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Selector de tamaño de papel */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tamaño de Papel</h3>
            <RadioGroup
              value={paperSize}
              onValueChange={(value: string) =>
                setPaperSize(value as PaperSize)
              }
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="letter" id="letter" />
                <Label htmlFor="letter" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Tamaño Carta</div>
                      <div className="text-sm text-muted-foreground">
                        8.5" x 11" - Impresoras estándar
                      </div>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="half-letter" id="half-letter" />
                <Label htmlFor="half-letter" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="font-medium">Media Carta</div>
                      <div className="text-sm text-muted-foreground">
                        5.5" x 8.5" - Formato compacto
                      </div>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="thermal-80mm" id="thermal-80mm" />
                <Label htmlFor="thermal-80mm" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Ticket 80mm</div>
                      <div className="text-sm text-muted-foreground">
                        80mm x ∞ - Impresoras térmicas
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Opciones de impresión */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Opciones de Impresión</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={handlePrint}
                disabled={isLoading}
                className="h-20 flex flex-col gap-2"
                variant="default"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Printer className="h-6 w-6" />
                )}
                <span>Imprimir</span>
                <span className="text-xs text-muted-foreground">
                  Enviar a impresora
                </span>
              </Button>

              <Button
                onClick={handlePreview}
                disabled={isLoading}
                className="h-20 flex flex-col gap-2"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Eye className="h-6 w-6" />
                )}
                <span>Vista Previa</span>
                <span className="text-xs text-muted-foreground">
                  Ver antes de imprimir
                </span>
              </Button>

              <Button
                onClick={handleDownload}
                disabled={isLoading}
                className="h-20 flex flex-col gap-2"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Download className="h-6 w-6" />
                )}
                <span>Descargar</span>
                <span className="text-xs text-muted-foreground">
                  Guardar como PDF
                </span>
              </Button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Información adicional */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              • La impresión utilizará la plantilla configurada para facturas
            </p>
            <p>
              • Si no hay plantilla configurada, se usará el formato profesional por defecto
            </p>
            <p>
              • <strong>Tamaño Carta:</strong> Ideal para facturas detalladas con toda la información
            </p>
            <p>
              • <strong>Media Carta:</strong> Formato compacto para facturas estándar
            </p>
            <p>
              • <strong>Ticket 80mm:</strong> Perfecto para tickets rápidos y comprobantes POS
            </p>
            <p>
              • Asegúrate de que tu impresora esté configurada correctamente
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
