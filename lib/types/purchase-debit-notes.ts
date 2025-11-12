import { Supplier } from './products';
import { Account } from './accounts';
import { Numeration } from './numerations';
import { Warehouse } from './products';
import { Product } from './products';

export interface PurchaseDebitNote {
  id: string;
  company_id: string;
  
  // Información del documento
  numeration_id?: string;
  debit_note_number?: string;
  
  // Información básica
  supplier_id: string;
  debit_note_date: string; // YYYY-MM-DD
  
  // Moneda y bodega
  currency: 'COP' | 'USD' | 'EUR';
  warehouse_id?: string;
  
  // Totales
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  
  // Totales de liquidación
  cash_refund_amount: number;
  invoice_credit_amount: number;
  
  // Estado
  status: 'open' | 'cancelled' | 'reconciled';
  is_reconciled: boolean;
  
  // Observaciones
  observations?: string;
  
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
  numeration?: Numeration;
  items?: PurchaseDebitNoteItem[];
  settlements?: PurchaseDebitNoteSettlement[];
  history?: PurchaseDebitNoteHistory[];
}

export interface PurchaseDebitNoteItem {
  id: string;
  purchase_debit_note_id: string;
  
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
  
  // Descripción
  description?: string;
  
  // Orden
  sort_order: number;
  
  // Auditoría
  created_at: string;
  
  // Relaciones (pobladas por joins)
  product?: Product;
  account?: Account;
}

export interface PurchaseDebitNoteSettlement {
  id: string;
  purchase_debit_note_id: string;
  
  // Tipo de liquidación
  settlement_type: 'CASH_REFUND' | 'INVOICE_CREDIT';
  
  // Si es devolución de dinero
  refund_date?: string; // YYYY-MM-DD
  refund_account_id?: string;
  refund_amount?: number;
  refund_observations?: string;
  
  // Si es débito a factura de compra
  purchase_id?: string;
  credit_amount?: number;
  
  // Auditoría
  created_at: string;
  
  // Relaciones (pobladas por joins)
  refund_account?: Account;
  purchase?: any; // Purchase type
}

export interface PurchaseDebitNoteHistory {
  id: string;
  purchase_debit_note_id: string;
  company_id: string;
  action: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'RESTORED' | 'RECONCILED' | 'UNRECONCILED';
  field_name?: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
  changed_by?: string;
  changed_at: string;
}

export interface CreatePurchaseDebitNoteInput {
  company_id: string;
  numeration_id?: string;
  supplier_id: string;
  debit_note_date: string;
  currency?: 'COP' | 'USD' | 'EUR';
  warehouse_id?: string;
  observations?: string;
  items: CreatePurchaseDebitNoteItemInput[];
  settlements: CreatePurchaseDebitNoteSettlementInput[];
}

export interface CreatePurchaseDebitNoteItemInput {
  item_type: 'PRODUCT' | 'ACCOUNT';
  product_id?: string;
  quantity?: number;
  unit_cost?: number;
  account_id?: string;
  account_amount?: number;
  description?: string;
  sort_order?: number;
}

export interface CreatePurchaseDebitNoteSettlementInput {
  settlement_type: 'CASH_REFUND' | 'INVOICE_CREDIT';
  refund_date?: string;
  refund_account_id?: string;
  refund_amount?: number;
  refund_observations?: string;
  purchase_id?: string;
  credit_amount?: number;
}

export interface UpdatePurchaseDebitNoteInput {
  numeration_id?: string;
  supplier_id?: string;
  debit_note_date?: string;
  currency?: 'COP' | 'USD' | 'EUR';
  warehouse_id?: string;
  observations?: string;
  status?: 'open' | 'cancelled' | 'reconciled';
  items?: CreatePurchaseDebitNoteItemInput[];
  settlements?: CreatePurchaseDebitNoteSettlementInput[];
}

export interface PendingPurchase {
  purchase_id: string;
  purchase_number: string;
  supplier_id: string;
  supplier_name: string;
  issue_date: string;
  due_date?: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
}

