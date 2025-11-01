'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar as CalendarIcon,
  Loader2,
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

interface TransactionsReportClientProps {
  companyId: string;
  userId: string;
}

interface Transaction {
  id: string;
  reference_number?: string;
  transaction_date: string;
  account_name: string;
  supplier_name?: string;
  detail: string;
  amount: number;
  transaction_type: string;
  related_entity_type?: string;
  related_entity_id?: string;
  description: string;
}

export function TransactionsReportClient({
  companyId,
  userId,
}: TransactionsReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalInflows, setTotalInflows] = useState(0);
  const [totalOutflows, setTotalOutflows] = useState(0);

  // Filtros de fecha
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

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

      // Obtener transacciones con información de cuenta y entidades relacionadas
      let query = supabase
        .from('account_transactions')
        .select(`
          id,
          reference_number,
          transaction_date,
          transaction_type,
          amount,
          description,
          related_entity_type,
          related_entity_id,
          account:accounts!account_transactions_account_id_fkey (
            id,
            account_name,
            account_type
          )
        `)
        .eq('company_id', companyId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10000);

      const { data: transactionsData, error } = await query;

      if (error) {
        console.error('Error al consultar transacciones:', error);
        throw error;
      }

      if (!transactionsData || transactionsData.length === 0) {
        toast.info('No se encontraron transacciones en el período seleccionado');
        setTransactions([]);
        setTotalInflows(0);
        setTotalOutflows(0);
        setLoading(false);
        return;
      }

      // Obtener información de entidades relacionadas (ventas y compras)
      const salesIds: string[] = [];
      const purchaseIds: string[] = [];

      transactionsData.forEach((tx: any) => {
        if (tx.related_entity_type === 'sale' && tx.related_entity_id) {
          salesIds.push(tx.related_entity_id);
        } else if (
          tx.related_entity_type === 'purchase' &&
          tx.related_entity_id
        ) {
          purchaseIds.push(tx.related_entity_id);
        }
      });

      // Obtener ventas relacionadas
      let salesMap = new Map<string, any>();
      if (salesIds.length > 0) {
        const { data: salesData } = await supabase
          .from('sales')
          .select('id, sale_number, customer_id, customers:customers!sales_customer_id_fkey (business_name)')
          .in('id', salesIds)
          .eq('company_id', companyId);

        if (salesData) {
          salesData.forEach((sale: any) => {
            const customer = Array.isArray(sale.customers)
              ? sale.customers[0]
              : sale.customers;
            salesMap.set(sale.id, {
              number: sale.sale_number,
              customer_name: customer?.business_name || 'Consumidor Final',
            });
          });
        }
      }

      // Obtener compras relacionadas
      let purchasesMap = new Map<string, any>();
      if (purchaseIds.length > 0) {
        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('id, purchase_number, supplier_id, suppliers:suppliers!purchases_supplier_id_fkey (name)')
          .in('id', purchaseIds)
          .eq('company_id', companyId);

        if (purchasesData) {
          purchasesData.forEach((purchase: any) => {
            const supplier = Array.isArray(purchase.suppliers)
              ? purchase.suppliers[0]
              : purchase.suppliers;
            purchasesMap.set(purchase.id, {
              number: purchase.purchase_number,
              supplier_name: supplier?.name || '',
            });
          });
        }
      }

      // Procesar transacciones
      const processedTransactions: Transaction[] = [];
      let totalIn = 0;
      let totalOut = 0;

      transactionsData.forEach((tx: any) => {
        const account = Array.isArray(tx.account)
          ? tx.account[0]
          : tx.account;

        const amount = Number(tx.amount) || 0;
        const isInflow =
          tx.transaction_type === 'DEPOSIT' ||
          tx.transaction_type === 'RECEIPT' ||
          tx.transaction_type === 'TRANSFER_IN';
        const isOutflow =
          tx.transaction_type === 'WITHDRAWAL' ||
          tx.transaction_type === 'PAYMENT' ||
          tx.transaction_type === 'TRANSFER_OUT' ||
          tx.transaction_type === 'FEE';

        // Determinar detalle y proveedor
        let detail = tx.description || '';
        let supplierName: string | undefined = undefined;

        if (tx.related_entity_type === 'sale' && tx.related_entity_id) {
          const sale = salesMap.get(tx.related_entity_id);
          if (sale) {
            detail = `Facturas: ${sale.number}`;
          }
        } else if (
          tx.related_entity_type === 'purchase' &&
          tx.related_entity_id
        ) {
          const purchase = purchasesMap.get(tx.related_entity_id);
          if (purchase) {
            detail = `Factura de compra: ${purchase.number}`;
            supplierName = purchase.supplier_name;
          }
        }

        // Si es un ajuste o movimiento de caja, usar la descripción
        if (
          tx.transaction_type === 'ADJUSTMENT' ||
          tx.description?.toLowerCase().includes('caja')
        ) {
          detail = tx.description || '';
        }

        processedTransactions.push({
          id: tx.id,
          reference_number: tx.reference_number || undefined,
          transaction_date: tx.transaction_date,
          account_name: account?.account_name || 'Sin cuenta',
          supplier_name: supplierName,
          detail: detail,
          amount: amount,
          transaction_type: tx.transaction_type,
          related_entity_type: tx.related_entity_type,
          related_entity_id: tx.related_entity_id,
          description: tx.description || '',
        });

        // Calcular totales
        if (isInflow && amount > 0) {
          totalIn += amount;
        } else if (isOutflow && amount < 0) {
          totalOut += Math.abs(amount);
        } else if (isOutflow && amount > 0) {
          totalOut += amount;
        } else if (!isInflow && !isOutflow && amount > 0) {
          // Otros ingresos (INTEREST, REFUND positivo)
          totalIn += amount;
        } else if (amount < 0) {
          totalOut += Math.abs(amount);
        }
      });

      setTransactions(processedTransactions);
      setTotalInflows(totalIn);
      setTotalOutflows(totalOut);
      setCurrentPage(1);
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);

      const errorMessage =
        error?.message ||
        error?.details ||
        'Error desconocido al generar el reporte';
      toast.error(`Error al generar el reporte: ${errorMessage}`);

      setTransactions([]);
      setTotalInflows(0);
      setTotalOutflows(0);
    } finally {
      setLoading(false);
    }
  };

  // Calcular transacciones paginadas
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

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
  const startItem = transactions.length > 0 ? startIndex + 1 : 0;
  const endItem = Math.min(endIndex, transactions.length);

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

  // Determinar si es entrada o salida
  const getInflowAmount = (tx: Transaction): number => {
    const isInflow =
      tx.transaction_type === 'DEPOSIT' ||
      tx.transaction_type === 'RECEIPT' ||
      tx.transaction_type === 'TRANSFER_IN' ||
      (tx.transaction_type === 'INTEREST' && tx.amount > 0) ||
      (tx.transaction_type === 'REFUND' && tx.amount > 0);
    return isInflow && tx.amount > 0 ? tx.amount : 0;
  };

  const getOutflowAmount = (tx: Transaction): number => {
    const isOutflow =
      tx.transaction_type === 'WITHDRAWAL' ||
      tx.transaction_type === 'PAYMENT' ||
      tx.transaction_type === 'TRANSFER_OUT' ||
      tx.transaction_type === 'FEE' ||
      tx.amount < 0;
    return isOutflow ? Math.abs(tx.amount) : 0;
  };

  const getTransactionLink = (tx: Transaction): string => {
    if (tx.related_entity_type === 'sale' && tx.related_entity_id) {
      return `/dashboard/sales/${tx.related_entity_id}`;
    } else if (tx.related_entity_type === 'purchase' && tx.related_entity_id) {
      return `/dashboard/purchases/${tx.related_entity_id}`;
    }
    return '#';
  };

  const getComprobanteNumber = (tx: Transaction): string => {
    if (tx.reference_number) {
      return tx.reference_number;
    }
    if (tx.related_entity_type === 'sale' && tx.related_entity_id) {
      // Intentar extraer número de factura del detalle
      const match = tx.detail.match(/Facturas?: (\d+)/);
      if (match) return match[1];
    }
    // Usar parte del ID como fallback
    return tx.id.substring(0, 8);
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
        <span className="text-foreground font-medium">Transacciones</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Transacciones
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Consulta los movimientos de dinero registrados en tu contabilidad.
        </p>
      </div>

      {/* Filtro de período */}
      <div className="mb-3">
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
      {!loading && transactions.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">
                  Total entradas
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(totalInflows)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">
                  Total salidas
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(totalOutflows)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botón Filtrar (placeholder) */}
      {!loading && transactions.length > 0 && (
        <div className="flex flex-col md:flex-row gap-y-3 md:flex-wrap items-center justify-end min-h-[40px]">
          <Button variant="outline" size="sm" className="w-full md:w-auto">
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
      ) : transactions.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">
                No se encontraron transacciones en el período seleccionado
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-sm mb-5">
            <CardContent className="pt-6 p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Detalle</TableHead>
                      <TableHead className="text-right">Entradas</TableHead>
                      <TableHead className="text-right">Salidas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((tx) => {
                      const comprobanteNumber = getComprobanteNumber(tx);
                      const transactionLink = getTransactionLink(tx);
                      const inflowAmount = getInflowAmount(tx);
                      const outflowAmount = getOutflowAmount(tx);

                      return (
                        <TableRow key={tx.id} className="hover:bg-accent">
                          <TableCell>
                            {transactionLink !== '#' ? (
                              <Link
                                href={transactionLink}
                                className="text-primary hover:underline text-ellipsis overflow-hidden max-w-[120px] whitespace-nowrap block"
                                target="_blank"
                              >
                                {comprobanteNumber}
                              </Link>
                            ) : (
                              <span className="text-ellipsis overflow-hidden max-w-[120px] whitespace-nowrap block">
                                {comprobanteNumber}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(tx.transaction_date), 'dd/MM/yyyy', {
                              locale: es,
                            })}
                          </TableCell>
                          <TableCell>
                            <p className="whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis">
                              {tx.account_name}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis">
                              {tx.supplier_name || ''}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis">
                              {tx.detail}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            {inflowAmount > 0 ? (
                              <span>{formatCurrency(inflowAmount)}</span>
                            ) : (
                              ''
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {outflowAmount > 0 ? (
                              <span>{formatCurrency(outflowAmount)}</span>
                            ) : (
                              ''
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="40">40</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="80">80</SelectItem>
                  </SelectContent>
                </Select>
                <div className="h-4 w-px bg-border" />
                <span className="text-sm text-muted-foreground">
                  {startItem}-{endItem} de {transactions.length}
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

