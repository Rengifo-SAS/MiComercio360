import { Supplier } from './products';
import { Account } from './accounts';
import { Numeration } from './numerations';
import { Warehouse } from './products';
import { Product } from './products';
import { CostCenter } from './cost-centers';
import { Tax } from './taxes';

export interface PurchaseInvoice {
  id: string;
  company_id: string;
  
  // Información del documento
  numeration_id?: string;
  invoice_number?: string; // Número interno
  supplier_invoice_number: string; // Número de factura del proveedor (obligatorio)
  
  // Información básica
  supplier_id: string;
  invoice_date: string; // YYYY-MM-DD
  due_date?: string; // YYYY-MM-DD
  
  // Personalización
  currency: 'COP' | 'USD' | 'EUR';
  warehouse_id?: string;
  cost_center_id?: string;
  
  // Totales
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  withholding_amount: number; // Total de retenciones
  total_amount: number;
  
  // Estado de pago (cuenta por pagar)
  payment_status: 'pending' | 'partially_paid' | 'paid' | 'cancelled';
  paid_amount: number;
  pending_amount: number; // Calculado automáticamente
  
  // Observaciones
  observations?: string;
  
  // Estado general
  status: 'active' | 'cancelled';
  is_cancelled: boolean;
  
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
  warehouse?: Warehouse;
  cost_center?: CostCenter;
  numeration?: Numeration;
  items?: PurchaseInvoiceItem[];
  withholdings?: PurchaseInvoiceWithholding[];
  history?: PurchaseInvoiceHistory[];
}

export interface PurchaseInvoiceItem {
  id: string;
  purchase_invoice_id: string;
  
  // Tipo de item
  item_type: 'PRODUCT' | 'ACCOUNT';
  
  // Si es producto
  product_id?: string;
  quantity?: number;
  unit_cost?: number;
  total_cost?: number;
  
  // Si es cuenta contable
  account_id?: string;
  account_amount?: number;
  
  // Descuentos e impuestos
  discount_percentage: number;
  discount_amount: number;
  tax_id?: string;
  
  // Descripción
  description?: string;
  
  // Orden
  sort_order: number;
  
  // Auditoría
  created_at: string;
  updated_at: string;
  
  // Relaciones (pobladas por joins)
  product?: Product;
  account?: Account;
  tax?: Tax;
}

export interface PurchaseInvoiceWithholding {
  id: string;
  purchase_invoice_id: string;
  
  // Tipo de retención
  withholding_type: 'IVA' | 'RENTA' | 'ICA' | 'CREE' | 'OTHER';
  
  // Monto base y porcentaje
  base_amount: number;
  percentage: number;
  withholding_amount: number;
  
  // Descripción
  description?: string;
  
  // Auditoría
  created_at: string;
}

export interface PurchaseInvoiceHistory {
  id: string;
  purchase_invoice_id: string;
  company_id: string;
  action: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'RESTORED' | 'PAYMENT_RECEIVED' | 'PARTIALLY_PAID' | 'FULLY_PAID';
  field_name?: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
  changed_by?: string;
  changed_at: string;
}

export interface CreatePurchaseInvoiceInput {
  company_id: string;
  numeration_id?: string;
  supplier_id: string;
  supplier_invoice_number: string;
  invoice_date: string;
  due_date?: string;
  currency?: 'COP' | 'USD' | 'EUR';
  warehouse_id?: string;
  cost_center_id?: string;
  observations?: string;
  items: CreatePurchaseInvoiceItemInput[];
  withholdings?: CreatePurchaseInvoiceWithholdingInput[];
}

export interface CreatePurchaseInvoiceItemInput {
  item_type: 'PRODUCT' | 'ACCOUNT';
  product_id?: string;
  account_id?: string;
  quantity?: number;
  unit_cost?: number;
  account_amount?: number;
  discount_percentage?: number;
  tax_id?: string;
  description?: string;
  sort_order?: number;
}

export interface CreatePurchaseInvoiceWithholdingInput {
  withholding_type: 'IVA' | 'RENTA' | 'ICA' | 'CREE' | 'OTHER';
  base_amount: number;
  percentage: number;
  withholding_amount: number;
  description?: string;
}

export interface UpdatePurchaseInvoiceInput {
  numeration_id?: string;
  supplier_id?: string;
  supplier_invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  currency?: 'COP' | 'USD' | 'EUR';
  warehouse_id?: string;
  cost_center_id?: string;
  observations?: string;
  status?: 'active' | 'cancelled';
  items?: CreatePurchaseInvoiceItemInput[];
  withholdings?: CreatePurchaseInvoiceWithholdingInput[];
}









