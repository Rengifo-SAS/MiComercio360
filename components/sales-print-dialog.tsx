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
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Printer,
  Download,
  Loader2,
  AlertCircle,
  FileText,
  Receipt,
  Mail,
} from 'lucide-react';
import { Sale } from '@/lib/types/sales';
import { SalesPrintService } from '@/lib/services/sales-print-service';
import { formatCurrency } from '@/lib/types/sales';
import { toast } from 'sonner';

interface SalesPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  companyId: string;
}

type PaperSize = 'letter' | 'thermal-80mm';

export function SalesPrintDialog({
  open,
  onOpenChange,
  sale,
  companyId,
}: SalesPrintDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paperSize, setPaperSize] = useState<PaperSize>('thermal-80mm');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  const handleSendInvoice = async () => {
    if (!email || !sale) return;

    setIsSending(true);
    setError(null);

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
      onOpenChange(false);
    } catch (err) {
      console.error('Error enviando factura:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Error al enviar la factura';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[85vw] lg:w-[80vw]">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
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

          {/* Enviar por email */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Enviar por Email</h3>
            <div className="space-y-2">
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
                  variant="default"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
              {sale?.customer?.email && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEmail(sale.customer?.email || '')}
                  className="w-full"
                >
                  Usar email del cliente: {sale.customer.email}
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Opciones de impresión */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Opciones de Impresión</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
