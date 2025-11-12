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
import { DollarSign, Plus, MoreHorizontal, Eye, Edit, Trash2, X, CheckCircle, FileCheck, FileX } from 'lucide-react';
import { PaymentsService } from '@/lib/services/payments-service';
import { Payment } from '@/lib/types/payments';
import { PaymentFormDialog } from '@/components/payment-form-dialog';
import { PaymentViewDialog } from '@/components/payment-view-dialog';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentsPageClientProps {
  companyId: string;
  initialPayments: Payment[];
  suppliers: any[];
  numerations: any[];
  accounts: any[];
  paymentMethods: any[];
  costCenters: any[];
}

export function PaymentsPageClient({
  companyId,
  initialPayments,
  suppliers,
  numerations,
  accounts,
  paymentMethods,
  costCenters,
}: PaymentsPageClientProps) {
  const [receivedPayments, setPayments] = useState<Payment[]>(initialPayments);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');

  const loadPayments = async () => {
    setLoading(true);
    try {
      const { payments: data } = await PaymentsService.getPayments(
        companyId,
        {
          search: searchTerm || undefined,
          status: statusFilter !== 'all' ? statusFilter as any : undefined,
          transactionType: transactionTypeFilter !== 'all' ? transactionTypeFilter as any : undefined,
          limit: 100,
        }
      );
      setPayments(data);
    } catch (error) {
      console.error('Error cargando pagos recibidos:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar los comprobantes de egreso',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [searchTerm, statusFilter, transactionTypeFilter, companyId]);

  const handleCancel = async (payment: Payment) => {
    if (!confirm('¿Está seguro de que desea cancelar este pago?')) {
      return;
    }

    try {
      await PaymentsService.cancelPayment(
        payment.id,
        companyId,
        'Cancelado por el usuario'
      );
      toast.success('Éxito', {
        description: 'Comprobante de egreso cancelado',
      });
      loadPayments();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo cancelar',
      });
    }
  };

  const handleRestore = async (payment: Payment) => {
    try {
      await PaymentsService.restorePayment(payment.id, companyId);
      toast.success('Éxito', {
        description: 'Comprobante de egreso restaurado',
      });
      loadPayments();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo restaurar',
      });
    }
  };

  const handleReconcile = async (payment: Payment) => {
    if (!confirm('¿Está seguro de que desea marcar este comprobante como conciliado?')) {
      return;
    }

    try {
      await PaymentsService.reconcilePayment(payment.id, companyId);
      toast.success('Éxito', {
        description: 'Comprobante de egreso marcado como conciliado',
      });
      loadPayments();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo conciliar',
      });
    }
  };

  const handleUnreconcile = async (payment: Payment) => {
    if (!confirm('¿Está seguro de que desea desmarcar este comprobante como conciliado?')) {
      return;
    }

    try {
      await PaymentsService.unreconcilePayment(payment.id, companyId);
      toast.success('Éxito', {
        description: 'Comprobante de egreso desmarcado como conciliado',
      });
      loadPayments();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo desconciliar',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este pago?')) {
      return;
    }

    try {
      await PaymentsService.deletePayment(id, companyId);
      toast.success('Éxito', {
        description: 'Comprobante de egreso eliminado',
      });
      loadPayments();
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

  const totalAmount = receivedPayments.reduce((sum, p) => sum + p.total_amount, 0);
  const openAmount = receivedPayments
    .filter((p) => p.status === 'open')
    .reduce((sum, p) => sum + p.total_amount, 0);
  const reconciledAmount = receivedPayments
    .filter((p) => p.is_reconciled)
    .reduce((sum, p) => sum + p.total_amount, 0);

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Comprobantes de Egreso</h1>
            <p className="text-sm text-muted-foreground">
              Registra tus comprobantes de egreso y controla las salidas de dinero de tu negocio
            </p>
          </div>
        </div>
        <PaymentFormDialog
          companyId={companyId}
          suppliers={suppliers}
          numerations={numerations}
          accounts={accounts}
          paymentMethods={paymentMethods}
          costCenters={costCenters}
          onSave={loadPayments}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Comprobante de Egreso
            </Button>
          }
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Total Pagos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{receivedPayments.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Abiertos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{formatCurrency(openAmount)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Conciliados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{formatCurrency(reconciledAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Comprobantes de Egreso</CardTitle>
            <CardDescription className="text-sm">
              Lista de todos los comprobantes de egreso registrados
            </CardDescription>
          </CardHeader>
        <CardContent className="p-0">
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Buscar por número, proveedor, beneficiario o referencia..."
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
                  <TableHead>Proveedor/Beneficiario</TableHead>
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
                ) : receivedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay comprobantes de egreso registrados
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
                        {payment.supplier?.name || payment.contact_name || 'General'}
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
                            <PaymentViewDialog
                              receivedPayment={payment}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalles
                                </DropdownMenuItem>
                              }
                            />
                            {payment.status !== 'cancelled' && (
                              <PaymentFormDialog
                                companyId={companyId}
                                payment={payment}
                                suppliers={suppliers}
                                numerations={numerations}
                                accounts={accounts}
                                paymentMethods={paymentMethods}
                                costCenters={costCenters}
                                onSave={loadPayments}
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
                              <>
                                <DropdownMenuItem onClick={() => handleCancel(payment)}>
                                  <X className="mr-2 h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                                {/* {payment.status !== 'reconciled' && !payment.is_reconciled ? (
                                  <DropdownMenuItem onClick={() => handleReconcile(payment)}>
                                    <FileCheck className="mr-2 h-4 w-4" />
                                    Marcar como Conciliado
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleUnreconcile(payment)}>
                                    <FileX className="mr-2 h-4 w-4" />
                                    Desmarcar como Conciliado
                                  </DropdownMenuItem>
                                )} */}
                              </>
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
        </CardContent>
      </Card>
    </div>
  );
}


