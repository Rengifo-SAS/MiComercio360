export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  cost_price?: number;
  stock_quantity: number;
  min_stock: number;
  category_id?: string;
  supplier_id?: string;
  company_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  category?: Category;
  supplier?: Supplier;
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

// Tipos para formularios
export interface CreateProductData {
  name: string;
  sku: string;
  description?: string;
  price: number;
  cost_price?: number;
  stock_quantity: number;
  min_stock: number;
  category_id?: string;
  supplier_id?: string;
}

export interface UpdateProductData {
  name?: string;
  sku?: string;
  description?: string;
  price?: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock?: number;
  category_id?: string;
  supplier_id?: string;
  is_active?: boolean;
}

// Tipos para filtros y búsqueda
export interface ProductFilters {
  category_id?: string;
  supplier_id?: string;
  is_active?: boolean;
  min_price?: number;
  max_price?: number;
  low_stock?: boolean;
}

export interface ProductSearchParams {
  query?: string;
  filters?: ProductFilters;
  sort_by?: 'name' | 'sku' | 'price' | 'stock_quantity' | 'created_at';
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
