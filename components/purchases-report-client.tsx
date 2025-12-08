'use client';

import { useState, useEffect, useMemo } from 'react';
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

interface PurchasesReportClientProps {
  companyId: string;
  userId: string;
}

interface Purchase {
  id: string;
  purchase_number: string;
  created_at: string;
  supplier_name: string;
  supplier_id: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
}

export function PurchasesReportClient({
  companyId,
  userId,
}: PurchasesReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [searchSupplier, setSearchSupplier] = useState('');
  const [appliedSearchSupplier, setAppliedSearchSupplier] = useState('');

  // Filtros de fecha
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfYear(new Date()),
    to: new Date(),
  });

  // Totales
  const [totalSubtotal, setTotalSubtotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Cargar reporte automáticamente al montar
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      generateReport();
    }
  }, []);

  // Regenerar cuando cambien las fechas
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      generateReport();
    }
  }, [dateRange]);

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      return;
    }

    setLoading(true);

    try {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      // Obtener compras con información de proveedor
      const { data: purchasesData, error } = await supabase
        .from('purchases')
        .select(`
          id,
          purchase_number,
          subtotal,
          tax_amount,
          total_amount,
          status,
          created_at,
          supplier_id,
          suppliers:suppliers!purchases_supplier_id_fkey (
            id,
            name
          )
        `)
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error) {
        console.error('Error al consultar compras:', error);
        throw error;
      }

      if (!purchasesData || purchasesData.length === 0) {
        toast.info('No se encontraron compras en el período seleccionado');
        setPurchases([]);
        setTotalSubtotal(0);
        setTotalAmount(0);
        setLoading(false);
        return;
      }

      // Procesar compras
      const processedPurchases: Purchase[] = purchasesData.map((purchase: any) => {
        const supplier = Array.isArray(purchase.suppliers)
          ? purchase.suppliers[0]
          : purchase.suppliers;

        return {
          id: purchase.id,
          purchase_number: purchase.purchase_number,
          created_at: purchase.created_at,
          supplier_name: supplier?.name || 'Sin proveedor',
          supplier_id: purchase.supplier_id,
          subtotal: Number(purchase.subtotal) || 0,
          tax_amount: Number(purchase.tax_amount) || 0,
          total_amount: Number(purchase.total_amount) || 0,
          status: purchase.status,
        };
      });

      setPurchases(processedPurchases);

      // Calcular totales
      const totalSub = processedPurchases.reduce(
        (sum, purchase) => sum + purchase.subtotal,
        0
      );
      const totalAmt = processedPurchases.reduce(
        (sum, purchase) => sum + purchase.total_amount,
        0
      );

      setTotalSubtotal(totalSub);
      setTotalAmount(totalAmt);
      setCurrentPage(1);
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);

      const errorMessage =
        error?.message ||
        error?.details ||
        'Error desconocido al generar el reporte';
      toast.error(`Error al generar el reporte: ${errorMessage}`);

      setPurchases([]);
      setTotalSubtotal(0);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar compras por búsqueda
  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      const matchesSupplier =
        !appliedSearchSupplier.trim() ||
        purchase.supplier_name
          .toLowerCase()
          .includes(appliedSearchSupplier.toLowerCase());

      return matchesSupplier;
    });
  }, [purchases, appliedSearchSupplier]);

  // Calcular compras paginadas
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPurchases = filteredPurchases.slice(startIndex, endIndex);

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
  const startItem = filteredPurchases.length > 0 ? startIndex + 1 : 0;
  const endItem = Math.min(endIndex, filteredPurchases.length);

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleFilter = () => {
    setAppliedSearchSupplier(searchSupplier);
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
        <span className="text-foreground font-medium">Compras</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Compras
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Consulta el detalle de las facturas de compra que tienes registradas en tu contabilidad.
        </p>
      </div>

      {/* Filtro de período */}
      <div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-8 justify-start text-left font-normal w-full md:w-auto',
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

      {/* Totales */}
      {!loading && purchases.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">
                  Antes de impuestos
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(totalSubtotal)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">
                  Después de impuestos
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Búsqueda y filtros */}
      {!loading && purchases.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Proveedor"
              value={searchSupplier}
              onChange={(e) => setSearchSupplier(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFilter();
                }
              }}
              className="pl-10 h-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleFilter}
            className="w-full md:w-auto"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtrar
          </Button>
        </div>
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
      ) : filteredPurchases.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {purchases.length === 0
                  ? 'No se encontraron compras en el período seleccionado'
                  : '¡No hay registros que cumplan con los filtros especificados!'}
              </p>
              {purchases.length === 0 && (
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/dashboard/purchases/new">
                    Nueva factura de compra
                  </Link>
                </Button>
              )}
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
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Antes de impuestos</TableHead>
                      <TableHead className="text-right">Impuestos</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPurchases.map((purchase) => (
                      <TableRow key={purchase.id} className="hover:bg-accent">
                        <TableCell>
                          <Link
                            href={`/dashboard/purchases/${purchase.id}`}
                            className="text-primary hover:underline font-medium"
                            target="_blank"
                          >
                            {purchase.purchase_number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {format(new Date(purchase.created_at), 'dd/MM/yyyy', {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]">
                          {purchase.supplier_name}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(purchase.subtotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(purchase.tax_amount)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(purchase.total_amount)}
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
                  Ítems por página:
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
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <div className="h-4 w-px bg-border" />
                <span className="text-sm text-muted-foreground">
                  {startItem}-{endItem} de {filteredPurchases.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Página</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value, 10);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="h-8 w-16 text-center"
                />
                <span className="text-sm text-muted-foreground">
                  de {totalPages}
                </span>
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

