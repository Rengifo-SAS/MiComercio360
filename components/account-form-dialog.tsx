'use client';

import { useState, useEffect } from 'react';
import { AccountsService } from '@/lib/services/accounts-service';
import type { Account, CreateAccountData } from '@/lib/types/accounts';
import {
  ACCOUNT_TYPES,
  CURRENCIES,
  COLOMBIAN_BANKS,
} from '@/lib/types/accounts';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, X } from 'lucide-react';

interface AccountFormDialogProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function AccountFormDialog({
  account,
  open,
  onOpenChange,
  onSave,
}: AccountFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateAccountData>({
    account_name: '',
    account_number: '',
    account_type: 'BANK_ACCOUNT',
    bank_name: '',
    bank_code: '',
    routing_number: '',
    card_number_last_four: '',
    card_holder_name: '',
    card_expiry_date: '',
    currency: 'COP',
    initial_balance: 0,
    credit_limit: 0,
    description: '',
    notes: '',
  });

  const [isActive, setIsActive] = useState(true);
  const [requiresReconciliation, setRequiresReconciliation] = useState(true);

  useEffect(() => {
    if (open) {
      setError(null); // Limpiar errores al abrir el diálogo
    }

    if (account) {
      setFormData({
        account_name: account.account_name,
        account_number: account.account_number || '',
        account_type: account.account_type,
        bank_name: account.bank_name || '',
        bank_code: account.bank_code || '',
        routing_number: account.routing_number || '',
        card_number_last_four: account.card_number_last_four || '',
        card_holder_name: account.card_holder_name || '',
        card_expiry_date: account.card_expiry_date || '',
        currency: account.currency,
        initial_balance: account.initial_balance,
        credit_limit: account.credit_limit || 0,
        description: account.description || '',
        notes: account.notes || '',
      });
      setIsActive(account.is_active);
      setRequiresReconciliation(account.requires_reconciliation);
    } else {
      // Reset form for new account
      setFormData({
        account_name: '',
        account_number: '',
        account_type: 'BANK_ACCOUNT',
        bank_name: '',
        bank_code: '',
        routing_number: '',
        card_number_last_four: '',
        card_holder_name: '',
        card_expiry_date: '',
        currency: 'COP',
        initial_balance: 0,
        credit_limit: 0,
        description: '',
        notes: '',
      });
      setIsActive(true);
      setRequiresReconciliation(true);
    }
  }, [account, open]);

  const handleInputChange = (field: keyof CreateAccountData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Limpiar campos vacíos antes de enviar
      const cleanedFormData = {
        ...formData,
        account_number: formData.account_number || undefined,
        bank_name: formData.bank_name || undefined,
        bank_code: formData.bank_code || undefined,
        routing_number: formData.routing_number || undefined,
        card_number_last_four: formData.card_number_last_four || undefined,
        card_holder_name: formData.card_holder_name || undefined,
        card_expiry_date: formData.card_expiry_date || undefined,
        credit_limit: formData.credit_limit || undefined,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
      };

      if (account) {
        await AccountsService.updateAccount(account.id, cleanedFormData);
      } else {
        await AccountsService.createAccount(cleanedFormData);
      }
      onSave();
    } catch (error: any) {
      console.error('Error guardando cuenta:', error);
      setError(error?.message || 'Error desconocido al guardar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const isBankAccount = formData.account_type === 'BANK_ACCOUNT';
  const isCreditCard = formData.account_type === 'CREDIT_CARD';
  const isCashBox = formData.account_type === 'CASH_BOX';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account ? 'Editar Cuenta' : 'Nueva Cuenta'}
          </DialogTitle>
          <DialogDescription>
            {account
              ? 'Modifica la información de la cuenta'
              : 'Crea una nueva cuenta bancaria, de efectivo o tarjeta de crédito'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error al guardar la cuenta
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información Básica</h3>

              <div>
                <Label htmlFor="account_name">Nombre de la Cuenta *</Label>
                <Input
                  id="account_name"
                  value={formData.account_name}
                  onChange={(e) =>
                    handleInputChange('account_name', e.target.value)
                  }
                  placeholder="Ej: Banco Bogotá - Cuenta Corriente"
                  required
                />
              </div>

              <div>
                <Label htmlFor="account_type">Tipo de Cuenta *</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) =>
                    handleInputChange('account_type', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Moneda *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    handleInputChange('currency', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="initial_balance">Saldo Inicial</Label>
                <Input
                  id="initial_balance"
                  type="number"
                  step="0.01"
                  value={formData.initial_balance}
                  onChange={(e) =>
                    handleInputChange(
                      'initial_balance',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Información específica por tipo */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información Específica</h3>

              {isBankAccount && (
                <>
                  <div>
                    <Label htmlFor="bank_name">Banco</Label>
                    <Select
                      value={formData.bank_code}
                      onValueChange={(value) => {
                        const bank = COLOMBIAN_BANKS.find(
                          (b) => b.code === value
                        );
                        handleInputChange('bank_code', value);
                        handleInputChange('bank_name', bank?.name || '');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOMBIAN_BANKS.map((bank) => (
                          <SelectItem key={bank.code} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="account_number">Número de Cuenta</Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) =>
                        handleInputChange('account_number', e.target.value)
                      }
                      placeholder="1234567890"
                    />
                  </div>

                  <div>
                    <Label htmlFor="routing_number">Número de Ruta</Label>
                    <Input
                      id="routing_number"
                      value={formData.routing_number}
                      onChange={(e) =>
                        handleInputChange('routing_number', e.target.value)
                      }
                      placeholder="0000000000"
                    />
                  </div>
                </>
              )}

              {isCreditCard && (
                <>
                  <div>
                    <Label htmlFor="card_holder_name">
                      Titular de la Tarjeta
                    </Label>
                    <Input
                      id="card_holder_name"
                      value={formData.card_holder_name}
                      onChange={(e) =>
                        handleInputChange('card_holder_name', e.target.value)
                      }
                      placeholder="Juan Pérez"
                    />
                  </div>

                  <div>
                    <Label htmlFor="card_number_last_four">
                      Últimos 4 Dígitos
                    </Label>
                    <Input
                      id="card_number_last_four"
                      value={formData.card_number_last_four}
                      onChange={(e) =>
                        handleInputChange(
                          'card_number_last_four',
                          e.target.value
                        )
                      }
                      placeholder="1234"
                      maxLength={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="card_expiry_date">
                      Fecha de Vencimiento
                    </Label>
                    <Input
                      id="card_expiry_date"
                      type="month"
                      value={formData.card_expiry_date}
                      onChange={(e) =>
                        handleInputChange('card_expiry_date', e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="credit_limit">Límite de Crédito</Label>
                    <Input
                      id="credit_limit"
                      type="number"
                      step="0.01"
                      value={formData.credit_limit}
                      onChange={(e) =>
                        handleInputChange(
                          'credit_limit',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>
                </>
              )}

              {isCashBox && (
                <div>
                  <Label htmlFor="description">Descripción de la Caja</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange('description', e.target.value)
                    }
                    placeholder="Ej: Caja principal de la tienda"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Configuración adicional */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configuración</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Cuenta Activa</Label>
                <p className="text-sm text-muted-foreground">
                  La cuenta estará disponible para transacciones
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requires_reconciliation">
                  Requiere Conciliación
                </Label>
                <p className="text-sm text-muted-foreground">
                  La cuenta requiere conciliación bancaria regular
                </p>
              </div>
              <Switch
                id="requires_reconciliation"
                checked={requiresReconciliation}
                onCheckedChange={setRequiresReconciliation}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Información adicional sobre la cuenta..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {account ? 'Actualizar' : 'Crear'} Cuenta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
