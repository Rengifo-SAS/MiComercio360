'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar as CalendarIcon,
  Loader2,
  Download,
  Settings2,
  Share2,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface AccountMovementsReportClientProps {
  companyId: string;
  userId: string;
}

interface AccountingAccount {
  id: string;
  code: string;
  name: string;
  level: number;
  children?: AccountingAccount[];
}

interface AccountMovement {
  id: string;
  transaction_date: string;
  transaction_type: string;
  reference_number: string;
  description: string;
  debit: number;
  credit: number;
  initial_balance: number;
  net_movement: number;
  final_balance: number;
  account_id?: string;
  account_code?: string;
  account_name?: string;
  customer_name?: string;
  supplier_name?: string;
  status: string;
  journal_entry?: string;
}

interface SummaryTotals {
  initialBalance: number;
  totalDebit: number;
  totalCredit: number;
  netMovement: number;
  finalBalance: number;
}

export function AccountMovementsReportClient({ companyId, userId }: AccountMovementsReportClientProps) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('');
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [summary, setSummary] = useState<SummaryTotals>({
    initialBalance: 0,
    totalDebit: 0,
    totalCredit: 0,
    netMovement: 0,
    finalBalance: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Table filters
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [journalFilter, setJournalFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [thirdPartyFilter, setThirdPartyFilter] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('');

  // Hierarchical accounting accounts (PUC structure)
  const accountingAccounts: AccountingAccount[] = [
    {
      id: 'all',
      code: '',
      name: 'Todas las cuentas',
      level: 0,
      children: [
        {
          id: '1',
          code: '1',
          name: 'Activos',
          level: 1,
          children: [
            { id: '11', code: '11', name: 'Disponible', level: 2 },
            { id: '13', code: '13', name: 'Deudores', level: 2 },
            { id: '15', code: '15', name: 'Inventarios', level: 2 },
            { id: '16', code: '16', name: 'Propiedades, planta y equipo', level: 2 },
          ],
        },
        {
          id: '2',
          code: '2',
          name: 'Pasivos',
          level: 1,
          children: [
            { id: '21', code: '21', name: 'Obligaciones financieras', level: 2 },
            { id: '22', code: '22', name: 'Cuentas por pagar', level: 2 },
            { id: '23', code: '23', name: 'Obligaciones laborales', level: 2 },
          ],
        },
        {
          id: '3',
          code: '3',
          name: 'Patrimonio',
          level: 1,
          children: [
            { id: '31', code: '31', name: 'Capital', level: 2 },
            { id: '36', code: '36', name: 'Revalorización del patrimonio', level: 2 },
          ],
        },
        {
          id: '4',
          code: '4',
          name: 'Ingresos',
          level: 1,
          children: [
            { id: '41', code: '41', name: 'Ingresos operacionales', level: 2 },
            { id: '42', code: '42', name: 'Ingresos no operacionales', level: 2 },
          ],
        },
        {
          id: '5',
          code: '5',
          name: 'Gastos',
          level: 1,
          children: [
            { id: '51', code: '51', name: 'Gastos operacionales', level: 2 },
            { id: '52', code: '52', name: 'Gastos no operacionales', level: 2 },
          ],
        },
      ],
    },
  ];

  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Process URL parameters on mount and when they change
  useEffect(() => {
    if (!searchParams) {
      setUrlParamsProcessed(true);
      setInitialLoad(false);
      return;
    }

    const categoryId = searchParams.get('category_id');
    const accountId = searchParams.get('account_id');
    const thirdPartyId = searchParams.get('third_party_id');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    let hasUrlParams = false;
    
    // Parse date parameters
    if (fromParam && toParam) {
      try {
        // Support both yyyy-MM-dd and ISO format
        const fromDateStr = fromParam.includes('T') ? fromParam : `${fromParam}T00:00:00`;
        const toDateStr = toParam.includes('T') ? toParam : `${toParam}T23:59:59`;
        
        const fromDate = new Date(fromDateStr);
        const toDate = new Date(toDateStr);
        
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          setDateRange({
            from: fromDate,
            to: toDate,
          });
          hasUrlParams = true;
        }
      } catch (error) {
        console.error('Error parsing date parameters:', error);
      }
    }
    
    // Handle account_id (direct account ID from trial balance)
    if (accountId) {
      setSelectedAccountId(accountId);
      hasUrlParams = true;
    } else if (categoryId) {
      // categoryId can be either a code from the hardcoded tree or a database account code
      // First try to find in hardcoded tree
      const findAccount = (accounts: AccountingAccount[]): AccountingAccount | null => {
        for (const acc of accounts) {
          if (acc.id === categoryId || acc.code === categoryId) return acc;
          if (acc.children) {
            const found = findAccount(acc.children);
            if (found) return found;
          }
        }
        return null;
      };
      const account = findAccount(accountingAccounts);
      
      if (account && account.id !== 'all') {
        // Found in hardcoded tree - but these don't have real account_ids
        // For now, we'll filter by account code in the generateReport
        setSelectedAccountId(categoryId);
        hasUrlParams = true;
      } else {
        // Not found in tree, try to find in database accounts by code
        // categoryId might be a database account code (e.g., '5273')
        (async () => {
          try {
            // Try exact match first, then partial match
            let { data: dbAccounts, error: dbError } = await supabase
              .from('accounts')
              .select('id, account_name, account_code')
              .eq('company_id', companyId)
              .eq('is_active', true)
              .eq('account_code', categoryId)
              .limit(1);
            
            // If no exact match, try partial match
            if (!dbAccounts || dbAccounts.length === 0) {
              const { data: partialMatch, error: partialError } = await supabase
                .from('accounts')
                .select('id, account_name, account_code')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .like('account_code', `${categoryId}%`)
                .limit(1);
              
              dbAccounts = partialMatch;
              dbError = partialError;
            }
            
            if (dbError) {
              console.error('Error loading account from database:', dbError);
            } else if (dbAccounts && dbAccounts.length > 0) {
              const dbAccount = dbAccounts[0];
              setSelectedAccountId(dbAccount.id);
              hasUrlParams = true;
              // Trigger report generation after account is set
              if (fromParam && toParam) {
                setTimeout(() => {
                  if (dateRange?.from && dateRange?.to) {
                    generateReport();
                  }
                }, 500);
              }
            } else {
              // No account found - might be a category code that needs special handling
              // Store the categoryId to filter by in generateReport
              setSelectedAccountId(categoryId);
              hasUrlParams = true;
            }
          } catch (error) {
            console.error('Error loading account from database:', error);
            // Fallback: use categoryId as filter
            setSelectedAccountId(categoryId);
            hasUrlParams = true;
          }
        })();
      }
    }
    
    // Handle third_party_id filter if provided
    if (thirdPartyId) {
      // This could be used to filter transactions by third party
      // For now, we'll store it but might need to implement the filter
      hasUrlParams = true;
    }
    
    setUrlParamsProcessed(true);
    
    // If we have URL params with dates, trigger report generation after state updates
    if (hasUrlParams && fromParam && toParam) {
      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        if (dateRange?.from && dateRange?.to) {
          generateReport();
        }
      }, 300);
    } else {
      setInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Mark initial load as complete when date range is set from URL
  useEffect(() => {
    if (urlParamsProcessed && dateRange?.from && dateRange?.to) {
      setInitialLoad(false);
    }
  }, [dateRange, urlParamsProcessed]);

  // Auto-load report when date range or account changes (but not on initial URL param load)
  useEffect(() => {
    if (!initialLoad && urlParamsProcessed && dateRange?.from && dateRange?.to) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedAccountId]);

  const renderAccountOption = (account: AccountingAccount, prefix: string = ''): React.ReactElement => {
    const indent = '  '.repeat(account.level);
    return (
      <div key={account.id}>
        <SelectItem value={account.id} className="pl-2">
          <span className="whitespace-pre">{indent}{account.code ? `${account.code} - ` : ''}{account.name}</span>
        </SelectItem>
        {account.children && account.children.map((child) => renderAccountOption(child, prefix))}
      </div>
    );
  };

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
          balance_after,
          reference_number,
          description,
          related_entity_type,
          related_entity_id,
          account:accounts!account_transactions_account_id_fkey (
            id,
            account_name,
            account_code
          )
        `
        )
        .eq('company_id', companyId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false })
        .limit(10000);

      const { data: transactionsData, error: transactionsError } = await query;

      if (transactionsError) throw transactionsError;

      // Get related customers and suppliers
      const customerIds: string[] = [];
      const supplierIds: string[] = [];

      (transactionsData || []).forEach((tx: any) => {
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
          .select('id, customer_id, customers:customers!sales_customer_id_fkey (business_name)')
          .in('id', [...new Set(customerIds)])
          .eq('company_id', companyId);

        if (salesData) {
          salesData.forEach((sale: any) => {
            const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
            customersMap.set(sale.id, customer?.business_name || 'Consumidor Final');
          });
        }
      }

      if (supplierIds.length > 0) {
        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('id, supplier_id, suppliers:suppliers!purchases_supplier_id_fkey (name)')
          .in('id', [...new Set(supplierIds)])
          .eq('company_id', companyId);

        if (purchasesData) {
          purchasesData.forEach((purchase: any) => {
            const supplier = Array.isArray(purchase.suppliers) ? purchase.suppliers[0] : purchase.suppliers;
            suppliersMap.set(purchase.id, supplier?.name || '');
          });
        }
      }

      // Process transactions into movements
      const processedMovements: AccountMovement[] = [];
      let runningBalance = 0;
      const firstDate = transactionsData && transactionsData.length > 0 ? new Date(transactionsData[transactionsData.length - 1].transaction_date) : null;

      // Calculate initial balance (sum of all transactions before start date)
      // If an account is selected, we need to filter by account_id or account_code
      let initialBalanceQuery = supabase
        .from('account_transactions')
        .select('amount, account_id, account:accounts!account_transactions_account_id_fkey(id, account_code)')
        .eq('company_id', companyId)
        .lt('transaction_date', startDate)
        .limit(10000);

      const { data: initialTransactions } = await initialBalanceQuery;

      if (initialTransactions) {
        // If account is selected, filter initial transactions
        let filteredInitial = initialTransactions;
        if (selectedAccountId && selectedAccountId !== 'all') {
          if (selectedAccountId.length > 20 || selectedAccountId.includes('-')) {
            // UUID - filter by account_id
            filteredInitial = initialTransactions.filter((tx: any) => tx.account_id === selectedAccountId);
          } else {
            // Category code - filter by account_code
            filteredInitial = initialTransactions.filter((tx: any) => {
              const account = Array.isArray(tx.account) ? tx.account[0] : tx.account;
              const accountCode = account?.account_code || '';
              return accountCode === selectedAccountId || 
                     accountCode.startsWith(selectedAccountId) ||
                     accountCode.includes(selectedAccountId);
            });
          }
        }
        runningBalance = filteredInitial.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
      }

      const initialBalance = runningBalance;

      (transactionsData || []).forEach((tx: any, index: number) => {
        const account = Array.isArray(tx.account) ? tx.account[0] : tx.account;
        const amount = Number(tx.amount) || 0;
        const debit = amount > 0 ? amount : 0;
        const credit = amount < 0 ? Math.abs(amount) : 0;
        
        let thirdPartyName = '';
        if (tx.related_entity_type === 'sale' && tx.related_entity_id) {
          thirdPartyName = customersMap.get(tx.related_entity_id) || '';
        } else if (tx.related_entity_type === 'purchase' && tx.related_entity_id) {
          thirdPartyName = suppliersMap.get(tx.related_entity_id) || '';
        }

        const initialBalanceForRow = runningBalance;
        runningBalance += amount;
        const finalBalanceForRow = runningBalance;

        processedMovements.push({
          id: tx.id,
          transaction_date: tx.transaction_date,
          transaction_type: tx.transaction_type || 'OTHER',
          reference_number: tx.reference_number || '',
          description: tx.description || '',
          debit,
          credit,
          initial_balance: initialBalanceForRow,
          net_movement: amount,
          final_balance: finalBalanceForRow,
          account_id: account?.id || '',
          account_code: '', // account_code no existe en accounts
          account_name: account?.account_name || 'Sin cuenta',
          customer_name: tx.related_entity_type === 'sale' ? thirdPartyName : undefined,
          supplier_name: tx.related_entity_type === 'purchase' ? thirdPartyName : undefined,
          status: 'PROCESSED',
          journal_entry: tx.reference_number || '',
        });
      });

      // Filter by selected account if needed
      let filteredMovements = processedMovements;
      if (selectedAccountId && selectedAccountId !== 'all') {
        // If selectedAccountId is a UUID (account_id from database), filter directly
        if (selectedAccountId.length > 20 || selectedAccountId.includes('-')) {
          // UUID format - filter by account_id from movement
          filteredMovements = processedMovements.filter((m) => m.account_id === selectedAccountId);
        } else {
          // Category ID or account code - filter by account code
          // This could be a category code (like '5273') or a hardcoded tree code
          filteredMovements = processedMovements.filter((m) => {
            // Check if account_code matches (starts with or equals)
            if (m.account_code) {
              return m.account_code === selectedAccountId || 
                     m.account_code.startsWith(selectedAccountId) ||
                     m.account_code.includes(selectedAccountId);
            }
            // Also check account_name for partial matches
            if (m.account_name) {
              return m.account_name.toLowerCase().includes(selectedAccountId.toLowerCase());
            }
            return false;
          });
        }
      }

      // Calculate summary
      const totalDebit = filteredMovements.reduce((sum, m) => sum + m.debit, 0);
      const totalCredit = filteredMovements.reduce((sum, m) => sum + m.credit, 0);
      const netMovement = totalDebit - totalCredit;
      const finalBalance = initialBalance + netMovement;

      setSummary({
        initialBalance,
        totalDebit,
        totalCredit,
        netMovement,
        finalBalance,
      });

      setMovements(filteredMovements);
      setCurrentPage(1);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Error: ${error?.message || 'Error desconocido'}`);
      setMovements([]);
      setSummary({
        initialBalance: 0,
        totalDebit: 0,
        totalCredit: 0,
        netMovement: 0,
        finalBalance: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const findAccountInTree = (accounts: AccountingAccount[], id: string): AccountingAccount | null => {
    for (const acc of accounts) {
      if (acc.id === id) return acc;
      if (acc.children) {
        const found = findAccountInTree(acc.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Filter movements for table
  const filteredMovements = useMemo(() => {
    let filtered = [...movements];

    if (docTypeFilter !== 'all') {
      filtered = filtered.filter((m) => m.transaction_type === docTypeFilter);
    }

    if (journalFilter.trim()) {
      filtered = filtered.filter((m) => m.journal_entry?.toLowerCase().includes(journalFilter.toLowerCase()));
    }

    if (dateFilter) {
      const filterDate = format(dateFilter, 'yyyy-MM-dd');
      filtered = filtered.filter((m) => format(new Date(m.transaction_date), 'yyyy-MM-dd') === filterDate);
    }

    if (thirdPartyFilter.trim()) {
      filtered = filtered.filter(
        (m) =>
          m.customer_name?.toLowerCase().includes(thirdPartyFilter.toLowerCase()) ||
          m.supplier_name?.toLowerCase().includes(thirdPartyFilter.toLowerCase())
      );
    }

    if (accountFilter.trim()) {
      filtered = filtered.filter(
        (m) =>
          m.account_code?.toLowerCase().includes(accountFilter.toLowerCase()) ||
          m.account_name?.toLowerCase().includes(accountFilter.toLowerCase())
      );
    }

    return filtered;
  }, [movements, docTypeFilter, journalFilter, dateFilter, thirdPartyFilter, accountFilter]);

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMovements = filteredMovements.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  const hasData = movements.length > 0 && dateRange.from && dateRange.to;

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
        <span className="text-foreground font-medium">Movimientos por cuenta contable</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">Movimientos por cuenta contable</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Conoce la actividad de tus cuentas contables y los movimientos en los que se encuentran asociadas.
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
          <Button variant="outline" size="default" className="gap-2" onClick={() => toast.info('Funcionalidad de personalización próximamente')}>
            <Settings2 className="h-4 w-4" />
            Personalizar
          </Button>
          <Button variant="outline" size="default" className="gap-2" onClick={() => toast.info('Funcionalidad de compartir próximamente')}>
            <Share2 className="h-4 w-4" />
            Compartir
          </Button>
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
              <Label>Cuentas contables</Label>
              <Select value={selectedAccountId || 'all'} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {accountingAccounts.map((account) => (
                    <div key={account.id}>
                      <SelectItem value={account.id}>
                        {account.code ? `${account.code} - ` : ''}{account.name}
                      </SelectItem>
                      {account.children &&
                        account.children.map((child) => (
                          <div key={child.id}>
                            <SelectItem value={child.id} className="pl-6">
                              {child.code ? `${child.code} - ` : ''}{child.name}
                            </SelectItem>
                            {child.children &&
                              child.children.map((grandchild) => (
                                <SelectItem key={grandchild.id} value={grandchild.id} className="pl-12">
                                  {grandchild.code ? `${grandchild.code} - ` : ''}{grandchild.name}
                                </SelectItem>
                              ))}
                          </div>
                        ))}
                    </div>
                  ))}
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

      {/* Empty State */}
      {!loading && !hasData && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="w-24 h-24 mb-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium text-foreground mb-2">Selecciona el periodo, cuenta contable y centro de costo</p>
              <p className="text-sm text-muted-foreground">Utiliza los filtros arriba para generar el reporte de movimientos por cuenta contable</p>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Summary Cards */}
      {hasData && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo inicial</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.initialBalance)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Débito</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalDebit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Crédito</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCredit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Movimiento neto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn('text-2xl font-bold', summary.netMovement >= 0 ? 'text-green-600' : 'text-red-600')}>
                {formatCurrency(summary.netMovement)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo final</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.finalBalance)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Listado de movimientos */}
      {hasData && !loading && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>Listado de movimientos</CardTitle>
              <Button variant="outline" size="sm" onClick={() => toast.info('Funcionalidad de exportación próximamente')}>
                <FileText className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Table Filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 pb-4 border-b">
              <div className="space-y-2">
                <Label className="text-xs">Tipo de documento</Label>
                <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
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
                <Label className="text-xs">Asiento</Label>
                <Input
                  placeholder="Buscar asiento"
                  value={journalFilter}
                  onChange={(e) => setJournalFilter(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-full justify-start text-left font-normal text-xs">
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateFilter ? format(dateFilter, 'dd/MM/yyyy') : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} locale={es} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tercero</Label>
                <Input
                  placeholder="Buscar tercero"
                  value={thirdPartyFilter}
                  onChange={(e) => setThirdPartyFilter(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Filtrar por cuenta</Label>
                <Input
                  placeholder="Buscar cuenta"
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">&nbsp;</Label>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full h-9 text-xs"
                  onClick={() => {
                    setDocTypeFilter('all');
                    setJournalFilter('');
                    setDateFilter(undefined);
                    setThirdPartyFilter('');
                    setAccountFilter('');
                  }}
                >
                  <Filter className="mr-2 h-3 w-3" />
                  Limpiar filtros
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tipo de documento</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Asiento</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">Tercero</TableHead>
                    <TableHead className="text-xs">Código contable</TableHead>
                    <TableHead className="text-xs">Cuenta contable</TableHead>
                    <TableHead className="text-xs text-right">Saldo inicial</TableHead>
                    <TableHead className="text-xs text-right">Débito</TableHead>
                    <TableHead className="text-xs text-right">Crédito</TableHead>
                    <TableHead className="text-xs text-right">Movimiento neto</TableHead>
                    <TableHead className="text-xs text-right">Saldo final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        No se encontraron movimientos con los filtros aplicados
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedMovements.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-xs">
                            {mov.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{format(new Date(mov.transaction_date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                        <TableCell className="text-xs">{mov.journal_entry || '-'}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="secondary" className="text-xs">
                            {mov.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{mov.customer_name || mov.supplier_name || '-'}</TableCell>
                        <TableCell className="text-xs font-mono">{mov.account_code || '-'}</TableCell>
                        <TableCell className="text-xs">{mov.account_name}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(mov.initial_balance)}</TableCell>
                        <TableCell className="text-xs text-right text-red-600">{mov.debit > 0 ? formatCurrency(mov.debit) : '-'}</TableCell>
                        <TableCell className="text-xs text-right text-green-600">{mov.credit > 0 ? formatCurrency(mov.credit) : '-'}</TableCell>
                        <TableCell className={cn('text-xs text-right', mov.net_movement >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {formatCurrency(mov.net_movement)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">{formatCurrency(mov.final_balance)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ítems por página:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(v) => {
                      setItemsPerPage(parseInt(v, 10));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredMovements.length)} de {filteredMovements.length}
                  </span>
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                            }}
                            isActive={currentPage === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}