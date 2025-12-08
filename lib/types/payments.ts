import { Supplier } from './products';
import { Account } from './accounts';
import { Numeration } from './numerations';
import { PaymentMethod } from './payment-methods';
import { CostCenter } from './cost-centers';
import { PurchaseInvoice } from './purchase-invoices';

export interface Payment {
  id: string;
  company_id: string;
  
  // Información del documento
  numeration_id?: string;
  payment_number?: string; // Número del documento (generado desde numeración)
  
  // Fecha y contacto
  payment_date: string; // YYYY-MM-DD
  supplier_id?: string; // Proveedor (si aplica)
  contact_name?: string; // Nombre del contacto (si no es proveedor registrado)
  
  // Información bancaria y financiera
  account_id: string; // Cuenta de donde sale el dinero (obligatorio)
  payment_method_id?: string; // Método de pago
  cost_center_id?: string; // Centro de costo
  
  // Moneda y monto
  currency: 'COP' | 'USD' | 'EUR';
  total_amount: number; // Monto total pagado
  
  // Detalles y concepto
  details?: string; // Detalles del pago (concepto)
  notes?: string; // Notas internas
  
  // Tipo de transacción
  transaction_type: 'INVOICE_PAYMENT' | 'ACCOUNT_PAYMENT';
  
  // Estado
  status: 'open' | 'cancelled' | 'reconciled';
  is_reconciled: boolean; // Si está conciliado
  reconciliation_id?: string; // ID de conciliación (si aplica)
  reconciliation_date?: string; // Fecha de conciliación
  
  // Referencia bancaria
  bank_reference?: string; // Referencia bancaria
  check_number?: string; // Número de cheque (si aplica)
  cleared_date?: string; // Fecha de compensación
  
  // Archivos adjuntos
  attachment_url?: string; // URL del archivo adjunto
  
  // Auditoría
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancelled_reason?: string;
  
  // Relaciones (pobladas por joins)
  supplier?: Supplier;
  account?: Account;
  payment_method?: PaymentMethod;
  cost_center?: CostCenter;
  numeration?: Numeration;
  items?: PaymentItem[];
  history?: PaymentHistory[];
}

export interface PaymentItem {
  id: string;
  payment_id: string;
  
  // Tipo de asociación
  item_type: 'INVOICE' | 'ACCOUNT';
  
  // Si es factura de compra
  purchase_invoice_id?: string;
  amount_paid: number; // Monto pagado de esta factura/cuenta
  
  // Si es cuenta contable
  account_id?: string; // Cuenta contable relacionada
  
  // Descripción
  description?: string;
  
  // Auditoría
  created_at: string;
  
  // Relaciones (pobladas por joins)
  purchase_invoice?: PurchaseInvoice;
  account?: Account;
}

export interface PaymentHistory {
  id: string;
  payment_id: string;
  company_id: string;
  action: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'RESTORED' | 'RECONCILED' | 'UNRECONCILED';
  field_name?: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
  changed_by?: string;
  changed_at: string;
}

export interface CreatePaymentInput {
  company_id: string;
  numeration_id?: string;
  payment_date: string;
  supplier_id?: string;
  contact_name?: string;
  account_id: string;
  payment_method_id?: string;
  cost_center_id?: string;
  currency?: 'COP' | 'USD' | 'EUR';
  details?: string;
  notes?: string;
  transaction_type: 'INVOICE_PAYMENT' | 'ACCOUNT_PAYMENT';
  bank_reference?: string;
  check_number?: string;
  attachment_url?: string;
  items: CreatePaymentItemInput[];
}

export interface CreatePaymentItemInput {
  item_type: 'INVOICE' | 'ACCOUNT';
  purchase_invoice_id?: string;
  account_id?: string;
  amount_paid: number;
  description?: string;
}

export interface UpdatePaymentInput {
  numeration_id?: string;
  payment_date?: string;
  supplier_id?: string;
  contact_name?: string;
  account_id?: string;
  payment_method_id?: string;
  cost_center_id?: string;
  currency?: 'COP' | 'USD' | 'EUR';
  details?: string;
  notes?: string;
  transaction_type?: 'INVOICE_PAYMENT' | 'ACCOUNT_PAYMENT';
  bank_reference?: string;
  check_number?: string;
  attachment_url?: string;
  status?: 'open' | 'cancelled' | 'reconciled';
  is_reconciled?: boolean;
  reconciliation_id?: string;
  reconciliation_date?: string;
  items?: CreatePaymentItemInput[];
}

// Interfaz para facturas de compra pendientes de pago
export interface PendingPurchaseInvoice {
  id: string;
  invoice_number?: string;
  supplier_invoice_number: string;
  supplier_id: string;
  supplier_name: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_status: 'pending' | 'partially_paid' | 'paid' | 'cancelled';
  currency: 'COP' | 'USD' | 'EUR';
}













