import { Customer } from './customers';
import { Product } from './products';
import { Tax } from './taxes';
import { Warehouse } from './products';
import { Numeration } from './numerations';
import { UserProfile } from './users';
import { Sale } from './sales';

export interface Quote {
  id: string;
  company_id: string;
  
  // Información del documento
  numeration_id?: string;
  quote_number?: string;
  
  // Información básica
  customer_id: string;
  quote_date: string; // YYYY-MM-DD
  expiration_date?: string; // YYYY-MM-DD (calculada automáticamente)
  payment_terms: number; // Plazo en días
  
  // Personalización
  currency: 'COP' | 'USD' | 'EUR';
  price_list_id?: string;
  salesperson_id?: string;
  warehouse_id?: string;
  
  // Totales
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  
  // Notas y comentarios
  notes?: string; // Notas visibles en PDF
  comments?: string; // Comentarios internos
  
  // Estado
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  is_invoiced: boolean;
  
  // Conversión a venta
  converted_to_sale_id?: string;
  converted_to_delivery_note_id?: string;
  converted_at?: string;
  converted_by?: string;
  
  // Auditoría
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Relaciones (pobladas por joins)
  customer?: Customer;
  salesperson?: UserProfile;
  warehouse?: Warehouse;
  numeration?: Numeration;
  converted_to_sale?: Sale;
  items?: QuoteItem[];
  history?: QuoteHistory[];
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  
  // Producto
  product_id?: string;
  
  // Información del producto en la cotización (modificable)
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

export interface QuoteHistory {
  id: string;
  quote_id: string;
  company_id: string;
  action: 'CREATED' | 'UPDATED' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED_TO_SALE' | 'CONVERTED_TO_DELIVERY_NOTE' | 'CLONED';
  field_name?: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
  changed_by?: string;
  changed_at: string;
}

export interface CreateQuoteInput {
  company_id: string;
  numeration_id?: string;
  customer_id: string;
  quote_date: string;
  payment_terms?: number;
  currency?: 'COP' | 'USD' | 'EUR';
  price_list_id?: string;
  salesperson_id?: string;
  warehouse_id?: string;
  notes?: string;
  comments?: string;
  items: CreateQuoteItemInput[];
}

export interface CreateQuoteItemInput {
  product_id?: string;
  product_reference?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  tax_id?: string;
  sort_order?: number;
}

export interface UpdateQuoteInput {
  numeration_id?: string;
  customer_id?: string;
  quote_date?: string;
  payment_terms?: number;
  currency?: 'COP' | 'USD' | 'EUR';
  price_list_id?: string;
  salesperson_id?: string;
  warehouse_id?: string;
  notes?: string;
  comments?: string;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  items?: CreateQuoteItemInput[];
}

export interface ConvertQuoteToSaleInput {
  quote_id: string;
  company_id: string;
  conversion_type: 'INVOICE' | 'DELIVERY_NOTE';
  sale_date?: string;
  payment_method?: string;
  account_id?: string;
  notes?: string;
}

