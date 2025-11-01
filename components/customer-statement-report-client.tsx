'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, differenceInDays, addDays } from 'date-fns';
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
  Eye,
  Printer,
  DollarSign,
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

interface CustomerStatementReportClientProps {
  companyId: string;
  userId: string;
}

interface Customer {
  id: string;
  business_name: string;
  identification_number: string;
  payment_terms: number;
}

interface StatementSale {
  id: string;
  sale_number: string;
  created_at: string;
  due_date: Date;
  overdue_days: number;
  total_amount: number;
  payment_amount_received: number;
  retencion_amount: number;
  payment_status: string;
  status: string;
  document_type: string;
  missing_amount: number;
}

export function CustomerStatementReportClient({
  companyId,
  userId,
}: CustomerStatementReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [sales, setSales] = useState<StatementSale[]>([]);
  const [filteredSales, setFilteredSales] = useState<StatementSale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [overdueFilter, setOverdueFilter] = useState<string>('all');
  const [cutoffDate, setCutoffDate] = useState<Date>(new Date());

  // Totales
  const [total, setTotal] = useState(0);
  const [totalRetention, setTotalRetention] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [balance, setBalance] = useState(0);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Cargar lista de clientes
  useEffect(() => {
    const loadCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, business_name, identification_number, payment_terms')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('business_name', { ascending: true });

        if (error) {
          console.error('Error al cargar clientes:', error);
          toast.error('Error al cargar la lista de clientes');
          return;
        }

        setCustomers(data || []);
      } catch (error) {
        console.error('Error al cargar clientes:', error);
        toast.error('Error al cargar la lista de clientes');
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadCustomers();
  }, [companyId, supabase]);

  // Filtrar clientes por búsqueda
  const filteredCustomersList = useMemo(() => {
    if (!customerSearchQuery.trim()) {
      return customers;
    }
    const query = customerSearchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.business_name.toLowerCase().includes(query) ||
        customer.identification_number.toLowerCase().includes(query)
    );
  }, [customers, customerSearchQuery]);

  // Generar reporte cuando se selecciona cliente
  useEffect(() => {
    if (selectedCustomer) {
      generateReport();
    } else {
      setSales([]);
      setFilteredSales([]);
      setTotal(0);
      setTotalRetention(0);
      setTotalCollected(0);
      setBalance(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer, cutoffDate]);

  // Filtrar ventas por días vencidos
  useEffect(() => {
    if (overdueFilter === 'all') {
      setFilteredSales(sales);
      setCurrentPage(1);
      return;
    }

    let filtered: StatementSale[] = [];

    switch (overdueFilter) {
      case '0-30':
        filtered = sales.filter((sale) => sale.overdue_days > 0 && sale.overdue_days <= 30);
        break;
      case '31-60':
        filtered = sales.filter((sale) => sale.overdue_days >= 31 && sale.overdue_days <= 60);
        break;
      case '61-90':
        filtered = sales.filter((sale) => sale.overdue_days >= 61 && sale.overdue_days <= 90);
        break;
      case '91+':
        filtered = sales.filter((sale) => sale.overdue_days >= 91);
        break;
      case 'not-overdue':
        filtered = sales.filter((sale) => sale.overdue_days <= 0);
        break;
      default:
        filtered = sales;
    }

    setFilteredSales(filtered);
    setCurrentPage(1);
  }, [overdueFilter, sales]);

  const generateReport = async () => {
    if (!selectedCustomer) {
      return;
    }

    setLoading(true);

    try {
      // Consultar todas las ventas del cliente
      const { data: salesData, error } = await supabase
        .from('sales')
        .select('*')
        .eq('company_id', companyId)
        .eq('customer_id', selectedCustomer.id)
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error) {
        console.error('Error al consultar ventas:', error);
        toast.error('Error al consultar las ventas. Por favor intenta de nuevo.');
        throw error;
      }

      if (!salesData || salesData.length === 0) {
        toast.info('No se encontraron ventas para este cliente');
        setSales([]);
        setFilteredSales([]);
        setTotal(0);
        setTotalRetention(0);
        setTotalCollected(0);
        setBalance(0);
        setLoading(false);
        return;
      }

      // Procesar ventas y calcular días vencidos
      const processedSales: StatementSale[] = salesData.map((sale: any) => {
        const createdDate = new Date(sale.created_at);
        // Fecha de vencimiento = fecha creación + payment_terms días
        const dueDate = addDays(createdDate, selectedCustomer.payment_terms || 0);
        const overdueDays = differenceInDays(cutoffDate, dueDate);

        const totalAmount = Number(sale.total_amount) || 0;
        const paymentAmountReceived =
          Number(sale.payment_amount_received) ||
          (sale.payment_status === 'completed' ? totalAmount : 0);
        const retencionAmount = Number(sale.retencion_amount) || 0;
        const missingAmount = totalAmount - paymentAmountReceived;

        return {
          id: sale.id,
          sale_number: sale.sale_number,
          created_at: sale.created_at,
          due_date: dueDate,
          overdue_days: overdueDays,
          total_amount: totalAmount,
          payment_amount_received: paymentAmountReceived,
          retencion_amount: retencionAmount,
          payment_status: sale.payment_status,
          status: sale.status,
          document_type: 'Factura', // Por ahora todas son facturas
          missing_amount: missingAmount,
        };
      });

      // Ordenar por días vencidos descendente (más vencidas primero)
      processedSales.sort((a, b) => b.overdue_days - a.overdue_days);

      setSales(processedSales);
      setFilteredSales(processedSales);

      // Calcular totales
      const sumTotal = processedSales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const sumRetention = processedSales.reduce(
        (sum, sale) => sum + sale.retencion_amount,
        0
      );
      const sumCollected = processedSales.reduce(
        (sum, sale) => sum + sale.payment_amount_received,
        0
      );
      const calcBalance = sumTotal - sumRetention - sumCollected;

      setTotal(sumTotal);
      setTotalRetention(sumRetention);
      setTotalCollected(sumCollected);
      setBalance(calcBalance);
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);

      const errorMessage =
        error?.message ||
        error?.details ||
        'Error desconocido al generar el reporte';
      toast.error(`Error al generar el reporte: ${errorMessage}`);

      setSales([]);
      setFilteredSales([]);
      setTotal(0);
      setTotalRetention(0);
      setTotalCollected(0);
      setBalance(0);
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
          Estado de cuenta cliente
        </span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Estado de cuenta cliente
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Revisa el detalle de las ventas asociadas a cada cliente y hazle seguimiento a sus facturas vencidas.
        </p>
      </div>

      {/* Filtros */}
      <Card className="shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg md:text-xl">
            Parámetros del reporte
          </CardTitle>
          <CardDescription className="text-sm">
            Selecciona el cliente y la fecha de corte para generar el reporte
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cliente</Label>
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      'w-full justify-between h-10',
                      !selectedCustomer && 'text-muted-foreground'
                    )}
                    disabled={loadingCustomers}
                  >
                    <span className="truncate">
                      {selectedCustomer
                        ? `${selectedCustomer.business_name} (${selectedCustomer.identification_number})`
                        : 'Buscar cliente...'}
                    </span>
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Buscar cliente..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {filteredCustomersList.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No se encontraron clientes.
                      </div>
                    ) : (
                      <div className="p-1">
                        {filteredCustomersList.map((customer) => (
                          <div
                            key={customer.id}
                            className="px-3 py-2 cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setCustomerSearchQuery('');
                              setCustomerSearchOpen(false);
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.business_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {customer.identification_number}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Fecha de corte</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10',
                      !cutoffDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {cutoffDate
                        ? format(cutoffDate, 'PPP', { locale: es })
                        : 'Selecciona una fecha'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={cutoffDate}
                    onSelect={(date) => date && setCutoffDate(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button
                onClick={generateReport}
                disabled={loading || !selectedCustomer}
                className="w-full h-10"
                size="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  'Generar reporte'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado inicial - Seleccionar cliente */}
      {!selectedCustomer && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Selecciona un cliente para generar el reporte ☝️
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Obtén un reporte completo de los movimientos asociados a cada cliente
            </p>
          </CardContent>
        </Card>
      )}

      {/* Resultados */}
      {selectedCustomer && (
        <>
          {loading && sales.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Generando reporte...</p>
            </div>
          )}

          {/* Filtros rápidos de días vencidos */}
          {sales.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={overdueFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOverdueFilter('all')}
              >
                Todas
              </Button>
              <Button
                variant={overdueFilter === '0-30' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOverdueFilter('0-30')}
              >
                Vencidas 30 días o menos
              </Button>
              <Button
                variant={overdueFilter === '31-60' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOverdueFilter('31-60')}
              >
                Vencidas 31 días a 60 días
              </Button>
              <Button
                variant={overdueFilter === '61-90' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOverdueFilter('61-90')}
              >
                Vencidas 61 días a 90 días
              </Button>
              <Button
                variant={overdueFilter === '91+' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOverdueFilter('91+')}
              >
                Vencidas 91+
              </Button>
              <Button
                variant={overdueFilter === 'not-overdue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOverdueFilter('not-overdue')}
              >
                No vencidas
              </Button>
            </div>
          )}

          {/* Resumen de totales */}
          {sales.length > 0 && (
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-center">
                  <div className="my-1 w-full md:w-1/4 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                    <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                      Total
                    </p>
                    <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                      {formatCurrency(total)}
                    </p>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                      <span className="text-[#47536b] font-medium">-</span>
                    </div>
                  </div>

                  <div className="my-1 w-full md:w-1/4 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                    <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                      Total retenciones
                    </p>
                    <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                      {formatCurrency(totalRetention)}
                    </p>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                      <span className="text-[#47536b] font-medium">-</span>
                    </div>
                  </div>

                  <div className="my-1 w-full md:w-1/4 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                    <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                      Total cobrado
                    </p>
                    <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                      {formatCurrency(totalCollected)}
                    </p>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                      <span className="text-[#47536b] font-medium">=</span>
                    </div>
                  </div>

                  <div className="my-1 w-full md:w-1/4 relative px-4">
                    <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                      Saldo
                    </p>
                    <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                      {formatCurrency(balance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabla de resultados */}
          {sales.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="space-y-1 pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold">Resultados</CardTitle>
                    <CardDescription className="text-sm">
                      {filteredSales.length} de {sales.length} documentos
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
                          Tipo de documento
                        </TableHead>
                        <TableHead className="min-w-[100px] font-semibold">
                          Creación
                        </TableHead>
                        <TableHead className="min-w-[100px] font-semibold">
                          Vencimiento
                        </TableHead>
                        <TableHead className="min-w-[100px] font-semibold text-right">
                          Días vencidos
                        </TableHead>
                        <TableHead className="min-w-[100px] font-semibold">
                          Estado
                        </TableHead>
                        <TableHead className="text-right min-w-[120px] font-semibold">
                          Total
                        </TableHead>
                        <TableHead className="text-right min-w-[120px] font-semibold">
                          Cobrado
                        </TableHead>
                        <TableHead className="text-right min-w-[120px] font-semibold">
                          Pendiente
                        </TableHead>
                        <TableHead className="text-right min-w-[120px] font-semibold">
                          Retenido
                        </TableHead>
                        <TableHead className="min-w-[120px] font-semibold">
                          Acciones
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
                            <Link
                              href={`/dashboard/sales/${sale.id}`}
                              className="text-primary hover:underline"
                              target="_blank"
                            >
                              {sale.document_type}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {format(new Date(sale.created_at), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell>
                            {format(sale.due_date, 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                sale.overdue_days > 0
                                  ? 'text-red-600 font-semibold'
                                  : 'font-medium'
                              }
                            >
                              {sale.overdue_days}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                sale.payment_status === 'completed'
                                  ? 'text-green-600 font-medium'
                                  : 'text-red-600 font-medium'
                              }
                            >
                              {sale.payment_status === 'completed' ? 'Pagado' : 'Pendiente'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">
                              {formatCurrency(sale.total_amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">
                              {formatCurrency(sale.payment_amount_received)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">
                              {formatCurrency(sale.missing_amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">
                              {formatCurrency(sale.retencion_amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/dashboard/sales/${sale.id}`}
                                target="_blank"
                                title="Ver detalle"
                                className="text-muted-foreground hover:text-primary"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              <Link
                                href={`/dashboard/sales/${sale.id}/print`}
                                target="_blank"
                                title="Imprimir"
                                className="text-muted-foreground hover:text-primary"
                              >
                                <Printer className="h-4 w-4" />
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Agregar pago"
                                onClick={() => {
                                  // TODO: Implementar agregar pago
                                  toast.info('Funcionalidad de agregar pago próximamente');
                                }}
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            </div>
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
                            <SelectItem value="30">30</SelectItem>
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
                          <SelectItem value="30">30</SelectItem>
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
          {sales.length === 0 && !loading && selectedCustomer && (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  No hay datos para mostrar
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  No se encontraron ventas para este cliente en el período seleccionado.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

