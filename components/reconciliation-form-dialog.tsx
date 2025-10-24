'use client';

import { useState, useEffect } from 'react';
import { AccountsService } from '@/lib/services/accounts-service';
import type { Account, ReconciliationData } from '@/lib/types/accounts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Calculator, CheckCircle } from 'lucide-react';

interface ReconciliationFormDialogProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function ReconciliationFormDialog({
  account,
  open,
  onOpenChange,
  onSave,
}: ReconciliationFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ReconciliationData>({
    account_id: '',
    reconciliation_date: new Date().toISOString().split('T')[0],
    statement_balance: 0,
    outstanding_deposits: 0,
    outstanding_checks: 0,
    bank_charges: 0,
    bank_credits: 0,
    adjustments: 0,
    notes: '',
  });

  const [calculatedBalance, setCalculatedBalance] = useState(0);
  const [difference, setDifference] = useState(0);

  useEffect(() => {
    if (open && account) {
      setError(null);
      setFormData({
        account_id: account.id,
        reconciliation_date: new Date().toISOString().split('T')[0],
        statement_balance: 0,
        outstanding_deposits: 0,
        outstanding_checks: 0,
        bank_charges: 0,
        bank_credits: 0,
        adjustments: 0,
        notes: '',
      });
    }
  }, [account, open]);

  useEffect(() => {
    // Calcular el saldo conciliado automáticamente
    const reconciled =
      formData.statement_balance +
      (formData.outstanding_deposits || 0) -
      (formData.outstanding_checks || 0) +
      (formData.bank_credits || 0) -
      (formData.bank_charges || 0) +
      (formData.adjustments || 0);

    setCalculatedBalance(reconciled);

    if (account) {
      setDifference(reconciled - account.current_balance);
    }
  }, [formData, account]);

  const handleInputChange = (field: keyof ReconciliationData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setLoading(true);
    setError(null);

    try {
      await AccountsService.createReconciliation(formData);
      onSave();
    } catch (error: any) {
      console.error('Error creando conciliación:', error);
      setError(error?.message || 'Error desconocido al crear la conciliación');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'COP') => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Conciliación Bancaria
          </DialogTitle>
          <DialogDescription>
            Realiza la conciliación bancaria para {account.account_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error al crear la conciliación
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Información de la cuenta */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Información de la Cuenta
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Cuenta:</span>{' '}
                {account.account_name}
              </div>
              <div>
                <span className="font-medium">Banco:</span>{' '}
                {account.bank_name || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Saldo Contable:</span>
                <span className="ml-2 font-semibold">
                  {formatCurrency(account.current_balance, account.currency)}
                </span>
              </div>
              <div>
                <span className="font-medium">Moneda:</span> {account.currency}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Datos del estado de cuenta */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                Datos del Estado de Cuenta
              </h3>

              <div>
                <Label htmlFor="reconciliation_date">
                  Fecha de Conciliación *
                </Label>
                <Input
                  id="reconciliation_date"
                  type="date"
                  value={formData.reconciliation_date}
                  onChange={(e) =>
                    handleInputChange('reconciliation_date', e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="statement_balance">
                  Saldo del Estado de Cuenta *
                </Label>
                <Input
                  id="statement_balance"
                  type="number"
                  step="0.01"
                  value={formData.statement_balance}
                  onChange={(e) =>
                    handleInputChange(
                      'statement_balance',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="outstanding_deposits">
                  Depósitos en Tránsito
                </Label>
                <Input
                  id="outstanding_deposits"
                  type="number"
                  step="0.01"
                  value={formData.outstanding_deposits || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'outstanding_deposits',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="outstanding_checks">Cheques Pendientes</Label>
                <Input
                  id="outstanding_checks"
                  type="number"
                  step="0.01"
                  value={formData.outstanding_checks || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'outstanding_checks',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Ajustes bancarios */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Ajustes Bancarios</h3>

              <div>
                <Label htmlFor="bank_credits">Créditos Bancarios</Label>
                <Input
                  id="bank_credits"
                  type="number"
                  step="0.01"
                  value={formData.bank_credits || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'bank_credits',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="bank_charges">Cargos Bancarios</Label>
                <Input
                  id="bank_charges"
                  type="number"
                  step="0.01"
                  value={formData.bank_charges || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'bank_charges',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="adjustments">Ajustes Adicionales</Label>
                <Input
                  id="adjustments"
                  type="number"
                  step="0.01"
                  value={formData.adjustments || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'adjustments',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Observaciones sobre la conciliación..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Resumen de la conciliación */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Resumen de la Conciliación
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Saldo Contable:</span>
                <div className="text-lg font-semibold">
                  {formatCurrency(account.current_balance, account.currency)}
                </div>
              </div>

              <div>
                <span className="font-medium">Saldo Conciliado:</span>
                <div className="text-lg font-semibold">
                  {formatCurrency(calculatedBalance, account.currency)}
                </div>
              </div>

              <div>
                <span className="font-medium">Diferencia:</span>
                <div
                  className={`text-lg font-semibold ${
                    Math.abs(difference) < 0.01
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatCurrency(difference, account.currency)}
                </div>
              </div>
            </div>

            {Math.abs(difference) < 0.01 && (
              <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-md">
                <p className="text-green-800 font-medium">
                  ✓ La conciliación está balanceada
                </p>
              </div>
            )}

            {Math.abs(difference) >= 0.01 && (
              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-200 rounded-md">
                <p className="text-yellow-800 font-medium">
                  ⚠ Hay una diferencia de{' '}
                  {formatCurrency(Math.abs(difference), account.currency)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Calculator className="h-4 w-4 mr-2" />
              Crear Conciliación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
