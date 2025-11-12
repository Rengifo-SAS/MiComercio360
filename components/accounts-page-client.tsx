'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AccountsService } from '@/lib/services/accounts-service';
import type { Account, AccountSummary } from '@/lib/types/accounts';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  CreditCard,
  Building2,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AccountFormDialog } from '@/components/account-form-dialog';
import { AccountViewDialog } from '@/components/account-view-dialog';
import { AccountDeleteDialog } from '@/components/account-delete-dialog';
import { DefaultAccountsCard } from '@/components/default-accounts-card';

export function AccountsPageClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsSummary, setAccountsSummary] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [user, setUser] = useState<any>(null);
  const defaultAccountsRef = useRef<{ refresh: () => void } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.user_metadata?.company_id) {
      loadAccounts();
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Obtener el perfil del usuario para conseguir el company_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error cargando perfil:', profileError);
        } else {
          // Agregar company_id al objeto user
          const userWithCompany = {
            ...user,
            user_metadata: {
              ...user.user_metadata,
              company_id: profile?.company_id,
            },
          };
          setUser(userWithCompany);
        }
      }
    } catch (error) {
      console.error('Error cargando usuario:', error);
    }
  };

  const loadAccounts = async () => {
    if (!user?.user_metadata?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [accountsData, summaryData] = await Promise.all([
        AccountsService.getAccounts(user.user_metadata.company_id),
        AccountsService.getAccountsSummary(user.user_metadata.company_id),
      ]);

      // Filtrar cuentas por defecto de la lista general
      const defaultAccountNames = [
        'Caja Chica',
        'Caja General',
        'Efectivo POS',
      ];
      const customAccounts = accountsData.filter(
        (account) => !defaultAccountNames.includes(account.account_name)
      );

      setAccounts(customAccounts);
      setAccountsSummary(summaryData);
    } catch (error) {
      console.error('Error cargando cuentas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setShowFormDialog(true);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setShowFormDialog(true);
  };

  const handleViewAccount = (account: Account) => {
    setSelectedAccount(account);
    setShowViewDialog(true);
  };

  const handleDeleteAccount = (account: Account) => {
    setSelectedAccount(account);
    setShowDeleteDialog(true);
  };

  const handleAccountSaved = () => {
    setShowFormDialog(false);
    setEditingAccount(null);
    loadAccounts();
    // También actualizar las cuentas por defecto
    if (defaultAccountsRef.current) {
      defaultAccountsRef.current.refresh();
    }
  };

  const handleAccountDeleted = () => {
    setShowDeleteDialog(false);
    setSelectedAccount(null);
    loadAccounts();
  };

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'BANK_ACCOUNT':
        return <Building2 className="h-5 w-5" />;
      case 'CASH_BOX':
        return <Wallet className="h-5 w-5" />;
      case 'CREDIT_CARD':
        return <CreditCard className="h-5 w-5" />;
      case 'INVESTMENT':
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const getAccountTypeColor = (accountType: string) => {
    switch (accountType) {
      case 'BANK_ACCOUNT':
        return 'bg-blue-100 text-blue-800';
      case 'CASH_BOX':
        return 'bg-green-100 text-green-800';
      case 'CREDIT_CARD':
        return 'bg-purple-100 text-purple-800';
      case 'INVESTMENT':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency = 'COP') => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getTotalBalance = () => {
    return accountsSummary.reduce(
      (total, account) => total + account.current_balance,
      0
    );
  };

  const getBalanceByType = (accountType: string) => {
    return accountsSummary
      .filter((account) => account.account_type === accountType)
      .reduce((total, account) => total + account.current_balance, 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </CardTitle>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
            <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Cuentas</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona tus cuentas bancarias y financieras
            </p>
          </div>
        </div>
      </div>

      {/* Resumen de cuentas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Saldo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {formatCurrency(getTotalBalance())}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">
              Cuentas Bancarias
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {formatCurrency(getBalanceByType('BANK_ACCOUNT'))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">
              Caja de Efectivo
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {formatCurrency(getBalanceByType('CASH_BOX'))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">
              Tarjetas de Crédito
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {formatCurrency(getBalanceByType('CREDIT_CARD'))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cuentas por defecto */}
      <DefaultAccountsCard
        ref={defaultAccountsRef}
        companyId={user?.user_metadata?.company_id || ''}
        onAccountClick={handleViewAccount}
        onEditAccount={handleEditAccount}
      />

      {/* Lista de cuentas */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Cuentas Personalizadas</CardTitle>
              <CardDescription className="text-sm">
                Gestiona tus cuentas bancarias y de efectivo adicionales
              </CardDescription>
            </div>
            <Button onClick={handleCreateAccount}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cuenta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id} className="relative shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getAccountIcon(account.account_type)}
                      <div>
                        <CardTitle className="text-base">
                          {account.account_name}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {account.bank_name || 'Sin banco'}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleViewAccount(account)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEditAccount(account)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteAccount(account)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Saldo Actual
                      </span>
                      <span
                        className={`text-lg font-semibold ${
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

                    <div className="flex items-center justify-between">
                      <Badge
                        className={getAccountTypeColor(account.account_type)}
                      >
                        {AccountsService.getAccountTypeLabel(
                          account.account_type
                        )}
                      </Badge>
                      <Badge
                        variant={account.is_active ? 'default' : 'secondary'}
                      >
                        {account.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>

                    {account.account_number && (
                      <div className="text-xs text-muted-foreground">
                        Cuenta: {account.account_number}
                      </div>
                    )}

                    {account.credit_limit && account.credit_limit > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Límite:{' '}
                        {formatCurrency(account.credit_limit, account.currency)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {accounts.length === 0 && (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No hay cuentas registradas
              </h3>
              <p className="text-muted-foreground mb-4">
                Comienza creando tu primera cuenta bancaria o de efectivo
              </p>
              <Button onClick={handleCreateAccount}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Cuenta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      <AccountFormDialog
        account={editingAccount}
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        onSave={handleAccountSaved}
      />

      <AccountViewDialog
        account={selectedAccount}
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
      />

      <AccountDeleteDialog
        account={selectedAccount}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onDelete={handleAccountDeleted}
      />
    </div>
  );
}
