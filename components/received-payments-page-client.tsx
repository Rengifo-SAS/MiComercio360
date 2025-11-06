'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, Plus, MoreHorizontal, Eye, Edit, Trash2, X, CheckCircle } from 'lucide-react';
import { ReceivedPaymentsService } from '@/lib/services/received-payments-service';
import { ReceivedPayment } from '@/lib/types/received-payments';
import { ReceivedPaymentFormDialog } from '@/components/received-payment-form-dialog';
import { ReceivedPaymentViewDialog } from '@/components/received-payment-view-dialog';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface ReceivedPaymentsPageClientProps {
  companyId: string;
  initialReceivedPayments: ReceivedPayment[];
  customers: any[];
  numerations: any[];
  accounts: any[];
  paymentMethods: any[];
  costCenters: any[];
}

export function ReceivedPaymentsPageClient({
  companyId,
  initialReceivedPayments,
  customers,
  numerations,
  accounts,
  paymentMethods,
  costCenters,
}: ReceivedPaymentsPageClientProps) {
  const [receivedPayments, setReceivedPayments] = useState<ReceivedPayment[]>(initialReceivedPayments);
  const [allReceivedPayments, setAllReceivedPayments] = useState<ReceivedPayment[]>(initialReceivedPayments);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const loadReceivedPayments = async () => {
    setLoading(true);
    try {
      const { receivedPayments: data } = await ReceivedPaymentsService.getReceivedPayments(
        companyId,
        {
          search: searchTerm || undefined,
          status: statusFilter !== 'all' ? statusFilter as any : undefined,
          transactionType: transactionTypeFilter !== 'all' ? transactionTypeFilter as any : undefined,
          limit: 1000,
        }
      );
      setAllReceivedPayments(data);
      setCurrentPage(1); // Resetear a la primera página cuando cambian los filtros
    } catch (error) {
      console.error('Error cargando pagos recibidos:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar los pagos recibidos',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivedPayments();
  }, [searchTerm, statusFilter, transactionTypeFilter, companyId]);

  // Paginación
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = allReceivedPayments.slice(startIndex, endIndex);
    setReceivedPayments(paginated);
  }, [allReceivedPayments, currentPage, itemsPerPage]);

  const handleCancel = async (payment: ReceivedPayment) => {
    if (!confirm('¿Está seguro de que desea cancelar este pago recibido?')) {
      return;
    }

    try {
      await ReceivedPaymentsService.cancelReceivedPayment(
        payment.id,
        companyId,
        'Cancelado por el usuario'
      );
      toast.success('Éxito', {
        description: 'Pago recibido cancelado',
      });
      loadReceivedPayments();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo cancelar',
      });
    }
  };

  const handleRestore = async (payment: ReceivedPayment) => {
    try {
      await ReceivedPaymentsService.restoreReceivedPayment(payment.id, companyId);
      toast.success('Éxito', {
        description: 'Pago recibido restaurado',
      });
      loadReceivedPayments();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo restaurar',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este pago recibido?')) {
      return;
    }

    try {
      await ReceivedPaymentsService.deleteReceivedPayment(id, companyId);
      toast.success('Éxito', {
        description: 'Pago recibido eliminado',
      });
      loadReceivedPayments();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo eliminar',
      });
    }
  };

  const getStatusBadge = (status: string, isReconciled: boolean) => {
    if (isReconciled) {
      return <Badge variant="default" className="bg-green-600">Conciliado</Badge>;
    }
    switch (status) {
      case 'open':
        return <Badge variant="default">Abierto</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completado</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'reconciled':
        return <Badge variant="default" className="bg-green-600">Conciliado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'INVOICE_PAYMENT':
        return 'Pago a Factura';
      case 'ACCOUNT_PAYMENT':
        return 'Pago a Cuenta';
      default:
        return type;
    }
  };

  const totalAmount = allReceivedPayments.reduce((sum, p) => sum + p.total_amount, 0);
  const openAmount = allReceivedPayments
    .filter((p) => p.status === 'open')
    .reduce((sum, p) => sum + p.total_amount, 0);
  const reconciledAmount = allReceivedPayments
    .filter((p) => p.is_reconciled)
    .reduce((sum, p) => sum + p.total_amount, 0);

  // Calcular paginación
  const totalPages = Math.ceil(allReceivedPayments.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startItem = allReceivedPayments.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, allReceivedPayments.length);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Pagos Recibidos</h1>
            <p className="text-muted-foreground">
              Registro y gestión de pagos recibidos de clientes
            </p>
          </div>
        </div>
        <ReceivedPaymentFormDialog
          companyId={companyId}
          customers={customers}
          numerations={numerations}
          accounts={accounts}
          paymentMethods={paymentMethods}
          costCenters={costCenters}
          onSave={loadReceivedPayments}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Pago Recibido
            </Button>
          }
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allReceivedPayments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abiertos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(openAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conciliados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reconciledAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Pagos Recibidos</CardTitle>
          <CardDescription>
            Lista de todos los pagos recibidos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Buscar por número, cliente o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="open">Abierto</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="reconciled">Conciliado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="INVOICE_PAYMENT">Pago a Factura</SelectItem>
                <SelectItem value="ACCOUNT_PAYMENT">Pago a Cuenta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : allReceivedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay pagos recibidos
                    </TableCell>
                  </TableRow>
                ) : (
                  receivedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.payment_number || 'N/A'}
                      </TableCell>
                      <TableCell>{formatDate(payment.payment_date)}</TableCell>
                      <TableCell>
                        {payment.customer?.business_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {getTransactionTypeLabel(payment.transaction_type)}
                      </TableCell>
                      <TableCell>{formatCurrency(payment.total_amount)}</TableCell>
                      <TableCell>{payment.account?.account_name || 'N/A'}</TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status, payment.is_reconciled)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <ReceivedPaymentViewDialog
                              receivedPayment={payment}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalles
                                </DropdownMenuItem>
                              }
                            />
                            {payment.status !== 'cancelled' && (
                              <ReceivedPaymentFormDialog
                                companyId={companyId}
                                receivedPayment={payment}
                                customers={customers}
                                numerations={numerations}
                                accounts={accounts}
                                paymentMethods={paymentMethods}
                                costCenters={costCenters}
                                onSave={loadReceivedPayments}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                }
                              />
                            )}
                            {payment.status === 'cancelled' ? (
                              <DropdownMenuItem onClick={() => handleRestore(payment)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Restaurar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleCancel(payment)}>
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(payment.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {allReceivedPayments.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startItem} a {endItem} de {allReceivedPayments.length} resultados
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
        </CardContent>
      </Card>
    </div>
  );
}





