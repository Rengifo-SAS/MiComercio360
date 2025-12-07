'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Eye,
  Clock,
  DollarSign,
  TrendingUp,
  User,
  Calendar,
  Receipt,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Shift,
  ShiftReport,
  CashMovement,
  formatShiftDuration,
  calculateShiftDuration,
} from '@/lib/types/shifts';
import { ShiftsService } from '@/lib/services/shifts-service';
import { createClient } from '@/lib/supabase/client';

interface ShiftViewDialogProps {
  shift: Shift;
  onClose?: () => void;
}

export function ShiftViewDialog({ shift, onClose }: ShiftViewDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [shiftSales, setShiftSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar reporte cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      loadReport();
      loadCashMovements();
      loadShiftSales();
    }
  }, [open, shift.id]);

  const loadShiftSales = async () => {
    try {
      const supabase = createClient();
      const { data: salesData, error } = await supabase
        .from('sales')
        .select(`
          id,
          sale_number,
          total_amount,
          payment_method,
          status,
          created_at,
          customer:customers(id, business_name, identification_number)
        `)
        .eq('shift_id', shift.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error cargando ventas del turno:', error);
        return;
      }

      setShiftSales(salesData || []);
    } catch (error) {
      console.error('Error cargando ventas del turno:', error);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const shiftReport = await ShiftsService.generateShiftReport(shift.id);
      setReport(shiftReport);
    } catch (error) {
      console.error('Error cargando reporte del turno:', error);
      toast.error('Error al cargar el reporte del turno');
    } finally {
      setLoading(false);
    }
  };

  const loadCashMovements = async () => {
    try {
      const movements = await ShiftsService.getShiftCashMovements(shift.id);
      setCashMovements(movements);
    } catch (error) {
      console.error('Error cargando movimientos de efectivo:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Abierto
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Cerrado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDifferenceColor = (difference: number) => {
    if (difference === 0) return 'text-green-600';
    if (difference > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const getDifferenceIcon = (difference: number) => {
    if (difference === 0) return <CheckCircle className="w-4 h-4" />;
    if (difference > 0) return <TrendingUp className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const getMovementTypeIcon = (type: string) => {
    return type === 'income' ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
    );
  };

  const getMovementTypeBadge = (type: string) => {
    return type === 'income' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Ingreso
      </Badge>
    ) : (
      <Badge variant="destructive">Egreso</Badge>
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Detalles del Turno
          </DialogTitle>
          <DialogDescription>
            Información completa del turno y sus transacciones
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando detalles...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="summary" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Resumen</TabsTrigger>
              <TabsTrigger value="sales">Ventas</TabsTrigger>
              <TabsTrigger value="cash">Efectivo</TabsTrigger>
              <TabsTrigger value="movements">Movimientos</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              {/* Información básica */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Información del Turno</span>
                    {getStatusBadge(shift.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Cajero:
                        </span>
                        <span className="font-medium">
                          {shift.cashier?.full_name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Inicio:
                        </span>
                        <span className="font-medium">
                          {formatDate(shift.start_time)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Fin:
                        </span>
                        <span className="font-medium">
                          {shift.end_time
                            ? formatDate(shift.end_time)
                            : 'En curso'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Duración:
                        </span>
                        <span className="font-medium">
                          {report?.time_summary.duration_formatted ||
                            'En curso'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {shift.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Notas:</p>
                      <p className="text-sm">{shift.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumen de ventas */}
              {report && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="w-5 h-5" />
                      Resumen de Ventas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total de Ventas
                        </p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(report.sales_summary.total_sales)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Transacciones
                        </p>
                        <p className="text-2xl font-bold">
                          {report.sales_summary.total_transactions}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Venta Promedio
                        </p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(report.sales_summary.average_sale)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">
                        Métodos de Pago:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Efectivo:</span>
                          <span className="font-medium">
                            {formatCurrency(
                              report.sales_summary.payment_methods.cash
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Tarjeta:</span>
                          <span className="font-medium">
                            {formatCurrency(
                              report.sales_summary.payment_methods.card
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Transferencia:</span>
                          <span className="font-medium">
                            {formatCurrency(
                              report.sales_summary.payment_methods.transfer
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Mixto:</span>
                          <span className="font-medium">
                            {formatCurrency(
                              report.sales_summary.payment_methods.mixed
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="w-5 h-5" />
                      Ventas del Turno
                    </CardTitle>
                    {shiftSales.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {shiftSales.length} {shiftSales.length === 1 ? 'venta' : 'ventas'} • Haz clic para ver detalles
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {shiftSales.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Número de Venta</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Método de Pago</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Fecha</TableHead>
                          </TableRow>
                        </TableHeader>
                      <TableBody>
                        {shiftSales.map((sale) => (
                          <TableRow 
                            key={sale.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors group"
                            onClick={(e) => {
                              e.preventDefault();
                              // Cerrar el diálogo primero
                              setOpen(false);
                              if (onClose) onClose();
                              // Navegar a la página de detalle de la venta
                              setTimeout(() => {
                                router.push(`/dashboard/sales/${sale.id}`);
                              }, 100);
                            }}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className="text-primary group-hover:underline">
                                  {sale.sale_number || 'N/A'}
                                </span>
                                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </TableCell>
                            <TableCell>
                              {sale.customer?.business_name || 'Consumidor Final'}
                            </TableCell>
                            <TableCell>
                              {sale.payment_method === 'cash' ? 'Efectivo' :
                               sale.payment_method === 'card' ? 'Tarjeta' :
                               sale.payment_method === 'transfer' ? 'Transferencia' :
                               sale.payment_method === 'mixed' ? 'Mixto' : sale.payment_method || 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(sale.total_amount || 0)}
                            </TableCell>
                            <TableCell>
                              {formatDate(sale.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No hay ventas
                      </h3>
                      <p className="text-muted-foreground">
                        No se registraron ventas en este turno.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cash" className="space-y-4">
              {report && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Resumen de Efectivo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Efectivo Inicial
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(report.cash_summary.initial_cash)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Efectivo Final
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(report.cash_summary.final_cash)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Ventas en Efectivo
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(report.cash_summary.cash_sales)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Efectivo Esperado
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(report.cash_summary.expected_cash)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium">Diferencia:</span>
                        <span
                          className={`text-xl font-bold flex items-center gap-2 ${getDifferenceColor(
                            report.cash_summary.difference
                          )}`}
                        >
                          {getDifferenceIcon(report.cash_summary.difference)}
                          {formatCurrency(report.cash_summary.difference)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {report.cash_summary.difference === 0
                          ? 'El efectivo coincide perfectamente'
                          : report.cash_summary.difference > 0
                          ? 'Hay un sobrante de efectivo'
                          : 'Hay un faltante de efectivo'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="movements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Movimientos de Efectivo</CardTitle>
                </CardHeader>
                <CardContent>
                  {cashMovements.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Referencia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cashMovements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getMovementTypeIcon(movement.movement_type)}
                                {getMovementTypeBadge(movement.movement_type)}
                              </div>
                            </TableCell>
                            <TableCell>{movement.description}</TableCell>
                            <TableCell className="font-mono">
                              {formatCurrency(movement.amount)}
                            </TableCell>
                            <TableCell>
                              {formatDate(movement.created_at)}
                            </TableCell>
                            <TableCell>{movement.reference || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No hay movimientos
                      </h3>
                      <p className="text-muted-foreground">
                        No se registraron movimientos de efectivo en este turno.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
