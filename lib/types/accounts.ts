// Tipos para el módulo de cuentas bancarias y control de efectivo

export type AccountType = 
  | 'BANK_ACCOUNT'      // Cuenta bancaria
  | 'CASH_BOX'          // Caja de efectivo
  | 'CREDIT_CARD'       // Tarjeta de crédito
  | 'INVESTMENT'        // Inversión
  | 'OTHER';            // Otras cuentas

export type TransactionType = 
  | 'DEPOSIT'          // Depósito/Ingreso
  | 'WITHDRAWAL'       // Retiro/Egreso
  | 'TRANSFER_IN'      // Transferencia entrante
  | 'TRANSFER_OUT'     // Transferencia saliente
  | 'PAYMENT'          // Pago
  | 'RECEIPT'          // Recibo/Cobro
  | 'ADJUSTMENT'       // Ajuste
  | 'INTEREST'         // Intereses
  | 'FEE'              // Comisiones
  | 'REFUND'           // Reembolso
  | 'RECONCILIATION';  // Conciliación

export type ReconciliationStatus = 
  | 'PENDING'      // Pendiente
  | 'IN_PROGRESS'  // En progreso
  | 'COMPLETED'    // Completada
  | 'CANCELLED';   // Cancelada

export interface Account {
  id: string;
  company_id: string;
  account_name: string;
  account_number?: string;
  account_type: AccountType;
  bank_name?: string;
  bank_code?: string;
  routing_number?: string;
  card_number_last_four?: string;
  card_holder_name?: string;
  card_expiry_date?: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  credit_limit?: number;
  available_credit?: number;
  is_active: boolean;
  is_reconciled: boolean;
  last_reconciliation_date?: string;
  requires_reconciliation: boolean;
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface AccountTransaction {
  id: string;
  account_id: string;
  company_id: string;
  transaction_date: string;
  transaction_type: TransactionType;
  amount: number;
  balance_after: number;
  reference_number?: string;
  description: string;
  related_transaction_id?: string;
  related_account_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  bank_reference?: string;
  check_number?: string;
  cleared_date?: string;
  is_reconciled: boolean;
  reconciliation_id?: string;
  reconciliation_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface AccountReconciliation {
  id: string;
  account_id: string;
  company_id: string;
  reconciliation_date: string;
  statement_balance: number;
  book_balance: number;
  reconciled_balance: number;
  outstanding_deposits: number;
  outstanding_checks: number;
  bank_charges: number;
  bank_credits: number;
  adjustments: number;
  status: ReconciliationStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface AccountSummary {
  account_id: string;
  account_name: string;
  account_type: AccountType;
  bank_name?: string;
  current_balance: number;
  currency: string;
  is_active: boolean;
  last_transaction_date?: string;
  transaction_count: number;
}

export interface CreateAccountData {
  account_name: string;
  account_number?: string;
  account_type: AccountType;
  bank_name?: string;
  bank_code?: string;
  routing_number?: string;
  card_number_last_four?: string;
  card_holder_name?: string;
  card_expiry_date?: string;
  currency: string;
  initial_balance: number;
  credit_limit?: number;
  description?: string;
  notes?: string;
}

export interface CreateTransactionData {
  account_id: string;
  transaction_type: TransactionType;
  amount: number;
  description: string;
  reference_number?: string;
  related_account_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  bank_reference?: string;
  check_number?: string;
  transaction_date?: string;
}

export interface TransferData {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string;
  reference_number?: string;
}

export interface ReconciliationData {
  account_id: string;
  reconciliation_date: string;
  statement_balance: number;
  outstanding_deposits?: number;
  outstanding_checks?: number;
  bank_charges?: number;
  bank_credits?: number;
  adjustments?: number;
  notes?: string;
}

// Constantes para los tipos de cuentas
export const ACCOUNT_TYPES = [
  { value: 'BANK_ACCOUNT', label: 'Cuenta Bancaria' },
  { value: 'CASH_BOX', label: 'Caja de Efectivo' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito' },
  { value: 'INVESTMENT', label: 'Inversión' },
  { value: 'OTHER', label: 'Otras Cuentas' }
] as const;

// Constantes para los tipos de transacciones
export const TRANSACTION_TYPES = [
  { value: 'DEPOSIT', label: 'Depósito/Ingreso' },
  { value: 'WITHDRAWAL', label: 'Retiro/Egreso' },
  { value: 'TRANSFER_IN', label: 'Transferencia Entrante' },
  { value: 'TRANSFER_OUT', label: 'Transferencia Saliente' },
  { value: 'PAYMENT', label: 'Pago' },
  { value: 'RECEIPT', label: 'Recibo/Cobro' },
  { value: 'ADJUSTMENT', label: 'Ajuste' },
  { value: 'INTEREST', label: 'Intereses' },
  { value: 'FEE', label: 'Comisiones' },
  { value: 'REFUND', label: 'Reembolso' },
  { value: 'RECONCILIATION', label: 'Conciliación' }
] as const;

// Constantes para monedas
export const CURRENCIES = [
  { value: 'COP', label: 'Peso Colombiano (COP)' },
  { value: 'USD', label: 'Dólar Americano (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' }
] as const;

// Constantes para bancos colombianos
export const COLOMBIAN_BANKS = [
  { code: '0001', name: 'Banco de Bogotá' },
  { code: '0002', name: 'Banco Popular' },
  { code: '0007', name: 'Citibank Colombia' },
  { code: '0012', name: 'Banco Colpatria' },
  { code: '0013', name: 'Banco Davivienda' },
  { code: '0014', name: 'Banco AV Villas' },
  { code: '0019', name: 'Banco Santander Colombia' },
  { code: '0023', name: 'Banco de Occidente' },
  { code: '0032', name: 'Citibank' },
  { code: '0040', name: 'Almacén Éxito' },
  { code: '0044', name: 'Banco Falabella' },
  { code: '0051', name: 'Bancolombia' },
  { code: '0059', name: 'Banco Pichincha' },
  { code: '0063', name: 'Banco Finandina' },
  { code: '0066', name: 'Banco Cooperativo Coopcentral' },
  { code: '0070', name: 'Banco Itaú' },
  { code: '0091', name: 'Banco Caja Social' },
  { code: '0100', name: 'Banco AV Villas' }
] as const;
