'use client';

import { useState } from 'react';
import { PaymentMethod } from '@/lib/types/payment-methods';
import { PaymentMethodsService } from '@/lib/services/payment-methods-service';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';

interface PaymentMethodDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod?: PaymentMethod | null;
  onDelete: () => void;
}

export function PaymentMethodDeleteDialog({
  open,
  onOpenChange,
  paymentMethod,
  onDelete,
}: PaymentMethodDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!paymentMethod) return;

    setLoading(true);
    setError(null);

    try {
      const success = await PaymentMethodsService.deletePaymentMethod(
        paymentMethod.id
      );

      if (success) {
        onDelete();
        onOpenChange(false);
      } else {
        setError('No se pudo eliminar el método de pago');
      }
    } catch (err) {
      console.error('Error eliminando método de pago:', err);
      setError((err as Error).message || 'Error al eliminar el método de pago');
    } finally {
      setLoading(false);
    }
  };

  if (!paymentMethod) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Eliminar Método de Pago
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el
            método de pago <strong>"{paymentMethod.name}"</strong> y todos sus
            datos asociados.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="py-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">
              Información del método de pago:
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <strong>Nombre:</strong> {paymentMethod.name}
              </p>
              <p>
                <strong>Tipo:</strong> {paymentMethod.payment_type}
              </p>
              <p>
                <strong>Estado:</strong>{' '}
                {paymentMethod.is_active ? 'Activo' : 'Inactivo'}
              </p>
              {paymentMethod.description && (
                <p>
                  <strong>Descripción:</strong> {paymentMethod.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Advertencia:</strong> Si este método de pago está siendo
            utilizado en transacciones existentes, la eliminación podría afectar
            el historial de pagos.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar Definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
