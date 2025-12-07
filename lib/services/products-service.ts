import { createClient } from '@/lib/supabase/client';
import {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductFilters,
  ProductSearchParams
} from '@/lib/types/products';

/**
 * Servicio mejorado para la gestión de productos
 * Alineado con el esquema real de la base de datos
 */
export class ProductsService {
  private static supabase = createClient();

  /**
   * Obtiene todos los productos de una empresa con filtros y paginación
   */
  static async getProducts(companyId: string, options?: {
    search?: string;
    categoryId?: string;
    supplierId?: string;
    warehouseId?: string;
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
        warehouseId = null,
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
          category:categories(id, name, description),
          supplier:suppliers(id, name, contact_person, phone, email),
          warehouse:warehouses!products_warehouse_id_fkey(id, name, code, is_main),
          inventory:inventory(id, quantity, reserved_quantity, warehouse_id, warehouses!inventory_warehouse_id_fkey(id, name, code))
        `, { count: 'exact' })
        .eq('company_id', companyId);

      // Aplicar filtros de búsqueda
      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
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

      // Procesar productos para calcular cantidad disponible total
      const processedProducts = (products || []).map(product => {
        const totalQuantity = product.inventory?.reduce(
          (sum: number, inv: any) => sum + (inv.quantity || 0),
          0
        ) || 0;

        return {
          ...product,
          available_quantity: totalQuantity
        };
      });

      return {
        products: processedProducts,
        total: count || 0
      };
    } catch (error) {
      console.error('Error en getProducts:', error);
      throw error;
    }
  }

  /**
   * Obtiene TODOS los productos de la empresa en páginas para cache offline.
   * Selecciona sólo los campos necesarios para POS y cálculo.
   */
  static async getAllProductsForCache(companyId: string): Promise<Product[]> {
    const PAGE_SIZE = 500; // tamaño grande para reducir rondas
    let offset = 0;
    let all: any[] = [];

    try {
      while (true) {
        const { data, error } = await this.supabase
          .from('products')
          .select(`
            id, sku, barcode, name, description,
            cost_price, selling_price, unit,
            iva_rate, ica_rate, retencion_rate,
            fiscal_classification, excise_tax,
            category_id, warehouse_id, cost_center_id,
            is_active, created_at, updated_at, company_id,
            inventory:inventory(quantity)
          `)
          .eq('company_id', companyId)
          .order('name', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          console.error('Error paginando productos para cache:', error);
          break;
        }

        const page = (data || []).map((p: any) => ({
          ...p,
          available_quantity: p.inventory?.reduce((s: number, inv: any) => s + (inv.quantity || 0), 0) || 0,
        }));

        all = all.concat(page);

        if (!data || data.length < PAGE_SIZE) {
          break; // última página
        }
        offset += PAGE_SIZE;
      }

      return all as Product[];
    } catch (e) {
      console.error('Error obteniendo productos para cache:', e);
      return all as Product[];
    }
  }

  /**
   * Obtiene un producto por ID con todas sus relaciones
   */
  static async getProductById(id: string, companyId?: string): Promise<Product | null> {
    try {
      let query = this.supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, description),
          supplier:suppliers(id, name, contact_person, phone, email),
          warehouse:warehouses!products_warehouse_id_fkey(id, name, code, is_main),
          inventory:inventory(id, quantity, reserved_quantity, warehouse_id, warehouses!inventory_warehouse_id_fkey(id, name, code))
        `)
        .eq('id', id);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query.single();

      if (error) {
        console.error('Error obteniendo producto:', error);
        return null;
      }

      // Calcular cantidad disponible total
      const totalQuantity = data.inventory?.reduce(
        (sum: number, inv: any) => sum + (inv.quantity || 0),
        0
      ) || 0;

      return {
        ...data,
        available_quantity: totalQuantity
      };
    } catch (error) {
      console.error('Error en getProductById:', error);
      return null;
    }
  }

  /**
   * Busca productos por término de búsqueda (nombre, SKU o código de barras)
   */
  static async searchProducts(companyId: string, searchTerm: string, limit: number = 50): Promise<Product[]> {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return [];
      }

      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name),
          warehouse:warehouses!products_warehouse_id_fkey(id, name, code),
          inventory:inventory(id, quantity, warehouse_id)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
        .order('name')
        .limit(limit);

      if (error) {
        console.error('Error buscando productos:', error);
        return [];
      }

      // Calcular cantidad disponible para cada producto
      const processedProducts = (data || []).map(product => {
        const totalQuantity = product.inventory?.reduce(
          (sum: number, inv: any) => sum + (inv.quantity || 0),
          0
        ) || 0;

        return {
          ...product,
          available_quantity: totalQuantity
        };
      });

      return processedProducts;
    } catch (error) {
      console.error('Error en searchProducts:', error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de productos
   */
  static async getProductsStats(companyId: string): Promise<{
    total_products: number;
    active_products: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_inventory_value: number;
  }> {
    try {
      // Obtener productos con su inventario
      const { data: products, error } = await this.supabase
        .from('products')
        .select(`
          id,
          is_active,
          min_stock,
          cost_price,
          inventory:inventory(quantity)
        `)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error obteniendo estadísticas:', error);
        throw new Error('Error al obtener estadísticas de productos');
      }

      let totalProducts = 0;
      let activeProducts = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let totalInventoryValue = 0;

      products?.forEach(product => {
        totalProducts++;

        if (product.is_active) {
          activeProducts++;
        }

        // Calcular cantidad total de inventario
        const totalQuantity = product.inventory?.reduce(
          (sum: number, inv: any) => sum + (inv.quantity || 0),
          0
        ) || 0;

        // Calcular valor de inventario
        totalInventoryValue += totalQuantity * (product.cost_price || 0);

        // Verificar stock bajo o sin stock
        if (totalQuantity === 0) {
          outOfStockCount++;
        } else if (product.min_stock > 0 && totalQuantity <= product.min_stock) {
          lowStockCount++;
        }
      });

      return {
        total_products: totalProducts,
        active_products: activeProducts,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
        total_inventory_value: totalInventoryValue
      };
    } catch (error) {
      console.error('Error en getProductsStats:', error);
      throw error;
    }
  }

  /**
   * Obtiene productos con stock bajo
   */
  static async getLowStockProducts(companyId: string, limit: number = 50): Promise<Product[]> {
    try {
      const { data: products, error } = await this.supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name),
          warehouse:warehouses!products_warehouse_id_fkey(id, name),
          inventory:inventory(quantity)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .gt('min_stock', 0)
        .order('min_stock', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error obteniendo productos con stock bajo:', error);
        return [];
      }

      // Filtrar productos donde la cantidad total sea menor o igual al stock mínimo
      const lowStockProducts = (products || [])
        .map(product => {
          const totalQuantity = product.inventory?.reduce(
            (sum: number, inv: any) => sum + (inv.quantity || 0),
            0
          ) || 0;

          return {
            ...product,
            available_quantity: totalQuantity
          };
        })
        .filter(product => product.available_quantity <= product.min_stock);

      return lowStockProducts;
    } catch (error) {
      console.error('Error en getLowStockProducts:', error);
      return [];
    }
  }

  /**
   * Obtiene productos sin stock
   */
  static async getOutOfStockProducts(companyId: string, limit: number = 50): Promise<Product[]> {
    try {
      const { data: products, error } = await this.supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name),
          warehouse:warehouses!products_warehouse_id_fkey(id, name),
          inventory:inventory(quantity)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name')
        .limit(limit);

      if (error) {
        console.error('Error obteniendo productos sin stock:', error);
        return [];
      }

      // Filtrar productos con cantidad total = 0
      const outOfStockProducts = (products || [])
        .map(product => {
          const totalQuantity = product.inventory?.reduce(
            (sum: number, inv: any) => sum + (inv.quantity || 0),
            0
          ) || 0;

          return {
            ...product,
            available_quantity: totalQuantity
          };
        })
        .filter(product => product.available_quantity === 0);

      return outOfStockProducts;
    } catch (error) {
      console.error('Error en getOutOfStockProducts:', error);
      return [];
    }
  }

  /**
   * Crea un nuevo producto
   */
  static async createProduct(productData: CreateProductData & { company_id: string }): Promise<Product> {
    try {
      // Validar datos requeridos
      if (!productData.name || !productData.sku || !productData.selling_price) {
        throw new Error('Faltan datos requeridos: name, sku, selling_price');
      }

      // Preparar datos del producto
      const newProductData: any = {
        name: productData.name.trim(),
        sku: productData.sku.trim(),
        barcode: productData.barcode?.trim() || null,
        description: productData.description?.trim() || null,
        category_id: productData.category_id || null,
        supplier_id: productData.supplier_id || null,
        warehouse_id: productData.warehouse_id || null,
        cost_price: productData.cost_price || 0,
        selling_price: productData.selling_price,
        min_stock: productData.min_stock || 0,
        max_stock: productData.max_stock || null,
        unit: productData.unit || 'unidad',
        iva_rate: productData.iva_rate || 0,
        ica_rate: productData.ica_rate || 0,
        retencion_rate: productData.retencion_rate || 0,
        fiscal_classification: productData.fiscal_classification || 'Bien',
        excise_tax: productData.excise_tax || false,
        tax_id: productData.tax_id || null,
        cost_center_id: productData.cost_center_id || null,
        image_url: productData.image_url || null,
        company_id: productData.company_id,
        is_active: true
      };

      // Crear el producto
      const { data: product, error } = await this.supabase
        .from('products')
        .insert(newProductData)
        .select(`
          *,
          category:categories(id, name),
          warehouse:warehouses!products_warehouse_id_fkey(id, name)
        `)
        .single();

      if (error) {
        console.error('Error creando producto:', error);

        // Proporcionar mensajes de error más específicos
        if (error.code === '23505') {
          throw new Error('Ya existe un producto con ese SKU o código de barras');
        }

        throw new Error(`Error al crear el producto: ${error.message}`);
      }

      // Si se proporciona cantidad inicial, crear inventario
      if (productData.available_quantity && productData.available_quantity > 0) {
        const warehouseId = productData.warehouse_id || await this.getMainWarehouse(productData.company_id);

        if (warehouseId) {
          await this.updateInventory(
            product.id,
            warehouseId,
            productData.available_quantity,
            productData.company_id
          );
        }
      }

      return product;
    } catch (error) {
      console.error('Error en createProduct:', error);
      throw error;
    }
  }

  /**
   * Actualiza un producto existente
   */
  static async updateProduct(
    productId: string,
    productData: UpdateProductData,
    companyId: string
  ): Promise<Product> {
    try {
      // Preparar datos de actualización (solo incluir campos definidos)
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (productData.name !== undefined) updateData.name = productData.name.trim();
      if (productData.sku !== undefined) updateData.sku = productData.sku.trim();
      if (productData.barcode !== undefined) updateData.barcode = productData.barcode?.trim() || null;
      if (productData.description !== undefined) updateData.description = productData.description?.trim() || null;
      if (productData.category_id !== undefined) updateData.category_id = productData.category_id;
      if (productData.supplier_id !== undefined) updateData.supplier_id = productData.supplier_id;
      if (productData.warehouse_id !== undefined) updateData.warehouse_id = productData.warehouse_id;
      if (productData.cost_price !== undefined) updateData.cost_price = productData.cost_price;
      if (productData.selling_price !== undefined) updateData.selling_price = productData.selling_price;
      if (productData.min_stock !== undefined) updateData.min_stock = productData.min_stock;
      if (productData.max_stock !== undefined) updateData.max_stock = productData.max_stock;
      if (productData.unit !== undefined) updateData.unit = productData.unit;
      if (productData.iva_rate !== undefined) updateData.iva_rate = productData.iva_rate;
      if (productData.ica_rate !== undefined) updateData.ica_rate = productData.ica_rate;
      if (productData.retencion_rate !== undefined) updateData.retencion_rate = productData.retencion_rate;
      if (productData.fiscal_classification !== undefined) updateData.fiscal_classification = productData.fiscal_classification;
      if (productData.excise_tax !== undefined) updateData.excise_tax = productData.excise_tax;
      if (productData.tax_id !== undefined) updateData.tax_id = productData.tax_id;
      if (productData.cost_center_id !== undefined) updateData.cost_center_id = productData.cost_center_id;
      if (productData.image_url !== undefined) updateData.image_url = productData.image_url;
      if (productData.is_active !== undefined) updateData.is_active = productData.is_active;

      // Actualizar el producto
      const { data: product, error } = await this.supabase
        .from('products')
        .update(updateData)
        .eq('id', productId)
        .eq('company_id', companyId)
        .select(`
          *,
          category:categories(id, name),
          warehouse:warehouses!products_warehouse_id_fkey(id, name),
          inventory:inventory(quantity)
        `)
        .single();

      if (error) {
        console.error('Error actualizando producto:', error);

        if (error.code === '23505') {
          throw new Error('Ya existe un producto con ese SKU o código de barras');
        }

        throw new Error(`Error al actualizar el producto: ${error.message}`);
      }

      return product;
    } catch (error) {
      console.error('Error en updateProduct:', error);
      throw error;
    }
  }

  /**
   * Elimina (desactiva) un producto
   */
  static async deleteProduct(productId: string, companyId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('products')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error eliminando producto:', error);
        throw new Error('Error al eliminar el producto');
      }

      return true;
    } catch (error) {
      console.error('Error en deleteProduct:', error);
      throw error;
    }
  }

  /**
   * Actualiza el inventario de un producto en una bodega específica
   * Usa estrategia de buscar-actualizar-insertar para evitar problemas con constraints
   */
  private static async updateInventory(
    productId: string,
    warehouseId: string,
    quantity: number,
    companyId: string
  ): Promise<void> {
    try {
      // Asegurar que quantity sea un entero
      const integerQuantity = Math.floor(Math.max(0, quantity));
      const now = new Date().toISOString();

      // 1. Actualizar tabla inventory
      // Buscar registro existente
      const { data: existingInventory } = await this.supabase
        .from('inventory')
        .select('id')
        .eq('product_id', productId)
        .eq('company_id', companyId)
        .eq('warehouse_id', warehouseId)
        .maybeSingle();

      if (existingInventory) {
        // Actualizar registro existente
        await this.supabase
          .from('inventory')
          .update({
            quantity: integerQuantity,
            last_updated: now
          })
          .eq('id', existingInventory.id);
      } else {
        // Crear nuevo registro
        await this.supabase
          .from('inventory')
          .insert({
            product_id: productId,
            warehouse_id: warehouseId,
            quantity: integerQuantity,
            company_id: companyId,
            last_updated: now
          });
      }

      // 2. Actualizar tabla warehouse_inventory
      // Esta tabla SÍ tiene restricción única en (warehouse_id, product_id)
      // por lo que podemos usar upsert de forma segura
      await this.supabase
        .from('warehouse_inventory')
        .upsert({
          product_id: productId,
          warehouse_id: warehouseId,
          quantity: integerQuantity,
          company_id: companyId,
          last_updated: now
        }, {
          onConflict: 'warehouse_id,product_id',
          ignoreDuplicates: false
        });
    } catch (error) {
      console.error('Error actualizando inventario:', error);
      // No lanzar error para no interrumpir la creación del producto
    }
  }

  /**
   * Obtiene la bodega principal de una empresa
   */
  private static async getMainWarehouse(companyId: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('warehouses')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('is_main', true)
        .single();

      if (error || !data) {
        // Si no hay bodega principal, usar la primera bodega activa
        const { data: firstWarehouse } = await this.supabase
          .from('warehouses')
          .select('id')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .limit(1)
          .single();

        return firstWarehouse?.id || null;
      }

      return data.id;
    } catch (error) {
      console.error('Error obteniendo bodega principal:', error);
      return null;
    }
  }

  /**
   * Verifica si un SKU o código de barras ya existe
   */
  static async checkDuplicates(
    companyId: string,
    sku?: string,
    barcode?: string,
    excludeProductId?: string
  ): Promise<{
    skuExists: boolean;
    barcodeExists: boolean;
  }> {
    try {
      let skuExists = false;
      let barcodeExists = false;

      // Verificar SKU
      if (sku && sku.trim() !== '') {
        let skuQuery = this.supabase
          .from('products')
          .select('id')
          .eq('company_id', companyId)
          .eq('sku', sku.trim())
          .limit(1);

        if (excludeProductId) {
          skuQuery = skuQuery.neq('id', excludeProductId);
        }

        const { data: skuData } = await skuQuery;
        skuExists = Boolean(skuData && skuData.length > 0);
      }

      // Verificar código de barras
      if (barcode && barcode.trim() !== '') {
        let barcodeQuery = this.supabase
          .from('products')
          .select('id')
          .eq('company_id', companyId)
          .eq('barcode', barcode.trim())
          .limit(1);

        if (excludeProductId) {
          barcodeQuery = barcodeQuery.neq('id', excludeProductId);
        }

        const { data: barcodeData } = await barcodeQuery;
        barcodeExists = Boolean(barcodeData && barcodeData.length > 0);
      }

      return { skuExists, barcodeExists };
    } catch (error) {
      console.error('Error verificando duplicados:', error);
      return { skuExists: false, barcodeExists: false };
    }
  }

  /**
   * Obtiene productos agrupados por categoría
   */
  static async getProductsByCategory(companyId: string): Promise<{
    categoryName: string;
    categoryId: string;
    productCount: number;
    products: Product[];
  }[]> {
    try {
      const { data: products, error } = await this.supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name),
          inventory:inventory(quantity)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error obteniendo productos por categoría:', error);
        return [];
      }

      // Agrupar por categoría
      const grouped = new Map<string, any>();

      products?.forEach(product => {
        const categoryId = product.category?.id || 'sin-categoria';
        const categoryName = product.category?.name || 'Sin Categoría';

        if (!grouped.has(categoryId)) {
          grouped.set(categoryId, {
            categoryId,
            categoryName,
            productCount: 0,
            products: []
          });
        }

        const group = grouped.get(categoryId);
        group.productCount++;
        group.products.push({
          ...product,
          available_quantity: product.inventory?.reduce(
            (sum: number, inv: any) => sum + (inv.quantity || 0),
            0
          ) || 0
        });
      });

      return Array.from(grouped.values());
    } catch (error) {
      console.error('Error en getProductsByCategory:', error);
      return [];
    }
  }
}
