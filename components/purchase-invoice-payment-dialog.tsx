'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { PurchaseInvoice } from '@/lib/types/purchase-invoices';
import { PurchaseInvoicesService } from '@/lib/services/purchase-invoices-service';
import { AccountsService } from '@/lib/services/accounts-service';
import { Account } from '@/lib/types/accounts';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PurchaseInvoicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseInvoice: PurchaseInvoice;
  companyId: string;
  onPaymentRegistered: () => void;
}

export function PurchaseInvoicePaymentDialog({
  open,
  onOpenChange,
  purchaseInvoice,
  companyId,
  onPaymentRegistered,
}: PurchaseInvoicePaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const remainingAmount = purchaseInvoice.total_amount - (purchaseInvoice.paid_amount || 0);

  useEffect(() => {
    if (open) {
      loadAccounts();
      // Inicializar con el monto pendiente
      setAmount(remainingAmount.toString());
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setReference('');
      setNotes('');
      setAccountId('');
    }
  }, [open, remainingAmount]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const accountsList = await AccountsService.getAccounts(companyId);
      setAccounts(accountsList.filter(acc => acc.is_active));
    } catch (error: any) {
      console.error('Error cargando cuentas:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar las cuentas',
      });
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountId) {
      toast.error('Error', {
        description: 'Debe seleccionar una cuenta contable',
      });
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Error', {
        description: 'El monto debe ser mayor a 0',
      });
      return;
    }

    if (paymentAmount > remainingAmount) {
      toast.error('Error', {
        description: `El monto no puede exceder el pendiente (${formatCurrency(remainingAmount)})`,
      });
      return;
    }

    setLoading(true);
    try {
      await PurchaseInvoicesService.registerPayment(
        purchaseInvoice.id,
        companyId,
        {
          amount: paymentAmount,
          account_id: accountId,
          payment_date: paymentDate ? new Date(paymentDate + 'T12:00:00').toISOString() : undefined,
          reference: reference || undefined,
          notes: notes || undefined,
        }
      );

      toast.success('Éxito', {
        description: 'Pago registrado exitosamente',
      });

      onPaymentRegistered();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error registrando pago:', error);
      toast.error('Error', {
        description: error.message || 'No se pudo registrar el pago',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Registrar un pago para la factura de compra
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="font-medium text-sm sm:text-base">{formatCurrency(purchaseInvoice.total_amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pagado:</span>
              <span className="font-medium text-sm sm:text-base">{formatCurrency(purchaseInvoice.paid_amount || 0)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-medium">Pendiente:</span>
              <span className="font-bold text-base sm:text-lg">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Monto del Pago *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={remainingAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Máximo: {formatCurrency(remainingAmount)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_id">Cuenta Contable *</Label>
            <Select
              value={accountId}
              onValueChange={setAccountId}
              disabled={loadingAccounts}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {loadingAccounts ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Cargando cuentas...
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No hay cuentas disponibles
                  </div>
                ) : (
                  accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id} className="truncate">
                      <span className="truncate block">{account.account_name} - {formatCurrency(account.current_balance)}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Fecha del Pago</Label>
            <Input
              id="payment_date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referencia</Label>
            <Input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Número de referencia del pago"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales sobre el pago"
              rows={3}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !accountId || !amount}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Pago'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

