'use client';

import { useState, useEffect } from 'react';
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

interface TaxWithholdingsReportClientProps {
  companyId: string;
  userId: string;
}

interface TaxWithholding {
  id: string;
  transaction_date: string;
  transaction_type: 'VENTA' | 'COMPRA';
  transaction_number: string;
  entity_name: string;
  entity_id: string;
  identification_number: string;
  subtotal: number;
  iva_amount: number;
  iva_withholding: number;
  ica_amount: number;
  ica_withholding: number;
  fuente_withholding: number;
  total_withholding: number;
}

export function TaxWithholdingsReportClient({
  companyId,
  userId,
}: TaxWithholdingsReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [withholdings, setWithholdings] = useState<TaxWithholding[]>([]);
  const [totalIvaWithholding, setTotalIvaWithholding] = useState(0);
  const [totalIcaWithholding, setTotalIcaWithholding] = useState(0);
  const [totalFuenteWithholding, setTotalFuenteWithholding] = useState(0);
  const [totalWithholding, setTotalWithholding] = useState(0);

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfYear(new Date()),
    to: new Date(),
  });
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'ALL' | 'VENTA' | 'COMPRA'>('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      generateReport();
    }
  }, [dateRange, transactionTypeFilter]);

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();
      const allWithholdings: TaxWithholding[] = [];

      // Obtener ventas con retenciones
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
              business_name,
              identification_number,
              tax_responsibility
            )
          `)
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false })
          .limit(10000);

        if (salesData && !salesError) {
          salesData.forEach((sale: any) => {
            const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
            
            // Calcular retenciones según responsabilidad tributaria del cliente
            const taxResp = customer?.tax_responsibility || '';
            const isRetentionAgent = taxResp.includes('AGENTE_RETENCION') || taxResp.includes('AUTORRETENEDOR');
            
            const subtotal = Number(sale.subtotal) || 0;
            const ivaAmount = Number(sale.tax_amount) || 0;
            
            // Cálculos simplificados de retenciones (en producción, estos deberían venir de la configuración)
            const ivaWithholding = isRetentionAgent && subtotal > 0 ? subtotal * 0.03 : 0; // 3% IVA
            const icaWithholding = isRetentionAgent && subtotal > 0 ? subtotal * 0.01 : 0; // 1% ICA
            const fuenteWithholding = isRetentionAgent && subtotal > 0 ? subtotal * 0.035 : 0; // 3.5% Fuente
            
            allWithholdings.push({
              id: sale.id,
              transaction_date: sale.created_at,
              transaction_type: 'VENTA',
              transaction_number: sale.sale_number,
              entity_name: customer?.business_name || 'Consumidor Final',
              entity_id: sale.customer_id || '',
              identification_number: customer?.identification_number || '',
              subtotal: subtotal,
              iva_amount: ivaAmount,
              iva_withholding: ivaWithholding,
              ica_amount: 0,
              ica_withholding: icaWithholding,
              fuente_withholding: fuenteWithholding,
              total_withholding: ivaWithholding + icaWithholding + fuenteWithholding,
            });
          });
        }
      }

      // Obtener compras con retenciones
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
              name,
              identification_number
            )
          `)
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false })
          .limit(10000);

        if (purchasesData && !purchasesError) {
          purchasesData.forEach((purchase: any) => {
            const supplier = Array.isArray(purchase.suppliers) ? purchase.suppliers[0] : purchase.suppliers;
            
            const subtotal = Number(purchase.subtotal) || 0;
            const ivaAmount = Number(purchase.tax_amount) || 0;
            
            // Para compras, generalmente aplicamos retenciones
            const ivaWithholding = subtotal > 0 ? subtotal * 0.03 : 0;
            const icaWithholding = subtotal > 0 ? subtotal * 0.01 : 0;
            const fuenteWithholding = subtotal > 0 ? subtotal * 0.035 : 0;
            
            allWithholdings.push({
              id: purchase.id,
              transaction_date: purchase.created_at,
              transaction_type: 'COMPRA',
              transaction_number: purchase.purchase_number,
              entity_name: supplier?.name || 'Sin proveedor',
              entity_id: purchase.supplier_id || '',
              identification_number: supplier?.identification_number || '',
              subtotal: subtotal,
              iva_amount: ivaAmount,
              iva_withholding: ivaWithholding,
              ica_amount: 0,
              ica_withholding: icaWithholding,
              fuente_withholding: fuenteWithholding,
              total_withholding: ivaWithholding + icaWithholding + fuenteWithholding,
            });
          });
        }
      }

      allWithholdings.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

      setWithholdings(allWithholdings);

      const totalIva = allWithholdings.reduce((sum, w) => sum + w.iva_withholding, 0);
      const totalIca = allWithholdings.reduce((sum, w) => sum + w.ica_withholding, 0);
      const totalFuente = allWithholdings.reduce((sum, w) => sum + w.fuente_withholding, 0);
      const total = allWithholdings.reduce((sum, w) => sum + w.total_withholding, 0);

      setTotalIvaWithholding(totalIva);
      setTotalIcaWithholding(totalIca);
      setTotalFuenteWithholding(totalFuente);
      setTotalWithholding(total);
      setCurrentPage(1);
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);
      toast.error(`Error al generar el reporte: ${error?.message || 'Error desconocido'}`);
      setWithholdings([]);
      setTotalIvaWithholding(0);
      setTotalIcaWithholding(0);
      setTotalFuenteWithholding(0);
      setTotalWithholding(0);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(withholdings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWithholdings = withholdings.slice(startIndex, endIndex);

  const getVisiblePages = () => {
    const delta = 2;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];
    if (totalPages <= 1) return [1];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
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
  const startItem = withholdings.length > 0 ? startIndex + 1 : 0;
  const endItem = Math.min(endIndex, withholdings.length);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/reports" className="hover:text-foreground transition-colors">
          Reportes
        </Link>
        <span>/</span>
        <Link href="/dashboard/reports/tax" className="hover:text-foreground transition-colors">
          Fiscales
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Impuestos y retenciones</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Impuestos y retenciones
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Revisa los impuestos y retenciones asociados a tus ventas y compras.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('h-10 justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (dateRange.to ? (
                <>
                  {format(dateRange.from, 'dd/MM/yyyy', { locale: es })} -{' '}
                  {format(dateRange.to, 'dd/MM/yyyy', { locale: es })}
                </>
              ) : (
                format(dateRange.from, 'dd/MM/yyyy', { locale: es })
              )) : (
                'Selecciona un rango'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })} numberOfMonths={2} locale={es} />
          </PopoverContent>
        </Popover>

        <Select value={transactionTypeFilter} onValueChange={(value) => setTransactionTypeFilter(value as 'ALL' | 'VENTA' | 'COMPRA')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="VENTA">Solo ventas</SelectItem>
            <SelectItem value="COMPRA">Solo compras</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="ml-auto">
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {!loading && withholdings.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">Retención IVA</p>
                <p className="text-lg font-semibold">{formatCurrency(totalIvaWithholding)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">Retención ICA</p>
                <p className="text-lg font-semibold">{formatCurrency(totalIcaWithholding)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">Retención Fuente</p>
                <p className="text-lg font-semibold">{formatCurrency(totalFuenteWithholding)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">Total retenciones</p>
                <p className="text-lg font-semibold">{formatCurrency(totalWithholding)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Generando reporte...</span>
            </div>
          </CardContent>
        </Card>
      ) : withholdings.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No se encontraron retenciones en el período seleccionado</p>
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
                      <TableHead>NIT/CC</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Ret. IVA</TableHead>
                      <TableHead className="text-right">Ret. ICA</TableHead>
                      <TableHead className="text-right">Ret. Fuente</TableHead>
                      <TableHead className="text-right">Total retención</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedWithholdings.map((w) => (
                      <TableRow key={`${w.transaction_type}-${w.id}`}>
                        <TableCell>{format(new Date(w.transaction_date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${w.transaction_type === 'VENTA' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {w.transaction_type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={w.transaction_type === 'VENTA' ? `/dashboard/sales/${w.id}` : `/dashboard/purchases/${w.id}`}
                            className="text-primary hover:underline"
                          >
                            {w.transaction_number}
                          </Link>
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]">{w.entity_name}</TableCell>
                        <TableCell>{w.identification_number || 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(w.subtotal)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(w.iva_withholding)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(w.ica_withholding)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(w.fuente_withholding)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(w.total_withholding)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ítems por página:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(parseInt(value, 10)); setCurrentPage(1); }}>
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
                <span className="text-sm text-muted-foreground">{startItem}-{endItem} de {withholdings.length}</span>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (hasPreviousPage) setCurrentPage(1); }} className={!hasPreviousPage ? 'pointer-events-none opacity-50' : ''} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" onClick={(e) => { e.preventDefault(); if (hasPreviousPage) setCurrentPage(currentPage - 1); }} className={!hasPreviousPage ? 'pointer-events-none opacity-50' : ''}>Anterior</PaginationLink>
                  </PaginationItem>
                  {visiblePages.map((page, index) => (
                    <PaginationItem key={index}>
                      {page === '...' ? <PaginationEllipsis /> : (
                        <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page as number); }} isActive={currentPage === page}>{page}</PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationLink href="#" onClick={(e) => { e.preventDefault(); if (hasNextPage) setCurrentPage(currentPage + 1); }} className={!hasNextPage ? 'pointer-events-none opacity-50' : ''}>Siguiente</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (hasNextPage) setCurrentPage(totalPages); }} className={!hasNextPage ? 'pointer-events-none opacity-50' : ''} />
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

