export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  barcode?: string;

  // Precios
  cost_price: number;
  selling_price: number;

  // Stock
  min_stock: number;
  max_stock?: number;
  unit: string;

  // Referencias
  category_id?: string;
  supplier_id?: string;
  warehouse_id?: string;
  company_id: string;

  // Impuestos y campos fiscales
  iva_rate?: number;
  ica_rate?: number;
  retencion_rate?: number;
  fiscal_classification?: string;
  excise_tax?: boolean;
  tax_id?: string;
  cost_center_id?: string;

  // Imagen
  image_url?: string;

  // Estado
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Relaciones (pobladas por joins)
  category?: Category;
  supplier?: Supplier;
  warehouse?: Warehouse;
  inventory?: InventoryRecord[];

  // Campo calculado
  available_quantity?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

// Interfaces adicionales
export interface Warehouse {
  id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  is_main?: boolean;
  is_active: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryRecord {
  id: string;
  product_id: string;
  quantity: number;
  reserved_quantity?: number;
  location?: string;
  warehouse_id?: string;
  company_id: string;
  last_updated: string;
  warehouses?: Warehouse;
}

// Tipos para formularios
export interface CreateProductData {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;

  // Precios
  cost_price: number;
  selling_price: number;

  // Stock
  min_stock?: number;
  max_stock?: number;
  unit?: string;
  available_quantity?: number;

  // Referencias
  category_id?: string;
  supplier_id?: string;
  warehouse_id?: string;

  // Impuestos
  iva_rate?: number;
  ica_rate?: number;
  retencion_rate?: number;
  fiscal_classification?: string;
  excise_tax?: boolean;
  tax_id?: string;
  cost_center_id?: string;

  // Imagen
  image_url?: string;
}

export interface UpdateProductData {
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;

  // Precios
  cost_price?: number;
  selling_price?: number;

  // Stock
  min_stock?: number;
  max_stock?: number;
  unit?: string;

  // Referencias
  category_id?: string;
  supplier_id?: string;
  warehouse_id?: string;

  // Impuestos
  iva_rate?: number;
  ica_rate?: number;
  retencion_rate?: number;
  fiscal_classification?: string;
  excise_tax?: boolean;
  tax_id?: string;
  cost_center_id?: string;

  // Imagen
  image_url?: string;

  // Estado
  is_active?: boolean;
}

// Tipos para filtros y búsqueda
export interface ProductFilters {
  category_id?: string;
  supplier_id?: string;
  warehouse_id?: string;
  is_active?: boolean;
  min_price?: number;
  max_price?: number;
  low_stock?: boolean;
  has_barcode?: boolean;
}

export interface ProductSearchParams {
  query?: string;
  filters?: ProductFilters;
  sort_by?: 'name' | 'sku' | 'selling_price' | 'cost_price' | 'min_stock' | 'created_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Utilidades
export function formatCurrency(amount: number, currency: string = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function getStockStatus(stock: number, minStock: number): {
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  label: string;
  color: string;
} {
  if (stock === 0) {
    return {
      status: 'out_of_stock',
      label: 'Sin stock',
      color: 'text-red-600'
    };
  } else if (stock <= minStock) {
    return {
      status: 'low_stock',
      label: 'Stock bajo',
      color: 'text-yellow-600'
    };
  } else {
    return {
      status: 'in_stock',
      label: 'En stock',
      color: 'text-green-600'
    };
  }
}
