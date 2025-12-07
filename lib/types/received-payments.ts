import { Customer } from './customers';
import { Account } from './accounts';
import { PaymentMethod } from './payment-methods';
import { CostCenter } from './cost-centers';
import { Numeration } from './numerations';
import { Sale } from './sales';

export interface ReceivedPayment {
  id: string;
  company_id: string;
  
  // Información del documento
  numeration_id?: string;
  payment_number?: string;
  
  // Fecha y contacto
  payment_date: string; // YYYY-MM-DD
  customer_id: string;
  
  // Información bancaria y financiera
  account_id: string;
  payment_method_id?: string;
  cost_center_id?: string;
  
  // Moneda y monto
  currency: 'COP' | 'USD' | 'EUR';
  total_amount: number;
  
  // Notas
  notes?: string;
  
  // Tipo de transacción
  transaction_type: 'INVOICE_PAYMENT' | 'ACCOUNT_PAYMENT';
  
  // Estado
  status: 'open' | 'completed' | 'cancelled' | 'reconciled';
  is_reconciled: boolean;
  
  // Referencia bancaria
  bank_reference?: string;
  check_number?: string;
  
  // Archivos adjuntos
  attachment_url?: string;
  
  // Auditoría
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancelled_reason?: string;
  
  // Relaciones (pobladas por joins)
  customer?: Customer;
  account?: Account;
  payment_method?: PaymentMethod;
  cost_center?: CostCenter;
  numeration?: Numeration;
  items?: ReceivedPaymentItem[];
  history?: ReceivedPaymentHistory[];
}

export interface ReceivedPaymentItem {
  id: string;
  received_payment_id: string;
  
  // Tipo de asociación
  item_type: 'INVOICE' | 'ACCOUNT';
  
  // Si es factura
  sale_id?: string;
  amount_paid: number;
  
  // Si es cuenta contable
  account_id?: string;
  
  // Descripción
  description?: string;
  
  // Auditoría
  created_at: string;
  
  // Relaciones (pobladas por joins)
  sale?: Sale;
  account?: Account;
}

export interface ReceivedPaymentHistory {
  id: string;
  received_payment_id: string;
  company_id: string;
  action: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'RESTORED' | 'RECONCILED' | 'UNRECONCILED';
  field_name?: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
  changed_by?: string;
  changed_at: string;
}

export interface CreateReceivedPaymentInput {
  company_id: string;
  numeration_id?: string;
  payment_date: string;
  customer_id: string;
  account_id: string;
  payment_method_id?: string;
  cost_center_id?: string;
  currency?: 'COP' | 'USD' | 'EUR';
  notes?: string;
  transaction_type: 'INVOICE_PAYMENT' | 'ACCOUNT_PAYMENT';
  bank_reference?: string;
  check_number?: string;
  attachment_url?: string;
  items: CreateReceivedPaymentItemInput[];
}

export interface CreateReceivedPaymentItemInput {
  item_type: 'INVOICE' | 'ACCOUNT';
  sale_id?: string;
  account_id?: string;
  amount_paid: number;
  description?: string;
}

export interface UpdateReceivedPaymentInput {
  numeration_id?: string;
  payment_date?: string;
  customer_id?: string;
  account_id?: string;
  payment_method_id?: string;
  cost_center_id?: string;
  currency?: 'COP' | 'USD' | 'EUR';
  notes?: string;
  transaction_type?: 'INVOICE_PAYMENT' | 'ACCOUNT_PAYMENT';
  bank_reference?: string;
  check_number?: string;
  attachment_url?: string;
  status?: 'open' | 'completed' | 'cancelled' | 'reconciled';
  items?: CreateReceivedPaymentItemInput[];
}

export interface PendingInvoice {
  sale_id: string;
  sale_number: string;
  customer_id: string;
  customer_name: string;
  issue_date: string;
  due_date?: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_status: string;
}

