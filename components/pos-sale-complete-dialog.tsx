'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/types/sales';
import { Sale } from '@/lib/types/sales';
import { SalesPrintService } from '@/lib/services/sales-print-service';
import { Printer, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface POSSaleCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  companyId: string;
  onNewSale: () => void;
  totalAmount: number;
  changeAmount?: number;
  printPaperSize: 'letter' | 'thermal-80mm';
}

export function POSSaleCompleteDialog({
  open,
  onOpenChange,
  sale,
  companyId,
  onNewSale,
  totalAmount,
  changeAmount = 0,
  printPaperSize,
}: POSSaleCompleteDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [email, setEmail] = useState('');

  const handlePrint = async () => {
    if (!sale) return;

    setIsPrinting(true);
    try {
      // Generar HTML optimizado para impresión
      const html = await SalesPrintService.generatePrintHTML(
        sale,
        companyId,
        printPaperSize
      );

      // Abrir en nueva ventana para impresión directa
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        throw new Error(
          'No se pudo abrir la ventana de impresión. Verifique que los pop-ups estén habilitados.'
        );
      }

      printWindow.document.write(html);
      printWindow.document.close();

      // Esperar un momento para que se cargue el contenido
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        toast.success('Diálogo de impresión del navegador abierto');
      }, 500);
    } catch (error) {
      console.error('Error generando impresión:', error);
      toast.error('Error al abrir el diálogo de impresión');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!email || !sale) return;

    setIsSending(true);
    try {
      // Enviar factura por correo usando API route
      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          saleId: sale.id,
          companyId,
          email,
          paperSize: 'letter', // Siempre usar tamaño carta para correos
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar la factura');
      }

      toast.success(
        result.message || `Factura enviada exitosamente a ${email}`
      );
      setEmail('');
    } catch (error) {
      console.error('Error enviando factura:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Error al enviar la factura';
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleNewSale = () => {
    onNewSale();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Venta Finalizada</DialogTitle>
          <DialogDescription className="sr-only">
            La venta se ha completado exitosamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header con estado de guardando */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/20 rounded-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-teal-600 dark:text-teal-400 animate-spin" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Guardando...
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Puedes imprimirla o crear una nueva venta mientras la guardamos.
              </p>
            </div>
          </div>

          {/* Resumen de transacción */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Total
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Cambio
              </span>
              <span
                className={`text-sm font-semibold ${
                  changeAmount > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {formatCurrency(changeAmount)}
              </span>
            </div>
          </div>

          {/* Compartir por email */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Compartir por:
              </span>
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border">
                <Mail className="h-4 w-4 text-gray-500" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enviar factura
              </label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Correo electrónico del cliente"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendInvoice}
                  disabled={!email || isSending}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-1" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3">
            <Button
              onClick={handlePrint}
              disabled={isPrinting}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {isPrinting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              {isPrinting ? 'Imprimiendo...' : 'Imprimir'}
            </Button>
            <Button
              onClick={handleNewSale}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            >
              Nueva venta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
