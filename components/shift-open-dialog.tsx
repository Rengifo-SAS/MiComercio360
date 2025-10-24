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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Clock, CreditCard, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { AccountsService } from '@/lib/services/accounts-service';
import { Account } from '@/lib/types/accounts';

interface ShiftOpenDialogProps {
  onOpen: (
    initialCash: number,
    notes?: string,
    sourceAccountId?: string
  ) => void;
  companyId: string;
}

export function ShiftOpenDialog({ onOpen, companyId }: ShiftOpenDialogProps) {
  const [open, setOpen] = useState(false);
  const [initialCash, setInitialCash] = useState('');
  const [notes, setNotes] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Cargar cuentas cuando se abre el diálogo
  useEffect(() => {
    if (open && companyId) {
      loadAccounts();
    }
  }, [open, companyId]);

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const accountsData = await AccountsService.getAccounts(companyId);
      // Filtrar solo cuentas de efectivo y bancarias
      const cashAccounts = accountsData.filter(
        (account) =>
          account.account_type === 'CASH_BOX' ||
          account.account_type === 'BANK_ACCOUNT'
      );
      setAccounts(cashAccounts);
    } catch (error) {
      console.error('Error cargando cuentas:', error);
      toast.error('Error al cargar las cuentas');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!initialCash || Number(initialCash) < 0) {
      toast.error('El efectivo inicial debe ser un valor válido');
      return;
    }

    try {
      setLoading(true);
      await onOpen(
        Number(initialCash),
        notes || undefined,
        sourceAccountId || undefined
      );
      setOpen(false);
      setInitialCash('');
      setNotes('');
      setSourceAccountId('');
    } catch (error) {
      // El error ya se maneja en el componente padre
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    // Remover caracteres no numéricos excepto el punto decimal
    const numericValue = value.replace(/[^\d.]/g, '');

    // Convertir a número y formatear
    const number = parseFloat(numericValue);
    if (isNaN(number)) return '';

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  };

  const handleCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = value.replace(/[^\d.]/g, '');
    setInitialCash(numericValue);
  };

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'BANK_ACCOUNT':
        return <Building2 className="w-4 h-4" />;
      case 'CASH_BOX':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Abrir Turno
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Abrir Nuevo Turno
          </DialogTitle>
          <DialogDescription>
            Establece el efectivo inicial para comenzar el turno de caja.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source-account">Cuenta de Origen *</Label>
            <Select
              value={sourceAccountId}
              onValueChange={setSourceAccountId}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Elige el banco del cual saldrá el dinero para la base inicial" />
              </SelectTrigger>
              <SelectContent>
                {loadingAccounts ? (
                  <SelectItem value="loading" disabled>
                    Cargando cuentas...
                  </SelectItem>
                ) : accounts.length === 0 ? (
                  <SelectItem value="no-accounts" disabled>
                    No hay cuentas disponibles
                  </SelectItem>
                ) : (
                  accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        {getAccountIcon(account.account_type)}
                        <span>{account.account_name}</span>
                        {account.bank_name && (
                          <span className="text-muted-foreground">
                            - {account.bank_name}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecciona la cuenta bancaria o de efectivo de la cual se extraerá
              el dinero inicial.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial-cash">Efectivo Inicial *</Label>
            <Input
              id="initial-cash"
              type="text"
              placeholder="0"
              value={initialCash}
              onChange={handleCashChange}
              required
              className="text-lg font-mono"
            />
            {initialCash && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(initialCash)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Este es el dinero que tendrás disponible para dar cambio a los
              clientes.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Observaciones sobre el turno..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
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
              {loading ? 'Abriendo...' : 'Abrir Turno'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
