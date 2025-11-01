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
import { Switch } from '@/components/ui/switch';
import {
  Calendar as CalendarIcon,
  Loader2,
  ChevronDown,
  ChevronRight,
  Search,
  Minus,
  Equal,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface IncomeExpenseReportClientProps {
  companyId: string;
  userId: string;
}

interface AccountingAccount {
  id: string;
  name: string;
  code?: string;
  level: number; // 0 = raíz, 1 = hijo, 2 = nieto, etc.
  amount: number;
  children?: AccountingAccount[];
  isExpanded?: boolean;
  parentId?: string;
}

interface AccountTree {
  [key: string]: AccountingAccount;
}

export function IncomeExpenseReportClient({
  companyId,
  userId,
}: IncomeExpenseReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtros de fecha
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfYear(new Date()),
    to: new Date(),
  });

  // Totales
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balance, setBalance] = useState(0);

  // Cargar reporte automáticamente al cambiar fechas
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      generateReport();
    }
  }, [dateRange]);

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Por favor selecciona un rango de fechas');
      return;
    }

    setLoading(true);

    try {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      // Obtener ingresos de ventas (subtotal sin impuestos, incluyendo pendientes)
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id, subtotal, total_amount, payment_status, status')
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .limit(10000);

      if (salesError) {
        console.error('Error al consultar ventas:', salesError);
        throw salesError;
      }

      // Obtener gastos de compras
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('id, total_amount, status')
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .limit(10000);

      if (purchasesError) {
        console.error('Error al consultar compras:', purchasesError);
        throw purchasesError;
      }

      // Obtener otros gastos de account_transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('account_transactions')
        .select('id, amount, transaction_type, description')
        .eq('company_id', companyId)
        .in('transaction_type', ['WITHDRAWAL', 'PAYMENT', 'FEE'])
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .limit(10000);

      if (transactionsError) {
        console.error('Error al consultar transacciones:', transactionsError);
        // No fallar si no hay tabla de transacciones
      }

      // Calcular totales
      const salesTotal = (salesData || []).reduce((sum, sale) => {
        return sum + (Number(sale.subtotal) || 0);
      }, 0);

      const purchasesTotal = (purchasesData || []).reduce((sum, purchase) => {
        return sum + (Number(purchase.total_amount) || 0);
      }, 0);

      const transactionsTotal = (transactionsData || []).reduce((sum, tx) => {
        // Los withdrawals y payments son negativos (egresos)
        const amount = Math.abs(Number(tx.amount) || 0);
        return sum + amount;
      }, 0);

      // Estructura jerárquica simplificada de cuentas
      const accountsTree: AccountingAccount[] = [
        {
          id: 'income',
          name: 'Ingresos',
          level: 0,
          amount: salesTotal,
          children: [
            {
              id: 'income-ordinary',
              name: 'Ingresos de actividades ordinarias',
              level: 1,
              amount: salesTotal,
              parentId: 'income',
              children: [
                {
                  id: 'income-sales',
                  name: 'Ventas',
                  level: 2,
                  amount: salesTotal,
                  parentId: 'income-ordinary',
                },
                {
                  id: 'income-returns',
                  name: 'Devoluciones en ventas',
                  level: 2,
                  amount: 0,
                  parentId: 'income-ordinary',
                },
              ],
            },
            {
              id: 'income-other',
              name: 'Otros Ingresos',
              level: 1,
              amount: 0,
              parentId: 'income',
              children: [
                {
                  id: 'income-financial',
                  name: 'Ingresos financieros',
                  level: 2,
                  amount: 0,
                  parentId: 'income-other',
                },
                {
                  id: 'income-other-diverse',
                  name: 'Otros ingresos diversos',
                  level: 2,
                  amount: 0,
                  parentId: 'income-other',
                },
              ],
            },
          ],
        },
        {
          id: 'costs',
          name: 'Costos',
          level: 0,
          amount: -purchasesTotal,
          children: [
            {
              id: 'costs-sales-operation',
              name: 'Costos de ventas y operación',
              level: 1,
              amount: -purchasesTotal,
              parentId: 'costs',
              children: [
                {
                  id: 'costs-goods-sold',
                  name: 'Costos de la mercancía vendida',
                  level: 2,
                  amount: -purchasesTotal,
                  parentId: 'costs-sales-operation',
                },
              ],
            },
            {
              id: 'costs-production',
              name: 'Costos de producción',
              level: 1,
              amount: 0,
              parentId: 'costs',
            },
          ],
        },
        {
          id: 'expenses',
          name: 'Gastos',
          level: 0,
          amount: -transactionsTotal,
          children: [
            {
              id: 'expenses-sales',
              name: 'Gastos de venta',
              level: 1,
              amount: -transactionsTotal * 0.3, // Estimación
              parentId: 'expenses',
            },
            {
              id: 'expenses-admin',
              name: 'Gastos de administración',
              level: 1,
              amount: -transactionsTotal * 0.5, // Estimación
              parentId: 'expenses',
            },
            {
              id: 'expenses-general',
              name: 'Gastos generales',
              level: 1,
              amount: -transactionsTotal * 0.2, // Estimación
              parentId: 'expenses',
            },
          ],
        },
      ];

      setAccounts(accountsTree);
      setTotalIncome(salesTotal);
      setTotalExpenses(purchasesTotal + transactionsTotal);
      setBalance(salesTotal - purchasesTotal - transactionsTotal);

      // Expandir todas las cuentas por defecto
      const allAccountIds = new Set<string>();
      const collectIds = (accs: AccountingAccount[]) => {
        accs.forEach((acc) => {
          allAccountIds.add(acc.id);
          if (acc.children) {
            collectIds(acc.children);
          }
        });
      };
      collectIds(accountsTree);
      setExpandedAccounts(allAccountIds);
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);

      const errorMessage =
        error?.message ||
        error?.details ||
        'Error desconocido al generar el reporte';
      toast.error(`Error al generar el reporte: ${errorMessage}`);

      setAccounts([]);
      setTotalIncome(0);
      setTotalExpenses(0);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar cuentas por búsqueda y saldo cero
  const filteredAccounts = useMemo(() => {
    const filterAccount = (acc: AccountingAccount): AccountingAccount | null => {
      // Filtrar por saldo cero
      if (!showZeroBalances && acc.amount === 0 && (!acc.children || acc.children.length === 0)) {
        return null;
      }

      // Filtrar por búsqueda
      const matchesSearch =
        !searchQuery.trim() ||
        acc.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtrar hijos recursivamente
      const filteredChildren = acc.children
        ? acc.children.map(filterAccount).filter((c): c is AccountingAccount => c !== null)
        : undefined;

      // Si tiene hijos que pasaron el filtro, incluir el padre
      if (filteredChildren && filteredChildren.length > 0) {
        return {
          ...acc,
          children: filteredChildren,
        };
      }

      // Si no tiene hijos o no pasa el filtro de búsqueda
      if (!matchesSearch) {
        return null;
      }

      return {
        ...acc,
        children: filteredChildren,
      };
    };

    return accounts.map(filterAccount).filter((acc): acc is AccountingAccount => acc !== null);
  }, [accounts, searchQuery, showZeroBalances]);

  const renderAccountRow = (account: AccountingAccount): React.ReactElement[] => {
    const rows: React.ReactElement[] = [];
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);
    const paddingLeft = `${account.level * 2}rem`;
    const isNegative = account.amount < 0;

    rows.push(
      <TableRow key={account.id}>
        <TableCell>
          <div className="flex gap-2 items-center" style={{ paddingLeft }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleAccount(account.id)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" /> // Espaciador para alineación
            )}
            <span
              className={cn(
                'hover:underline hover:underline-offset-2 cursor-pointer',
                account.level === 0
                  ? 'font-semibold text-sm'
                  : account.level === 1
                  ? 'text-xs'
                  : 'text-xs'
              )}
            >
              {account.name}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <span
            className={cn(
              'font-semibold',
              account.level === 0 ? 'text-sm' : 'text-xs',
              isNegative && 'text-rose-700'
            )}
          >
            {formatCurrency(account.amount)}
          </span>
        </TableCell>
      </TableRow>
    );

    // Renderizar hijos si está expandido
    if (hasChildren && isExpanded && account.children) {
      account.children.forEach((child) => {
        rows.push(...renderAccountRow(child));
      });
    }

    return rows;
  };

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    return `${sign}${new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(absValue)}`;
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
          Ingresos y gastos
        </span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Ingresos y gastos
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Conoce los valores asociados a tus cuentas contables de ingresos y egresos, sin impuestos e incluyendo los pagos pendientes.
        </p>
      </div>

      {/* Filtro de período */}
      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-8 justify-start text-left font-normal',
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

        <Button
          onClick={generateReport}
          disabled={loading || !dateRange?.from || !dateRange?.to}
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

      {/* Totales */}
      {!loading && accounts.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">
                  Total de ingresos
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(totalIncome)}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <Minus className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">
                  Total de egresos
                </p>
                <p className="text-lg font-semibold text-rose-700">
                  {formatCurrency(-totalExpenses)}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <Equal className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-normal text-muted-foreground mb-1">
                  Saldo
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controles de tabla */}
      {!loading && accounts.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cuenta contable"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="zero-balances" className="text-sm font-normal">
              Cuentas con saldos en cero
            </Label>
            <Switch
              id="zero-balances"
              checked={showZeroBalances}
              onCheckedChange={setShowZeroBalances}
            />
          </div>
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
      ) : filteredAccounts.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">
                {accounts.length === 0
                  ? 'No se encontraron datos en el período seleccionado'
                  : 'No hay cuentas que coincidan con los filtros seleccionados'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="pt-6 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta contable</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => renderAccountRow(account))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

