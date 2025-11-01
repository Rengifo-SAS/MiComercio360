'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, startOfYear, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface BalanceSheetReportClientProps {
  companyId: string;
  userId: string;
}

interface AccountLine {
  id: string;
  name: string;
  amount: number;
  level: number;
  children?: AccountLine[];
}

export function BalanceSheetReportClient({ companyId, userId }: BalanceSheetReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [accounts, setAccounts] = useState<AccountLine[]>([]);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set(['assets', 'liabilities', 'equity']));
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);
  const [totalEquity, setTotalEquity] = useState(0);

  useEffect(() => {
    if (dateTo) generateReport();
  }, [dateTo]);

  const generateReport = async () => {
    if (!dateTo) return;
    setLoading(true);
    try {
      const endDate = endOfDay(dateTo).toISOString();

      const [accountsResult, salesPendingResult, purchasesPendingResult, inventoryResult] = await Promise.all([
        supabase.from('accounts').select('id, account_name, current_balance, account_type').eq('company_id', companyId).eq('is_active', true),
        supabase.from('sales').select('id, total_amount').eq('company_id', companyId).eq('payment_status', 'PENDING').neq('status', 'cancelled').lte('created_at', endDate).limit(10000),
        supabase.from('purchases').select('id, total_amount').eq('company_id', companyId).neq('status', 'received').lte('created_at', endDate).limit(10000),
        supabase.from('products').select('id, cost_price, warehouse_inventory:warehouse_inventory(quantity)').eq('company_id', companyId).eq('is_active', true),
      ]);

      const cashAccounts = (accountsResult.data || []).filter((a: any) => a.account_type === 'CASH_BOX' || a.account_type === 'BANK_ACCOUNT');
      const totalCash = cashAccounts.reduce((sum: number, a: any) => sum + (Number(a.current_balance) || 0), 0);
      
      // Accounts Receivable: Sum of pending sales
      const accountsReceivable = (salesPendingResult.data || []).reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
      
      // Inventory: Sum of cost_price * quantity from warehouse_inventory
      let inventory = 0;
      (inventoryResult.data || []).forEach((product: any) => {
        const costPrice = Number(product.cost_price) || 0;
        const inventoryItems = Array.isArray(product.warehouse_inventory) ? product.warehouse_inventory : [];
        const totalQuantity = inventoryItems.reduce((sum: number, inv: any) => sum + (Number(inv.quantity) || 0), 0);
        inventory += costPrice * totalQuantity;
      });
      
      // Accounts Payable: Sum of pending purchases
      const totalLiabilitiesValue = (purchasesPendingResult.data || []).reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
      
      // Calculate net profit from sales and purchases up to endDate
      const [salesResult, purchasesResult] = await Promise.all([
        supabase.from('sales').select('id, total_amount, subtotal').eq('company_id', companyId).neq('status', 'cancelled').lte('created_at', endDate).limit(10000),
        supabase.from('purchases').select('id, total_amount').eq('company_id', companyId).neq('status', 'cancelled').lte('created_at', endDate).limit(10000),
      ]);
      
      const totalSales = (salesResult.data || []).reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);
      const totalPurchases = (purchasesResult.data || []).reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
      const netProfit = totalSales - totalPurchases;
      
      const totalAssetsValue = totalCash + accountsReceivable + inventory;
      const totalEquityValue = totalAssetsValue - totalLiabilitiesValue;

      const reportAccounts: AccountLine[] = [
        {
          id: 'assets',
          name: 'ACTIVOS',
          amount: totalAssetsValue,
          level: 0,
          children: [
            {
              id: 'assets-current',
              name: 'Activos corrientes',
              amount: totalCash + accountsReceivable,
              level: 1,
              children: [
                { id: 'cash', name: 'Caja y bancos', amount: totalCash, level: 2 },
                { id: 'receivables', name: 'Cuentas por cobrar', amount: accountsReceivable, level: 2 },
                { id: 'inventory', name: 'Inventarios', amount: inventory, level: 2 },
              ],
            },
          ],
        },
        {
          id: 'liabilities',
          name: 'PASIVOS',
          amount: totalLiabilitiesValue,
          level: 0,
          children: [
            {
              id: 'liabilities-current',
              name: 'Pasivos corrientes',
              amount: totalLiabilitiesValue,
              level: 1,
              children: [{ id: 'payables', name: 'Cuentas por pagar', amount: totalLiabilitiesValue, level: 2 }],
            },
          ],
        },
        {
          id: 'equity',
          name: 'PATRIMONIO',
          amount: totalEquityValue,
          level: 0,
          children: [
            { id: 'capital', name: 'Capital', amount: totalEquityValue - (netProfit > 0 ? netProfit : 0), level: 1 },
            { id: 'retained', name: 'Utilidades retenidas', amount: netProfit > 0 ? netProfit : 0, level: 1 },
          ],
        },
      ];

      setAccounts(reportAccounts);
      setTotalAssets(totalAssetsValue);
      setTotalLiabilities(totalLiabilitiesValue);
      setTotalEquity(totalEquityValue);
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
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  const renderAccountLine = (account: AccountLine): React.ReactNode => {
    const isExpanded = expandedAccounts.has(account.id);
    const hasChildren = account.children && account.children.length > 0;

    return (
      <React.Fragment key={account.id}>
        <TableRow className={account.level === 0 ? 'bg-slate-50 font-semibold' : ''}>
          <TableCell style={{ paddingLeft: `${account.level * 20 + 8}px` }}>
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button onClick={() => toggleExpand(account.id)} className="p-0.5 hover:bg-slate-200 rounded">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              {!hasChildren && <div className="w-5" />}
              <span className={account.level === 0 ? 'font-bold' : ''}>{account.name}</span>
            </div>
          </TableCell>
          <TableCell className="text-right font-medium">{formatCurrency(account.amount)}</TableCell>
        </TableRow>
        {hasChildren && isExpanded && account.children?.map((child) => renderAccountLine(child))}
      </React.Fragment>
    );
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/reports" className="hover:text-foreground transition-colors">Reportes</Link>
        <span>/</span>
        <Link href="/dashboard/reports/accounting" className="hover:text-foreground transition-colors">Contables</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Estado de situación financiera</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">Estado de situación financiera</h1>
        <p className="text-sm md:text-base text-muted-foreground">Conoce los recursos que tienes y cómo se están aprovechando.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('h-10 justify-start text-left font-normal')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateTo, 'dd/MM/yyyy', { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={(date) => date && setDateTo(date)} locale={es} />
          </PopoverContent>
        </Popover>
      </div>

      {!loading && accounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm font-normal text-muted-foreground mb-1">Total activos</p><p className="text-lg font-semibold">{formatCurrency(totalAssets)}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm font-normal text-muted-foreground mb-1">Total pasivos</p><p className="text-lg font-semibold">{formatCurrency(totalLiabilities)}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm font-normal text-muted-foreground mb-1">Total patrimonio</p><p className="text-lg font-semibold">{formatCurrency(totalEquity)}</p></div></CardContent></Card>
        </div>
      )}

      {loading ? (
        <Card><CardContent className="pt-6"><div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">Generando reporte...</span></div></CardContent></Card>
      ) : accounts.length === 0 ? (
        <Card><CardContent className="pt-6"><div className="flex flex-col items-center justify-center py-12 text-center"><p className="text-muted-foreground">No se encontraron datos</p></div></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="pt-6 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{accounts.map((account) => renderAccountLine(account))}</TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

