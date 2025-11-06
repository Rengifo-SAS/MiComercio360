import { Customer } from './customers';
import { Product } from './products';
import { Tax } from './taxes';
import { Warehouse } from './products';
import { Numeration } from './numerations';

export interface RecurringInvoice {
  id: string;
  company_id: string;
  
  // Información del documento
  numeration_id?: string;
  
  // Cliente
  customer_id: string;
  
  // Fechas y programación
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  day_of_month: number; // 1-31
  frequency_months: number; // 1 = mensual, 2 = bimestral, etc.
  
  // Plazo y términos
  payment_terms: number; // Días de plazo de pago
  
  // Moneda y bodega
  currency: 'COP' | 'USD' | 'EUR';
  warehouse_id?: string;
  
  // Notas
  notes?: string; // Notas visibles en el PDF
  observations?: string; // Notas internas
  
  // Lista de precios (opcional)
  price_list_id?: string;
  
  // Cálculos
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  
  // Estado
  is_active: boolean;
  last_generated_date?: string;
  next_generation_date?: string;
  
  // Auditoría
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Relaciones (pobladas por joins)
  customer?: Customer;
  numeration?: Numeration;
  warehouse?: Warehouse;
  items?: RecurringInvoiceItem[];
  generations?: RecurringInvoiceGeneration[];
}

export interface RecurringInvoiceItem {
  id: string;
  recurring_invoice_id: string;
  
  // Producto
  product_id?: string;
  
  // Información del producto
  product_reference?: string;
  description?: string;
  
  // Precios y cantidades
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  
  // Impuestos
  tax_id?: string;
  
  // Total
  total_price: number;
  
  // Orden
  sort_order: number;
  
  // Auditoría
  created_at: string;
  updated_at: string;
  
  // Relaciones (pobladas por joins)
  product?: Product;
  tax?: Tax;
}

export interface RecurringInvoiceGeneration {
  id: string;
  recurring_invoice_id: string;
  sale_id?: string;
  company_id: string;
  scheduled_date: string; // YYYY-MM-DD
  generated_date: string;
  status: 'pending' | 'generated' | 'failed' | 'skipped';
  error_message?: string;
  generated_by?: string;
}

export interface CreateRecurringInvoiceInput {
  company_id: string;
  numeration_id?: string;
  customer_id: string;
  start_date: string;
  end_date?: string;
  day_of_month: number;
  frequency_months: number;
  payment_terms?: number;
  currency?: 'COP' | 'USD' | 'EUR';
  warehouse_id?: string;
  notes?: string;
  observations?: string;
  price_list_id?: string;
  items: CreateRecurringInvoiceItemInput[];
}

export interface CreateRecurringInvoiceItemInput {
  product_id?: string;
  product_reference?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  tax_id?: string;
  sort_order?: number;
}

export interface UpdateRecurringInvoiceInput {
  numeration_id?: string;
  customer_id?: string;
  start_date?: string;
  end_date?: string;
  day_of_month?: number;
  frequency_months?: number;
  payment_terms?: number;
  currency?: 'COP' | 'USD' | 'EUR';
  warehouse_id?: string;
  notes?: string;
  observations?: string;
  price_list_id?: string;
  is_active?: boolean;
  items?: CreateRecurringInvoiceItemInput[];
}

