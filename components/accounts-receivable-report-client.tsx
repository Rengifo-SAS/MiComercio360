'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, differenceInDays, addDays, startOfYear, startOfDay, endOfDay } from 'date-fns';
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
import { Input } from '@/components/ui/input';
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
  Search,
  Filter,
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

interface AccountsReceivableReportClientProps {
  companyId: string;
  userId: string;
}

interface ReceivableSale {
  id: string;
  sale_number: string;
  created_at: string;
  due_date: Date;
  overdue_days: number;
  total_amount: number;
  payment_amount_received: number;
  missing_amount: number;
  customer_name: string;
  customer_id: string | null;
  document_type: string;
  numeration_name?: string;
}

export function AccountsReceivableReportClient({
  companyId,
  userId,
}: AccountsReceivableReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState<ReceivableSale[]>([]);
  const [filteredSales, setFilteredSales] = useState<ReceivableSale[]>([]);
  const [overdueFilter, setOverdueFilter] = useState<string>('all');

  // Filtros de fecha
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfYear(new Date()),
    to: new Date(),
  });

  // Totales
  const [totalReceivable, setTotalReceivable] = useState(0);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Cargar reporte automáticamente al cambiar fechas
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      generateReport();
    }
  }, [dateRange]);

  // Filtrar por días vencidos
  useEffect(() => {
    let filtered = sales;

    if (overdueFilter === 'all') {
      filtered = sales;
    } else {
      const today = new Date();
      switch (overdueFilter) {
        case '0-30':
          filtered = sales.filter(
            (sale) => sale.overdue_days > 0 && sale.overdue_days <= 30
          );
          break;
        case '31-60':
          filtered = sales.filter(
            (sale) => sale.overdue_days >= 31 && sale.overdue_days <= 60
          );
          break;
        case '61-90':
          filtered = sales.filter(
            (sale) => sale.overdue_days >= 61 && sale.overdue_days <= 90
          );
          break;
        case '91+':
          filtered = sales.filter((sale) => sale.overdue_days >= 91);
          break;
        case 'not-overdue':
          filtered = sales.filter((sale) => sale.overdue_days <= 0);
          break;
      }
    }

    setFilteredSales(filtered);
    setCurrentPage(1);
  }, [overdueFilter, sales]);

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Por favor selecciona un rango de fechas');
      return;
    }

    setLoading(true);

    try {
      // Obtener todas las ventas pendientes dentro del rango de fechas
      const { data: salesData, error } = await supabase
        .from('sales')
        .select(`
          id,
          sale_number,
          total_amount,
          payment_amount_received,
          created_at,
          payment_status,
          status,
          customer_id,
          customers:customers!sales_customer_id_fkey (
            id,
            business_name,
            identification_number,
            payment_terms
          ),
          numeration:numerations!sales_numeration_id_fkey (
            id,
            name,
            document_type
          )
        `)
        .eq('company_id', companyId)
        .eq('payment_status', 'pending')
        .neq('status', 'cancelled')
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error) {
        console.error('Error al consultar ventas:', error);
        toast.error('Error al consultar las ventas. Por favor intenta de nuevo.');
        throw error;
      }

      if (!salesData || salesData.length === 0) {
        toast.info('No se encontraron ventas pendientes en el período seleccionado');
        setSales([]);
        setFilteredSales([]);
        setTotalReceivable(0);
        setLoading(false);
        return;
      }

      // Procesar ventas y calcular días vencidos
      const today = new Date();
      const processedSales: ReceivableSale[] = salesData.map((sale: any) => {
        const customer = Array.isArray(sale.customers)
          ? sale.customers[0]
          : sale.customers;
        const numeration = Array.isArray(sale.numeration)
          ? sale.numeration[0]
          : sale.numeration;

        const createdDate = new Date(sale.created_at);
        const paymentTerms = customer?.payment_terms || 0;
        const dueDate = addDays(createdDate, paymentTerms);
        const overdueDays = differenceInDays(today, dueDate);

        const totalAmount = Number(sale.total_amount) || 0;
        const paymentAmountReceived = Number(sale.payment_amount_received) || 0;
        const missingAmount = totalAmount - paymentAmountReceived;

        return {
          id: sale.id,
          sale_number: sale.sale_number,
          created_at: sale.created_at,
          due_date: dueDate,
          overdue_days: overdueDays,
          total_amount: totalAmount,
          payment_amount_received: paymentAmountReceived,
          missing_amount: missingAmount,
          customer_name: customer?.business_name || 'Consumidor Final',
          customer_id: sale.customer_id,
          document_type: numeration?.document_type || 'Factura',
          numeration_name: numeration?.name,
        };
      });

      // Ordenar por días vencidos descendente (más vencidas primero)
      processedSales.sort((a, b) => b.overdue_days - a.overdue_days);

      setSales(processedSales);
      setFilteredSales(processedSales);

      // Calcular total por cobrar (solo el monto faltante)
      const total = processedSales.reduce(
        (sum, sale) => sum + sale.missing_amount,
        0
      );
      setTotalReceivable(total);
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);

      const errorMessage =
        error?.message ||
        error?.details ||
        'Error desconocido al generar el reporte';
      toast.error(`Error al generar el reporte: ${errorMessage}`);

      setSales([]);
      setFilteredSales([]);
      setTotalReceivable(0);
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
          href="/dashboard/reports/administrative"
          className="hover:text-foreground transition-colors"
        >
          Administrativos
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">
          Cuentas por cobrar
        </span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Cuentas por cobrar
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Controla el vencimiento y cobro de tus facturas a crédito.
        </p>
      </div>

      {/* Filtros */}
      <Card className="shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg md:text-xl">
            Parámetros del reporte
          </CardTitle>
          <CardDescription className="text-sm">
            Selecciona el período para generar el reporte
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Periodo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'dd/MM/yyyy', { locale: es })} -{' '}
                            {format(dateRange.to, 'dd/MM/yyyy', { locale: es })}
                          </>
                        ) : (
                          format(dateRange.from, 'dd/MM/yyyy', { locale: es })
                        )
                      ) : (
                        'Selecciona un rango'
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button
                onClick={generateReport}
                disabled={loading || !dateRange?.from || !dateRange?.to}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  'Generar Reporte'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros rápidos */}
      {sales.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={overdueFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOverdueFilter('all')}
            className="h-8"
          >
            Todas
          </Button>
          <Button
            variant={overdueFilter === '0-30' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOverdueFilter('0-30')}
            className="h-8"
          >
            Vencidas 30 días o menos
          </Button>
          <Button
            variant={overdueFilter === '31-60' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOverdueFilter('31-60')}
            className="h-8"
          >
            Vencidas 31 días a 60 días
          </Button>
          <Button
            variant={overdueFilter === '61-90' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOverdueFilter('61-90')}
            className="h-8"
          >
            Vencidas 61 días a 90 días
          </Button>
          <Button
            variant={overdueFilter === '91+' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOverdueFilter('91+')}
            className="h-8"
          >
            Vencidas 91+
          </Button>
          <Button
            variant={overdueFilter === 'not-overdue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOverdueFilter('not-overdue')}
            className="h-8"
          >
            No vencidas
          </Button>
        </div>
      )}

      {/* Totales */}
      {sales.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">
                  Total por cobrar
                </p>
                <p className="text-lg font-semibold text-orange-600">
                  {formatCurrency(totalReceivable)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      {loading ? (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Generando reporte...
              </span>
            </div>
          </CardContent>
        </Card>
      ) : filteredSales.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">
                {sales.length === 0
                  ? 'No se encontraron ventas pendientes en el período seleccionado'
                  : 'No hay ventas que coincidan con los filtros seleccionados'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-sm">
            <CardContent className="pt-6 p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <input type="checkbox" className="rounded" />
                      </TableHead>
                      <TableHead className="w-[13%]">Número</TableHead>
                      <TableHead className="w-[15%]">Tipo de documento</TableHead>
                      <TableHead className="w-[20%]">Cliente</TableHead>
                      <TableHead className="w-[11%]">Creación</TableHead>
                      <TableHead className="w-[12%]">Vencimiento</TableHead>
                      <TableHead className="w-[16%] text-right">Total</TableHead>
                      <TableHead className="w-[16%] text-right">Cobrado</TableHead>
                      <TableHead className="w-[16%] text-right">Por cobrar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <input type="checkbox" className="rounded" />
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/sales/${sale.id}`}
                            className="text-primary hover:underline font-medium"
                            target="_blank"
                          >
                            {sale.sale_number}
                          </Link>
                        </TableCell>
                        <TableCell className="truncate max-w-[150px]">
                          {sale.document_type}
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]">
                          {sale.customer_name}
                        </TableCell>
                        <TableCell>
                          {format(new Date(sale.created_at), 'dd/MM/yyyy', {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              sale.overdue_days > 0 ? 'text-red-600 font-medium' : ''
                            }
                          >
                            {format(sale.due_date, 'dd/MM/yyyy', { locale: es })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(sale.total_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(sale.payment_amount_received)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(sale.missing_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Mostrando {startItem}-{endItem} de {filteredSales.length}
                </span>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Resultados por página
                  </span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
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
                        if (hasPreviousPage) setCurrentPage(1);
                      }}
                      className={
                        !hasPreviousPage ? 'pointer-events-none opacity-50' : ''
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasPreviousPage) setCurrentPage(currentPage - 1);
                      }}
                      className={
                        !hasPreviousPage ? 'pointer-events-none opacity-50' : ''
                      }
                    >
                      Anterior
                    </PaginationLink>
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
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasNextPage) setCurrentPage(currentPage + 1);
                      }}
                      className={
                        !hasNextPage ? 'pointer-events-none opacity-50' : ''
                      }
                    >
                      Siguiente
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasNextPage) setCurrentPage(totalPages);
                      }}
                      className={
                        !hasNextPage ? 'pointer-events-none opacity-50' : ''
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}

