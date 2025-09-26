'use client';

import { useState } from 'react';
import { AccountsService } from '@/lib/services/accounts-service';
import type { Account } from '@/lib/types/accounts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  Trash2,
  AlertTriangle,
  Building2,
  Wallet,
  CreditCard,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

interface AccountDeleteDialogProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export function AccountDeleteDialog({
  account,
  open,
  onOpenChange,
  onDelete,
}: AccountDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!account) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Intentando eliminar cuenta:', account.id);
      await AccountsService.deleteAccount(account.id);
      console.log('Cuenta eliminada exitosamente');
      onDelete();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error eliminando cuenta';
      setError(errorMessage);
      console.error('Error eliminando cuenta:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!account) return null;

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'BANK_ACCOUNT':
        return <Building2 className="h-6 w-6" />;
      case 'CASH_BOX':
        return <Wallet className="h-6 w-6" />;
      case 'CREDIT_CARD':
        return <CreditCard className="h-6 w-6" />;
      case 'INVESTMENT':
        return <TrendingUp className="h-6 w-6" />;
      default:
        return <DollarSign className="h-6 w-6" />;
    }
  };

  const formatCurrency = (amount: number, currency = 'COP') => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle>Eliminar Cuenta</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Cuenta a eliminar:</h4>
            <div className="flex items-center gap-3 mb-3">
              {getAccountIcon(account.account_type)}
              <div>
                <div className="font-medium">{account.account_name}</div>
                <div className="text-sm text-muted-foreground">
                  {account.bank_name || 'Sin banco'}
                </div>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Tipo:</strong>{' '}
                {AccountsService.getAccountTypeLabel(account.account_type)}
              </p>
              <p>
                <strong>Saldo Actual:</strong>{' '}
                {formatCurrency(account.current_balance, account.currency)}
              </p>
              {account.account_number && (
                <p>
                  <strong>Número:</strong> {account.account_number}
                </p>
              )}
              <p>
                <strong>Estado:</strong>{' '}
                {account.is_active ? 'Activa' : 'Inactiva'}
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Advertencia</p>
                <p className="text-yellow-700 mt-1">
                  Al eliminar esta cuenta, se eliminarán permanentemente:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-yellow-700">
                  <li>Todos los datos de la cuenta</li>
                  <li>El historial de transacciones</li>
                  <li>Los registros de conciliación</li>
                  <li>Las transferencias relacionadas</li>
                </ul>
                <p className="text-yellow-700 mt-2 font-medium">
                  Asegúrate de que no hay transacciones pendientes antes de
                  continuar.
                </p>
              </div>
            </div>
          </div>
        </div>

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
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Cuenta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
