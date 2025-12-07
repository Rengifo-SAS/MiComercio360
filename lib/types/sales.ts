export interface Sale {
  id: string;
  shift_id?: string;
  customer_id?: string;
  cashier_id: string;
  sale_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: SaleStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  company_id: string;
  account_id?: string;

  // Información de pago
  payment_reference?: string;
  payment_amount_received?: number;
  payment_change?: number;

  // Impuestos específicos
  iva_amount?: number;
  ica_amount?: number;
  retencion_amount?: number;

  // Relaciones
  customer?: Customer;
  cashier?: Profile;
  shift?: Shift;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  total_price: number;
  created_at: string;

  // Campos adicionales para impresión
  product_name?: string;
  sku?: string;

  // Relaciones
  product?: Product;
}

export interface Customer {
  id: string;
  company_id: string;
  identification_type: string;
  identification_number: string;
  business_name: string;
  person_type: string;
  tax_responsibility: string;
  department: string;
  municipality: string;

  // Campos adicionales para compatibilidad
  name?: string;
  city?: string;
  state?: string;
  address: string;
  postal_code?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  website?: string;
  tax_id?: string;
  tax_regime?: string;
  economic_activity_code?: string;
  economic_activity_description?: string;
  bank_name?: string;
  account_type?: string;
  account_number?: string;
  credit_limit: number;
  payment_terms: number;
  discount_percentage: number;
  is_active: boolean;
  is_vip: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
  is_active: boolean;
  company_id: string;
  phone?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  last_login?: string;
  login_count: number;
  status: string;
  two_factor_enabled: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  notes?: string;
  timezone: string;
  language: string;
  date_format: string;
  currency: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Shift {
  id: string;
  cashier_id: string;
  company_id: string;
  start_time: string;
  end_time?: string;
  initial_cash: number;
  final_cash?: number;
  total_sales: number;
  total_transactions: number;
  status: ShiftStatus;
  notes?: string;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  max_stock?: number;
  unit: string;
  barcode?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company_id: string;
  iva_rate: number;
  ica_rate: number;
  retencion_rate: number;
  fiscal_classification: string;
  excise_tax: boolean;
  warehouse_id?: string;
  tax_id?: string;
  cost_center_id?: string;
  available_quantity?: number; // Cantidad disponible en inventario
}

// Enums
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mixed';
export type PaymentStatus = 'pending' | 'completed' | 'refunded' | 'partially_refunded';
export type SaleStatus = 'pending' | 'completed' | 'cancelled';
export type ShiftStatus = 'open' | 'closed';
// Removed DocumentType as it's not used in the current structure

// Tipos para formularios
export interface CreateSaleData {
  customer_id?: string;
  cashier_id?: string;
  shift_id?: string;
  sale_number?: string;
  total_amount: number;
  discount_amount?: number;
  tax_amount?: number;
  payment_method: string;
  payment_status?: string;
  status?: SaleStatus;
  notes?: string;
  account_id?: string;
  numeration_id?: string;
  items: CreateSaleItemData[];
  created_at?: string;
  // Información de pago
  payment_reference?: string;
  payment_amount_received?: number;
  payment_change?: number;
}

export interface CreateSaleItemData {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  // Tasas capturadas del producto al momento de agregarlo a la venta
  iva_rate?: number;
  ica_rate?: number;
  retencion_rate?: number;
}

export interface UpdateSaleData {
  customer_id?: string;
  items?: CreateSaleItemData[];
  payment_method?: string;
  notes?: string;
  // Información de pago
  payment_reference?: string;
  payment_amount_received?: number;
  payment_change?: number;
  discount_amount?: number;
  status?: SaleStatus;
}

// Tipos para filtros y búsqueda
export interface SaleFilters {
  status?: SaleStatus[];
  payment_method?: PaymentMethod[];
  payment_status?: PaymentStatus[];
  customer_id?: string;
  cashier_id?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface SaleSearchParams {
  query?: string;
  filters?: SaleFilters;
  sort_by?: 'created_at' | 'sale_number' | 'total_amount' | 'customer_name';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Tipos para estadísticas
export interface SaleStats {
  total_sales: number;
  total_amount: number;
  average_sale: number;
  total_items: number;
  sales_today: number;
  sales_this_month: number;
  sales_this_year: number;
  amount_today: number;
  amount_this_month: number;
  amount_this_year: number;
  items_today: number;
  items_this_month: number;
  items_this_year: number;
}

export interface SaleChartData {
  date: string;
  sales: number;
  amount: number;
  transactions: number;
}

// Tipos para reportes
export interface SalesReport {
  period: {
    from: string;
    to: string;
  };
  summary: SaleStats;
  sales: Sale[];
  chart_data: SaleChartData[];
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    total_amount: number;
  }>;
  top_customers: Array<{
    customer_id: string;
    customer_name: string;
    total_purchases: number;
    total_amount: number;
  }>;
}

// Utilidades
export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mixed: 'Mixto',
};

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  refunded: 'Reembolsado',
  partially_refunded: 'Parcialmente Reembolsado',
};

export const SaleStatusLabels: Record<SaleStatus, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

// Removed DocumentTypeLabels as DocumentType was removed

// Funciones de utilidad
export function formatCurrency(amount: number, currency: string = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function calculateSaleTotals(
  items: CreateSaleItemData[],
  discountAmount: number = 0,
  products?: Product[]
): {
  subtotal: number;
  tax_amount: number;
  iva_amount: number;
  ica_amount: number;
  retencion_amount: number;
  discount_amount: number;
  total_amount: number;
} {
  // Calcular subtotal
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unit_price;
    const itemDiscount = item.discount_percentage
      ? (itemTotal * item.discount_percentage) / 100
      : 0;
    return sum + itemTotal - itemDiscount;
  }, 0);

  const discount_amount = discountAmount;
  const subtotalAfterDiscount = subtotal - discount_amount;

  // Calcular impuestos según estándares colombianos
  let iva_amount = 0;
  let ica_amount = 0;
  let retencion_amount = 0;

  if (items.length > 0) {
    items.forEach(item => {
      const base = (item.quantity * item.unit_price) -
        (item.discount_percentage ? (item.quantity * item.unit_price * item.discount_percentage) / 100 : 0);

      // Usar tasas del ítem si están presentes; si no, intentar de products[] como respaldo
      const prod = products?.find(p => p.id === item.product_id);
      const iva = (item.iva_rate ?? prod?.iva_rate ?? 0);
      const ica = (item.ica_rate ?? prod?.ica_rate ?? 0);
      const rete = (item.retencion_rate ?? prod?.retencion_rate ?? 0);

      if (iva > 0) iva_amount += (base * iva) / 100;
      if (ica > 0) ica_amount += (base * ica) / 100;
      if (rete > 0) retencion_amount += (base * rete) / 100;
    });
  }

  const tax_amount = iva_amount + ica_amount;
  const total_amount = subtotalAfterDiscount + tax_amount - retencion_amount;

  return {
    subtotal,
    tax_amount,
    iva_amount,
    ica_amount,
    retencion_amount,
    discount_amount,
    total_amount,
  };
}
