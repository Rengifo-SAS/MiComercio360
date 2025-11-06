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
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-violet-100 dark:bg-violet-900/20 rounded-lg">
            <Repeat className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Pagos Recurrentes</h1>
            <p className="text-muted-foreground">
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recurringPayments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recurringPayments.filter((p) => p.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recurringPayments.filter((p) => !p.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(recurringPayments.reduce((sum, p) => sum + p.total_amount, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Pagos Recurrentes</CardTitle>
          <CardDescription>
            Lista de todos los pagos recurrentes configurados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Buscar por proveedor, contacto, detalles o numeración..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Día del Mes</TableHead>
                  <TableHead>Próxima Generación</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
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
                    <TableRow key={recurringPayment.id}>
                      <TableCell className="font-medium">
                        {recurringPayment.supplier?.name ||
                          recurringPayment.contact_name ||
                          'N/A'}
                      </TableCell>
                      <TableCell>
                        Cada {recurringPayment.frequency_months} mes(es)
                      </TableCell>
                      <TableCell>Día {recurringPayment.day_of_month}</TableCell>
                      <TableCell>
                        {recurringPayment.next_generation_date
                          ? formatDate(recurringPayment.next_generation_date)
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(recurringPayment.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={recurringPayment.is_active ? 'default' : 'secondary'}>
                          {recurringPayment.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
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






