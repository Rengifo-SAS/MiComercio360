'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AccountsService } from '@/lib/services/accounts-service';
import type { Account } from '@/lib/types/accounts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, Building2, CreditCard, Plus, Eye, Edit } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DefaultAccountsCardProps {
  companyId: string;
  onAccountClick?: (account: Account) => void;
  onEditAccount?: (account: Account) => void;
}

export interface DefaultAccountsCardRef {
  refresh: () => void;
}

export const DefaultAccountsCard = forwardRef<
  DefaultAccountsCardRef,
  DefaultAccountsCardProps
>(({ companyId, onAccountClick, onEditAccount }, ref) => {
  const [defaultAccounts, setDefaultAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useImperativeHandle(ref, () => ({
    refresh: loadDefaultAccounts,
  }));

  useEffect(() => {
    loadDefaultAccounts();
  }, [companyId]);

  const loadDefaultAccounts = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const accounts = await AccountsService.getDefaultAccounts(companyId);
      setDefaultAccounts(accounts);
    } catch (error) {
      console.error('Error cargando cuentas por defecto:', error);
      setDefaultAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const getAccountIcon = (accountName: string) => {
    switch (accountName) {
      case 'Caja Chica':
        return <Wallet className="h-5 w-5 text-green-600" />;
      case 'Caja General':
        return <Building2 className="h-5 w-5 text-blue-600" />;
      case 'Efectivo POS':
        return <CreditCard className="h-5 w-5 text-purple-600" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  const getAccountColor = (accountName: string) => {
    switch (accountName) {
      case 'Caja Chica':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Caja General':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Efectivo POS':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number, currency = 'COP') => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cuentas por Defecto</CardTitle>
          <CardDescription>Cargando cuentas del sistema...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-gray-100 rounded animate-pulse"
              ></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cuentas por Defecto</CardTitle>
            <CardDescription>
              Cuentas del sistema creadas automáticamente
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadDefaultAccounts}>
            <Plus className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {defaultAccounts.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {defaultAccounts.map((account) => (
              <Card
                key={account.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${getAccountColor(
                  account.account_name
                )}`}
                onClick={() => onAccountClick?.(account)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getAccountIcon(account.account_name)}
                      <span className="font-medium">
                        {account.account_name}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAccountClick?.(account);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAccount?.(account);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Saldo:</span>
                      <span
                        className={`font-semibold ${
                          account.current_balance >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(
                          account.current_balance,
                          account.currency
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span>Estado:</span>
                      <Badge
                        variant={account.is_active ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {account.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              No hay cuentas por defecto
            </h3>
            <p className="text-muted-foreground mb-4">
              Las cuentas del sistema se crean automáticamente al configurar la
              empresa
            </p>
            <Button onClick={loadDefaultAccounts}>
              <Plus className="h-4 w-4 mr-2" />
              Verificar Cuentas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

DefaultAccountsCard.displayName = 'DefaultAccountsCard';
