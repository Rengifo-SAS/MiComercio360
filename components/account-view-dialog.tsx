'use client';

import { useState, useEffect } from 'react';
import { AccountsService } from '@/lib/services/accounts-service';
import type { Account, AccountTransaction } from '@/lib/types/accounts';
import { ReconciliationFormDialog } from '@/components/reconciliation-form-dialog';
import { ReconciliationsList } from '@/components/reconciliations-list';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Wallet,
  CreditCard,
  TrendingUp,
  DollarSign,
  Calendar,
  Hash,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Calculator,
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AccountViewDialogProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountViewDialog({
  account,
  open,
  onOpenChange,
}: AccountViewDialogProps) {
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReconciliationDialog, setShowReconciliationDialog] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalTransactions, setTotalTransactions] = useState(0);

  useEffect(() => {
    if (account && open) {
      loadTransactions();
    }
  }, [account, open]);

  const loadTransactions = async () => {
    if (!account) return;

    try {
      setLoading(true);
      // Cargar todas las transacciones para paginación
      const data = await AccountsService.getTransactions(account.id, 1000, 0);
      setAllTransactions(data);
      setTotalTransactions(data.length);
      setCurrentPage(1); // Resetear a la primera página
    } catch (error) {
      console.error('Error cargando transacciones:', error);
    } finally {
      setLoading(false);
    }
  };

  // Paginación de transacciones
  useEffect(() => {
    if (allTransactions.length > 0) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginated = allTransactions.slice(startIndex, endIndex);
      setTransactions(paginated);
    } else {
      setTransactions([]);
    }
  }, [allTransactions, currentPage, itemsPerPage]);

  if (!account) return null;

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'BANK_ACCOUNT':
        return <Building2 className="h-6 w-6" />;
      case 'CASH_BOX':
        return <Wallet className="h-6 w-6" />;
      case 'CREDIT_CARD':
        return <CreditCard className="h-6 w-6" />;
      case 'INVESTMENT':
        return <TrendingUp className="h-6 w-6" />;
      default:
        return <DollarSign className="h-6 w-6" />;
    }
  };

  const getAccountTypeColor = (accountType: string) => {
    switch (accountType) {
      case 'BANK_ACCOUNT':
        return 'bg-blue-100 text-blue-800';
      case 'CASH_BOX':
        return 'bg-green-100 text-green-800';
      case 'CREDIT_CARD':
        return 'bg-purple-100 text-purple-800';
      case 'INVESTMENT':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionIcon = (transactionType: string) => {
    switch (transactionType) {
      case 'DEPOSIT':
      case 'TRANSFER_IN':
      case 'RECEIPT':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'WITHDRAWAL':
      case 'TRANSFER_OUT':
      case 'PAYMENT':
      case 'REFUND':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
    }
  };

  const formatCurrency = (amount: number, currency = 'COP') => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calcular paginación
  const totalPages = Math.ceil(allTransactions.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startItem = allTransactions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, allTransactions.length);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll al inicio de las transacciones
    const transactionsElement = document.querySelector('[data-transactions-list]');
    if (transactionsElement) {
      transactionsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Calcular páginas visibles
  const getVisiblePages = () => {
    if (totalPages <= 1) return [1];
    
    const delta = 2;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[85vw] lg:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getAccountIcon(account.account_type)}
            <div>
              <div>{account.account_name}</div>
              <DialogDescription className="text-base">
                {account.bank_name || 'Sin banco'}
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
            <TabsTrigger value="reconciliations">Conciliaciones</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Saldo Actual</CardTitle>
                  <CardDescription>
                    Balance disponible en la cuenta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-3xl font-bold ${
                      account.current_balance >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(account.current_balance, account.currency)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Información de la Cuenta
                  </CardTitle>
                  <CardDescription>
                    Detalles básicos de la cuenta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tipo:</span>
                    <Badge
                      className={getAccountTypeColor(account.account_type)}
                    >
                      {AccountsService.getAccountTypeLabel(
                        account.account_type
                      )}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Moneda:
                    </span>
                    <span className="text-sm font-medium">
                      {account.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Estado:
                    </span>
                    <Badge
                      variant={account.is_active ? 'default' : 'secondary'}
                    >
                      {account.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  {account.account_number && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Número:
                      </span>
                      <span className="text-sm font-medium">
                        {account.account_number}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {account.credit_limit && account.credit_limit > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Información de Crédito
                  </CardTitle>
                  <CardDescription>
                    Límites y disponibilidad de crédito
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Límite de Crédito:
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(account.credit_limit, account.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Crédito Disponible:
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(
                        account.available_credit || 0,
                        account.currency
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Últimas Transacciones</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadTransactions}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                />
                Actualizar
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-100 rounded animate-pulse"
                  ></div>
                ))}
              </div>
            ) : allTransactions.length > 0 ? (
              <>
                <div className="space-y-2" data-transactions-list>
                  {transactions.map((transaction) => (
                    <Card key={transaction.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getTransactionIcon(transaction.transaction_type)}
                            <div>
                              <div className="font-medium">
                                {AccountsService.getTransactionTypeLabel(
                                  transaction.transaction_type
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {transaction.description}
                              </div>
                              {transaction.reference_number && (
                                <div className="text-xs text-muted-foreground">
                                  Ref: {transaction.reference_number}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`font-semibold ${
                                transaction.amount >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {transaction.amount >= 0 ? '+' : ''}
                              {formatCurrency(
                                transaction.amount,
                                account.currency
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(transaction.transaction_date)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Saldo:{' '}
                              {formatCurrency(
                                transaction.balance_after,
                                account.currency
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Paginación */}
                {allTransactions.length > itemsPerPage && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {startItem} a {endItem} de {allTransactions.length} resultados
                      </p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-muted-foreground">Filas por página:</p>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={handleItemsPerPageChange}
                        >
                          <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent side="top">
                            {[10, 20, 30, 50, 100].map((pageSize) => (
                              <SelectItem key={pageSize} value={pageSize.toString()}>
                                {pageSize}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {totalPages > 1 && (
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (hasPreviousPage) {
                                  handlePageChange(currentPage - 1);
                                }
                              }}
                              className={
                                !hasPreviousPage
                                  ? 'pointer-events-none opacity-50'
                                  : 'cursor-pointer'
                              }
                            />
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
                                    handlePageChange(page as number);
                                  }}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              )}
                            </PaginationItem>
                          ))}

                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (hasNextPage) {
                                  handlePageChange(currentPage + 1);
                                }
                              }}
                              className={
                                !hasNextPage
                                  ? 'pointer-events-none opacity-50'
                                  : 'cursor-pointer'
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No hay transacciones
                </h3>
                <p className="text-muted-foreground">
                  Esta cuenta no tiene transacciones registradas
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reconciliations" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Conciliaciones Bancarias</h3>
              <Button
                onClick={() => setShowReconciliationDialog(true)}
                disabled={!account.requires_reconciliation}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Nueva Conciliación
              </Button>
            </div>

            {!account.requires_reconciliation && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Conciliación no requerida
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Esta cuenta no requiere conciliación bancaria regular.
                        Puedes habilitar esta funcionalidad editando la cuenta.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <ReconciliationsList
              accountId={account.id}
              accountName={account.account_name}
            />
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información Detallada</CardTitle>
                <CardDescription>Datos completos de la cuenta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Información Básica
                    </Label>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nombre:</span>
                        <span>{account.account_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span>
                          {AccountsService.getAccountTypeLabel(
                            account.account_type
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Moneda:</span>
                        <span>{account.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Saldo Inicial:
                        </span>
                        <span>
                          {formatCurrency(
                            account.initial_balance,
                            account.currency
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Información Bancaria
                    </Label>
                    <div className="space-y-1 text-sm">
                      {account.bank_name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Banco:</span>
                          <span>{account.bank_name}</span>
                        </div>
                      )}
                      {account.bank_code && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Código:</span>
                          <span>{account.bank_code}</span>
                        </div>
                      )}
                      {account.account_number && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Número:</span>
                          <span>{account.account_number}</span>
                        </div>
                      )}
                      {account.routing_number && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ruta:</span>
                          <span>{account.routing_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {account.description && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Descripción</Label>
                    <p className="text-sm text-muted-foreground">
                      {account.description}
                    </p>
                  </div>
                )}

                {account.notes && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Notas</Label>
                    <p className="text-sm text-muted-foreground">
                      {account.notes}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Fechas</Label>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Creada:</span>
                      <span>{formatDate(account.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Actualizada:
                      </span>
                      <span>{formatDate(account.updated_at)}</span>
                    </div>
                    {account.last_reconciliation_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Última Conciliación:
                        </span>
                        <span>
                          {formatDate(account.last_reconciliation_date)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Diálogo de conciliación */}
        <ReconciliationFormDialog
          account={account}
          open={showReconciliationDialog}
          onOpenChange={setShowReconciliationDialog}
          onSave={() => {
            setShowReconciliationDialog(false);
            // Aquí podrías agregar lógica para actualizar la lista de conciliaciones
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// Componente Label para usar en el diálogo
function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
      {...props}
    />
  );
}
