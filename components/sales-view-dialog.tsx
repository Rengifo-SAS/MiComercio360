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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Printer,
  Download,
  Edit,
  Calendar,
  User,
  CreditCard,
  FileText,
  Package,
  Loader2,
} from 'lucide-react';
import {
  Sale,
  PaymentMethodLabels,
  PaymentStatusLabels,
  SaleStatusLabels,
  formatCurrency,
  formatDateTime,
} from '@/lib/types/sales';
import { SalesPrintService } from '@/lib/services/sales-print-service';

interface SalesViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  companyId: string;
}

export function SalesViewDialog({
  open,
  onOpenChange,
  sale,
  companyId,
}: SalesViewDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!sale) return null;

  const handlePrint = async () => {
    if (!sale) return;

    setIsPrinting(true);
    try {
      await SalesPrintService.printSale(sale, companyId);
    } catch (error) {
      console.error('Error imprimiendo venta:', error);
      alert('Error al imprimir la venta. Inténtalo de nuevo.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExport = async () => {
    if (!sale) return;

    setIsExporting(true);
    try {
      await SalesPrintService.generatePDF(sale, companyId);
    } catch (error) {
      console.error('Error exportando venta:', error);
      alert('Error al exportar la venta. Inténtalo de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Venta #{sale.sale_number}
              </DialogTitle>
              <DialogDescription>
                Detalles de la transacción de venta
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={isPrinting || isExporting}
              >
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                {isPrinting ? 'Imprimiendo...' : 'Imprimir'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isPrinting || isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isExporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información general */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Información de la Venta
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número:</span>
                    <span className="font-medium">#{sale.sale_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span>{formatDateTime(sale.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge
                      variant={
                        sale.status === 'completed'
                          ? 'default'
                          : sale.status === 'cancelled'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {SaleStatusLabels[sale.status]}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(sale.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </h3>
                {sale.customer ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nombre:</span>
                      <span className="font-medium">
                        {sale.customer.business_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Documento:</span>
                      <span>{sale.customer.identification_number}</span>
                    </div>
                    {sale.customer.email && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span>{sale.customer.email}</span>
                      </div>
                    )}
                    {sale.customer.phone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Teléfono:</span>
                        <span>{sale.customer.phone}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Sin cliente</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pago
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Método:</span>
                    <span>{PaymentMethodLabels[sale.payment_method]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge
                      variant={
                        sale.payment_status === 'completed'
                          ? 'default'
                          : sale.payment_status === 'refunded'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {PaymentStatusLabels[sale.payment_status]}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items de la venta */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos ({sale.items?.length || 0})
            </h3>

            {sale.items && sale.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-center">Descuento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {item.product?.name || 'Producto no encontrado'}
                          </div>
                          {item.product?.sku && (
                            <div className="text-sm text-muted-foreground">
                              SKU: {item.product.sku}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.discount_percentage > 0 ? (
                          <div>
                            <div className="text-sm text-muted-foreground">
                              {item.discount_percentage}%
                            </div>
                            <div className="text-xs text-red-600">
                              -{formatCurrency(item.discount_amount)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total_price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No hay productos en esta venta
              </p>
            )}
          </div>

          <Separator />

          {/* Resumen de totales */}
          <div className="space-y-2">
            <h3 className="font-semibold">Resumen de Totales</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descuento:</span>
                  <span className="text-red-600">
                    -{formatCurrency(sale.discount_amount)}
                  </span>
                </div>
              )}
              {sale.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impuestos:</span>
                  <span>{formatCurrency(sale.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(sale.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Notas */}
          {sale.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Notas</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {sale.notes}
                </p>
              </div>
            </>
          )}

          {/* Información del cajero */}
          {sale.cashier && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Cajero</h3>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span>{sale.cashier.full_name || sale.cashier.email}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button onClick={handlePrint} disabled={isPrinting || isExporting}>
              {isPrinting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              {isPrinting ? 'Imprimiendo...' : 'Imprimir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
