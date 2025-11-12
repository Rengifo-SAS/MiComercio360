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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Repeat, Plus, MoreHorizontal, Eye, Edit, Trash2, Play, Calendar } from 'lucide-react';
import { RecurringPaymentsService } from '@/lib/services/recurring-payments-service';
import { RecurringPayment } from '@/lib/types/recurring-payments';
import { RecurringPaymentFormDialog } from '@/components/recurring-payment-form-dialog';
import { RecurringPaymentViewDialog } from '@/components/recurring-payment-view-dialog';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RecurringPaymentsPageClientProps {
  companyId: string;
  initialRecurringPayments: RecurringPayment[];
  suppliers: any[];
  numerations: any[];
  accounts: any[];
  paymentMethods: any[];
  costCenters: any[];
}

export function RecurringPaymentsPageClient({
  companyId,
  initialRecurringPayments,
  suppliers,
  numerations,
  accounts,
  paymentMethods,
  costCenters,
}: RecurringPaymentsPageClientProps) {
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>(
    initialRecurringPayments
  );
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadRecurringPayments = async () => {
    setLoading(true);
    try {
      const { recurringPayments: data } =
        await RecurringPaymentsService.getRecurringPayments(companyId, {
          search: searchTerm || undefined,
          limit: 100,
        });
      setRecurringPayments(data);
    } catch (error) {
      console.error('Error cargando pagos recurrentes:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar los pagos recurrentes',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecurringPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, companyId]);

  const handleGeneratePayment = async (recurringPayment: RecurringPayment) => {
    try {
      await RecurringPaymentsService.generatePaymentFromRecurring(
        recurringPayment.id,
        companyId
      );
      toast.success('Éxito', {
        description: 'Pago generado correctamente',
      });
      loadRecurringPayments();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo generar el pago',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await RecurringPaymentsService.deleteRecurringPayment(id, companyId);
      toast.success('Éxito', {
        description: 'Pago recurrente eliminado',
      });
      loadRecurringPayments();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo eliminar',
      });
    }
  };

  const handleStatusToggle = async (recurringPayment: RecurringPayment) => {
    try {
      await RecurringPaymentsService.updateRecurringPaymentStatus(
        recurringPayment.id,
        companyId,
        !recurringPayment.is_active
      );
      toast.success('Éxito', {
        description: `Pago recurrente ${!recurringPayment.is_active ? 'activado' : 'desactivado'}`,
      });
      loadRecurringPayments();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo actualizar',
      });
    }
  };

  const filteredPayments = recurringPayments.filter((payment) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      payment.supplier?.name?.toLowerCase().includes(search) ||
      payment.contact_name?.toLowerCase().includes(search) ||
      payment.details?.toLowerCase().includes(search) ||
      payment.numeration?.name?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-violet-100 dark:bg-violet-900/20 rounded-lg">
            <Repeat className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Pagos Recurrentes</h1>
            <p className="text-sm text-muted-foreground">
              Programa los gastos que se repiten periódicamente, puedes programar el día y la frecuencia del pago en meses
            </p>
          </div>
        </div>
        <RecurringPaymentFormDialog
          companyId={companyId}
          suppliers={suppliers}
          numerations={numerations}
          accounts={accounts}
          paymentMethods={paymentMethods}
          costCenters={costCenters}
          onSave={loadRecurringPayments}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Pago Recurrente
            </Button>
          }
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Total</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{recurringPayments.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Activos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {recurringPayments.filter((p) => p.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Inactivos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {recurringPayments.filter((p) => !p.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Valor Total</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {formatCurrency(recurringPayments.reduce((sum, p) => sum + p.total_amount, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Pagos Recurrentes</CardTitle>
          <CardDescription className="text-sm">
            Lista de todos los pagos recurrentes configurados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-6 pt-6 pb-4">
            <Input
              placeholder="Buscar por proveedor, contacto, detalles o numeración..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm h-10"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 py-3">Contacto</TableHead>
                  <TableHead className="px-4 py-3">Frecuencia</TableHead>
                  <TableHead className="px-4 py-3">Día del Mes</TableHead>
                  <TableHead className="px-4 py-3">Próxima Generación</TableHead>
                  <TableHead className="px-4 py-3">Total</TableHead>
                  <TableHead className="px-4 py-3">Estado</TableHead>
                  <TableHead className="text-right px-4 py-3">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay pagos recurrentes
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((recurringPayment) => (
                    <TableRow key={recurringPayment.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium px-4 py-3">
                        {recurringPayment.supplier?.name ||
                          recurringPayment.contact_name ||
                          'N/A'}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        Cada {recurringPayment.frequency_months} mes(es)
                      </TableCell>
                      <TableCell className="px-4 py-3">Día {recurringPayment.day_of_month}</TableCell>
                      <TableCell className="px-4 py-3">
                        {recurringPayment.next_generation_date
                          ? formatDate(recurringPayment.next_generation_date)
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {formatCurrency(recurringPayment.total_amount)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant={recurringPayment.is_active ? 'default' : 'secondary'}>
                          {recurringPayment.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <RecurringPaymentViewDialog
                              recurringPayment={recurringPayment}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalles
                                </DropdownMenuItem>
                              }
                            />
                            <RecurringPaymentFormDialog
                              companyId={companyId}
                              recurringPayment={recurringPayment}
                              suppliers={suppliers}
                              numerations={numerations}
                              accounts={accounts}
                              paymentMethods={paymentMethods}
                              costCenters={costCenters}
                              onSave={loadRecurringPayments}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              }
                            />
                            <DropdownMenuItem
                              onClick={() => handleGeneratePayment(recurringPayment)}
                              disabled={!recurringPayment.is_active}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Generar ahora
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusToggle(recurringPayment)}
                            >
                              {recurringPayment.is_active ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(recurringPayment.id)}
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






