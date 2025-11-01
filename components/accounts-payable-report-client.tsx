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

interface AccountsPayableReportClientProps {
  companyId: string;
  userId: string;
}

interface PayablePurchase {
  id: string;
  purchase_number: string;
  created_at: string;
  due_date: Date;
  overdue_days: number;
  total_amount: number;
  payment_amount_paid: number;
  missing_amount: number;
  supplier_name: string;
  supplier_id: string | null;
  document_type: string;
}

export function AccountsPayableReportClient({
  companyId,
  userId,
}: AccountsPayableReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<PayablePurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<PayablePurchase[]>([]);
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
  const [totalPayable, setTotalPayable] = useState(0);

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
    let filtered = purchases;

    if (overdueFilter === 'all') {
      filtered = purchases;
    } else {
      switch (overdueFilter) {
        case '0-30':
          filtered = purchases.filter(
            (purchase) => purchase.overdue_days > 0 && purchase.overdue_days <= 30
          );
          break;
        case '31-60':
          filtered = purchases.filter(
            (purchase) => purchase.overdue_days >= 31 && purchase.overdue_days <= 60
          );
          break;
        case '61-90':
          filtered = purchases.filter(
            (purchase) => purchase.overdue_days >= 61 && purchase.overdue_days <= 90
          );
          break;
        case '91+':
          filtered = purchases.filter((purchase) => purchase.overdue_days >= 91);
          break;
        case 'not-overdue':
          filtered = purchases.filter((purchase) => purchase.overdue_days <= 0);
          break;
      }
    }

    setFilteredPurchases(filtered);
    setCurrentPage(1);
  }, [overdueFilter, purchases]);

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Por favor selecciona un rango de fechas');
      return;
    }

    setLoading(true);

    try {
      // Obtener todas las compras pendientes dentro del rango de fechas
      // status != 'received' significa que están pendientes de recibir/pagar
      const { data: purchasesData, error } = await supabase
        .from('purchases')
        .select(`
          id,
          purchase_number,
          total_amount,
          created_at,
          status,
          supplier_id,
          suppliers:suppliers!purchases_supplier_id_fkey (
            id,
            name,
            contact_person
          )
        `)
        .eq('company_id', companyId)
        .neq('status', 'received')
        .neq('status', 'cancelled')
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error) {
        console.error('Error al consultar compras:', error);
        toast.error('Error al consultar las compras. Por favor intenta de nuevo.');
        throw error;
      }

      if (!purchasesData || purchasesData.length === 0) {
        toast.info('No se encontraron compras pendientes en el período seleccionado');
        setPurchases([]);
        setFilteredPurchases([]);
        setTotalPayable(0);
        setLoading(false);
        return;
      }

      // Procesar compras y calcular días vencidos
      const today = new Date();
      const DEFAULT_PAYMENT_TERMS = 30; // Días por defecto si no hay payment_terms en supplier

      const processedPurchases: PayablePurchase[] = purchasesData.map((purchase: any) => {
        const supplier = Array.isArray(purchase.suppliers)
          ? purchase.suppliers[0]
          : purchase.suppliers;

        const createdDate = new Date(purchase.created_at);
        // Usar 30 días por defecto ya que suppliers no tiene payment_terms
        const paymentTerms = DEFAULT_PAYMENT_TERMS;
        const dueDate = addDays(createdDate, paymentTerms);
        const overdueDays = differenceInDays(today, dueDate);

        const totalAmount = Number(purchase.total_amount) || 0;
        // Si status = 'received', significa que ya fue pagada completamente
        // Si status = 'pending', significa que aún no está pagada
        const paymentAmountPaid = purchase.status === 'received' ? totalAmount : 0;
        const missingAmount = totalAmount - paymentAmountPaid;

        return {
          id: purchase.id,
          purchase_number: purchase.purchase_number,
          created_at: purchase.created_at,
          due_date: dueDate,
          overdue_days: overdueDays,
          total_amount: totalAmount,
          payment_amount_paid: paymentAmountPaid,
          missing_amount: missingAmount,
          supplier_name: supplier?.name || 'Sin proveedor',
          supplier_id: purchase.supplier_id,
          document_type: 'Factura de compra',
        };
      });

      // Ordenar por días vencidos descendente (más vencidas primero)
      processedPurchases.sort((a, b) => b.overdue_days - a.overdue_days);

      setPurchases(processedPurchases);
      setFilteredPurchases(processedPurchases);

      // Calcular total por pagar (solo el monto faltante)
      const total = processedPurchases.reduce(
        (sum, purchase) => sum + purchase.missing_amount,
        0
      );
      setTotalPayable(total);
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);

      const errorMessage =
        error?.message ||
        error?.details ||
        'Error desconocido al generar el reporte';
      toast.error(`Error al generar el reporte: ${errorMessage}`);

      setPurchases([]);
      setFilteredPurchases([]);
      setTotalPayable(0);
    } finally {
      setLoading(false);
    }
  };

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
          Cuentas por pagar
        </span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Cuentas por pagar
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Conoce las deudas que tienes registradas y lleva un control de tus pagos pendientes.
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
      {purchases.length > 0 && (
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
      {purchases.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">
                  Total por pagar
                </p>
                <p className="text-lg font-semibold text-orange-600">
                  {formatCurrency(totalPayable)}
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
      ) : filteredPurchases.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">
                {purchases.length === 0
                  ? '¡No tienes facturas pendientes por pagar!'
                  : 'No hay compras que coincidan con los filtros seleccionados'}
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
                      <TableHead className="w-[15%]">Tipo de documento</TableHead>
                      <TableHead className="w-[10%]">Número</TableHead>
                      <TableHead className="w-[20%]">Proveedor</TableHead>
                      <TableHead className="w-[11%]">Creación</TableHead>
                      <TableHead className="w-[11%]">Vencimiento</TableHead>
                      <TableHead className="w-[16%] text-right">Total</TableHead>
                      <TableHead className="w-[16%] text-right">Pagado</TableHead>
                      <TableHead className="w-[16%] text-right">Por pagar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="truncate max-w-[150px]">
                          {purchase.document_type}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/purchases/${purchase.id}`}
                            className="text-primary hover:underline font-medium"
                            target="_blank"
                          >
                            {purchase.purchase_number}
                          </Link>
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]">
                          {purchase.supplier_name}
                        </TableCell>
                        <TableCell>
                          {format(new Date(purchase.created_at), 'dd/MM/yyyy', {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              purchase.overdue_days > 0 ? 'text-red-600 font-medium' : ''
                            }
                          >
                            {format(purchase.due_date, 'dd/MM/yyyy', { locale: es })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(purchase.total_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(purchase.payment_amount_paid)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(purchase.missing_amount)}
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
                  Mostrando {startItem}-{endItem} de {filteredPurchases.length}
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

