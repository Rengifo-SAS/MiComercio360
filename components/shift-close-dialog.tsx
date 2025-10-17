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
              <CardTitle className="text-lg">Resumen del Turno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cajero</p>
                  <p className="font-medium">
                    {shift.cashier?.full_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inicio</p>
                  <p className="font-medium">
                    {format(new Date(shift.start_time), 'dd/MM/yyyy HH:mm', {
                      locale: es,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duración</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {durationFormatted}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Efectivo Inicial
                  </p>
                  <p className="font-medium">
                    {formatCurrency(shift.initial_cash)}
                  </p>
                </div>
              </div>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Resumen de Efectivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Ventas en Efectivo
                    </p>
                    <p className="font-medium">
                      {formatCurrency(cashSummary.cash_sales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Ventas con Tarjeta
                    </p>
                    <p className="font-medium">
                      {formatCurrency(cashSummary.card_sales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Ventas por Transferencia
                    </p>
                    <p className="font-medium">
                      {formatCurrency(cashSummary.transfer_sales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Ventas Mixtas
                    </p>
                    <p className="font-medium">
                      {formatCurrency(cashSummary.mixed_sales)}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                    <span className="text-sm text-muted-foreground">
                      Efectivo Esperado:
                    </span>
                    <span className="font-medium text-lg">
                      {formatCurrency(cashSummary.expected_cash)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                    <span className="text-sm text-muted-foreground">
                      Diferencia:
                    </span>
                    <span
                      className={`font-medium text-lg flex items-center gap-1 ${getDifferenceColor(
                        cashSummary.difference
                      )}`}
                    >
                      {getDifferenceIcon(cashSummary.difference)}
                      {formatCurrency(cashSummary.difference)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Formulario de cierre */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="final-cash">Efectivo Final *</Label>
                <Input
                  id="final-cash"
                  type="text"
                  placeholder="0"
                  value={finalCash}
                  onChange={handleCashChange}
                  required
                  className="text-lg font-mono"
                />
                {finalCash && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(Number(finalCash))}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Cuenta todo el efectivo disponible en la caja registradora.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas de Cierre (Opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Observaciones sobre el cierre del turno..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
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
                className="w-full sm:w-auto"
              >
                {loading ? 'Cerrando...' : 'Cerrar Turno'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
