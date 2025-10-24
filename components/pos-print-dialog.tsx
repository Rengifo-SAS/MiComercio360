'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Printer, Download, Eye, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { SalesPrintService } from '@/lib/services/sales-print-service';
import { SalesService } from '@/lib/services/sales-service';
import { toast } from 'sonner';

interface POSPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
  companyId: string;
  defaultPaperSize?: 'letter' | 'thermal-80mm';
}

export function POSPrintDialog({
  open,
  onOpenChange,
  saleId,
  companyId,
  defaultPaperSize = 'thermal-80mm',
}: POSPrintDialogProps) {
  const [paperSize, setPaperSize] = useState<'letter' | 'thermal-80mm'>(
    defaultPaperSize
  );
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    if (!saleId || !companyId) return;

    try {
      setLoading(true);
      // Obtener la venta completa
      const sale = await SalesService.getSaleById(saleId);
      if (!sale) {
        throw new Error('No se pudo encontrar la venta');
      }

      await SalesPrintService.printSale(sale, companyId, paperSize);
      toast.success('Impresión iniciada');
      onOpenChange(false);
    } catch (error) {
      console.error('Error imprimiendo:', error);
      toast.error('Error al imprimir');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!saleId || !companyId) return;

    try {
      setLoading(true);
      // Obtener la venta completa
      const sale = await SalesService.getSaleById(saleId);
      if (!sale) {
        throw new Error('No se pudo encontrar la venta');
      }

      // Generar HTML y abrir en nueva ventana para vista previa
      const html = await SalesPrintService.generatePrintHTML(
        sale,
        companyId,
        paperSize
      );
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(html);
        previewWindow.document.close();
      } else {
        throw new Error(
          'No se pudo abrir la ventana de vista previa. Verifique que los pop-ups estén habilitados.'
        );
      }
    } catch (error) {
      console.error('Error en vista previa:', error);
      toast.error('Error en vista previa');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!saleId || !companyId) return;

    try {
      setLoading(true);
      // Obtener la venta completa
      const sale = await SalesService.getSaleById(saleId);
      if (!sale) {
        throw new Error('No se pudo encontrar la venta');
      }

      await SalesPrintService.generatePDF(sale, companyId, paperSize);
      toast.success('PDF generado');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Printer className="h-4 w-4" />
            Impresión Rápida
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de configuración */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Configuración POS
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Tamaño: {paperSize === 'thermal-80mm' ? '80mm Térmica' : 'Carta'}
            </div>
          </div>

          {/* Botones de acción - Compactos */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={loading}
              className="flex flex-col items-center gap-1 h-12 text-xs"
            >
              <Eye className="h-3 w-3" />
              <span>Vista</span>
            </Button>

            <Button
              onClick={handlePrint}
              disabled={loading}
              className="flex flex-col items-center gap-1 h-12 bg-teal-600 hover:bg-teal-700 text-xs"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Printer className="h-3 w-3" />
              )}
              <span>Imprimir</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={loading}
              className="flex flex-col items-center gap-1 h-12 text-xs"
            >
              <Download className="h-3 w-3" />
              <span>PDF</span>
            </Button>
          </div>

          {/* Botón cerrar */}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
            disabled={loading}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
