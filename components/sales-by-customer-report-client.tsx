'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, startOfYear, startOfDay, endOfDay } from 'date-fns';
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

interface SalesByCustomerReportClientProps {
  companyId: string;
  userId: string;
}

interface CustomerSalesData {
  customer_id: string;
  customer_name: string;
  customer_identification: string;
  total_documents: number;
  amount_before_tax: number;
  amount_after_tax: number;
}

export function SalesByCustomerReportClient({
  companyId,
  userId,
}: SalesByCustomerReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerSalesData[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerSalesData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fechas por defecto: año actual completo
  const today = new Date();
  const [dateFrom, setDateFrom] = useState<Date>(startOfYear(today));
  const [dateTo, setDateTo] = useState<Date>(today);

  // Totales
  const [totalBeforeTax, setTotalBeforeTax] = useState(0);
  const [totalAfterTax, setTotalAfterTax] = useState(0);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Generar reporte automáticamente al cambiar fechas
  useEffect(() => {
    if (dateFrom && dateTo) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const generateReport = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Por favor selecciona ambas fechas');
      return;
    }

    if (dateFrom > dateTo) {
      toast.error('La fecha inicial no puede ser mayor a la fecha final');
      return;
    }

    setLoading(true);
    setCustomers([]);
    setFilteredCustomers([]);
    setTotalBeforeTax(0);
    setTotalAfterTax(0);

    try {
      const startDate = startOfDay(dateFrom).toISOString();
      const endDate = endOfDay(dateTo).toISOString();

      // Consultar ventas con JOIN de clientes
      const { data: salesData, error } = await supabase
        .from('sales')
        .select(
          `
          id,
          created_at,
          subtotal,
          tax_amount,
          discount_amount,
          total_amount,
          status,
          customer_id,
          customers (
            id,
            business_name,
            identification_number
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
        toast.info('No se encontraron ventas en el período seleccionado');
        setCustomers([]);
        setFilteredCustomers([]);
        setTotalBeforeTax(0);
        setTotalAfterTax(0);
        setLoading(false);
        return;
      }

      // Agrupar por cliente
      const customersMap = new Map<string, CustomerSalesData>();

      salesData.forEach((sale: any) => {
        if (!sale) return;

        // Obtener datos del cliente
        let customer = null;
        if (sale.customers) {
          customer = Array.isArray(sale.customers)
            ? sale.customers[0]
            : sale.customers;
        }

        const customerId = sale.customer_id || 'consumidor-final';
        const customerName = customer?.business_name || 'Consumidor Final';
        const customerIdentification = customer?.identification_number || 'N/A';

        if (!customersMap.has(customerId)) {
          customersMap.set(customerId, {
            customer_id: customerId,
            customer_name: customerName,
            customer_identification: customerIdentification,
            total_documents: 0,
            amount_before_tax: 0,
            amount_after_tax: 0,
          });
        }

        const customerData = customersMap.get(customerId)!;
        customerData.total_documents += 1;

        // Calcular montos
        const subtotal = Number(sale.subtotal) || 0;
        const discount = Number(sale.discount_amount) || 0;
        const beforeTax = subtotal - discount;
        const afterTax = Number(sale.total_amount) || 0;

        customerData.amount_before_tax += beforeTax;
        customerData.amount_after_tax += afterTax;
      });

      const customersArray = Array.from(customersMap.values()).sort((a, b) =>
        a.customer_name.localeCompare(b.customer_name)
      );

      setCustomers(customersArray);
      setFilteredCustomers(customersArray);
      setCurrentPage(1);

      // Calcular totales
      const sumBeforeTax = customersArray.reduce(
        (sum, customer) => sum + customer.amount_before_tax,
        0
      );
      const sumAfterTax = customersArray.reduce(
        (sum, customer) => sum + customer.amount_after_tax,
        0
      );

      setTotalBeforeTax(sumBeforeTax);
      setTotalAfterTax(sumAfterTax);

      toast.success(
        `Reporte generado: ${format(dateFrom, 'dd/MMM/yy', {
          locale: es,
        })} - ${format(dateTo, 'dd/MMM/yy', { locale: es })}`
      );
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);

      const errorMessage = error?.message || error?.details || 'Error desconocido al generar el reporte';
      toast.error(`Error al generar el reporte: ${errorMessage}`);

      // Limpiar estado en caso de error
      setCustomers([]);
      setFilteredCustomers([]);
      setTotalBeforeTax(0);
      setTotalAfterTax(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Resetear a la primera página cuando se busca

    if (!query.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(
      (customer) =>
        customer.customer_name.toLowerCase().includes(query.toLowerCase()) ||
        customer.customer_identification.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredCustomers(filtered);
  };

  // Calcular items paginados
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

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
  const startItem = filteredCustomers.length > 0 ? startIndex + 1 : 0;
  const endItem = Math.min(endIndex, filteredCustomers.length);

  // Resetear página cuando cambia itemsPerPage
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
        <span className="text-foreground font-medium">Ventas por clientes</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Ventas por clientes
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Conoce las ventas asociadas a cada uno de tus clientes.
        </p>
      </div>

      {/* Filtros */}
      <Card className="shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg md:text-xl">
            Parámetros del reporte
          </CardTitle>
          <CardDescription className="text-sm">
            Selecciona el rango de fechas para generar el reporte
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fecha inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10',
                      !dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {dateFrom
                        ? format(dateFrom, 'PPP', { locale: es })
                        : 'Selecciona una fecha'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => date && setDateFrom(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Fecha final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10',
                      !dateTo && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {dateTo
                        ? format(dateTo, 'PPP', { locale: es })
                        : 'Selecciona una fecha'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => date && setDateTo(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button
                onClick={generateReport}
                disabled={loading}
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

      {/* Resultados */}
      {loading && customers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Generando reporte...</p>
        </div>
      )}

      {/* Resumen de totales */}
      {customers.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center">
              <div className="my-1 w-full md:w-1/2 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                  Antes de impuestos
                </p>
                <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                  {formatCurrency(totalBeforeTax)}
                </p>
              </div>

              <div className="my-1 w-full md:w-1/2 relative px-4">
                <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                  Después de impuestos
                </p>
                <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                  {formatCurrency(totalAfterTax)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de resultados */}
      {customers.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold">Resultados</CardTitle>
                <CardDescription className="text-sm">
                  {filteredCustomers.length} de {customers.length} clientes
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar por nombre o identificación"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
                <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[200px] font-semibold">
                      Cliente
                    </TableHead>
                    <TableHead className="text-right min-w-[140px] font-semibold">
                      Número de documentos
                    </TableHead>
                    <TableHead className="text-right min-w-[160px] font-semibold">
                      Antes de impuestos
                    </TableHead>
                    <TableHead className="text-right min-w-[160px] font-semibold">
                      Después de impuestos
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.map((customer) => (
                    <TableRow key={customer.customer_id} className="hover:bg-muted/50">
                      <TableCell className="font-medium max-w-[200px]">
                        <span className="text-primary truncate block">
                          {customer.customer_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">
                          {customer.total_documents.toLocaleString('es-CO')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-primary font-medium">
                          {formatCurrency(customer.amount_before_tax)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-primary font-semibold">
                          {formatCurrency(customer.amount_after_tax)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredCustomers.length === 0 && searchQuery && (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No se encontraron clientes que coincidan con &quot;
                  <span className="font-medium">{searchQuery}</span>&quot;
                </p>
              </div>
            )}

            {/* Paginación */}
            {filteredCustomers.length > 0 && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {startItem}-{endItem}{' '}
                    <span className="text-muted-foreground">de {filteredCustomers.length}</span>
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
            {filteredCustomers.length > 0 && totalPages === 1 && (
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startItem}-{endItem} de {filteredCustomers.length}
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
      {customers.length === 0 && !loading && !isInitialLoad && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              No hay datos para mostrar
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No se encontraron ventas en el período seleccionado. Intenta con otro rango de fechas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
