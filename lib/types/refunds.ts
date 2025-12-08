export interface RefundRequest {
  id: string;
  sale_id: string;
  company_id: string;
  request_type: 'REFUND' | 'CANCELLATION';
  reason: 'CONSUMER_RETRACT' | 'WARRANTY_CLAIM' | 'PRODUCT_DEFECT' | 'FRAUD' | 'CUSTOMER_DISSATISFACTION' | 'OTHER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  requested_amount: number;
  approved_amount?: number;
  refund_method: 'CASH' | 'CARD_REVERSAL' | 'TRANSFER' | 'STORE_CREDIT';
  description: string;
  supporting_documents?: string[]; // URLs de documentos adjuntos
  request_date: string;
  processed_date?: string;
  processed_by?: string;
  customer_signature?: string; // Para firmas digitales
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export interface RefundItem {
  id: string;
  refund_request_id: string;
  sale_item_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  condition: 'NEW' | 'USED' | 'DAMAGED';
  notes?: string;
  created_at: string;
}

export interface CreateRefundRequestData {
  sale_id: string;
  company_id: string;
  request_type: 'REFUND' | 'CANCELLATION';
  reason: 'CONSUMER_RETRACT' | 'WARRANTY_CLAIM' | 'PRODUCT_DEFECT' | 'FRAUD' | 'CUSTOMER_DISSATISFACTION' | 'OTHER';
  requested_amount: number;
  refund_method: 'CASH' | 'CARD_REVERSAL' | 'TRANSFER' | 'STORE_CREDIT';
  description: string;
  supporting_documents?: string[];
  customer_signature?: string;
  items: CreateRefundItemData[];
}

export interface CreateRefundItemData {
  sale_item_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  condition: 'NEW' | 'USED' | 'DAMAGED';
  notes?: string;
}

export interface UpdateRefundRequestData {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  approved_amount?: number;
  processed_date?: string;
  processed_by?: string;
  description?: string;
  supporting_documents?: string[];
}

// Constantes para las opciones de reembolso
export const REFUND_REASONS = {
  CONSUMER_RETRACT: 'Derecho de Retracto (5 días hábiles)',
  WARRANTY_CLAIM: 'Reclamo de Garantía',
  PRODUCT_DEFECT: 'Defecto del Producto',
  FRAUD: 'Fraude',
  CUSTOMER_DISSATISFACTION: 'Insatisfacción del Cliente',
  OTHER: 'Otro'
} as const;

export const REFUND_METHODS = {
  CASH: 'Efectivo',
  CARD_REVERSAL: 'Reversión a Tarjeta',
  TRANSFER: 'Transferencia',
  STORE_CREDIT: 'Crédito en Tienda'
} as const;

export const REFUND_REQUEST_TYPES = {
  REFUND: 'Reembolso',
  CANCELLATION: 'Anulación'
} as const;

export const REFUND_STATUSES = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  PROCESSED: 'Procesado'
} as const;

export const PRODUCT_CONDITIONS = {
  NEW: 'Nuevo',
  USED: 'Usado',
  DAMAGED: 'Dañado'
} as const;
