'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ArrowLeft,
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
import { toast } from 'sonner';

interface SaleDetailPageClientProps {
  sale: Sale;
  companyId: string;
}

export function SaleDetailPageClient({
  sale,
  companyId,
}: SaleDetailPageClientProps) {
  const router = useRouter();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await SalesPrintService.printSale(sale, companyId);
    } catch (error) {
      console.error('Error imprimiendo venta:', error);
      toast.error('Error al imprimir la venta. Inténtalo de nuevo.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await SalesPrintService.generatePDF(sale, companyId);
    } catch (error) {
      console.error('Error exportando venta:', error);
      toast.error('Error al exportar la venta. Inténtalo de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/sales" className="hover:text-foreground transition-colors">
          Ventas
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Venta #{sale.sale_number}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-6 w-6 md:h-8 md:w-8" />
                Venta #{sale.sale_number}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Detalles de la transacción de venta
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos ({sale.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sale.items && sale.items.length > 0 ? (
                <div className="overflow-x-auto">
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
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No hay productos en esta venta
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {sale.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                  {sale.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Sale Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Información de la Venta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sale.customer ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-medium">{sale.customer.business_name}</span>
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
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Totals Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
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
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(sale.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cashier Info */}
          {sale.cashier && (
            <Card>
              <CardHeader>
                <CardTitle>Cajero</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span>{sale.cashier.full_name || sale.cashier.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

