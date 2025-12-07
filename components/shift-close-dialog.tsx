'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  XCircle,
  DollarSign,
  Clock,
  TrendingUp,
  AlertTriangle,
  Receipt,
  CreditCard,
  ArrowRightLeft,
  Wallet,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Shift,
  ShiftCashSummary,
  formatShiftDuration,
  calculateShiftDuration,
} from '@/lib/types/shifts';
import { ShiftsService } from '@/lib/services/shifts-service';

interface ShiftCloseDialogProps {
  shift: Shift;
  onClose: (shiftId: string, finalCash: number, notes?: string) => void;
}

export function ShiftCloseDialog({ shift, onClose }: ShiftCloseDialogProps) {
  const [open, setOpen] = useState(false);
  const [finalCash, setFinalCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [cashSummary, setCashSummary] = useState<ShiftCashSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Cargar resumen de efectivo cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      loadCashSummary();
    }
  }, [open, shift.id]);

  const loadCashSummary = async () => {
    try {
      setLoadingSummary(true);
      const summary = await ShiftsService.getShiftCashSummary(shift.id);
      setCashSummary(summary);
      // Establecer el efectivo final sugerido
      setFinalCash(summary.expected_cash.toString());
    } catch (error) {
      console.error('Error cargando resumen de efectivo:', error);
      toast.error('Error al cargar el resumen de efectivo');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!finalCash || Number(finalCash) < 0) {
      toast.error('El efectivo final debe ser un valor válido');
      return;
    }

    try {
      setLoading(true);
      await onClose(shift.id, Number(finalCash), notes || undefined);
      setOpen(false);
      setFinalCash('');
      setNotes('');
    } catch (error) {
      // El error ya se maneja en el componente padre
    } finally {
      setLoading(false);
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

  const handleCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = value.replace(/[^\d.]/g, '');
    setFinalCash(numericValue);
  };

  const getDifferenceColor = (difference: number) => {
    if (difference === 0) return 'text-green-600';
    if (difference > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const getDifferenceIcon = (difference: number) => {
    if (difference === 0) return <TrendingUp className="w-4 h-4" />;
    if (difference > 0) return <TrendingUp className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const duration = calculateShiftDuration(
    shift.start_time,
    new Date().toISOString()
  );
  const durationFormatted = duration
    ? formatShiftDuration(duration)
    : 'En curso';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <XCircle className="w-4 h-4 mr-2" />
          Cerrar Turno
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[85vw] lg:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Cerrar Turno
          </DialogTitle>
          <DialogDescription>
            Realiza el cierre de caja y concilia el efectivo disponible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen del turno */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Resumen del Turno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Cajero
                  </p>
                  <p className="text-base font-semibold">
                    {shift.cashier?.full_name || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Inicio
                  </p>
                  <p className="text-base font-semibold">
                    {format(new Date(shift.start_time), 'dd/MM/yyyy HH:mm', {
                      locale: es,
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Duración
                  </p>
                  <p className="text-base font-semibold flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {durationFormatted}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Efectivo Inicial
                  </p>
                  <p className="text-base font-semibold">
                    {formatCurrency(shift.initial_cash)}
                  </p>
                </div>
              </div>

              {shift.total_transactions > 0 && (
                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        Total de Ventas
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(shift.total_sales)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        Transacciones
                      </p>
                      <p className="text-2xl font-bold flex items-center gap-2">
                        <Receipt className="w-5 h-5" />
                        {shift.total_transactions}
                      </p>
                      {shift.total_transactions > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Promedio: {formatCurrency(Math.round(shift.total_sales / shift.total_transactions))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumen de efectivo */}
          {loadingSummary ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    Cargando resumen de efectivo...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : cashSummary ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Resumen de Ventas por Método de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Efectivo
                        </p>
                        <Wallet className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-xl font-bold text-green-700 dark:text-green-400">
                        {formatCurrency(cashSummary.cash_sales)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Tarjeta
                        </p>
                        <CreditCard className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                        {formatCurrency(cashSummary.card_sales)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/20">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Transferencia
                        </p>
                        <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                      </div>
                      <p className="text-xl font-bold text-purple-700 dark:text-purple-400">
                        {formatCurrency(cashSummary.transfer_sales)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-orange-50 dark:bg-orange-950/20">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Mixto
                        </p>
                        <DollarSign className="w-4 h-4 text-orange-600" />
                      </div>
                      <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
                        {formatCurrency(cashSummary.mixed_sales)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Conciliación de Efectivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                          Efectivo Inicial
                        </p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(cashSummary.initial_cash)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                          Ventas en Efectivo
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          + {formatCurrency(cashSummary.cash_sales)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg border bg-primary/5">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                          Efectivo Esperado
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(cashSummary.expected_cash)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Efectivo inicial + Ventas en efectivo
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className={`p-4 rounded-lg border-2 ${
                      cashSummary.difference === 0 
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                        : cashSummary.difference > 0 
                        ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                        : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {cashSummary.difference === 0 ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              getDifferenceIcon(cashSummary.difference)
                            )}
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                              Diferencia
                            </p>
                          </div>
                          <p className={`text-2xl font-bold ${getDifferenceColor(cashSummary.difference)}`}>
                            {cashSummary.difference === 0 
                              ? 'Sin diferencia' 
                              : cashSummary.difference > 0 
                              ? `+ ${formatCurrency(cashSummary.difference)}` 
                              : formatCurrency(cashSummary.difference)}
                          </p>
                          {cashSummary.difference !== 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {cashSummary.difference > 0 
                                ? 'Hay más efectivo del esperado' 
                                : 'Falta efectivo del esperado'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          {/* Formulario de cierre */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Completar Cierre de Turno
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {cashSummary && (
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Instrucciones para el cierre
                        </p>
                        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                          <li>Cuenta todo el efectivo físico disponible en la caja registradora</li>
                          <li>El efectivo esperado es {formatCurrency(cashSummary.expected_cash)}</li>
                          <li>Ingresa el monto real que encontraste en la caja</li>
                          {cashSummary.difference !== 0 && (
                            <li className="font-medium">
                              Si hay diferencia, documenta la razón en las notas
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="final-cash" className="text-base font-semibold">
                        Efectivo Final en Caja *
                      </Label>
                      <Input
                        id="final-cash"
                        type="text"
                        placeholder="0"
                        value={finalCash}
                        onChange={handleCashChange}
                        required
                        className="text-2xl font-mono h-14"
                      />
                      {finalCash && (
                        <p className="text-lg font-semibold text-primary">
                          {formatCurrency(Number(finalCash))}
                        </p>
                      )}
                      {cashSummary && finalCash && (
                        <div className="mt-2">
                          {Number(finalCash) === cashSummary.expected_cash ? (
                            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              El efectivo coincide con lo esperado
                            </p>
                          ) : (
                            <p className={`text-xs font-medium flex items-center gap-1 ${
                              Number(finalCash) > cashSummary.expected_cash 
                                ? 'text-blue-600' 
                                : 'text-red-600'
                            }`}>
                              {Number(finalCash) > cashSummary.expected_cash ? (
                                <>
                                  <TrendingUp className="w-3 h-3" />
                                  Sobrante: {formatCurrency(Number(finalCash) - cashSummary.expected_cash)}
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3" />
                                  Faltante: {formatCurrency(cashSummary.expected_cash - Number(finalCash))}
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-start gap-2">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        Ingresa el monto total de efectivo físico que hay en la caja registradora 
                        al momento del cierre. Este valor se comparará con el efectivo esperado 
                        basado en las ventas del turno.
                      </span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-base font-semibold">
                        Notas de Cierre
                        <span className="text-muted-foreground font-normal ml-1">(Opcional)</span>
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="Ejemplo: Diferencia por cambio en billetes grandes, retiro de efectivo para compras, etc."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={5}
                        className="min-h-[120px] resize-none"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Documenta cualquier observación relevante sobre el cierre del turno, 
                      especialmente si hay diferencias en el efectivo o situaciones especiales.
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      disabled={loading}
                      className="w-full sm:w-auto"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || loadingSummary}
                      className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Cerrando...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Confirmar Cierre de Turno
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
