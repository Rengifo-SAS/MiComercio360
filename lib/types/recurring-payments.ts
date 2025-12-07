import { Supplier } from './products';
import { Account } from './accounts';
import { Numeration } from './numerations';
import { PaymentMethod } from './payment-methods';
import { CostCenter } from './cost-centers';
import { Payment } from './payments';

export interface RecurringPayment {
  id: string;
  company_id: string;
  
  // Información del documento
  numeration_id?: string;
  
  // Proveedor o contacto
  supplier_id?: string;
  contact_name?: string;
  
  // Fechas y programación
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  day_of_month: number; // Día del mes para generar (1-31)
  frequency_months: number; // Frecuencia en meses (1 = mensual, 2 = bimestral, etc.)
  
  // Información bancaria y financiera
  account_id: string; // Cuenta de donde sale el dinero (obligatorio)
  payment_method_id?: string;
  cost_center_id?: string;
  
  // Moneda
  currency: 'COP' | 'USD' | 'EUR';
  
  // Detalles y concepto
  details?: string; // Detalles del pago (concepto)
  notes?: string; // Notas internas
  
  // Tipo de transacción
  transaction_type: 'INVOICE_PAYMENT' | 'ACCOUNT_PAYMENT';
  
  // Cálculos
  total_amount: number;
  
  // Estado
  is_active: boolean;
  last_generated_date?: string; // YYYY-MM-DD
  next_generation_date?: string; // YYYY-MM-DD (calculada automáticamente)
  
  // Auditoría
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Relaciones (pobladas por joins)
  supplier?: Supplier;
  account?: Account;
  payment_method?: PaymentMethod;
  cost_center?: CostCenter;
  numeration?: Numeration;
  items?: RecurringPaymentItem[];
  generations?: RecurringPaymentGeneration[];
}

export interface RecurringPaymentItem {
  id: string;
  recurring_payment_id: string;
  
  // Tipo de item
  item_type: 'INVOICE' | 'ACCOUNT';
  
  // Si es factura de compra (para futuras implementaciones)
  purchase_invoice_id?: string;
  
  // Si es cuenta contable
  account_id?: string;
  
  // Monto
  amount: number;
  
  // Descripción
  description?: string;
  
  // Orden
  sort_order: number;
  
  // Auditoría
  created_at: string;
  updated_at: string;
  
  // Relaciones (pobladas por joins)
  account?: Account;
  purchase_invoice?: any; // Para futuras implementaciones
}

export interface RecurringPaymentGeneration {
  id: string;
  recurring_payment_id: string;
  payment_id?: string; // Pago generado
  company_id: string;
  scheduled_date: string; // YYYY-MM-DD
  generated_date: string;
  status: 'pending' | 'generated' | 'failed' | 'skipped';
  error_message?: string;
  generated_by?: string;
  
  // Relaciones (pobladas por joins)
  payment?: Payment;
}

export interface CreateRecurringPaymentInput {
  company_id: string;
  numeration_id?: string;
  supplier_id?: string;
  contact_name?: string;
  start_date: string;
  end_date?: string;
  day_of_month: number;
  frequency_months: number;
  account_id: string;
  payment_method_id?: string;
  cost_center_id?: string;
  currency?: 'COP' | 'USD' | 'EUR';
  details?: string;
  notes?: string;
  transaction_type: 'INVOICE_PAYMENT' | 'ACCOUNT_PAYMENT';
  items: CreateRecurringPaymentItemInput[];
}

export interface CreateRecurringPaymentItemInput {
  item_type: 'INVOICE' | 'ACCOUNT';
  purchase_invoice_id?: string;
  account_id?: string;
  amount: number;
  description?: string;
  sort_order?: number;
}

export interface UpdateRecurringPaymentInput {
  numeration_id?: string;
  supplier_id?: string;
  contact_name?: string;
  start_date?: string;
  end_date?: string;
  day_of_month?: number;
  frequency_months?: number;
  account_id?: string;
  payment_method_id?: string;
  cost_center_id?: string;
  currency?: 'COP' | 'USD' | 'EUR';
  details?: string;
  notes?: string;
  transaction_type?: 'INVOICE_PAYMENT' | 'ACCOUNT_PAYMENT';
  is_active?: boolean;
  items?: CreateRecurringPaymentItemInput[];
}













