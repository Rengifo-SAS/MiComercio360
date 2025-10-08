'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Printer, Download, Eye } from 'lucide-react';
import { useState } from 'react';
import { SalesPrintService } from '@/lib/services/sales-print-service';
import { SalesService } from '@/lib/services/sales-service';
import { toast } from 'sonner';

interface POSPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
  companyId: string;
}

export function POSPrintDialog({
  open,
  onOpenChange,
  saleId,
  companyId,
}: POSPrintDialogProps) {
  const [paperSize, setPaperSize] = useState<'letter' | 'thermal-80mm'>('thermal-80mm');
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
      const html = await SalesPrintService.generatePrintHTML(sale, companyId, paperSize);
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(html);
        previewWindow.document.close();
      } else {
        throw new Error('No se pudo abrir la ventana de vista previa. Verifique que los pop-ups estén habilitados.');
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimir Factura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selección de tamaño de papel */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tamaño de Papel</Label>
            <RadioGroup value={paperSize} onValueChange={(value: 'letter' | 'thermal-80mm') => setPaperSize(value)}>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="thermal-80mm" id="thermal-80mm" />
                <Label htmlFor="thermal-80mm" className="cursor-pointer flex-1">
                  <div className="font-medium">Impresora de 80mm</div>
                  <div className="text-sm text-gray-500">Ideal para POS y terminales</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="letter" id="letter" />
                <Label htmlFor="letter" className="cursor-pointer flex-1">
                  <div className="font-medium">Tamaño Carta</div>
                  <div className="text-sm text-gray-500">Para impresoras estándar</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={loading}
              className="flex flex-col items-center gap-2 h-16"
            >
              <Eye className="h-4 w-4" />
              <span className="text-xs">Vista Previa</span>
            </Button>
            
            <Button
              onClick={handlePrint}
              disabled={loading}
              className="flex flex-col items-center gap-2 h-16 bg-teal-600 hover:bg-teal-700"
            >
              <Printer className="h-4 w-4" />
              <span className="text-xs">Imprimir</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={loading}
              className="flex flex-col items-center gap-2 h-16"
            >
              <Download className="h-4 w-4" />
              <span className="text-xs">Descargar PDF</span>
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
