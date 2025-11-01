'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar as CalendarIcon,
  Loader2,
  Download,
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface JournalReportClientProps {
  companyId: string;
  userId: string;
}

interface JournalEntryLine {
  id: string;
  entry_number: string;
  entry_date: string;
  transaction_date: string;
  transaction_type: string;
  account_code?: string;
  account_name: string;
  cost_center?: string;
  debit: number;
  credit: number;
  third_party_name?: string;
  third_party_id?: string;
  third_party_type?: string;
  status: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

interface GroupedJournalEntry {
  entry_number: string;
  entry_date: string;
  status: string;
  lines: JournalEntryLine[];
}

export function JournalReportClient({ companyId, userId }: JournalReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>('all');
  const [groupedEntries, setGroupedEntries] = useState<GroupedJournalEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pageInput, setPageInput] = useState('1');

  // Load report automatically on mount
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      generateReport();
    }
  }, [dateRange]);

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Por favor selecciona el período');
      return;
    }

    setLoading(true);
    try {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      // Build query for account_transactions
      let query = supabase
        .from('account_transactions')
        .select(
          `
          id,
          transaction_date,
          transaction_type,
          amount,
          reference_number,
          description,
          related_entity_type,
          related_entity_id,
          account:accounts!account_transactions_account_id_fkey (
            id,
            account_name
          )
        `
        )
        .eq('company_id', companyId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false })
        .order('reference_number', { ascending: true })
        .limit(10000);

      const { data: transactionsData, error: transactionsError } = await query;

      if (transactionsError) throw transactionsError;

      // Get related customers and suppliers
      const customerIds: string[] = [];
      const supplierIds: string[] = [];

      (transactionsData || []).forEach((tx: any) => {
        try {
          if (tx?.related_entity_type === 'sale' && tx?.related_entity_id) {
            customerIds.push(tx.related_entity_id);
          } else if (tx?.related_entity_type === 'purchase' && tx?.related_entity_id) {
            supplierIds.push(tx.related_entity_id);
          }
        } catch (e) {
          console.warn('Error al procesar transacción:', e, tx);
        }
      });

      let customersMap = new Map<string, any>();
      let suppliersMap = new Map<string, any>();

      // Helper function to batch queries into chunks
      const batchQuery = async <T,>(
        table: string,
        select: string,
        ids: string[],
        companyId: string,
        idField: string = 'id'
      ): Promise<T[]> => {
        const uniqueIds = [...new Set(ids)];
        const BATCH_SIZE = 100; // Process 100 IDs at a time to avoid URL length limits
        const results: T[] = [];

        for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
          const batch = uniqueIds.slice(i, i + BATCH_SIZE);
          const { data, error } = await supabase
            .from(table)
            .select(select)
            .in(idField, batch)
            .eq('company_id', companyId);

          if (error) {
            throw error;
          }

          if (data) {
            results.push(...(data as T[]));
          }
        }

        return results;
      };

      if (customerIds.length > 0) {
        try {
          const salesData = await batchQuery<any>(
            'sales',
            'id, customer_id, customers:customers!sales_customer_id_fkey (business_name, identification_number, identification_type)',
            customerIds,
            companyId
          );

          salesData.forEach((sale: any) => {
            const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
            const idType = customer?.identification_type === 'NIT' ? 'NIT' : customer?.identification_type === 'CC' ? 'Cédula de ciudadanía' : 'Cédula de ciudadanía';
            const idNumber = customer?.identification_number || '222222222222';
            customersMap.set(sale.id, {
              name: customer?.business_name || 'Consumidor Final',
              id_type: idType,
              id_number: idNumber,
              full_name: `${customer?.business_name || 'Consumidor Final'} ( ${idType}. ${idNumber} )`,
            });
          });
        } catch (salesError: any) {
          console.error('Error al consultar ventas:', salesError);
          throw salesError;
        }
      }

      if (supplierIds.length > 0) {
        try {
          const purchasesData = await batchQuery<any>(
            'purchases',
            'id, supplier_id, suppliers:suppliers!purchases_supplier_id_fkey (name, identification_number, identification_type)',
            supplierIds,
            companyId
          );

          purchasesData.forEach((purchase: any) => {
            const supplier = Array.isArray(purchase.suppliers) ? purchase.suppliers[0] : purchase.suppliers;
            const idType = supplier?.identification_type === 'NIT' ? 'NIT' : supplier?.identification_type === 'CC' ? 'Cédula de ciudadanía' : 'Cédula de ciudadanía';
            const idNumber = supplier?.identification_number || '';
            suppliersMap.set(purchase.id, {
              name: supplier?.name || '',
              id_type: idType,
              id_number: idNumber,
              full_name: `${supplier?.name || ''} ( ${idType}. ${idNumber} )`,
            });
          });
        } catch (purchasesError: any) {
          console.error('Error al consultar compras:', purchasesError);
          throw purchasesError;
        }
      }

      // Group transactions by reference_number (journal entry number)
      const entriesMap = new Map<string, JournalEntryLine[]>();

      (transactionsData || []).forEach((tx: any) => {
        try {
          if (!tx || !tx.id) {
            console.warn('Transacción inválida:', tx);
            return;
          }

          const account = Array.isArray(tx.account) ? tx.account[0] : tx.account;
          const amount = Number(tx.amount) || 0;
          const debit = amount > 0 ? amount : 0;
          const credit = amount < 0 ? Math.abs(amount) : 0;
          
          const entryNumber = tx.reference_number || `ENTRY-${tx.id?.substring?.(0, 8) || 'UNKNOWN'}`;
          
          let thirdPartyName = '';
          let thirdPartyId = '';
          let thirdPartyType = '';
          
          if (tx.related_entity_type === 'sale' && tx.related_entity_id) {
            const customer = customersMap.get(tx.related_entity_id);
            thirdPartyName = customer?.full_name || 'Consumidor Final ( Cédula de ciudadanía. 222222222222 )';
            thirdPartyType = 'customer';
          } else if (tx.related_entity_type === 'purchase' && tx.related_entity_id) {
            const supplier = suppliersMap.get(tx.related_entity_id);
            thirdPartyName = supplier?.full_name || '';
            thirdPartyType = 'supplier';
          }

          const line: JournalEntryLine = {
            id: tx.id,
            entry_number: entryNumber,
            entry_date: tx.transaction_date || new Date().toISOString(),
            transaction_date: tx.transaction_date || new Date().toISOString(),
            transaction_type: tx.transaction_type || 'OTHER',
            account_code: '', // account_code no existe en accounts, se puede derivar del account_name si es necesario
            account_name: account?.account_name || 'Sin cuenta',
            cost_center: '', // TODO: Add cost_center_id to account_transactions table
            debit,
            credit,
            third_party_name: thirdPartyName,
            third_party_id: thirdPartyId,
            third_party_type: thirdPartyType,
            status: 'PROCESSED',
            related_entity_type: tx.related_entity_type,
            related_entity_id: tx.related_entity_id,
          };

          if (!entriesMap.has(entryNumber)) {
            entriesMap.set(entryNumber, []);
          }
          entriesMap.get(entryNumber)!.push(line);
        } catch (e) {
          console.error('Error al procesar transacción:', e, tx);
          // Continuar con las demás transacciones
        }
      });

      // Convert to grouped entries array
      const grouped: GroupedJournalEntry[] = [];
      for (const [entryNumber, lines] of entriesMap.entries()) {
        try {
          if (!lines || lines.length === 0) {
            continue;
          }
          grouped.push({
            entry_number: entryNumber,
            entry_date: lines[0]?.entry_date || new Date().toISOString(),
            status: 'PROCESSED',
            lines: lines.sort((a, b) => {
              // Sort by debit first, then credit
              if (a.debit > 0 && b.credit > 0) return -1;
              if (a.credit > 0 && b.debit > 0) return 1;
              return 0;
            }),
          });
        } catch (e) {
          console.warn('Error al crear entrada agrupada:', e, entryNumber, lines);
          // Continuar con la siguiente entrada
        }
      }

      // Sort by date descending, then by entry number
      grouped.sort((a, b) => {
        try {
          const dateA = a.entry_date ? new Date(a.entry_date) : new Date(0);
          const dateB = b.entry_date ? new Date(b.entry_date) : new Date(0);
          if (dateB.getTime() !== dateA.getTime()) {
            return dateB.getTime() - dateA.getTime();
          }
          return (a.entry_number || '').localeCompare(b.entry_number || '');
        } catch (e) {
          console.warn('Error al ordenar entrada:', e, a, b);
          return 0;
        }
      });

      setGroupedEntries(grouped);
      setCurrentPage(1);
      setPageInput('1');
      setSelectedEntries(new Set());
    } catch (error: any) {
      console.error('Error al generar reporte:', error);
      console.error('Stack trace:', error?.stack);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Mejorar el manejo de errores para mostrar información más útil
      let errorMessage = 'Error desconocido al generar el reporte';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      } else if (error?.code) {
        errorMessage = `Error ${error.code}`;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Intentar extraer mensaje del objeto de error
        try {
          const errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error));
          if (errorStr && errorStr !== '{}' && errorStr !== 'null') {
            errorMessage = errorStr.length > 200 ? errorStr.substring(0, 200) + '...' : errorStr;
          }
        } catch (e) {
          errorMessage = `Error de tipo: ${typeof error}`;
        }
      }
      
      toast.error(`Error al generar el reporte: ${errorMessage}`);
      setGroupedEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter by entry type
  const filteredEntries = useMemo(() => {
    if (entryTypeFilter === 'all') return groupedEntries;
    
    return groupedEntries.filter((entry) =>
      entry.lines.some((line) => line.transaction_type === entryTypeFilter)
    );
  }, [groupedEntries, entryTypeFilter]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput(page.toString());
    }
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const toggleSelectEntry = (entryNumber: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryNumber)) {
      newSelected.delete(entryNumber);
    } else {
      newSelected.add(entryNumber);
    }
    setSelectedEntries(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEntries.size === paginatedEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(paginatedEntries.map((e) => e.entry_number)));
    }
  };

  const getEntryUrl = (line: JournalEntryLine) => {
    if (line.related_entity_type === 'sale' && line.related_entity_id) {
      return `/dashboard/sales/${line.related_entity_id}`;
    } else if (line.related_entity_type === 'purchase' && line.related_entity_id) {
      return `/dashboard/purchases/${line.related_entity_id}`;
    }
    return '#';
  };

  const totalItems = filteredEntries.reduce((sum, entry) => sum + entry.lines.length, 0);

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/reports" className="hover:text-foreground transition-colors">
          Reportes
        </Link>
        <span>/</span>
        <Link href="/dashboard/reports/accounting" className="hover:text-foreground transition-colors">
          Contables
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Libro diario</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">Libro diario</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Consulta, descarga e imprime el movimiento contable con el detalle de tus transacciones registradas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="default" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Ayuda
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default" className="gap-2">
                <Download className="h-4 w-4" />
                Descargar
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.info('Funcionalidad de exportación próximamente')}>
                Exportar a Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Funcionalidad de exportación próximamente')}>
                Exportar a PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Periodo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: es })}
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
                  <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })} numberOfMonths={2} locale={es} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Tipo de registro</Label>
              <Select value={entryTypeFilter} onValueChange={setEntryTypeFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="DEPOSIT">Depósito</SelectItem>
                  <SelectItem value="WITHDRAWAL">Retiro</SelectItem>
                  <SelectItem value="PAYMENT">Pago</SelectItem>
                  <SelectItem value="RECEIPT">Recibo</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                  <SelectItem value="TRANSFER_IN">Transferencia entrada</SelectItem>
                  <SelectItem value="TRANSFER_OUT">Transferencia salida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={generateReport} disabled={loading} className="w-full">
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

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Generando reporte...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!loading && filteredEntries.length > 0 && (
        <Card>
          <CardContent className="pt-6 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEntries.size === paginatedEntries.length && paginatedEntries.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="min-w-[130px]">Asiento</TableHead>
                    <TableHead className="min-w-[90px]">Estado</TableHead>
                    <TableHead className="min-w-[70px]">Fecha</TableHead>
                    <TableHead className="min-w-[140px]">Tercero</TableHead>
                    <TableHead className="min-w-[90px]">Código</TableHead>
                    <TableHead className="min-w-[135px]">Cuenta contable</TableHead>
                    <TableHead className="min-w-[100px]">Centro de costo</TableHead>
                    <TableHead className="text-right min-w-[105px]">Débito</TableHead>
                    <TableHead className="text-right min-w-[105px]">Crédito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.map((entry) => {
                    const isSelected = selectedEntries.has(entry.entry_number);
                    
                    return entry.lines.map((line, lineIndex) => {
                      const isFirstLine = lineIndex === 0;
                      
                      return (
                        <TableRow key={`${entry.entry_number}-${line.id}-${lineIndex}`}>
                          {isFirstLine && (
                            <>
                              <TableCell rowSpan={entry.lines.length} className="align-top">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSelectEntry(entry.entry_number)}
                                />
                              </TableCell>
                              <TableCell rowSpan={entry.lines.length} className="align-top">
                                <Link
                                  href={getEntryUrl(line)}
                                  target="_blank"
                                  className="text-blue-600 hover:underline"
                                >
                                  {entry.entry_number}
                                </Link>
                              </TableCell>
                              <TableCell rowSpan={entry.lines.length} className="align-top">
                                <Badge variant="secondary" className="text-xs">
                                  {entry.status}
                                </Badge>
                              </TableCell>
                              <TableCell rowSpan={entry.lines.length} className="align-top">
                                {format(new Date(entry.entry_date), 'dd/MM/yyyy', { locale: es })}
                              </TableCell>
                            </>
                          )}
                          <TableCell className={cn(!isFirstLine && 'border-t-0')}>
                            <span className="block border-b border-gray-200 pb-1 last:border-b-0">
                              {line.third_party_name || '-'}
                            </span>
                          </TableCell>
                          <TableCell className={cn(!isFirstLine && 'border-t-0', 'font-mono text-xs')}>
                            <span className="block border-b border-gray-200 pb-1 last:border-b-0">
                              {line.account_code || '-'}
                            </span>
                          </TableCell>
                          <TableCell className={cn(!isFirstLine && 'border-t-0')}>
                            <span className="block border-b border-gray-200 pb-1 last:border-b-0">
                              {line.account_name}
                            </span>
                          </TableCell>
                          <TableCell className={cn(!isFirstLine && 'border-t-0')}>
                            <span className="block border-b border-gray-200 pb-1 last:border-b-0">
                              {line.cost_center || '-'}
                            </span>
                          </TableCell>
                          <TableCell className={cn('text-right', !isFirstLine && 'border-t-0')}>
                            <span className="block border-b border-gray-200 pb-1 last:border-b-0">
                              {line.debit > 0 ? formatCurrency(line.debit) : ''}
                            </span>
                          </TableCell>
                          <TableCell className={cn('text-right', !isFirstLine && 'border-t-0')}>
                            <span className="block border-b border-gray-200 pb-1 last:border-b-0">
                              {line.credit > 0 ? formatCurrency(line.credit) : ''}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredEntries.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No se encontraron asientos contables para el período seleccionado</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && filteredEntries.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  Página
                  <Input
                    type="text"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={handlePageInputBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handlePageInputBlur();
                      }
                    }}
                    className="h-8 w-12 text-center text-xs p-1"
                  />
                  de {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateReport}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredEntries.length)}{' '}
                  <span className="text-muted-foreground/70">de {filteredEntries.length}</span>
                </span>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Resultados por página</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(v) => {
                      setItemsPerPage(parseInt(v, 10));
                      setCurrentPage(1);
                      setPageInput('1');
                    }}
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
