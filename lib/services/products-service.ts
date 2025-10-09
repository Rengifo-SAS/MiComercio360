import { createClient } from '@/lib/supabase/client';
import { Product } from '@/lib/types/sales';

export class ProductsService {
  private static supabase = createClient();

  // Obtener todos los productos de una empresa
  static async getProducts(companyId: string, options?: {
    search?: string;
    categoryId?: string;
    supplierId?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
    try {
      const {
        search = '',
        categoryId = null,
        supplierId = null,
        isActive = null,
        sortBy = 'name',
        sortOrder = 'asc',
        limit = 50,
        offset = 0
      } = options || {};

      let query = this.supabase
        .from('products')
        .select(`
          *,
          inventory:inventory(quantity, warehouse_id),
          warehouses!products_warehouse_id_fkey(id, name, code)
        `, { count: 'exact' })
        .eq('company_id', companyId);

      // Aplicar filtros
      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      if (isActive !== null) {
        query = query.eq('is_active', isActive);
      }

      // Aplicar ordenamiento
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Aplicar paginación
      query = query.range(offset, offset + limit - 1);

      const { data: products, error, count } = await query;

      if (error) {
        console.error('Error obteniendo productos:', error);
        throw new Error('Error al obtener los productos');
      }

      // Procesar productos para incluir cantidad disponible
      const processedProducts = (products || []).map(product => ({
        ...product,
        available_quantity: product.inventory?.[0]?.quantity || 0
      }));

      return {
        products: processedProducts,
        total: count || 0
      };
    } catch (error) {
      console.error('Error en getProducts:', error);
      throw error;
    }
  }

  // Obtener un producto por ID
  static async getProductById(id: string): Promise<Product | null> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error obteniendo producto:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error en getProductById:', error);
      return null;
    }
  }

  // Buscar productos por nombre o SKU
  static async searchProducts(companyId: string, searchTerm: string): Promise<Product[]> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          inventory:inventory(quantity)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
        .order('name');

      if (error) {
        console.error('Error buscando productos:', error);
        return [];
      }

      // Procesar productos para incluir cantidad disponible
      const processedProducts = (data || []).map(product => ({
        ...product,
        available_quantity: product.inventory?.[0]?.quantity || 0
      }));

      return processedProducts;
    } catch (error) {
      console.error('Error en searchProducts:', error);
      return [];
    }
  }

  // Obtener productos con stock bajo
  static async getLowStockProducts(companyId: string): Promise<Product[]> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .lte('min_stock', 10) // Productos con stock menor o igual a 10
        .order('min_stock');

      if (error) {
        console.error('Error obteniendo productos con stock bajo:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error en getLowStockProducts:', error);
      return [];
    }
  }

  // Obtener estadísticas de productos
  static async getProductStats(companyId: string): Promise<{
    total_products: number;
    active_products: number;
    inactive_products: number;
    low_stock_products: number;
    total_value: number;
  }> {
    try {
      const { data: products, error } = await this.supabase
        .from('products')
        .select('is_active, selling_price, cost_price, min_stock')
        .eq('company_id', companyId);

      if (error) {
        console.error('Error obteniendo estadísticas de productos:', error);
        throw new Error('Error al obtener las estadísticas');
      }

      const stats = {
        total_products: products?.length || 0,
        active_products: products?.filter(p => p.is_active).length || 0,
        inactive_products: products?.filter(p => !p.is_active).length || 0,
        low_stock_products: products?.filter(p => p.min_stock <= 10).length || 0,
        total_value: products?.reduce((sum, p) => sum + (p.selling_price * p.min_stock), 0) || 0,
      };

      return stats;
    } catch (error) {
      console.error('Error en getProductStats:', error);
      throw error;
    }
  }

  // Crear un nuevo producto
  static async createProduct(productData: {
    name: string;
    sku: string;
    barcode?: string;
    description?: string;
    category_id: string;
    cost_price?: number;
    selling_price: number;
    available_quantity?: number;
    iva_rate?: number;
    ica_rate?: number;
    retencion_rate?: number;
    company_id: string;
    is_active?: boolean;
  }): Promise<Product> {
    try {
      // Crear el producto sin available_quantity
      const { data: product, error } = await this.supabase
        .from('products')
        .insert({
          name: productData.name,
          sku: productData.sku,
          barcode: productData.barcode || null,
          description: productData.description || null,
          category_id: productData.category_id,
          cost_price: productData.cost_price || 0,
          selling_price: productData.selling_price,
          iva_rate: productData.iva_rate || 0,
          ica_rate: productData.ica_rate || 0,
          retencion_rate: productData.retencion_rate || 0,
          company_id: productData.company_id,
          is_active: productData.is_active !== undefined ? productData.is_active : true,
        })
        .select(`
          *,
          inventory:inventory(quantity)
        `)
        .single();

      if (error) {
        console.error('Error creando producto:', error);
        throw new Error('Error al crear el producto');
      }

      // Si se proporciona una cantidad disponible, crear/actualizar el inventario
      if (productData.available_quantity && productData.available_quantity > 0) {
        const { error: inventoryError } = await this.supabase
          .from('inventory')
          .upsert({
            product_id: product.id,
            quantity: productData.available_quantity,
            company_id: productData.company_id,
          });

        if (inventoryError) {
          console.error('Error creando inventario:', inventoryError);
          // No lanzamos error aquí para no fallar la creación del producto
        }
      }

      return product;
    } catch (error) {
      console.error('Error en createProduct:', error);
      throw error;
    }
  }
}
