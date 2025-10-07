'use client';

import { useState } from 'react';
import { PaymentGateway } from '@/lib/types/payment-methods';
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

interface PaymentGatewayDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentGateway?: PaymentGateway | null;
  onDelete: () => void;
}

export function PaymentGatewayDeleteDialog({
  open,
  onOpenChange,
  paymentGateway,
  onDelete,
}: PaymentGatewayDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!paymentGateway) return;

    setLoading(true);
    setError(null);

    try {
      const success = await PaymentMethodsService.deletePaymentGateway(
        paymentGateway.id
      );

      if (success) {
        onDelete();
        onOpenChange(false);
      } else {
        setError('No se pudo eliminar la pasarela de pago');
      }
    } catch (err) {
      console.error('Error eliminando pasarela de pago:', err);
      setError(
        (err as Error).message || 'Error al eliminar la pasarela de pago'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!paymentGateway) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Eliminar Pasarela de Pago
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente la
            pasarela de pago <strong>"{paymentGateway.name}"</strong> y toda su
            configuración.
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
            <h4 className="font-medium mb-2">Información de la pasarela:</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <strong>Nombre:</strong> {paymentGateway.name}
              </p>
              <p>
                <strong>Tipo:</strong> {paymentGateway.gateway_type}
              </p>
              <p>
                <strong>Entorno:</strong>{' '}
                {paymentGateway.environment === 'production'
                  ? 'Producción'
                  : 'Pruebas'}
              </p>
              <p>
                <strong>Estado:</strong>{' '}
                {paymentGateway.is_active ? 'Activa' : 'Inactiva'}
              </p>
            </div>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Advertencia:</strong> Si esta pasarela está siendo utilizada
            en métodos de pago activos, la eliminación podría afectar la
            funcionalidad de procesamiento de pagos.
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
