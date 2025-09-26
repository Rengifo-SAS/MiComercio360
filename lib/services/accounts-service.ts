// Servicio para manejo de cuentas bancarias y transacciones
import { createClient } from '@/lib/supabase/client';
import type {
  Account,
  AccountTransaction,
  AccountReconciliation,
  AccountSummary,
  CreateAccountData,
  CreateTransactionData,
  TransferData,
  ReconciliationData
} from '@/lib/types/accounts';

const supabase = createClient();

export class AccountsService {
  // ===== GESTIÓN DE CUENTAS =====

  static async getAccounts(companyId: string): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('company_id', companyId)
      .order('account_name');

    if (error) throw error;
    return data || [];
  }

  static async getAccount(id: string): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async createAccount(accountData: CreateAccountData): Promise<Account> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener el company_id del perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error('Error obteniendo perfil del usuario');
    if (!profile?.company_id) throw new Error('Usuario no tiene compañía asignada');

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...accountData,
        company_id: profile.company_id,
        created_by: user.id,
        current_balance: accountData.initial_balance
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateAccount(id: string, accountData: Partial<CreateAccountData>): Promise<Account> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Si se está actualizando el saldo inicial, también actualizar el saldo actual
    const updateData: any = {
      ...accountData,
      updated_by: user.id
    };

    if (accountData.initial_balance !== undefined) {
      updateData.current_balance = accountData.initial_balance;
    }

    const { data, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteAccount(id: string): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getAccountsSummary(companyId: string): Promise<AccountSummary[]> {
    const { data, error } = await supabase.rpc('get_accounts_summary', {
      p_company_id: companyId
    });

    if (error) throw error;
    return data || [];
  }

  // ===== GESTIÓN DE TRANSACCIONES =====

  static async getTransactions(
    accountId: string,
    limit = 50,
    offset = 0
  ): Promise<AccountTransaction[]> {
    const { data, error } = await supabase
      .from('account_transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  static async getTransaction(id: string): Promise<AccountTransaction | null> {
    const { data, error } = await supabase
      .from('account_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async createTransaction(transactionData: CreateTransactionData): Promise<AccountTransaction> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener el company_id del perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error('Error obteniendo perfil del usuario');
    if (!profile?.company_id) throw new Error('Usuario no tiene compañía asignada');

    // Obtener la cuenta para calcular el saldo
    const account = await this.getAccount(transactionData.account_id);
    if (!account) throw new Error('Cuenta no encontrada');

    const newBalance = account.current_balance + transactionData.amount;

    const { data, error } = await supabase
      .from('account_transactions')
      .insert({
        ...transactionData,
        company_id: profile.company_id,
        balance_after: newBalance,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createTransfer(transferData: TransferData): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase.rpc('create_transfer', {
      p_from_account_id: transferData.from_account_id,
      p_to_account_id: transferData.to_account_id,
      p_amount: transferData.amount,
      p_description: transferData.description,
      p_reference_number: transferData.reference_number,
      p_created_by: user.id
    });

    if (error) throw error;
    return data;
  }

  static async updateTransaction(
    id: string,
    transactionData: Partial<CreateTransactionData>
  ): Promise<AccountTransaction> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('account_transactions')
      .update({
        ...transactionData,
        updated_by: user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('account_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===== CONCILIACIÓN BANCARIA =====

  static async getReconciliations(accountId: string): Promise<AccountReconciliation[]> {
    const { data, error } = await supabase
      .from('account_reconciliations')
      .select('*')
      .eq('account_id', accountId)
      .order('reconciliation_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createReconciliation(reconciliationData: ReconciliationData): Promise<AccountReconciliation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener el company_id del perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error('Error obteniendo perfil del usuario');
    if (!profile?.company_id) throw new Error('Usuario no tiene compañía asignada');

    // Obtener el saldo actual de la cuenta
    const account = await this.getAccount(reconciliationData.account_id);
    if (!account) throw new Error('Cuenta no encontrada');

    const bookBalance = account.current_balance;
    const reconciledBalance = reconciliationData.statement_balance + 
      (reconciliationData.outstanding_deposits || 0) - 
      (reconciliationData.outstanding_checks || 0) + 
      (reconciliationData.bank_credits || 0) - 
      (reconciliationData.bank_charges || 0) + 
      (reconciliationData.adjustments || 0);

    const { data, error } = await supabase
      .from('account_reconciliations')
      .insert({
        ...reconciliationData,
        company_id: profile.company_id,
        book_balance: bookBalance,
        reconciled_balance: reconciledBalance,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateReconciliation(
    id: string,
    reconciliationData: Partial<ReconciliationData>
  ): Promise<AccountReconciliation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('account_reconciliations')
      .update({
        ...reconciliationData,
        updated_by: user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ===== REPORTES Y ANÁLISIS =====

  static async getAccountBalance(accountId: string): Promise<number> {
    const account = await this.getAccount(accountId);
    return account?.current_balance || 0;
  }

  static async getTotalBalance(companyId: string, accountType?: string): Promise<number> {
    let query = supabase
      .from('accounts')
      .select('current_balance')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (accountType) {
      query = query.eq('account_type', accountType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data?.reduce((sum, account) => sum + account.current_balance, 0) || 0;
  }

  static async getTransactionsByDateRange(
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<AccountTransaction[]> {
    const { data, error } = await supabase
      .from('account_transactions')
      .select('*')
      .eq('account_id', accountId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getUnreconciledTransactions(accountId: string): Promise<AccountTransaction[]> {
    const { data, error } = await supabase
      .from('account_transactions')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_reconciled', false)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ===== CUENTAS POR DEFECTO =====

  static async createDefaultAccounts(companyId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase.rpc('create_default_accounts_for_company', {
      p_company_id: companyId,
      p_created_by: user.id
    });

    if (error) throw error;
  }

  static async getDefaultAccounts(companyId: string): Promise<Account[]> {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('company_id', companyId)
      .in('account_name', ['Caja Chica', 'Caja General', 'Efectivo POS'])
      .order('account_name');

    if (error) {
      throw error;
    }
    
    return data || [];
  }

  // ===== UTILIDADES =====

  static formatCurrency(amount: number, currency = 'COP'): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }

  static getAccountTypeLabel(accountType: string): string {
    const typeMap: Record<string, string> = {
      'BANK_ACCOUNT': 'Cuenta Bancaria',
      'CASH_BOX': 'Caja de Efectivo',
      'CREDIT_CARD': 'Tarjeta de Crédito',
      'INVESTMENT': 'Inversión',
      'OTHER': 'Otras Cuentas'
    };
    return typeMap[accountType] || accountType;
  }

  static getTransactionTypeLabel(transactionType: string): string {
    const typeMap: Record<string, string> = {
      'DEPOSIT': 'Depósito/Ingreso',
      'WITHDRAWAL': 'Retiro/Egreso',
      'TRANSFER_IN': 'Transferencia Entrante',
      'TRANSFER_OUT': 'Transferencia Saliente',
      'PAYMENT': 'Pago',
      'RECEIPT': 'Recibo/Cobro',
      'ADJUSTMENT': 'Ajuste',
      'INTEREST': 'Intereses',
      'FEE': 'Comisiones',
      'REFUND': 'Reembolso',
      'RECONCILIATION': 'Conciliación'
    };
    return typeMap[transactionType] || transactionType;
  }
}
