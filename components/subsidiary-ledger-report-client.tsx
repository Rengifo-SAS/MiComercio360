'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Calendar as CalendarIcon,
  Loader2,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface SubsidiaryLedgerReportClientProps {
  companyId: string;
  userId: string;
}

interface AccountThirdPartyBalance {
  account_id: string;
  account_name: string;
  account_code?: string;
  third_party_id?: string;
  third_party_name?: string;
  third_party_type?: 'customer' | 'supplier';
  previous_balance: number;
  debit: number;
  credit: number;
  net: number;
  final_balance: number;
}

type QuickPeriod = 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'custom';

export function SubsidiaryLedgerReportClient({ companyId, userId }: SubsidiaryLedgerReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('this-month');
  const [balances, setBalances] = useState<AccountThirdPartyBalance[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleQuickPeriod = (period: QuickPeriod) => {
    setQuickPeriod(period);
    const now = new Date();
    switch (period) {
      case 'this-month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
      case 'this-year':
        setDateRange({ from: startOfYear(now), to: now });
        break;
      case 'last-year':
        const lastYear = subYears(now, 1);
        setDateRange({ from: startOfYear(lastYear), to: endOfYear(lastYear) });
        break;
      case 'custom':
        break;
    }
  };

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      const fromMonth = format(dateRange.from, 'MMMM', { locale: es });
      const fromYear = format(dateRange.from, 'yyyy');
      if (format(dateRange.from, 'yyyy-MM') === format(dateRange.to, 'yyyy-MM')) {
        setQuickPeriod('custom');
      }
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

      // Fetch account transactions for the period
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

      // Fetch previous period transactions (before start date)
      const { data: previousTransactions, error: previousError } = await supabase
        .from('account_transactions')
        .select(
          `
          id,
          amount,
          account_id,
          related_entity_type,
          related_entity_id
        `
        )
        .eq('company_id', companyId)
        .lt('transaction_date', startDate)
        .limit(10000);

      if (previousError) throw previousError;

      // Get related customers and suppliers
      const customerIds: string[] = [];
      const supplierIds: string[] = [];

      [...(periodTransactions || []), ...(previousTransactions || [])].forEach((tx: any) => {
        if (tx.related_entity_type === 'sale' && tx.related_entity_id) {
          customerIds.push(tx.related_entity_id);
        } else if (tx.related_entity_type === 'purchase' && tx.related_entity_id) {
          supplierIds.push(tx.related_entity_id);
        }
      });

      let customersMap = new Map<string, any>();
      let suppliersMap = new Map<string, any>();

      if (customerIds.length > 0) {
        const { data: salesData } = await supabase
          .from('sales')
          .select('id, customer_id, customers:customers!sales_customer_id_fkey (id, business_name, identification_number)')
          .in('id', [...new Set(customerIds)])
          .eq('company_id', companyId);

        if (salesData) {
          salesData.forEach((sale: any) => {
            const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
            customersMap.set(sale.id, {
              id: customer?.id,
              name: customer?.business_name || 'Consumidor Final',
              type: 'customer',
            });
          });
        }
      }

      if (supplierIds.length > 0) {
        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('id, supplier_id, suppliers:suppliers!purchases_supplier_id_fkey (id, name, identification_number)')
          .in('id', [...new Set(supplierIds)])
          .eq('company_id', companyId);

        if (purchasesData) {
          purchasesData.forEach((purchase: any) => {
            const supplier = Array.isArray(purchase.suppliers) ? purchase.suppliers[0] : purchase.suppliers;
            suppliersMap.set(purchase.id, {
              id: supplier?.id,
              name: supplier?.name || '',
              type: 'supplier',
            });
          });
        }
      }

      // Group by account and third party
      const balancesMap = new Map<string, AccountThirdPartyBalance>();

      // Process previous transactions for previous balance
      (previousTransactions || []).forEach((tx: any) => {
        const account = Array.isArray(tx.account) ? tx.account?.[0] : tx.account;
        if (!account) return;

        let thirdPartyId: string | undefined;
        let thirdPartyName: string | undefined;
        let thirdPartyType: 'customer' | 'supplier' | undefined;

        if (tx.related_entity_type === 'sale' && tx.related_entity_id) {
          const customer = customersMap.get(tx.related_entity_id);
          if (customer) {
            thirdPartyId = customer.id;
            thirdPartyName = customer.name;
            thirdPartyType = 'customer';
          }
        } else if (tx.related_entity_type === 'purchase' && tx.related_entity_id) {
          const supplier = suppliersMap.get(tx.related_entity_id);
          if (supplier) {
            thirdPartyId = supplier.id;
            thirdPartyName = supplier.name;
            thirdPartyType = 'supplier';
          }
        }

        const key = `${account.id}-${thirdPartyId || 'NO_THIRD_PARTY'}`;
        const existing = balancesMap.get(key) || {
          account_id: account.id,
          account_name: account.account_name || 'Sin cuenta',
          account_code: '', // account_code no existe en accounts
          third_party_id: thirdPartyId,
          third_party_name: thirdPartyName,
          third_party_type: thirdPartyType,
          previous_balance: 0,
          debit: 0,
          credit: 0,
          net: 0,
          final_balance: 0,
        };

        const amount = Number(tx.amount) || 0;
        existing.previous_balance += amount;
        balancesMap.set(key, existing);
      });

      // Process period transactions
      (periodTransactions || []).forEach((tx: any) => {
        const account = Array.isArray(tx.account) ? tx.account?.[0] : tx.account;
        if (!account) return;

        let thirdPartyId: string | undefined;
        let thirdPartyName: string | undefined;
        let thirdPartyType: 'customer' | 'supplier' | undefined;

        if (tx.related_entity_type === 'sale' && tx.related_entity_id) {
          const customer = customersMap.get(tx.related_entity_id);
          if (customer) {
            thirdPartyId = customer.id;
            thirdPartyName = customer.name;
            thirdPartyType = 'customer';
          }
        } else if (tx.related_entity_type === 'purchase' && tx.related_entity_id) {
          const supplier = suppliersMap.get(tx.related_entity_id);
          if (supplier) {
            thirdPartyId = supplier.id;
            thirdPartyName = supplier.name;
            thirdPartyType = 'supplier';
          }
        }

        const key = `${account.id}-${thirdPartyId || 'NO_THIRD_PARTY'}`;
        const existing = balancesMap.get(key) || {
          account_id: account.id,
          account_name: account.account_name || 'Sin cuenta',
          account_code: '', // account_code no existe en accounts
          third_party_id: thirdPartyId,
          third_party_name: thirdPartyName,
          third_party_type: thirdPartyType,
          previous_balance: 0,
          debit: 0,
          credit: 0,
          net: 0,
          final_balance: 0,
        };

        const amount = Number(tx.amount) || 0;
        if (amount > 0) {
          existing.debit += amount;
        } else {
          existing.credit += Math.abs(amount);
        }
        existing.net = existing.debit - existing.credit;
        existing.final_balance = existing.previous_balance + existing.net;
        balancesMap.set(key, existing);
      });

      // Also include accounts without third parties (for accounts without related entities)
      const accountsMap = new Map<string, any>();
      (periodTransactions || []).forEach((tx: any) => {
        const account = Array.isArray(tx.account) ? tx.account?.[0] : tx.account;
        if (account && !tx.related_entity_id) {
          const key = `${account.id}-NO_THIRD_PARTY`;
          if (!balancesMap.has(key)) {
            accountsMap.set(account.id, account);
          }
        }
      });

      accountsMap.forEach((account) => {
        const key = `${account.id}-NO_THIRD_PARTY`;
        if (!balancesMap.has(key)) {
          balancesMap.set(key, {
            account_id: account.id,
            account_name: account.account_name || 'Sin cuenta',
            account_code: '', // account_code no existe en accounts
            third_party_id: undefined,
            third_party_name: undefined,
            third_party_type: undefined,
            previous_balance: 0,
            debit: 0,
            credit: 0,
            net: 0,
            final_balance: 0,
          });
        }
      });

      // Calculate balances for accounts without third parties
      const noThirdPartyKeys = Array.from(balancesMap.keys()).filter((k) => k.endsWith('-NO_THIRD_PARTY'));
      noThirdPartyKeys.forEach((key) => {
        const balance = balancesMap.get(key)!;
        
        // Previous balance
        (previousTransactions || []).forEach((tx: any) => {
          if (tx.account_id === balance.account_id && !tx.related_entity_id) {
            balance.previous_balance += Number(tx.amount) || 0;
          }
        });

        // Period movements
        (periodTransactions || []).forEach((tx: any) => {
          if (tx.account_id === balance.account_id && !tx.related_entity_id) {
            const amount = Number(tx.amount) || 0;
            if (amount > 0) {
              balance.debit += amount;
            } else {
              balance.credit += Math.abs(amount);
            }
          }
        });

        balance.net = balance.debit - balance.credit;
        balance.final_balance = balance.previous_balance + balance.net;
        balancesMap.set(key, balance);
      });

      const allBalances = Array.from(balancesMap.values()).filter((b) => b.debit !== 0 || b.credit !== 0 || b.previous_balance !== 0);
      
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

  const totalPages = Math.ceil(balances.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBalances = balances.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    return `${sign}${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(absValue)}`;
  };

  const getPeriodLabel = () => {
    if (!dateRange.from || !dateRange.to) return 'Este mes';
    if (quickPeriod === 'this-month') return 'Este mes';
    if (quickPeriod === 'last-month') return 'Mes anterior';
    if (quickPeriod === 'this-year') return 'Este año';
    if (quickPeriod === 'last-year') return 'Año anterior';
    return `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`;
  };

  const getCategoryUrl = (accountId: string) => {
    if (!dateRange.from || !dateRange.to) return '#';
    return `/dashboard/reports/accounting/account-movements?from=${format(dateRange.from, 'yyyy-MM-dd')}&to=${format(dateRange.to, 'yyyy-MM-dd')}&account_id=${accountId}`;
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
        <span className="text-foreground font-medium">Auxiliar por tercero</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">Auxiliar por tercero</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Consulta el saldo acumulado de tus cuentas contables por cada tercero en el periodo de tiempo que elijas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="default" className="gap-2" onClick={() => toast.info('Funcionalidad de exportación próximamente')}>
            <Download className="h-4 w-4" />
            Descargar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 gap-2">
                <CalendarIcon className="h-4 w-4" />
                {getPeriodLabel()}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-2 space-y-2 border-b">
                <Button
                  variant={quickPeriod === 'this-month' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleQuickPeriod('this-month')}
                >
                  Este mes
                </Button>
                <Button
                  variant={quickPeriod === 'last-month' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleQuickPeriod('last-month')}
                >
                  Mes anterior
                </Button>
                <Button
                  variant={quickPeriod === 'this-year' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleQuickPeriod('this-year')}
                >
                  Este año
                </Button>
                <Button
                  variant={quickPeriod === 'last-year' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleQuickPeriod('last-year')}
                >
                  Año anterior
                </Button>
              </div>
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  if (range) {
                    setDateRange({ from: range.from, to: range.to });
                    setQuickPeriod('custom');
                  }
                }}
                numberOfMonths={2}
                locale={es}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={generateReport} disabled={loading} className="h-8 gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Filter className="h-4 w-4" />
                Filtrar
              </>
            )}
          </Button>
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
      {!loading && balances.length > 0 && (
        <Card>
          <CardContent className="pt-6 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Cuenta contable</TableHead>
                    <TableHead className="min-w-[180px]">Tercero</TableHead>
                    <TableHead className="text-right min-w-[120px]">Saldo anterior</TableHead>
                    <TableHead className="text-right min-w-[120px]">Débito</TableHead>
                    <TableHead className="text-right min-w-[120px]">Crédito</TableHead>
                    <TableHead className="text-right min-w-[120px]">Neto</TableHead>
                    <TableHead className="text-right min-w-[120px]">Saldo final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBalances.map((balance, index) => (
                    <TableRow key={`${balance.account_id}-${balance.third_party_id || 'none'}-${index}`}>
                      <TableCell>
                        <Link
                          href={getCategoryUrl(balance.account_id)}
                          target="_blank"
                          className="text-blue-600 hover:underline"
                        >
                          {balance.account_name}
                        </Link>
                      </TableCell>
                      <TableCell>{balance.third_party_name || ''}</TableCell>
                      <TableCell className="text-right">{formatCurrency(balance.previous_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(balance.debit)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(balance.credit)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(balance.net)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(balance.final_balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && balances.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No se encontraron saldos para el período seleccionado</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && balances.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, balances.length)} de {balances.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
