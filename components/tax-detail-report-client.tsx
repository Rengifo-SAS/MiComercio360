'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, startOfYear, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface TaxDetailReportClientProps {
  companyId: string;
  userId: string;
}

interface TaxTransaction {
  id: string;
  transaction_date: string;
  transaction_type: 'VENTA' | 'COMPRA';
  transaction_number: string;
  entity_name: string;
  entity_id: string;
  subtotal: number;
  tax_amount: number;
  iva_amount: number;
  ica_amount: number;
  total_amount: number;
}

export function TaxDetailReportClient({
  companyId,
  userId,
}: TaxDetailReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<TaxTransaction[]>([]);
  const [totalTaxAmount, setTotalTaxAmount] = useState(0);
  const [totalIvaAmount, setTotalIvaAmount] = useState(0);
  const [totalIcaAmount, setTotalIcaAmount] = useState(0);

  // Filtros
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfYear(new Date()),
    to: new Date(),
  });
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'ALL' | 'VENTA' | 'COMPRA'>('ALL');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      generateReport();
    }
  }, [dateRange, transactionTypeFilter]);

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      return;
    }

    setLoading(true);

    try {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      const allTransactions: TaxTransaction[] = [];

      // Obtener ventas
      if (transactionTypeFilter === 'ALL' || transactionTypeFilter === 'VENTA') {
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select(`
            id,
            sale_number,
            subtotal,
            tax_amount,
            total_amount,
            created_at,
            customer_id,
            customers:customers!sales_customer_id_fkey (
              id,
              business_name
            )
          `)
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false })
          .limit(10000);

        if (salesError) {
          console.error('Error al consultar ventas:', salesError);
          throw salesError;
        }

        if (salesData) {
          salesData.forEach((sale: any) => {
            const customer = Array.isArray(sale.customers)
              ? sale.customers[0]
              : sale.customers;

            // Calcular IVA (asumiendo que tax_amount es principalmente IVA)
            // En un sistema real, estos valores deberían estar en la tabla
            const ivaAmount = Number(sale.tax_amount) || 0;
            const icaAmount = 0; // ICA generalmente se calcula por separado

            allTransactions.push({
              id: sale.id,
              transaction_date: sale.created_at,
              transaction_type: 'VENTA',
              transaction_number: sale.sale_number,
              entity_name: customer?.business_name || 'Consumidor Final',
              entity_id: sale.customer_id || '',
              subtotal: Number(sale.subtotal) || 0,
              tax_amount: Number(sale.tax_amount) || 0,
              iva_amount: ivaAmount,
              ica_amount: icaAmount,
              total_amount: Number(sale.total_amount) || 0,
            });
          });
        }
      }

      // Obtener compras
      if (transactionTypeFilter === 'ALL' || transactionTypeFilter === 'COMPRA') {
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('purchases')
          .select(`
            id,
            purchase_number,
            subtotal,
            tax_amount,
            total_amount,
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

        if (purchasesError) {
          console.error('Error al consultar compras:', purchasesError);
          throw purchasesError;
        }

        if (purchasesData) {
          purchasesData.forEach((purchase: any) => {
            const supplier = Array.isArray(purchase.suppliers)
              ? purchase.suppliers[0]
              : purchase.suppliers;

            const ivaAmount = Number(purchase.tax_amount) || 0;
            const icaAmount = 0;

            allTransactions.push({
              id: purchase.id,
              transaction_date: purchase.created_at,
              transaction_type: 'COMPRA',
              transaction_number: purchase.purchase_number,
              entity_name: supplier?.name || 'Sin proveedor',
              entity_id: purchase.supplier_id || '',
              subtotal: Number(purchase.subtotal) || 0,
              tax_amount: Number(purchase.tax_amount) || 0,
              iva_amount: ivaAmount,
              ica_amount: icaAmount,
              total_amount: Number(purchase.total_amount) || 0,
            });
          });
        }
      }

      // Ordenar por fecha descendente
      allTransactions.sort(
        (a, b) =>
          new Date(b.transaction_date).getTime() -
          new Date(a.transaction_date).getTime()
      );

      setTransactions(allTransactions);

      // Calcular totales
      const totalTax = allTransactions.reduce(
        (sum, tx) => sum + tx.tax_amount,
        0
      );
      const totalIva = allTransactions.reduce(
        (sum, tx) => sum + tx.iva_amount,
        0
      );
      const totalIca = allTransactions.reduce(
        (sum, tx) => sum + tx.ica_amount,
        0
      );

      setTotalTaxAmount(totalTax);
      setTotalIvaAmount(totalIva);
      setTotalIcaAmount(totalIca);
      setCurrentPage(1);
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);
      toast.error(`Error al generar el reporte: ${error?.message || 'Error desconocido'}`);
      setTransactions([]);
      setTotalTaxAmount(0);
      setTotalIvaAmount(0);
      setTotalIcaAmount(0);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y paginar
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

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
  const startItem = transactions.length > 0 ? startIndex + 1 : 0;
  const endItem = Math.min(endIndex, transactions.length);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
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
        <Link href="/dashboard/reports" className="hover:text-foreground transition-colors">
          Reportes
        </Link>
        <span>/</span>
        <Link href="/dashboard/reports/tax" className="hover:text-foreground transition-colors">
          Fiscales
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Reporte detallado de impuestos</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Reporte detallado de impuestos
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Revisa el detalle de tus impuestos generados por cada transacción.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-10 justify-start text-left font-normal',
                !dateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
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

        <Select
          value={transactionTypeFilter}
          onValueChange={(value) => setTransactionTypeFilter(value as 'ALL' | 'VENTA' | 'COMPRA')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="VENTA">Solo ventas</SelectItem>
            <SelectItem value="COMPRA">Solo compras</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Totales */}
      {!loading && transactions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">
                  Total impuestos
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(totalTaxAmount)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">
                  Total IVA
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(totalIvaAmount)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">
                  Total ICA
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(totalIcaAmount)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Generando reporte...</span>
            </div>
          </CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                No se encontraron transacciones en el período seleccionado
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="pt-6 p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente/Proveedor</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">IVA</TableHead>
                      <TableHead className="text-right">ICA</TableHead>
                      <TableHead className="text-right">Total impuestos</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((tx) => (
                      <TableRow key={`${tx.transaction_type}-${tx.id}`}>
                        <TableCell>
                          {format(new Date(tx.transaction_date), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            tx.transaction_type === 'VENTA'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {tx.transaction_type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={
                              tx.transaction_type === 'VENTA'
                                ? `/dashboard/sales/${tx.id}`
                                : `/dashboard/purchases/${tx.id}`
                            }
                            className="text-primary hover:underline"
                          >
                            {tx.transaction_number}
                          </Link>
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]">
                          {tx.entity_name}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(tx.subtotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(tx.iva_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(tx.ica_amount)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(tx.tax_amount)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(tx.total_amount)}
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
                <span className="text-sm text-muted-foreground">Ítems por página:</span>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
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
                <div className="h-4 w-px bg-border" />
                <span className="text-sm text-muted-foreground">
                  {startItem}-{endItem} de {transactions.length}
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
                      className={!hasPreviousPage ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasPreviousPage) setCurrentPage(currentPage - 1);
                      }}
                      className={!hasPreviousPage ? 'pointer-events-none opacity-50' : ''}
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
                      className={!hasNextPage ? 'pointer-events-none opacity-50' : ''}
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
                      className={!hasNextPage ? 'pointer-events-none opacity-50' : ''}
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

