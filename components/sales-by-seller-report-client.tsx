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

interface SalesBySellerReportClientProps {
  companyId: string;
  userId: string;
}

interface SellerSalesData {
  seller_id: string;
  seller_name: string;
  total_documents: number;
  total_paid: number;
  amount_before_tax: number;
  amount_after_tax: number;
}

interface Seller {
  id: string;
  full_name: string | null;
  email: string;
}

export function SalesBySellerReportClient({
  companyId,
  userId,
}: SalesBySellerReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [sellers, setSellers] = useState<SellerSalesData[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<SellerSalesData[]>([]);
  const [availableSellers, setAvailableSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fechas por defecto: año actual completo
  const today = new Date();
  const [dateFrom, setDateFrom] = useState<Date>(startOfYear(today));
  const [dateTo, setDateTo] = useState<Date>(today);

  // Totales
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalBeforeTax, setTotalBeforeTax] = useState(0);
  const [totalAfterTax, setTotalAfterTax] = useState(0);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Cargar lista de vendedores
  useEffect(() => {
    const loadSellers = async () => {
      setLoadingSellers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('full_name', { ascending: true });

        if (error) {
          console.error('Error al cargar vendedores:', error);
          toast.error('Error al cargar la lista de vendedores');
          return;
        }

        setAvailableSellers(data || []);
      } catch (error) {
        console.error('Error al cargar vendedores:', error);
        toast.error('Error al cargar la lista de vendedores');
      } finally {
        setLoadingSellers(false);
      }
    };

    loadSellers();
  }, [companyId, supabase]);

  // Generar reporte automáticamente al cambiar fechas o vendedor
  useEffect(() => {
    if (dateFrom && dateTo && availableSellers.length > 0) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, selectedSellerId, availableSellers]);

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
    setSellers([]);
    setFilteredSellers([]);
    setTotalPaid(0);
    setTotalBeforeTax(0);
    setTotalAfterTax(0);

    try {
      const startDate = startOfDay(dateFrom).toISOString();
      const endDate = endOfDay(dateTo).toISOString();

      // Consultar ventas con JOIN a profiles (cashiers)
      let query = supabase
        .from('sales')
        .select(
          `
          id,
          cashier_id,
          subtotal,
          discount_amount,
          tax_amount,
          total_amount,
          payment_status,
          payment_amount_received,
          cashier:profiles!sales_cashier_id_fkey (
            id,
            full_name,
            email
          )
        `
        )
        .eq('company_id', companyId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: false })
        .limit(10000);

      // Filtrar por vendedor si está seleccionado
      if (selectedSellerId && selectedSellerId !== 'all') {
        query = query.eq('cashier_id', selectedSellerId);
      }

      const { data: salesData, error } = await query;

      if (error) {
        console.error('Error al consultar ventas:', error);
        toast.error('Error al consultar las ventas. Por favor intenta de nuevo.');
        throw error;
      }

      if (!salesData || salesData.length === 0) {
        toast.info('No se encontraron ventas en el período seleccionado');
        setSellers([]);
        setFilteredSellers([]);
        setTotalPaid(0);
        setTotalBeforeTax(0);
        setTotalAfterTax(0);
        setLoading(false);
        return;
      }

      // Agrupar por vendedor
      const sellersMap = new Map<string, SellerSalesData>();

      salesData.forEach((sale: any) => {
        if (!sale) return;

        const cashier = Array.isArray(sale.cashier)
          ? sale.cashier[0]
          : sale.cashier;

        if (!cashier || !cashier.id) {
          // Si no hay vendedor asignado, usar "Sin asignar"
          const sellerKey = 'sin-asignar';
          const sellerName = 'Sin asignar';

          if (!sellersMap.has(sellerKey)) {
            sellersMap.set(sellerKey, {
              seller_id: sellerKey,
              seller_name: sellerName,
              total_documents: 0,
              total_paid: 0,
              amount_before_tax: 0,
              amount_after_tax: 0,
            });
          }

          const sellerData = sellersMap.get(sellerKey)!;
          sellerData.total_documents += 1;
          
          const subtotal = Number(sale.subtotal) || 0;
          const discountAmount = Number(sale.discount_amount) || 0;
          const taxAmount = Number(sale.tax_amount) || 0;
          const totalAmount = Number(sale.total_amount) || 0;
          const paymentAmountReceived = Number(sale.payment_amount_received) || totalAmount;

          sellerData.amount_before_tax += subtotal - discountAmount;
          sellerData.amount_after_tax += totalAmount;

          // Total pagado: solo ventas completadas
          if (sale.payment_status === 'completed') {
            sellerData.total_paid += paymentAmountReceived;
          }

          return;
        }

        const sellerKey = cashier.id;
        const sellerName = cashier.full_name || cashier.email || 'Sin nombre';

        if (!sellersMap.has(sellerKey)) {
          sellersMap.set(sellerKey, {
            seller_id: sellerKey,
            seller_name: sellerName,
            total_documents: 0,
            total_paid: 0,
            amount_before_tax: 0,
            amount_after_tax: 0,
          });
        }

        const sellerData = sellersMap.get(sellerKey)!;
        sellerData.total_documents += 1;
        
        const subtotal = Number(sale.subtotal) || 0;
        const discountAmount = Number(sale.discount_amount) || 0;
        const taxAmount = Number(sale.tax_amount) || 0;
        const totalAmount = Number(sale.total_amount) || 0;
        const paymentAmountReceived = Number(sale.payment_amount_received) || totalAmount;

        sellerData.amount_before_tax += subtotal - discountAmount;
        sellerData.amount_after_tax += totalAmount;

        // Total pagado: solo ventas completadas
        if (sale.payment_status === 'completed') {
          sellerData.total_paid += paymentAmountReceived;
        }
      });

      // Convertir a array y ordenar por cantidad de documentos descendente
      const sellersArray = Array.from(sellersMap.values()).sort(
        (a, b) => b.total_documents - a.total_documents
      );

      setSellers(sellersArray);
      setFilteredSellers(sellersArray);
      setCurrentPage(1);

      // Calcular totales
      const sumPaid = sellersArray.reduce((sum, seller) => sum + seller.total_paid, 0);
      const sumBeforeTax = sellersArray.reduce(
        (sum, seller) => sum + seller.amount_before_tax,
        0
      );
      const sumAfterTax = sellersArray.reduce(
        (sum, seller) => sum + seller.amount_after_tax,
        0
      );

      setTotalPaid(sumPaid);
      setTotalBeforeTax(sumBeforeTax);
      setTotalAfterTax(sumAfterTax);

      toast.success(
        `Reporte generado: ${format(dateFrom, 'dd/MMM/yy', {
          locale: es,
        })} - ${format(dateTo, 'dd/MMM/yy', { locale: es })}`
      );
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);

      const errorMessage =
        error?.message ||
        error?.details ||
        'Error desconocido al generar el reporte';
      toast.error(`Error al generar el reporte: ${errorMessage}`);

      // Limpiar estado en caso de error
      setSellers([]);
      setFilteredSellers([]);
      setTotalPaid(0);
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
      setFilteredSellers(sellers);
      return;
    }

    const filtered = sellers.filter((seller) =>
      seller.seller_name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredSellers(filtered);
  };

  // Calcular sellers paginados
  const totalPages = Math.ceil(filteredSellers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSellers = filteredSellers.slice(startIndex, endIndex);

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
  const startItem = filteredSellers.length > 0 ? startIndex + 1 : 0;
  const endItem = Math.min(endIndex, filteredSellers.length);

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
        <span className="text-foreground font-medium">
          Ventas por vendedor
        </span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Ventas por vendedor
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Revisa el resumen de las ventas asociadas a cada vendedor/a.
        </p>
      </div>

      {/* Filtros */}
      <Card className="shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg md:text-xl">
            Parámetros del reporte
          </CardTitle>
          <CardDescription className="text-sm">
            Selecciona el rango de fechas y vendedor para generar el reporte
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

            <div className="space-y-2">
              <Label className="text-sm font-medium">Vendedor</Label>
              <Select
                value={selectedSellerId}
                onValueChange={setSelectedSellerId}
                disabled={loadingSellers}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Todos los vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los vendedores</SelectItem>
                  {availableSellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.full_name || seller.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button
                onClick={generateReport}
                disabled={loading || loadingSellers}
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
      {loading && sellers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Generando reporte...</p>
        </div>
      )}

      {/* Resumen de totales */}
      {sellers.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center">
              <div className="my-1 w-full md:w-1/3 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                  Total pagado
                </p>
                <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                  {formatCurrency(totalPaid)}
                </p>
              </div>

              <div className="my-1 w-full md:w-1/3 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                  Antes de impuestos
                </p>
                <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                  {formatCurrency(totalBeforeTax)}
                </p>
              </div>

              <div className="my-1 w-full md:w-1/3 relative px-4">
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
      {sellers.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold">Resultados</CardTitle>
                <CardDescription className="text-sm">
                  {filteredSellers.length} de {sellers.length} vendedores
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar por nombre de vendedor"
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
                      Vendedor
                    </TableHead>
                    <TableHead className="text-right min-w-[140px] font-semibold">
                      Número de documentos
                    </TableHead>
                    <TableHead className="text-right min-w-[140px] font-semibold">
                      Pagado
                    </TableHead>
                    <TableHead className="text-right min-w-[140px] font-semibold">
                      Antes de impuestos
                    </TableHead>
                    <TableHead className="text-right min-w-[140px] font-semibold">
                      Después de impuestos
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSellers.map((seller) => (
                    <TableRow key={seller.seller_id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <span className="text-primary">
                          {seller.seller_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">
                          {seller.total_documents}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-primary font-medium">
                          {formatCurrency(seller.total_paid)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">
                          {formatCurrency(seller.amount_before_tax)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">
                          {formatCurrency(seller.amount_after_tax)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredSellers.length === 0 && searchQuery && (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No se encontraron vendedores que coincidan con &quot;
                  <span className="font-medium">{searchQuery}</span>&quot;
                </p>
              </div>
            )}

            {/* Paginación */}
            {filteredSellers.length > 0 && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {startItem}-{endItem}{' '}
                    <span className="text-muted-foreground">de {filteredSellers.length}</span>
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
            {filteredSellers.length > 0 && totalPages === 1 && (
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startItem}-{endItem} de {filteredSellers.length}
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
      {sellers.length === 0 && !loading && !isInitialLoad && (
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

