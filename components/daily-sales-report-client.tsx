'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar as CalendarIcon,
  Loader2,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DailySalesReportClientProps {
  companyId: string;
  userId: string;
}

interface PaymentMethodGroup {
  method: string;
  display_name: string;
  total_amount: number;
  sale_count: number;
}

interface NumerationGroup {
  numeration_id: string;
  numeration_name: string;
  total_amount: number;
  sale_count: number;
}

interface SaleDetail {
  id: string;
  sale_number: string;
  created_at: string;
  payment_method: string;
  payment_method_display: string;
  numeration_name: string;
  customer_name: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
}

export function DailySalesReportClient({
  companyId,
  userId,
}: DailySalesReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodGroup[]>([]);
  const [numerations, setNumerations] = useState<NumerationGroup[]>([]);
  const [salesDetails, setSalesDetails] = useState<SaleDetail[]>([]);
  const [filteredSales, setFilteredSales] = useState<SaleDetail[]>([]);
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterNumeration, setFilterNumeration] = useState<string>('all');

  // Totales
  const [totalSales, setTotalSales] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalBeforeTax, setTotalBeforeTax] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Cargar reporte automáticamente al cambiar la fecha
  useEffect(() => {
    if (selectedDate) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Filtrar ventas según filtros seleccionados
  useEffect(() => {
    let filtered = salesDetails;

    if (filterPaymentMethod !== 'all') {
      filtered = filtered.filter(
        (sale) => sale.payment_method === filterPaymentMethod
      );
    }

    if (filterNumeration !== 'all') {
      filtered = filtered.filter(
        (sale) => sale.numeration_name === filterNumeration
      );
    }

    setFilteredSales(filtered);
    setCurrentPage(1);
  }, [filterPaymentMethod, filterNumeration, salesDetails]);

  const generateReport = async () => {
    if (!selectedDate) {
      toast.error('Por favor selecciona una fecha');
      return;
    }

    setLoading(true);
    setPaymentMethods([]);
    setNumerations([]);
    setSalesDetails([]);
    setFilteredSales([]);
    setTotalSales(0);
    setTotalAmount(0);
    setTotalBeforeTax(0);
    setTotalTax(0);
    setTotalDiscount(0);

    try {
      const startDate = format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
      const endDate = format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

      // Consultar ventas del día con JOINs necesarios
      const { data: salesData, error } = await supabase
        .from('sales')
        .select(
          `
          id,
          sale_number,
          created_at,
          payment_method,
          subtotal,
          discount_amount,
          tax_amount,
          total_amount,
          status,
          customer_id,
          numeration_id,
          customers:customer_id (
            id,
            business_name
          ),
          numerations:numeration_id (
            id,
            name
          )
        `
        )
        .eq('company_id', companyId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error) {
        console.error('Error al consultar ventas:', error);
        toast.error('Error al consultar las ventas. Por favor intenta de nuevo.');
        throw error;
      }

      if (!salesData || salesData.length === 0) {
        toast.info('No se encontraron ventas para el día seleccionado');
        setPaymentMethods([]);
        setNumerations([]);
        setSalesDetails([]);
        setFilteredSales([]);
        setTotalSales(0);
        setTotalAmount(0);
        setTotalBeforeTax(0);
        setTotalTax(0);
        setTotalDiscount(0);
        setLoading(false);
        return;
      }

      // Procesar ventas
      const paymentMethodsMap = new Map<string, PaymentMethodGroup>();
      const numerationsMap = new Map<string, NumerationGroup>();
      const details: SaleDetail[] = [];

      const getPaymentMethodDisplay = (method: string): string => {
        const mapping: { [key: string]: string } = {
          cash: 'Efectivo',
          card: 'Tarjeta',
          transfer: 'Transferencia',
          mixed: 'Mixto',
        };
        return mapping[method] || method;
      };

      salesData.forEach((sale: any) => {
        if (!sale) return;

        const paymentMethod = sale.payment_method || 'cash';
        const paymentMethodDisplay = getPaymentMethodDisplay(paymentMethod);
        const customer = Array.isArray(sale.customers)
          ? sale.customers[0]
          : sale.customers;
        const numeration = Array.isArray(sale.numerations)
          ? sale.numerations[0]
          : sale.numerations;

        const customerName = customer?.business_name || 'Consumidor Final';
        const numerationName = numeration?.name || 'Sin numeración';

        // Agrupar por forma de pago
        if (!paymentMethodsMap.has(paymentMethod)) {
          paymentMethodsMap.set(paymentMethod, {
            method: paymentMethod,
            display_name: paymentMethodDisplay,
            total_amount: 0,
            sale_count: 0,
          });
        }
        const paymentGroup = paymentMethodsMap.get(paymentMethod)!;
        paymentGroup.total_amount += Number(sale.total_amount) || 0;
        paymentGroup.sale_count += 1;

        // Agrupar por numeración
        const numerationKey = numeration?.id || 'sin-numeracion';
        if (!numerationsMap.has(numerationKey)) {
          numerationsMap.set(numerationKey, {
            numeration_id: numerationKey,
            numeration_name: numerationName,
            total_amount: 0,
            sale_count: 0,
          });
        }
        const numerationGroup = numerationsMap.get(numerationKey)!;
        numerationGroup.total_amount += Number(sale.total_amount) || 0;
        numerationGroup.sale_count += 1;

        // Detalle de venta
        details.push({
          id: sale.id,
          sale_number: sale.sale_number,
          created_at: sale.created_at,
          payment_method: paymentMethod,
          payment_method_display: paymentMethodDisplay,
          numeration_name: numerationName,
          customer_name: customerName,
          subtotal: Number(sale.subtotal) || 0,
          discount_amount: Number(sale.discount_amount) || 0,
          tax_amount: Number(sale.tax_amount) || 0,
          total_amount: Number(sale.total_amount) || 0,
          status: sale.status,
        });
      });

      // Convertir a arrays y ordenar
      const paymentMethodsArray = Array.from(paymentMethodsMap.values()).sort(
        (a, b) => b.total_amount - a.total_amount
      );
      const numerationsArray = Array.from(numerationsMap.values()).sort(
        (a, b) => b.total_amount - a.total_amount
      );

      setPaymentMethods(paymentMethodsArray);
      setNumerations(numerationsArray);
      setSalesDetails(details);
      setFilteredSales(details);

      // Calcular totales
      const sumTotal = details.reduce((sum, sale) => sum + sale.total_amount, 0);
      const sumBeforeTax = details.reduce(
        (sum, sale) => sum + sale.subtotal - sale.discount_amount,
        0
      );
      const sumTax = details.reduce((sum, sale) => sum + sale.tax_amount, 0);
      const sumDiscount = details.reduce(
        (sum, sale) => sum + sale.discount_amount,
        0
      );

      setTotalSales(details.length);
      setTotalAmount(sumTotal);
      setTotalBeforeTax(sumBeforeTax);
      setTotalTax(sumTax);
      setTotalDiscount(sumDiscount);

      toast.success(
        `Reporte generado para ${format(selectedDate, 'dd/MMM/yyyy', {
          locale: es,
        })}`
      );
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);

      const errorMessage =
        error?.message ||
        error?.details ||
        'Error desconocido al generar el reporte';
      toast.error(`Error al generar el reporte: ${errorMessage}`);

      setPaymentMethods([]);
      setNumerations([]);
      setSalesDetails([]);
      setFilteredSales([]);
      setTotalSales(0);
      setTotalAmount(0);
      setTotalBeforeTax(0);
      setTotalTax(0);
      setTotalDiscount(0);
    } finally {
      setLoading(false);
    }
  };

  // Calcular ventas paginadas
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  // Calcular páginas visibles
  const getVisiblePages = () => {
    const delta = 2;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];

    if (totalPages <= 1) return [1];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startItem = filteredSales.length > 0 ? startIndex + 1 : 0;
  const endItem = Math.min(endIndex, filteredSales.length);

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/reports"
          className="hover:text-foreground transition-colors"
        >
          Reportes
        </Link>
        <span>/</span>
        <Link
          href="/dashboard/reports/sales"
          className="hover:text-foreground transition-colors"
        >
          Ventas
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">
          Ventas diarias
        </span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Ventas diarias
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Exporta tus ventas agrupadas por forma de pago y numeraciones.
        </p>
      </div>

      {/* Filtros */}
      <Card className="shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg md:text-xl">
            Parámetros del reporte
          </CardTitle>
          <CardDescription className="text-sm">
            Selecciona el día específico para generar el reporte
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Día</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {selectedDate
                        ? format(selectedDate, 'PPP', { locale: es })
                        : 'Selecciona un día'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Forma de pago</Label>
              <Select
                value={filterPaymentMethod}
                onValueChange={setFilterPaymentMethod}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Todas las formas de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las formas de pago</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.method} value={method.method}>
                      {method.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Numeración</Label>
              <Select
                value={filterNumeration}
                onValueChange={setFilterNumeration}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Todas las numeraciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las numeraciones</SelectItem>
                  {numerations.map((num) => (
                    <SelectItem
                      key={num.numeration_id}
                      value={num.numeration_name}
                    >
                      {num.numeration_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {loading && salesDetails.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Generando reporte...</p>
        </div>
      )}

      {/* Resumen de totales */}
      {salesDetails.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">Total ventas</p>
              <p className="text-lg font-semibold">{totalSales}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">
                Antes de impuestos
              </p>
              <p className="text-lg font-semibold">
                {formatCurrency(totalBeforeTax)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">
                Descuentos
              </p>
              <p className="text-lg font-semibold">
                {formatCurrency(totalDiscount)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">Impuestos</p>
              <p className="text-lg font-semibold">
                {formatCurrency(totalTax)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">
                Total del día
              </p>
              <p className="text-lg font-semibold text-primary">
                {formatCurrency(totalAmount)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resumen por forma de pago */}
      {paymentMethods.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold">
              Resumen por forma de pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Forma de pago</TableHead>
                    <TableHead className="text-right font-semibold">
                      Número de ventas
                    </TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentMethods.map((method) => (
                    <TableRow key={method.method} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {method.display_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {method.sale_count}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(method.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen por numeración */}
      {numerations.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold">
              Resumen por numeración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Numeración</TableHead>
                    <TableHead className="text-right font-semibold">
                      Número de ventas
                    </TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {numerations.map((num) => (
                    <TableRow key={num.numeration_id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {num.numeration_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {num.sale_count}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(num.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalle de ventas */}
      {salesDetails.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold">Detalle de ventas</CardTitle>
                <CardDescription className="text-sm">
                  {filteredSales.length} de {salesDetails.length} ventas
                </CardDescription>
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[100px] font-semibold">
                      Número
                    </TableHead>
                    <TableHead className="min-w-[120px] font-semibold">
                      Fecha/Hora
                    </TableHead>
                    <TableHead className="min-w-[120px] font-semibold">
                      Cliente
                    </TableHead>
                    <TableHead className="min-w-[120px] font-semibold">
                      Forma de pago
                    </TableHead>
                    <TableHead className="min-w-[120px] font-semibold">
                      Numeración
                    </TableHead>
                    <TableHead className="text-right min-w-[120px] font-semibold">
                      Subtotal
                    </TableHead>
                    <TableHead className="text-right min-w-[120px] font-semibold">
                      Descuento
                    </TableHead>
                    <TableHead className="text-right min-w-[120px] font-semibold">
                      Impuesto
                    </TableHead>
                    <TableHead className="text-right min-w-[120px] font-semibold">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Link
                          href={`/dashboard/sales/${sale.id}`}
                          className="text-primary hover:underline"
                          target="_blank"
                        >
                          {sale.sale_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>{sale.customer_name}</TableCell>
                      <TableCell>{sale.payment_method_display}</TableCell>
                      <TableCell>{sale.numeration_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.subtotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.discount_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.tax_amount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(sale.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {filteredSales.length > 0 && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {startItem}-{endItem}{' '}
                    <span className="text-muted-foreground">de {filteredSales.length}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Resultados por página</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={handleItemsPerPageChange}
                    >
                      <SelectTrigger className="h-9 w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasPreviousPage) {
                            setCurrentPage(currentPage - 1);
                          }
                        }}
                        className={
                          !hasPreviousPage
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                      />
                    </PaginationItem>

                    {visiblePages.map((page, index) => (
                      <PaginationItem key={index}>
                        {page === '...' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page as number);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasNextPage) {
                            setCurrentPage(currentPage + 1);
                          }
                        }}
                        className={
                          !hasNextPage
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}

            {/* Información de paginación cuando solo hay una página */}
            {filteredSales.length > 0 && totalPages === 1 && (
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startItem}-{endItem} de {filteredSales.length}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Resultados por página</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="h-9 w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estado vacío */}
      {salesDetails.length === 0 && !loading && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              No hay datos para mostrar
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No se encontraron ventas para el día seleccionado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
