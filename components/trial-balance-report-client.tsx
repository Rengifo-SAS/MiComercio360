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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  ChevronRight,
  Search,
  ArrowDown,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface TrialBalanceReportClientProps {
  companyId: string;
  userId: string;
}

interface AccountBalance {
  id: string;
  name: string;
  code?: string;
  level: number;
  children?: AccountBalance[];
  isTotal?: boolean;
  categoryId?: string;
  initialDebit: number;
  initialCredit: number;
  periodDebit: number;
  periodCredit: number;
  finalDebit: number;
  finalCredit: number;
}

export function TrialBalanceReportClient({ companyId, userId }: TrialBalanceReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [annualClosure, setAnnualClosure] = useState(false);

  // Totals - sum all top-level accounts (level 0)
  const totals = useMemo(() => {
    const calculateTotals = (accountList: AccountBalance[]) => {
      let totalInitialDebit = 0;
      let totalInitialCredit = 0;
      let totalPeriodDebit = 0;
      let totalPeriodCredit = 0;
      let totalFinalDebit = 0;
      let totalFinalCredit = 0;

      const sumAccount = (acc: AccountBalance) => {
        // Only sum top-level accounts (level 0) for totals
        if (acc.level === 0) {
          totalInitialDebit += acc.initialDebit;
          totalInitialCredit += acc.initialCredit;
          totalPeriodDebit += acc.periodDebit;
          totalPeriodCredit += acc.periodCredit;
          totalFinalDebit += acc.finalDebit;
          totalFinalCredit += acc.finalCredit;
        }
      };

      accountList.forEach(sumAccount);

      return {
        initialDebit: totalInitialDebit,
        initialCredit: totalInitialCredit,
        periodDebit: totalPeriodDebit,
        periodCredit: totalPeriodCredit,
        finalDebit: totalFinalDebit,
        finalCredit: totalFinalCredit,
      };
    };

    return calculateTotals(accounts);
  }, [accounts]);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      generateReport();
    }
  }, [dateRange, annualClosure]);

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
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
        .select('id, amount, account_id')
        .eq('company_id', companyId)
        .lt('transaction_date', startDate)
        .limit(10000);

      if (initialError) throw initialError;

      // Fetch sales and purchases for account grouping
      const [salesResult, purchasesResult] = await Promise.all([
        supabase
          .from('sales')
          .select('id, subtotal, total_amount, status')
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .limit(10000),
        supabase
          .from('purchases')
          .select('id, total_amount, status')
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .limit(10000),
      ]);

      const salesTotal = (salesResult.data || []).reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);
      const purchasesTotal = (purchasesResult.data || []).reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);

      // Group by account
      const accountsMap = new Map<string, { initialDebit: number; initialCredit: number; periodDebit: number; periodCredit: number }>();

      // Process initial transactions
      (initialTransactions || []).forEach((tx: any) => {
        const amount = Number(tx.amount) || 0;
        const existing = accountsMap.get(tx.account_id) || {
          initialDebit: 0,
          initialCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
        };
        if (amount > 0) {
          existing.initialDebit += amount;
        } else {
          existing.initialCredit += Math.abs(amount);
        }
        accountsMap.set(tx.account_id, existing);
      });

      // Process period transactions
      (periodTransactions || []).forEach((tx: any) => {
        const account = Array.isArray(tx.account) ? tx.account[0] : tx.account;
        if (!account) return;
        const amount = Number(tx.amount) || 0;
        const existing = accountsMap.get(account.id) || {
          initialDebit: 0,
          initialCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
        };
        if (amount > 0) {
          existing.periodDebit += amount;
        } else {
          existing.periodCredit += Math.abs(amount);
        }
        accountsMap.set(account.id, existing);
      });

      // Get all accounts
      const { data: allAccounts } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('company_id', companyId)
        .eq('is_active', true);

      // Build account balances map from actual transactions
      const accountBalancesMap = new Map<string, AccountBalance>();

      // Process all accounts and their transactions
      (allAccounts || []).forEach((account: any) => {
        const accountData = accountsMap.get(account.id) || {
          initialDebit: 0,
          initialCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
        };

        const finalDebit = accountData.initialDebit + accountData.periodDebit;
        const finalCredit = accountData.initialCredit + accountData.periodCredit;

        accountBalancesMap.set(account.id, {
          id: account.id,
          name: account.account_name,
          level: 0,
          initialDebit: accountData.initialDebit,
          initialCredit: accountData.initialCredit,
          periodDebit: accountData.periodDebit,
          periodCredit: accountData.periodCredit,
          finalDebit,
          finalCredit,
        });
      });

      // Build hierarchical structure based on account categories
      // For now, we'll use a simplified structure similar to profit-loss
      const reportAccounts: AccountBalance[] = [
        {
          id: 'assets',
          name: 'Activos',
          level: 0,
          categoryId: '5001',
          initialDebit: 0,
          initialCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
          finalDebit: 0,
          finalCredit: 0,
          children: [
            {
              id: 'current-assets',
              name: 'Activos corrientes',
              level: 1,
              categoryId: '5002',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'non-current-assets',
              name: 'Activos no corrientes',
              level: 1,
              categoryId: '5050',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
          ],
        },
        {
          id: 'liabilities',
          name: 'Pasivos',
          level: 0,
          categoryId: '5066',
          initialDebit: 0,
          initialCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
          finalDebit: 0,
          finalCredit: 0,
          children: [
            {
              id: 'current-liabilities',
              name: 'Pasivos corrientes',
              level: 1,
              categoryId: '5067',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'non-current-liabilities',
              name: 'Pasivos no corrientes',
              level: 1,
              categoryId: '5126',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
          ],
        },
        {
          id: 'equity',
          name: 'Patrimonio',
          level: 0,
          categoryId: '5131',
          initialDebit: 0,
          initialCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
          finalDebit: 0,
          finalCredit: 0,
          children: [
            {
              id: 'capital',
              name: 'Capital social',
              level: 1,
              categoryId: '5132',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'reserves',
              name: 'Reservas',
              level: 1,
              categoryId: '5139',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'earnings',
              name: 'Resultado del ejercicio',
              level: 1,
              categoryId: '5140',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'accumulated',
              name: 'Ganancias acumuladas',
              level: 1,
              categoryId: '5143',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'surplus',
              name: 'Supertávit',
              level: 1,
              categoryId: '5144',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'initial-adjustments',
              name: 'Ajustes por saldos iniciales',
              level: 1,
              categoryId: '5145',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
          ],
        },
        {
          id: 'income',
          name: 'Ingresos',
          level: 0,
          categoryId: '5148',
          initialDebit: 0,
          initialCredit: salesTotal,
          periodDebit: 0,
          periodCredit: 0,
          finalDebit: 0,
          finalCredit: 0,
          children: [
            {
              id: 'ordinary-income',
              name: 'Ingresos de actividades ordinarias',
              level: 1,
              categoryId: '5149',
              initialDebit: 0,
              initialCredit: salesTotal,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
          ],
        },
        {
          id: 'expenses',
          name: 'Gastos',
          level: 0,
          categoryId: '5159',
          initialDebit: 0,
          initialCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
          finalDebit: 0,
          finalCredit: 0,
          children: [
            {
              id: 'sales-expenses',
              name: 'Gastos de venta',
              level: 1,
              categoryId: '5160',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'admin-expenses',
              name: 'Gastos de administración',
              level: 1,
              categoryId: '5179',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'general-expenses',
              name: 'Gastos generales',
              level: 1,
              categoryId: '5198',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'financial-expenses',
              name: 'Gastos financieros',
              level: 1,
              categoryId: '5251',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'other-expenses',
              name: 'Otros gastos',
              level: 1,
              categoryId: '5254',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'tax-expenses',
              name: 'Gastos por impuestos',
              level: 1,
              categoryId: '5260',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
          ],
        },
        {
          id: 'costs',
          name: 'Costos',
          level: 0,
          categoryId: '5264',
          initialDebit: purchasesTotal,
          initialCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
          finalDebit: 0,
          finalCredit: 0,
          children: [
            {
              id: 'sales-costs',
              name: 'Costos de ventas y operación',
              level: 1,
              categoryId: '5265',
              initialDebit: purchasesTotal,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
          ],
        },
        {
          id: 'production-costs',
          name: 'Costos de producción',
          level: 0,
          categoryId: '5272',
          initialDebit: 0,
          initialCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
          finalDebit: 0,
          finalCredit: 0,
          children: [
            {
              id: 'raw-materials',
              name: 'Materia prima directa',
              level: 1,
              categoryId: '5273',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'labor',
              name: 'Mano de obra',
              level: 1,
              categoryId: '5274',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'indirect-costs',
              name: 'Costos indirectos',
              level: 1,
              categoryId: '5289',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'service-contracts',
              name: 'Contratos de servicios',
              level: 1,
              categoryId: '5290',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
          ],
        },
        {
          id: 'order-accounts',
          name: 'Cuentas de orden',
          level: 0,
          categoryId: '5291',
          initialDebit: 0,
          initialCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
          finalDebit: 0,
          finalCredit: 0,
          children: [
            {
              id: 'debtor-order',
              name: 'Cuentas de orden deudoras',
              level: 1,
              categoryId: '5292',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
            {
              id: 'creditor-order',
              name: 'Cuentas de orden acreedoras',
              level: 1,
              categoryId: '5293',
              initialDebit: 0,
              initialCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
              finalDebit: 0,
              finalCredit: 0,
            },
          ],
        },
      ];

      // Calculate final balances recursively
      const calculateFinalBalances = (accountList: AccountBalance[]): AccountBalance[] => {
        return accountList.map((acc) => {
          let children = acc.children ? calculateFinalBalances(acc.children) : undefined;
          
          // Calculate final balances
          const finalDebit = acc.initialDebit + acc.periodDebit;
          const finalCredit = acc.initialCredit + acc.periodCredit;
          
          // If has children, sum their values (but keep own values if they exist)
          if (children && children.length > 0) {
            const childInitialDebit = children.reduce((sum, c) => sum + c.initialDebit, 0);
            const childInitialCredit = children.reduce((sum, c) => sum + c.initialCredit, 0);
            const childPeriodDebit = children.reduce((sum, c) => sum + c.periodDebit, 0);
            const childPeriodCredit = children.reduce((sum, c) => sum + c.periodCredit, 0);
            const childFinalDebit = children.reduce((sum, c) => sum + c.finalDebit, 0);
            const childFinalCredit = children.reduce((sum, c) => sum + c.finalCredit, 0);
            
            // Use parent's own values if they exist, otherwise sum children
            return {
              ...acc,
              initialDebit: acc.initialDebit || childInitialDebit,
              initialCredit: acc.initialCredit || childInitialCredit,
              periodDebit: acc.periodDebit || childPeriodDebit,
              periodCredit: acc.periodCredit || childPeriodCredit,
              finalDebit: (acc.initialDebit || childInitialDebit) + (acc.periodDebit || childPeriodDebit),
              finalCredit: (acc.initialCredit || childInitialCredit) + (acc.periodCredit || childPeriodCredit),
              children,
            };
          }
          
          return {
            ...acc,
            finalDebit,
            finalCredit,
            children,
          };
        });
      };

      const calculatedAccounts = calculateFinalBalances(reportAccounts);
      
      // Expand top-level accounts by default
      setExpandedAccounts(new Set(calculatedAccounts.map((a) => a.id)));
      setAccounts(calculatedAccounts);
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
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAccounts(newExpanded);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  const renderAccountRow = (account: AccountBalance): React.ReactNode => {
    const isExpanded = expandedAccounts.has(account.id);
    const hasChildren = account.children && account.children.length > 0;
    const isTotalRow = account.isTotal || account.level === 0;
    const shouldShow = showZeroBalances || account.initialDebit !== 0 || account.initialCredit !== 0 || account.periodDebit !== 0 || account.periodCredit !== 0 || account.finalDebit !== 0 || account.finalCredit !== 0;

    if (!shouldShow && !hasChildren) return null;

    const matchesSearch = !searchQuery.trim() || account.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch && !hasChildren) return null;

    const filteredChildren = account.children?.filter((child) => {
      const childMatches = !searchQuery.trim() || child.name.toLowerCase().includes(searchQuery.toLowerCase());
      const childShouldShow = showZeroBalances || child.initialDebit !== 0 || child.initialCredit !== 0 || child.periodDebit !== 0 || child.periodCredit !== 0 || child.finalDebit !== 0 || child.finalCredit !== 0;
      return childMatches && childShouldShow;
    });

    const hasVisibleChildren = filteredChildren && filteredChildren.length > 0;

    return (
      <React.Fragment key={account.id}>
        <TableRow className={isTotalRow ? 'bg-slate-50 font-semibold' : ''}>
          <TableCell style={{ paddingLeft: `${account.level * 24 + 8}px` }}>
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button onClick={() => toggleExpand(account.id)} className="p-0.5 hover:bg-slate-200 rounded">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              {!hasChildren && <div className="w-5" />}
              {account.categoryId ? (
                <Link
                  href={`/dashboard/reports/accounting/account-movements?from=${format(dateRange.from!, 'yyyy-MM-dd')}&to=${format(dateRange.to!, 'yyyy-MM-dd')}&category_id=${account.categoryId}`}
                  target="_blank"
                  className={cn(
                    'hover:underline hover:underline-offset-2 break-words',
                    isTotalRow ? 'font-semibold text-sm' : 'font-semibold text-xs'
                  )}
                >
                  {account.name}
                </Link>
              ) : (
                <span className={cn(isTotalRow ? 'font-semibold text-sm' : 'font-semibold text-xs')}>{account.name}</span>
              )}
            </div>
          </TableCell>
          <TableCell className="text-right text-xs">
            {account.initialDebit !== 0 ? formatCurrency(account.initialDebit) : ''}
          </TableCell>
          <TableCell className="text-right text-xs">
            {account.initialCredit !== 0 ? formatCurrency(account.initialCredit) : ''}
          </TableCell>
          <TableCell className="text-right text-xs">
            {account.periodDebit !== 0 ? formatCurrency(account.periodDebit) : ''}
          </TableCell>
          <TableCell className="text-right text-xs">
            {account.periodCredit !== 0 ? formatCurrency(account.periodCredit) : ''}
          </TableCell>
          <TableCell className="text-right text-xs">
            {account.finalDebit !== 0 ? formatCurrency(account.finalDebit) : ''}
          </TableCell>
          <TableCell className="text-right text-xs">
            {account.finalCredit !== 0 ? formatCurrency(account.finalCredit) : ''}
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && filteredChildren && filteredChildren.map((child) => renderAccountRow(child))}
      </React.Fragment>
    );
  };

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim() && showZeroBalances) return accounts;
    
    const filterAccount = (acc: AccountBalance): AccountBalance | null => {
      const matchesSearch = !searchQuery.trim() || acc.name.toLowerCase().includes(searchQuery.toLowerCase());
      const shouldShow = showZeroBalances || acc.initialDebit !== 0 || acc.initialCredit !== 0 || acc.periodDebit !== 0 || acc.periodCredit !== 0 || acc.finalDebit !== 0 || acc.finalCredit !== 0;
      
      const filteredChildren = acc.children
        ? acc.children.map(filterAccount).filter((c): c is AccountBalance => c !== null)
        : undefined;
      
      if (filteredChildren && filteredChildren.length > 0) {
        return {
          ...acc,
          children: filteredChildren,
        };
      }
      
      if (!matchesSearch || (!shouldShow && !acc.children)) {
        return null;
      }
      
      return {
        ...acc,
        children: filteredChildren,
      };
    };
    
    return accounts.map(filterAccount).filter((acc): acc is AccountBalance => acc !== null);
  }, [accounts, searchQuery, showZeroBalances]);

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
        <span className="text-foreground font-medium">Balance de prueba</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">Balance de prueba</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Consulta el saldo de todas tus cuentas contables con el acumulado de sus movimientos débitos y créditos.
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

      {/* Date Range Filter */}
      <div className="flex gap-4 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 gap-2">
              <CalendarIcon className="h-4 w-4" />
              {dateRange.from && dateRange.to
                ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`
                : 'Seleccionar período'}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })} numberOfMonths={2} locale={es} />
          </PopoverContent>
        </Popover>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-1 gap-2 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cuenta contable"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => toast.info('Funcionalidad de exportación próximamente')}>
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <Switch id="annual-closure" checked={annualClosure} onCheckedChange={setAnnualClosure} />
            <Label htmlFor="annual-closure" className="text-sm cursor-pointer">
              Cierre anual
            </Label>
            <HelpCircle className="h-5 w-5 text-blue-500 cursor-help" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="zero-balances" checked={showZeroBalances} onCheckedChange={setShowZeroBalances} />
            <Label htmlFor="zero-balances" className="text-sm cursor-pointer">
              Cuentas con saldos en cero
            </Label>
          </div>
        </div>
      </div>

      {/* Section Header Bar */}
      <div className="w-full h-10 border-b bg-slate-400/20 border-slate-200">
        <div className="flex items-center h-full">
          <div className="min-w-[300px] flex relative justify-center items-center w-52 h-full text-xs font-medium text-slate-500 border-r border-slate-200"></div>
          <div className="flex relative justify-center items-center w-52 h-full text-xs font-medium text-slate-500 border-r border-slate-200">
            Saldo inicial
          </div>
          <div className="flex relative justify-center items-center w-52 h-full text-xs font-medium text-slate-500 border-r border-slate-200">
            Movimientos
          </div>
          <div className="flex relative justify-center items-center w-52 h-full text-xs font-medium text-slate-500">
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
      {!loading && filteredAccounts.length > 0 && (
        <Card>
          <CardContent className="pt-6 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[300px]">Cuenta contable</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => renderAccountRow(account))}
                  {/* Totals Row */}
                  <TableRow className="bg-slate-100 font-semibold">
                    <TableCell>
                      <span className="font-semibold text-sm">Total</span>
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">{formatCurrency(totals.initialDebit)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{formatCurrency(totals.initialCredit)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{formatCurrency(totals.periodDebit)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{formatCurrency(totals.periodCredit)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{formatCurrency(totals.finalDebit)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{formatCurrency(totals.finalCredit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredAccounts.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No se encontraron cuentas para el período seleccionado</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
