'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, startOfYear, startOfMonth, endOfMonth, subMonths, subYears, differenceInDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar as CalendarIcon, Loader2, ChevronDown, ChevronRight, ChevronUp, Search, ArrowDown, HelpCircle, Settings2, Download, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface ProfitLossReportClientProps {
  companyId: string;
  userId: string;
}

interface AccountLine {
  id: string;
  name: string;
  amount: number;
  previousAmount: number;
  level: number;
  children?: AccountLine[];
  isTotal?: boolean;
  categoryId?: string;
}

type ViewType = 'detailed' | 'summary';
type QuickPeriod = 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'custom';

export function ProfitLossReportClient({ companyId, userId }: ProfitLossReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [previousDateRange, setPreviousDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(subMonths(new Date(), 1)),
  });
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('this-month');
  const [viewType, setViewType] = useState<ViewType>('detailed');
  const [accounts, setAccounts] = useState<AccountLine[]>([]);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set(['income', 'costs', 'expenses']));
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSummaryExpanded, setAiSummaryExpanded] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [previousTotalIncome, setPreviousTotalIncome] = useState(0);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      // Verificar si el rango actual coincide con algún período rápido
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const lastMonth = subMonths(now, 1);
      const lastMonthStart = startOfMonth(lastMonth);
      const lastMonthEnd = endOfMonth(lastMonth);
      const currentYearStart = startOfYear(now);
      const lastYear = subYears(now, 1);
      const lastYearStart = startOfYear(lastYear);
      const lastYearEnd = endOfMonth(lastYear);

      if (dateRange.from.getTime() === currentMonthStart.getTime() && dateRange.to.getTime() === currentMonthEnd.getTime()) {
        setQuickPeriod('this-month');
      } else if (dateRange.from.getTime() === lastMonthStart.getTime() && dateRange.to.getTime() === lastMonthEnd.getTime()) {
        setQuickPeriod('last-month');
      } else if (dateRange.from.getTime() === currentYearStart.getTime() && dateRange.to.getTime() === now.getTime()) {
        setQuickPeriod('this-year');
      } else if (dateRange.from.getTime() === lastYearStart.getTime() && dateRange.to.getTime() === lastYearEnd.getTime()) {
        setQuickPeriod('last-year');
      } else {
        setQuickPeriod('custom');
      }

      // Calcular período anterior basado en el período actual
      const daysDiff = differenceInDays(dateRange.to, dateRange.from);
      const prevTo = subDays(dateRange.from, 1);
      const prevFrom = subDays(prevTo, daysDiff);
      setPreviousDateRange({ from: prevFrom, to: prevTo });
      generateReport();
    }
  }, [dateRange]);

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
        setDateRange({ from: startOfYear(lastYear), to: endOfMonth(lastYear) });
        break;
      case 'custom':
        break;
    }
  };

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to || !previousDateRange?.from || !previousDateRange?.to) return;
    setLoading(true);
    try {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();
      const prevStartDate = startOfDay(previousDateRange.from).toISOString();
      const prevEndDate = endOfDay(previousDateRange.to).toISOString();

      const [
        salesResult,
        purchasesResult,
        transactionsResult,
        prevSalesResult,
        prevPurchasesResult,
        prevTransactionsResult,
      ] = await Promise.all([
        supabase.from('sales').select('id, subtotal, total_amount, status').eq('company_id', companyId).neq('status', 'cancelled').gte('created_at', startDate).lte('created_at', endDate).limit(10000),
        supabase.from('purchases').select('id, total_amount, status').eq('company_id', companyId).neq('status', 'cancelled').gte('created_at', startDate).lte('created_at', endDate).limit(10000),
        supabase.from('account_transactions').select('id, amount, transaction_type, description, account:accounts!account_transactions_account_id_fkey(account_name)').eq('company_id', companyId).in('transaction_type', ['WITHDRAWAL', 'PAYMENT', 'FEE']).gte('transaction_date', startDate).lte('transaction_date', endDate).limit(10000),
        supabase.from('sales').select('id, subtotal, total_amount, status').eq('company_id', companyId).neq('status', 'cancelled').gte('created_at', prevStartDate).lte('created_at', prevEndDate).limit(10000),
        supabase.from('purchases').select('id, total_amount, status').eq('company_id', companyId).neq('status', 'cancelled').gte('created_at', prevStartDate).lte('created_at', prevEndDate).limit(10000),
        supabase.from('account_transactions').select('id, amount, transaction_type, description, account:accounts!account_transactions_account_id_fkey(account_name)').eq('company_id', companyId).in('transaction_type', ['WITHDRAWAL', 'PAYMENT', 'FEE']).gte('transaction_date', prevStartDate).lte('transaction_date', prevEndDate).limit(10000),
      ]);

      const salesTotal = (salesResult.data || []).reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);
      const purchasesTotal = (purchasesResult.data || []).reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
      
      // Group expenses by account name to categorize them
      const expensesByAccount = new Map<string, number>();
      (transactionsResult.data || []).forEach((t: any) => {
        const account = Array.isArray(t.account) ? t.account[0] : t.account;
        const accountName = account?.account_name || 'Otros gastos';
        const amount = Math.abs(Number(t.amount) || 0);
        expensesByAccount.set(accountName, (expensesByAccount.get(accountName) || 0) + amount);
      });
      
      const expensesTotal = (transactionsResult.data || []).reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
      const grossProfit = salesTotal - purchasesTotal;

      const prevSalesTotal = (prevSalesResult.data || []).reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);
      const prevPurchasesTotal = (prevPurchasesResult.data || []).reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
      
      // Group previous period expenses by account
      const prevExpensesByAccount = new Map<string, number>();
      (prevTransactionsResult.data || []).forEach((t: any) => {
        const account = Array.isArray(t.account) ? t.account[0] : t.account;
        const accountName = account?.account_name || 'Otros gastos';
        const amount = Math.abs(Number(t.amount) || 0);
        prevExpensesByAccount.set(accountName, (prevExpensesByAccount.get(accountName) || 0) + amount);
      });
      
      const prevExpensesTotal = (prevTransactionsResult.data || []).reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
      
      // Categorize expenses: try to match account names to expense categories
      const getExpenseCategory = (accountName: string): { category: 'sales' | 'admin' | 'general'; subCategory: string } => {
        const name = accountName.toLowerCase();
        if (name.includes('venta') || name.includes('comercial') || name.includes('marketing')) {
          return { category: 'sales', subCategory: 'Gastos de personal de ventas' };
        } else if (name.includes('administra') || name.includes('personal') || name.includes('nomina')) {
          return { category: 'admin', subCategory: 'Gastos de personal' };
        } else if (name.includes('servicio') || name.includes('honorario')) {
          return { category: 'general', subCategory: 'Honorarios y servicios' };
        } else if (name.includes('arrendam') || name.includes('renta')) {
          return { category: 'general', subCategory: 'Arrendamientos' };
        } else if (name.includes('public') || name.includes('utilidad')) {
          return { category: 'general', subCategory: 'Servicios públicos' };
        }
        return { category: 'general', subCategory: 'Otros gastos' };
      };
      
      // Group expenses by category
      const salesExpenses = Array.from(expensesByAccount.entries()).reduce((sum, [name, amount]) => {
        const cat = getExpenseCategory(name);
        return cat.category === 'sales' ? sum + amount : sum;
      }, 0);
      const adminExpenses = Array.from(expensesByAccount.entries()).reduce((sum, [name, amount]) => {
        const cat = getExpenseCategory(name);
        return cat.category === 'admin' ? sum + amount : sum;
      }, 0);
      const generalExpenses = Array.from(expensesByAccount.entries()).reduce((sum, [name, amount]) => {
        const cat = getExpenseCategory(name);
        return cat.category === 'general' ? sum + amount : sum;
      }, 0);
      
      const prevSalesExpenses = Array.from(prevExpensesByAccount.entries()).reduce((sum, [name, amount]) => {
        const cat = getExpenseCategory(name);
        return cat.category === 'sales' ? sum + amount : sum;
      }, 0);
      const prevAdminExpenses = Array.from(prevExpensesByAccount.entries()).reduce((sum, [name, amount]) => {
        const cat = getExpenseCategory(name);
        return cat.category === 'admin' ? sum + amount : sum;
      }, 0);
      const prevGeneralExpenses = Array.from(prevExpensesByAccount.entries()).reduce((sum, [name, amount]) => {
        const cat = getExpenseCategory(name);
        return cat.category === 'general' ? sum + amount : sum;
      }, 0);
      const prevGrossProfit = prevSalesTotal - prevPurchasesTotal;
      const operatingProfit = grossProfit - expensesTotal;
      const prevOperatingProfit = prevGrossProfit - prevExpensesTotal;
      const netProfit = operatingProfit;
      const prevNetProfit = prevOperatingProfit;

      const reportAccounts: AccountLine[] = [
        {
          id: 'income',
          name: 'Ingresos de actividades ordinarias',
          amount: salesTotal,
          previousAmount: prevSalesTotal,
          level: 0,
          categoryId: '5149',
          children: [
            {
              id: 'sales',
              name: 'Ventas',
              amount: salesTotal,
              previousAmount: prevSalesTotal,
              level: 1,
              categoryId: '5150',
            },
            {
              id: 'returns',
              name: 'Devoluciones en ventas',
              amount: 0,
              previousAmount: 0,
              level: 1,
              categoryId: '5151',
            },
          ],
        },
        {
          id: 'costs',
          name: 'Costos de ventas y operación',
          amount: -purchasesTotal,
          previousAmount: -prevPurchasesTotal,
          level: 0,
          categoryId: '5265',
          children: [
            {
              id: 'goods-sold',
              name: 'Costos de la mercancía vendida',
              amount: -purchasesTotal,
              previousAmount: -prevPurchasesTotal,
              level: 1,
              categoryId: '5266',
            },
            {
              id: 'services-cost',
              name: 'Costo de los servicios vendidos',
              amount: 0,
              previousAmount: 0,
              level: 1,
              categoryId: '5271',
            },
          ],
        },
        {
          id: 'gross-profit',
          name: 'Utilidad bruta',
          amount: grossProfit,
          previousAmount: prevGrossProfit,
          level: 0,
          isTotal: true,
        },
        {
          id: 'expenses-sales',
          name: 'Gastos de venta',
          amount: -salesExpenses,
          previousAmount: -prevSalesExpenses,
          level: 0,
          categoryId: '5160',
          children: [
            {
              id: 'sales-personnel',
              name: 'Gastos de personal de ventas',
              amount: -salesExpenses,
              previousAmount: -prevSalesExpenses,
              level: 1,
              categoryId: '5161',
            },
          ],
        },
        {
          id: 'expenses-admin',
          name: 'Gastos de administración',
          amount: -adminExpenses,
          previousAmount: -prevAdminExpenses,
          level: 0,
          categoryId: '5179',
          children: [
            {
              id: 'admin-personnel',
              name: 'Gastos de personal',
              amount: -adminExpenses,
              previousAmount: -prevAdminExpenses,
              level: 1,
              categoryId: '5180',
            },
          ],
        },
        {
          id: 'expenses-general',
          name: 'Gastos generales',
          amount: -generalExpenses,
          previousAmount: -prevGeneralExpenses,
          level: 0,
          categoryId: '5198',
          children: Array.from(expensesByAccount.entries())
            .filter(([name]) => getExpenseCategory(name).category === 'general')
            .map(([name, amount], index) => ({
              id: `general-${index}`,
              name: getExpenseCategory(name).subCategory,
              amount: -amount,
              previousAmount: -(prevExpensesByAccount.get(name) || 0),
              level: 1,
              categoryId: '5199',
            })),
        },
        {
          id: 'operating-profit',
          name: 'Utilidad operativa',
          amount: operatingProfit,
          previousAmount: prevOperatingProfit,
          level: 0,
          isTotal: true,
        },
        {
          id: 'other-income',
          name: 'Otros Ingresos',
          amount: 0,
          previousAmount: 0,
          level: 0,
          categoryId: '5152',
          children: [
            {
              id: 'financial-income',
              name: 'Ingresos financieros',
              amount: 0,
              previousAmount: 0,
              level: 1,
              categoryId: '5153',
            },
            {
              id: 'other-diverse',
              name: 'Otros ingresos diversos',
              amount: 0,
              previousAmount: 0,
              level: 1,
              categoryId: '5156',
            },
          ],
        },
        {
          id: 'financial-expenses',
          name: 'Gastos financieros',
          amount: 0,
          previousAmount: 0,
          level: 0,
          categoryId: '5251',
          children: [
            {
              id: 'financial-interests',
              name: 'Gastos por Intereses financieros',
              amount: 0,
              previousAmount: 0,
              level: 1,
              categoryId: '5252',
            },
            {
              id: 'financial-delay',
              name: 'Gastos por Intereses de mora',
              amount: 0,
              previousAmount: 0,
              level: 1,
              categoryId: '5253',
            },
          ],
        },
        {
          id: 'other-expenses',
          name: 'Otros gastos',
          amount: 0,
          previousAmount: 0,
          level: 0,
          categoryId: '5254',
        },
        {
          id: 'profit-before-tax',
          name: 'Utilidad antes de impuestos',
          amount: operatingProfit,
          previousAmount: prevOperatingProfit,
          level: 0,
          isTotal: true,
        },
        {
          id: 'tax-expenses',
          name: 'Gastos por impuestos',
          amount: 0,
          previousAmount: 0,
          level: 0,
          categoryId: '5260',
          children: [
            {
              id: 'tax-income',
              name: 'Impuestos de renta y complementarios',
              amount: 0,
              previousAmount: 0,
              level: 1,
              categoryId: '5261',
            },
            {
              id: 'tax-non-credit',
              name: 'Gastos por impuestos no acreditables',
              amount: 0,
              previousAmount: 0,
              level: 1,
              categoryId: '5262',
            },
            {
              id: 'tax-withholding',
              name: 'Retención en la fuente asumida',
              amount: 0,
              previousAmount: 0,
              level: 1,
              categoryId: '5263',
            },
          ],
        },
        {
          id: 'net-profit',
          name: 'Utilidad neta',
          amount: netProfit,
          previousAmount: prevNetProfit,
          level: 0,
          isTotal: true,
        },
      ];

      setAccounts(reportAccounts);
      setTotalIncome(salesTotal);
      setPreviousTotalIncome(prevSalesTotal);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Error: ${error?.message || 'Error desconocido'}`);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedAccounts(newExpanded);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0.00%';
    return ((value / total) * 100).toFixed(2) + '%';
  };

  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts;
    const searchLower = searchQuery.toLowerCase();
    const filterAccount = (acc: AccountLine): AccountLine | null => {
      const matches = acc.name.toLowerCase().includes(searchLower);
      const filteredChildren = acc.children?.map((child) => filterAccount(child)).filter((c) => c !== null) as AccountLine[] | undefined;
      if (matches || (filteredChildren && filteredChildren.length > 0)) {
        return { ...acc, children: filteredChildren };
      }
      return null;
    };
    return accounts.map((acc) => filterAccount(acc)).filter((acc) => acc !== null) as AccountLine[];
  }, [accounts, searchQuery]);


  const renderAccountLine = (account: AccountLine): React.ReactNode => {
    const isExpanded = expandedAccounts.has(account.id);
    const hasChildren = account.children && account.children.length > 0;
    const isTotalRow = account.isTotal;
    const incomePercentage = totalIncome > 0 ? (Math.abs(account.amount) / totalIncome) * 100 : 0;
    const prevIncomePercentage = previousTotalIncome > 0 ? (Math.abs(account.previousAmount) / previousTotalIncome) * 100 : 0;
    const absoluteVar = account.amount - account.previousAmount;
    const relativeVar = account.previousAmount !== 0 ? ((absoluteVar / Math.abs(account.previousAmount)) * 100).toFixed(0) : '0';
    const isNegative = account.amount < 0;

    return (
      <React.Fragment key={account.id}>
        <TableRow className={isTotalRow ? 'bg-slate-50' : ''}>
          <TableCell style={{ paddingLeft: `${account.level * 1.5 + 0.5}rem` }} className={isTotalRow ? 'font-semibold' : ''}>
            <div className="flex items-center gap-2">
              {hasChildren && !isTotalRow && (
                <button onClick={() => toggleExpand(account.id)} className="p-0.5 hover:bg-slate-200 rounded transition-colors">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              {(!hasChildren || isTotalRow) && <div className="w-5" />}
              <div className="flex items-center gap-2">
                {account.categoryId ? (
                  <Link
                    href={`/dashboard/reports/accounting/account-movements?from=${format(dateRange.from!, 'yyyy-MM-dd')}&to=${format(dateRange.to!, 'yyyy-MM-dd')}&category_id=${account.categoryId}`}
                    className={cn(
                      'text-xs hover:underline hover:underline-offset-1 break-words max-w-[225px] cursor-pointer',
                      isTotalRow ? 'font-semibold' : account.level === 0 ? 'font-semibold' : ''
                    )}
                  >
                    {account.name}
                  </Link>
                ) : (
                  <span className={cn('text-xs break-words max-w-[225px]', isTotalRow ? 'font-semibold' : account.level === 0 ? 'font-semibold' : '')}>
                    {account.name}
                  </span>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className={cn('text-right text-xs whitespace-nowrap', isTotalRow ? 'font-semibold' : '')}>
            {isNegative ? '-' : ''}
            {formatCurrency(Math.abs(account.amount))}
          </TableCell>
          <TableCell className={cn('text-right text-xs whitespace-nowrap', isTotalRow ? 'font-semibold' : '')}>
            {formatPercentage(Math.abs(account.amount), totalIncome)}
          </TableCell>
          <TableCell className={cn('text-right text-xs whitespace-nowrap', isTotalRow ? 'font-semibold' : '')}>
            {account.previousAmount < 0 ? '-' : ''}
            {formatCurrency(Math.abs(account.previousAmount))}
          </TableCell>
          <TableCell className={cn('text-right text-xs whitespace-nowrap', isTotalRow ? 'font-semibold' : '')}>
            {formatPercentage(Math.abs(account.previousAmount), previousTotalIncome)}
          </TableCell>
          <TableCell className={cn('text-right text-xs whitespace-nowrap', isTotalRow ? 'font-semibold' : '', absoluteVar >= 0 ? 'text-green-700' : '')}>
            {absoluteVar < 0 ? '-' : ''}
            {formatCurrency(Math.abs(absoluteVar))}
          </TableCell>
          <TableCell className={cn('text-right text-xs whitespace-nowrap', isTotalRow ? 'font-semibold' : '')}>{relativeVar}%</TableCell>
        </TableRow>
        {hasChildren && isExpanded && account.children?.map((child) => renderAccountLine(child))}
      </React.Fragment>
    );
  };

  const periodLabel = dateRange.from && dateRange.to ? `${format(dateRange.from, 'dd')} al ${format(dateRange.to, 'dd')} de ${format(dateRange.to, 'MMMM yyyy', { locale: es })}` : '';
  const previousPeriodLabel = previousDateRange.from && previousDateRange.to ? `${format(previousDateRange.from, 'dd')} al ${format(previousDateRange.to, 'dd')} de ${format(previousDateRange.to, 'MMMM yyyy', { locale: es })}` : '';
  const currentPeriodShort = dateRange.to ? format(dateRange.to, 'MMM, yyyy', { locale: es }) : '';
  const previousPeriodShort = previousDateRange.to ? format(previousDateRange.to, 'MMM, yyyy', { locale: es }) : '';

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/reports" className="hover:text-foreground transition-colors">
          Reportes
        </Link>
        <span>/</span>
        <Link href="/dashboard/reports/accounting" className="hover:text-foreground transition-colors">
          Contables
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Estado de resultados</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">Estado de resultados</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Conoce tu desempeño financiero y obtén insumos para tomar decisiones inteligentes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://ayuda.alegra.com/es/como-generar-el-estado-de-resultados-en-alegra-int"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Ayuda</span>
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default" className="gap-2">
                <Download className="h-4 w-4" />
                Descargar
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.info('Funcionalidad de exportación próximamente')}>Exportar a Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Funcionalidad de exportación próximamente')}>Exportar a PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row flex-wrap gap-2 items-start">
        {/* Quick Period Chips */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={quickPeriod === 'this-month' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleQuickPeriod('this-month')}
          >
            Este mes
          </Button>
          <Button
            variant={quickPeriod === 'last-month' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleQuickPeriod('last-month')}
          >
            Mes anterior
          </Button>
          <Button
            variant={quickPeriod === 'this-year' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleQuickPeriod('this-year')}
          >
            Este año
          </Button>
          <Button
            variant={quickPeriod === 'last-year' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleQuickPeriod('last-year')}
          >
            Año anterior
          </Button>
        </div>

        {/* Date Range Picker Chip */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
              <CalendarIcon className="h-4 w-4" />
              {dateRange.from && dateRange.to
                ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
                : 'Seleccionar período'}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })} numberOfMonths={2} locale={es} />
          </PopoverContent>
        </Popover>

        {/* Vista Chip */}
        <Select value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue>
              {viewType === 'detailed' ? 'Vista: Reporte detallado' : 'Vista: Resumen'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="detailed">Vista: Reporte detallado</SelectItem>
            <SelectItem value="summary">Vista: Resumen</SelectItem>
          </SelectContent>
        </Select>

        {/* Personalizar reporte button */}
        <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs" onClick={() => toast.info('Funcionalidad de personalización próximamente')}>
          <Settings2 className="h-4 w-4" />
          Personalizar reporte
        </Button>
      </div>

      {/* Card de información del período */}
      {!loading && dateRange.from && dateRange.to && previousDateRange.from && previousDateRange.to && (
        <Card className="bg-white">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-sm font-medium text-slate-500 mb-1">
              {periodLabel}: <span className="whitespace-pre sm:whitespace-normal"> Comparativo {format(dateRange.to, 'yyyy')} - {format(previousDateRange.to, 'yyyy')}</span>
            </p>
            <p className="text-sm text-slate-500">Expresado en pesos colombianos COP</p>
          </CardContent>
        </Card>
      )}

      {/* Card de resumen con IA */}
      {!loading && accounts.length > 0 && (
        <Card className="border-slate-400/20 bg-slate-50">
          <CardContent className="p-0">
            <div className="flex items-center justify-between w-full h-10 p-3 border-b border-slate-400/20">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-amber-500" />
                <span className="text-xs font-medium text-slate-500">Resumen</span>
                <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300 text-xs">
                  Próximamente
                </Badge>
              </div>
              <button onClick={() => setAiSummaryExpanded(!aiSummaryExpanded)} className="p-1 hover:bg-slate-200 rounded transition-colors">
                {aiSummaryExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
            {aiSummaryExpanded && (
              <div className="px-4 py-3">
                <p className="text-sm text-slate-700 mb-3">
                  El análisis automático de tu estado de resultados estará disponible próximamente. Esta funcionalidad te ayudará a entender mejor el desempeño financiero de tu empresa.
                </p>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => toast.info('Funcionalidad próximamente')}>
                    Saber más
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">¿Te pareció útil?</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => toast.info('Funcionalidad próximamente')}>
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => toast.info('Funcionalidad próximamente')}>
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabla principal */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Generando reporte...</span>
            </div>
          </CardContent>
        </Card>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No se encontraron datos en el período seleccionado</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 p-0">
            <div className="flex items-center justify-between px-3 pt-1.5 pb-2 border-b border-gray-200">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar cuenta contable" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-8 text-sm" />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info('Funcionalidad de exportación próximamente')}>
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[350px]">&nbsp;</TableHead>
                    <TableHead className="text-right">
                      {currentPeriodShort || format(new Date(), 'MMM, yyyy', { locale: es })}
                    </TableHead>
                    <TableHead className="text-right">% de Ingresos</TableHead>
                    <TableHead className="text-right">
                      {previousPeriodShort || format(subMonths(new Date(), 1), 'MMM, yyyy', { locale: es })}
                    </TableHead>
                    <TableHead className="text-right">% de Ingresos</TableHead>
                    <TableHead className="text-right">Var. Absoluta</TableHead>
                    <TableHead className="text-right">Var. Relativa (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{filteredAccounts.map((account) => renderAccountLine(account))}</TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-end px-3 pt-2 pb-2 border-t border-gray-200">
              <p className="text-sm text-muted-foreground">
                {filteredAccounts.length}-{filteredAccounts.length} de {filteredAccounts.length}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
