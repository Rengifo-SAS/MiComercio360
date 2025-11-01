'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
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
  ChevronDown,
  Search,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface TrialBalanceThirdPartyReportClientProps {
  companyId: string;
  userId: string;
}

interface ThirdPartyAccountBalance {
  id: string;
  account_id: string;
  account_name: string;
  account_code?: string;
  third_party_id?: string;
  third_party_name?: string;
  third_party_identification?: string;
  third_party_type?: 'customer' | 'supplier';
  initialDebit: number;
  initialCredit: number;
  periodDebit: number;
  periodCredit: number;
  finalDebit: number;
  finalCredit: number;
}

export function TrialBalanceThirdPartyReportClient({
  companyId,
  userId,
}: TrialBalanceThirdPartyReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [balances, setBalances] = useState<ThirdPartyAccountBalance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Totals
  const totals = useMemo(() => {
    return balances.reduce(
      (acc, balance) => ({
        initialDebit: acc.initialDebit + balance.initialDebit,
        initialCredit: acc.initialCredit + balance.initialCredit,
        periodDebit: acc.periodDebit + balance.periodDebit,
        periodCredit: acc.periodCredit + balance.periodCredit,
        finalDebit: acc.finalDebit + balance.finalDebit,
        finalCredit: acc.finalCredit + balance.finalCredit,
      }),
      {
        initialDebit: 0,
        initialCredit: 0,
        periodDebit: 0,
        periodCredit: 0,
        finalDebit: 0,
        finalCredit: 0,
      }
    );
  }, [balances]);

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

      // Fetch period transactions
      const { data: periodTransactions, error: periodError } = await supabase
        .from('account_transactions')
        .select(
          `
          id,
          transaction_date,
          amount,
          account_id,
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
        .limit(10000);

      if (periodError) throw periodError;

      // Fetch initial transactions (before period)
      const { data: initialTransactions, error: initialError } = await supabase
        .from('account_transactions')
        .select('id, amount, account_id, related_entity_type, related_entity_id')
        .eq('company_id', companyId)
        .lt('transaction_date', startDate)
        .limit(10000);

      if (initialError) throw initialError;

      // Get unique related entity IDs
      const saleIds: string[] = [];
      const purchaseIds: string[] = [];

      [...(periodTransactions || []), ...(initialTransactions || [])].forEach((tx: any) => {
        if (tx.related_entity_type === 'sale' && tx.related_entity_id) {
          saleIds.push(tx.related_entity_id);
        } else if (tx.related_entity_type === 'purchase' && tx.related_entity_id) {
          purchaseIds.push(tx.related_entity_id);
        }
      });

      // Fetch customers and suppliers
      let customersMap = new Map<string, { id: string; name: string; identification: string }>();
      let suppliersMap = new Map<string, { id: string; name: string; identification: string }>();

      if (saleIds.length > 0) {
        const { data: salesData } = await supabase
          .from('sales')
          .select('id, customer_id, customers:customers!sales_customer_id_fkey (id, business_name, identification_number, identification_type)')
          .in('id', [...new Set(saleIds)])
          .eq('company_id', companyId);

        if (salesData) {
          salesData.forEach((sale: any) => {
            const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
            if (customer) {
              customersMap.set(sale.id, {
                id: customer.id,
                name: customer.business_name || 'Consumidor Final',
                identification: customer.identification_number || '',
              });
            }
          });
        }
      }

      if (purchaseIds.length > 0) {
        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('id, supplier_id, suppliers:suppliers!purchases_supplier_id_fkey (id, name, identification_number, identification_type)')
          .in('id', [...new Set(purchaseIds)])
          .eq('company_id', companyId);

        if (purchasesData) {
          purchasesData.forEach((purchase: any) => {
            const supplier = Array.isArray(purchase.suppliers) ? purchase.suppliers[0] : purchase.suppliers;
            if (supplier) {
              suppliersMap.set(purchase.id, {
                id: supplier.id,
                name: supplier.name || '',
                identification: supplier.identification_number || '',
              });
            }
          });
        }
      }

      // Group by account and third party
      const balancesMap = new Map<string, ThirdPartyAccountBalance>();

      // Process initial transactions
      (initialTransactions || []).forEach((tx: any) => {
        let thirdPartyId: string | undefined;
        let thirdPartyName: string | undefined;
        let thirdPartyIdentification: string | undefined;
        let thirdPartyType: 'customer' | 'supplier' | undefined;

        if (tx.related_entity_type === 'sale' && tx.related_entity_id) {
          const customer = customersMap.get(tx.related_entity_id);
          if (customer) {
            thirdPartyId = customer.id;
            thirdPartyName = customer.name;
            thirdPartyIdentification = customer.identification;
            thirdPartyType = 'customer';
          }
        } else if (tx.related_entity_type === 'purchase' && tx.related_entity_id) {
          const supplier = suppliersMap.get(tx.related_entity_id);
          if (supplier) {
            thirdPartyId = supplier.id;
            thirdPartyName = supplier.name;
            thirdPartyIdentification = supplier.identification;
            thirdPartyType = 'supplier';
          }
        }

        const key = `${tx.account_id}-${thirdPartyId || 'NO_THIRD_PARTY'}`;
        
        // Get account name (we'll fetch it later or use a placeholder)
        const existing = balancesMap.get(key) || {
          id: key,
          account_id: tx.account_id,
          account_name: '', // Will be populated from period transactions
          account_code: '', // Will be populated from period transactions
          third_party_id: thirdPartyId,
          third_party_name: thirdPartyName,
          third_party_identification: thirdPartyIdentification,
          third_party_type: thirdPartyType,
          initialDebit: 0,
          initialCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
          finalDebit: 0,
          finalCredit: 0,
        };

        const amount = Number(tx.amount) || 0;
        if (amount > 0) {
          existing.initialDebit += amount;
        } else {
          existing.initialCredit += Math.abs(amount);
        }
        balancesMap.set(key, existing);
      });

      // Process period transactions
      (periodTransactions || []).forEach((tx: any) => {
        const account = Array.isArray(tx.account) ? tx.account[0] : tx.account;
        if (!account) return;

        let thirdPartyId: string | undefined;
        let thirdPartyName: string | undefined;
        let thirdPartyIdentification: string | undefined;
        let thirdPartyType: 'customer' | 'supplier' | undefined;

        if (tx.related_entity_type === 'sale' && tx.related_entity_id) {
          const customer = customersMap.get(tx.related_entity_id);
          if (customer) {
            thirdPartyId = customer.id;
            thirdPartyName = customer.name;
            thirdPartyIdentification = customer.identification;
            thirdPartyType = 'customer';
          }
        } else if (tx.related_entity_type === 'purchase' && tx.related_entity_id) {
          const supplier = suppliersMap.get(tx.related_entity_id);
          if (supplier) {
            thirdPartyId = supplier.id;
            thirdPartyName = supplier.name;
            thirdPartyIdentification = supplier.identification;
            thirdPartyType = 'supplier';
          }
        }

        const key = `${account.id}-${thirdPartyId || 'NO_THIRD_PARTY'}`;
        const existing = balancesMap.get(key) || {
          id: key,
          account_id: account.id,
          account_name: account.account_name || 'Sin cuenta',
          account_code: '', // account_code no existe en accounts
          third_party_id: thirdPartyId,
          third_party_name: thirdPartyName,
          third_party_identification: thirdPartyIdentification,
          third_party_type: thirdPartyType,
          initialDebit: 0,
          initialCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
          finalDebit: 0,
          finalCredit: 0,
        };

        // Update account name and code from period transaction
        if (!existing.account_name) {
          existing.account_name = account.account_name || 'Sin cuenta';
        }
        // account_code no existe en accounts, se deja vacío

        const amount = Number(tx.amount) || 0;
        if (amount > 0) {
          existing.periodDebit += amount;
        } else {
          existing.periodCredit += Math.abs(amount);
        }

        // Calculate final balances
        existing.finalDebit = existing.initialDebit + existing.periodDebit;
        existing.finalCredit = existing.initialCredit + existing.periodCredit;

        balancesMap.set(key, existing);
      });

      // Also handle accounts without third parties
      const accountsWithoutThirdParties = new Set<string>();
      
      [...(periodTransactions || []), ...(initialTransactions || [])].forEach((tx: any) => {
        if (!tx.related_entity_id) {
          accountsWithoutThirdParties.add(tx.account_id);
        }
      });

      // Get account names for accounts without third parties
      if (accountsWithoutThirdParties.size > 0) {
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('id, account_name')
          .in('id', Array.from(accountsWithoutThirdParties))
          .eq('company_id', companyId);

        if (accountsData) {
          accountsData.forEach((acc: any) => {
            const key = `${acc.id}-NO_THIRD_PARTY`;
            if (!balancesMap.has(key)) {
              balancesMap.set(key, {
                id: key,
                account_id: acc.id,
                account_name: acc.account_name || 'Sin cuenta',
                third_party_id: undefined,
                third_party_name: undefined,
                third_party_identification: undefined,
                third_party_type: undefined,
                initialDebit: 0,
                initialCredit: 0,
                periodDebit: 0,
                periodCredit: 0,
                finalDebit: 0,
                finalCredit: 0,
              });
            }
          });

          // Recalculate for accounts without third parties
          const noThirdPartyKeys = Array.from(balancesMap.keys()).filter((k) => k.endsWith('-NO_THIRD_PARTY'));
          noThirdPartyKeys.forEach((key) => {
            const balance = balancesMap.get(key)!;
            
            // Previous balance
            (initialTransactions || []).forEach((tx: any) => {
              if (tx.account_id === balance.account_id && !tx.related_entity_id) {
                const amount = Number(tx.amount) || 0;
                if (amount > 0) {
                  balance.initialDebit += amount;
                } else {
                  balance.initialCredit += Math.abs(amount);
                }
              }
            });

            // Period movements
            (periodTransactions || []).forEach((tx: any) => {
              const account = Array.isArray(tx.account) ? tx.account[0] : tx.account;
              if (account && account.id === balance.account_id && !tx.related_entity_id) {
                const amount = Number(tx.amount) || 0;
                if (amount > 0) {
                  balance.periodDebit += amount;
                } else {
                  balance.periodCredit += Math.abs(amount);
                }
              }
            });

            balance.finalDebit = balance.initialDebit + balance.periodDebit;
            balance.finalCredit = balance.initialCredit + balance.periodCredit;
            balancesMap.set(key, balance);
          });
        }
      }

      // Update account names for accounts that might have been missing
      const accountIds = new Set<string>();
      Array.from(balancesMap.values()).forEach((b) => {
        if (!b.account_name || b.account_name === '') {
          accountIds.add(b.account_id);
        }
      });

      if (accountIds.size > 0) {
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('id, account_name')
          .in('id', Array.from(accountIds))
          .eq('company_id', companyId);

        if (accountsData) {
          accountsData.forEach((acc: any) => {
            Array.from(balancesMap.values()).forEach((balance) => {
              if (balance.account_id === acc.id && !balance.account_name) {
                balance.account_name = acc.account_name || 'Sin cuenta';
              }
            });
          });
        }
      }

      const allBalances = Array.from(balancesMap.values()).filter(
        (b) =>
          b.initialDebit !== 0 ||
          b.initialCredit !== 0 ||
          b.periodDebit !== 0 ||
          b.periodCredit !== 0 ||
          b.finalDebit !== 0 ||
          b.finalCredit !== 0
      );

      // Sort by account name, then by third party name
      allBalances.sort((a, b) => {
        if (a.account_name !== b.account_name) {
          return a.account_name.localeCompare(b.account_name);
        }
        const nameA = a.third_party_name || '';
        const nameB = b.third_party_name || '';
        return nameA.localeCompare(nameB);
      });

      setBalances(allBalances);
      setCurrentPage(1);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Error: ${error?.message || 'Error desconocido'}`);
      setBalances([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBalances = balances.filter(
    (b) =>
      b.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.third_party_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.third_party_identification || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBalances.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBalances = filteredBalances.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

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
        <span className="text-foreground font-medium">Balance de prueba por tercero</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            Balance de prueba por tercero
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Consulta los movimientos de tus cuentas detallados por contacto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 gap-2">
              <CalendarIcon className="h-4 w-4" />
              {dateRange.from && dateRange.to
                ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`
                : 'Seleccionar período'}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
              locale={es}
            />
          </PopoverContent>
        </Popover>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cuenta o tercero"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0"
          onClick={() => toast.info('Funcionalidad de exportación próximamente')}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Section Header Bar */}
      <div className="w-full h-10 border-b bg-slate-400/20 border-slate-200">
        <div className="flex items-center h-full">
          <div className="min-w-[200px] flex relative justify-center items-center h-full text-xs font-medium text-slate-500 border-r border-slate-200"></div>
          <div className="min-w-[180px] flex relative justify-center items-center h-full text-xs font-medium text-slate-500 border-r border-slate-200"></div>
          <div className="flex relative justify-center items-center w-40 h-full text-xs font-medium text-slate-500 border-r border-slate-200">
            Saldo inicial
          </div>
          <div className="flex relative justify-center items-center w-40 h-full text-xs font-medium text-slate-500 border-r border-slate-200">
            Movimientos
          </div>
          <div className="flex relative justify-center items-center w-40 h-full text-xs font-medium text-slate-500">
            Saldo final
          </div>
        </div>
      </div>

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
      {!loading && filteredBalances.length > 0 && (
        <Card>
          <CardContent className="pt-6 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Cuenta contable</TableHead>
                    <TableHead className="min-w-[180px]">Tercero</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBalances.map((balance) => (
                    <TableRow key={balance.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/reports/accounting/account-movements?from=${format(dateRange.from!, 'yyyy-MM-dd')}&to=${format(dateRange.to!, 'yyyy-MM-dd')}&account_id=${balance.account_id}${balance.third_party_id ? `&third_party_id=${balance.third_party_id}` : ''}`}
                          target="_blank"
                          className="text-blue-600 hover:underline"
                        >
                          {balance.account_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {balance.third_party_name ? (
                          <div>
                            <div className="font-medium">{balance.third_party_name}</div>
                            {balance.third_party_identification && (
                              <div className="text-xs text-muted-foreground">
                                {balance.third_party_identification}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {balance.initialDebit !== 0 ? formatCurrency(balance.initialDebit) : ''}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {balance.initialCredit !== 0 ? formatCurrency(balance.initialCredit) : ''}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {balance.periodDebit !== 0 ? formatCurrency(balance.periodDebit) : ''}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {balance.periodCredit !== 0 ? formatCurrency(balance.periodCredit) : ''}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {balance.finalDebit !== 0 ? formatCurrency(balance.finalDebit) : ''}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {balance.finalCredit !== 0 ? formatCurrency(balance.finalCredit) : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-slate-100 font-semibold">
                    <TableCell colSpan={2}>
                      <span className="font-semibold text-sm">Total</span>
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      {formatCurrency(totals.initialDebit)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      {formatCurrency(totals.initialCredit)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      {formatCurrency(totals.periodDebit)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      {formatCurrency(totals.periodCredit)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      {formatCurrency(totals.finalDebit)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      {formatCurrency(totals.finalCredit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredBalances.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                No se encontraron movimientos por tercero para el período seleccionado
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && filteredBalances.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredBalances.length)} de{' '}
            {filteredBalances.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              ←
            </Button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
