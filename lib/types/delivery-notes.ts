import { Customer } from './customers';
import { Product } from './products';
import { Tax } from './taxes';
import { Warehouse } from './products';
import { Numeration } from './numerations';
import { UserProfile } from './users';
import { Sale } from './sales';

export interface DeliveryNote {
  id: string;
  company_id: string;
  
  // Información del documento
  numeration_id?: string;
  delivery_note_number?: string;
  
  // Información básica
  customer_id: string;
  delivery_date: string; // YYYY-MM-DD
  expiration_date?: string; // YYYY-MM-DD
  
  // Tipo de documento
  document_type: 'DELIVERY_NOTE' | 'SERVICE_ORDER';
  
  // Personalización
  warehouse_id?: string;
  currency: 'COP' | 'USD' | 'EUR';
  price_list_id?: string;
  salesperson_id?: string;
  
  // Totales
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  
  // Notas y comentarios
  notes?: string; // Notas visibles en el documento
  observations?: string; // Observaciones/comentarios internos
  
  // Estado
  status: 'pending' | 'partially_invoiced' | 'invoiced' | 'cancelled';
  is_cancelled: boolean;
  
  // Conversión a factura
  converted_to_sale_id?: string;
  converted_at?: string;
  converted_by?: string;
  
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
  salesperson?: UserProfile;
  warehouse?: Warehouse;
  numeration?: Numeration;
  converted_to_sale?: Sale;
  items?: DeliveryNoteItem[];
  conversions?: DeliveryNoteSaleConversion[];
  history?: DeliveryNoteHistory[];
}

export interface DeliveryNoteItem {
  id: string;
  delivery_note_id: string;
  
  // Producto
  product_id?: string;
  
  // Información del producto
  product_reference?: string;
  description?: string;
  
  // Cantidades
  quantity: number; // Cantidad remitida
  quantity_invoiced: number; // Cantidad ya facturada
  quantity_pending: number; // Cantidad pendiente (calculada automáticamente)
  
  // Precios y descuentos
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

export interface DeliveryNoteSaleConversion {
  id: string;
  delivery_note_id: string;
  sale_id: string;
  company_id: string;
  converted_at: string;
  converted_by?: string;
  
  // Relaciones
  delivery_note?: DeliveryNote;
  sale?: Sale;
}

export interface DeliveryNoteHistory {
  id: string;
  delivery_note_id: string;
  company_id: string;
  action: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'RESTORED' | 'CONVERTED_TO_SALE' | 'PARTIALLY_INVOICED' | 'FULLY_INVOICED';
  field_name?: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
  changed_by?: string;
  changed_at: string;
}

export interface CreateDeliveryNoteInput {
  company_id: string;
  numeration_id?: string;
  customer_id: string;
  delivery_date: string;
  expiration_date?: string;
  document_type?: 'DELIVERY_NOTE' | 'SERVICE_ORDER';
  warehouse_id?: string;
  currency?: 'COP' | 'USD' | 'EUR';
  price_list_id?: string;
  salesperson_id?: string;
  notes?: string;
  observations?: string;
  attachment_url?: string;
  items: CreateDeliveryNoteItemInput[];
}

export interface CreateDeliveryNoteItemInput {
  product_id?: string;
  product_reference?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  tax_id?: string;
  sort_order?: number;
}

export interface UpdateDeliveryNoteInput {
  numeration_id?: string;
  customer_id?: string;
  delivery_date?: string;
  expiration_date?: string;
  document_type?: 'DELIVERY_NOTE' | 'SERVICE_ORDER';
  warehouse_id?: string;
  currency?: 'COP' | 'USD' | 'EUR';
  price_list_id?: string;
  salesperson_id?: string;
  notes?: string;
  observations?: string;
  attachment_url?: string;
  status?: 'pending' | 'partially_invoiced' | 'invoiced' | 'cancelled';
  items?: CreateDeliveryNoteItemInput[];
}

export interface ConvertDeliveryNoteToSaleInput {
  delivery_note_ids: string[]; // Puede ser una o varias remisiones
  company_id: string;
  sale_date?: string;
  payment_method?: string;
  account_id?: string;
  notes?: string;
  // Items específicos a facturar (si se omite, se facturan todos los items pendientes)
  items_to_invoice?: {
    delivery_note_id: string;
    item_id: string;
    quantity_to_invoice: number;
  }[];
}

