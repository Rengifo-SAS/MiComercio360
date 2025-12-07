'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ShiftsService } from '@/lib/services/shifts-service';
import { CreateCashMovementData } from '@/lib/types/shifts';

interface CashMovementDialogProps {
  shiftId: string;
  onMovementAdded: () => void;
  onClose?: () => void;
}

export function CashMovementDialog({
  shiftId,
  onMovementAdded,
  onClose,
}: CashMovementDialogProps) {
  const [open, setOpen] = useState(true);
  const [movementType, setMovementType] = useState<'income' | 'expense'>(
    'income'
  );
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      toast.error('El monto debe ser un valor válido mayor a 0');
      return;
    }

    if (!description.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }

    try {
      setLoading(true);

      const movementData: CreateCashMovementData = {
        movement_type: movementType,
        amount: Number(amount),
        description: description.trim(),
        reference: reference.trim() || undefined,
      };

      await ShiftsService.createCashMovement(shiftId, movementData);

      toast.success('Movimiento de efectivo registrado exitosamente');
      setOpen(false);
      setAmount('');
      setDescription('');
      setReference('');
      onMovementAdded();
    } catch (error: any) {
      console.error('Error creando movimiento de efectivo:', error);
      toast.error(error.message || 'Error al registrar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^\d.]/g, '');
    const number = parseFloat(numericValue);
    if (isNaN(number)) return '';

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = value.replace(/[^\d.]/g, '');
    setAmount(numericValue);
  };

  const getMovementTypeLabel = (type: string) => {
    return type === 'income' ? 'Ingreso' : 'Egreso';
  };

  const getMovementTypeDescription = (type: string) => {
    return type === 'income'
      ? 'Dinero que ingresa a la caja (ej: pago de proveedor, devolución de cambio)'
      : 'Dinero que sale de la caja (ej: compra de suministros, retiro de efectivo)';
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Registrar Movimiento de Efectivo
          </DialogTitle>
          <DialogDescription>
            Registra ingresos o egresos de efectivo durante el turno.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="movement-type">Tipo de Movimiento *</Label>
            <Select
              value={movementType}
              onValueChange={(value: 'income' | 'expense') =>
                setMovementType(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Ingreso</SelectItem>
                <SelectItem value="expense">Egreso</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getMovementTypeDescription(movementType)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Monto *</Label>
            <Input
              id="amount"
              type="text"
              placeholder="0"
              value={amount}
              onChange={handleAmountChange}
              required
              className="text-lg font-mono"
            />
            {amount && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(amount)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              placeholder="Describe el motivo del movimiento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Ejemplo: "Pago de suministros de oficina", "Devolución de cambio a
              cliente"
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referencia (Opcional)</Label>
            <Input
              id="reference"
              placeholder="Número de factura, recibo, etc."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Número de documento que respalda el movimiento
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Movimiento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
