import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';

export interface ProductImportData {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  category_name: string;
  cost_price: number;
  selling_price: number;
  available_quantity: number;
  iva_rate: number;
  ica_rate: number;
  retencion_rate: number;
  warehouse_name?: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated?: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    data: any;
  }>;
  warnings: Array<{
    row: number;
    message: string;
    data: any;
  }>;
}

export interface ImportConfig {
  companyId: string;
  userId: string;
  updateExistingProducts: boolean;
  createMissingCategories: boolean;
  createMissingWarehouses: boolean;
}

export interface ImportHistory {
  id: string;
  filename: string;
  file_path: string;
  company_id: string;
  uploaded_by: string;
  uploaded_at: string;
  total_rows: number;
  imported_rows: number;
  error_rows: number;
  status: 'processing' | 'completed' | 'failed';
  errors?: string;
}

export class ProductsImportService {
  private static supabase = createClient();

  /**
   * Parsea un archivo Excel y extrae los datos de productos
   */
  static parseExcelFile(file: File): Promise<ProductImportData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Obtener la primera hoja
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            reject(new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos'));
            return;
          }
          
          // Obtener encabezados (primera fila)
          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1) as any[][];
          
          // Mapear encabezados a índices
          const headerMap = this.createHeaderMap(headers);
          
          // Validar que tenemos los campos requeridos (en español o inglés)
          const requiredFieldMappings = {
            'name': ['nombre', 'nombre del producto', 'producto'],
            'cost_price': ['precio costo', 'precio de costo', 'costo', 'cost_price'],
            'selling_price': ['precio venta', 'precio de venta', 'venta', 'selling_price']
          };
          
          const missingFields = [];
          for (const [requiredField, possibleNames] of Object.entries(requiredFieldMappings)) {
            const found = possibleNames.some(name => headerMap[name] !== undefined);
            if (!found) {
              missingFields.push(requiredField);
            }
          }
          
          if (missingFields.length > 0) {
            reject(new Error(`Faltan los siguientes campos requeridos: ${missingFields.join(', ')}`));
            return;
          }
          
          // Convertir filas a objetos ProductImportData
          const products: ProductImportData[] = [];
          
          for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            
            if (!row || row.length === 0) continue;
            
            try {
              const product = this.mapRowToProduct(row, headerMap, i + 2); // +2 porque empezamos desde la fila 2
              if (product) {
                products.push(product);
              }
            } catch (error) {
              console.warn(`Error parseando fila ${i + 2}:`, error);
              continue;
            }
          }

          resolve(products);
        } catch (error) {
          reject(new Error(`Error parseando archivo Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error leyendo el archivo'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Crea un mapa de encabezados a índices
   */
  private static createHeaderMap(headers: string[]): { [key: string]: number } {
    const map: { [key: string]: number } = {};
    
    headers.forEach((header, index) => {
      if (header) {
        const normalizedHeader = header.toLowerCase()
          .replace(/[áéíóúñ]/g, (match) => {
            const map: { [key: string]: string } = {
              'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n'
            };
            return map[match] || match;
          })
          .replace(/[^\w\s]/g, '')
          .trim();
        
        map[normalizedHeader] = index;
      }
    });
    
    return map;
  }

  /**
   * Mapea una fila de datos a un objeto ProductImportData
   */
  private static mapRowToProduct(row: any[], headerMap: { [key: string]: number }, rowNumber: number): ProductImportData | null {
    try {
      const getValue = (possibleFields: string[]): string => {
        for (const field of possibleFields) {
          const index = headerMap[field];
          if (index !== undefined && row[index] !== undefined) {
            return String(row[index]).trim();
          }
        }
        return '';
      };
      
      const getNumber = (possibleFields: string[], defaultValue: number = 0): number => {
        const value = getValue(possibleFields);
        if (!value) return defaultValue;
        
        // Limpiar el valor numérico
        const cleaned = value.replace(/[^\d.-]/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? defaultValue : parsed;
      };
      
      const name = getValue(['nombre', 'nombre del producto', 'producto', 'name']);
      if (!name) {
        console.warn(`Fila ${rowNumber}: Nombre del producto es requerido`);
        return null;
      }
      
      // Generar SKU único si no se proporciona
      const skuValue = getValue(['sku', 'codigo', 'código', 'sku (opcional)']);
      const sku = skuValue || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        name,
        sku,
        barcode: getValue(['codigo de barras', 'código de barras', 'barcode', 'codigo de barras (opcional)']),
        description: getValue(['descripcion', 'descripción', 'description', 'descripción (opcional)']),
        category_name: getValue(['categoria', 'categoría', 'category']) || 'General',
        cost_price: getNumber(['precio costo', 'precio de costo', 'costo', 'cost_price', 'precio de costo']),
        selling_price: getNumber(['precio venta', 'precio de venta', 'venta', 'selling_price', 'precio de venta']),
        available_quantity: getNumber(['cantidad disponible', 'cantidad', 'stock', 'available_quantity', 'cantidad disponible']),
        iva_rate: getNumber(['iva', 'iva (%)', 'iva_rate']) || 19,
        ica_rate: getNumber(['ica', 'ica (%)', 'ica_rate']) || 0,
        retencion_rate: getNumber(['retencion', 'retención', 'retencion (%)', 'retencion_rate']) || 0,
        warehouse_name: getValue(['bodega', 'warehouse', 'almacen', 'almacén'])
      };
    } catch (error) {
      console.error(`Error mapeando fila ${rowNumber}:`, error);
      return null;
    }
  }

  /**
   * Genera una plantilla de Excel para importación
   */
  static generateTemplate(): Blob {
    const templateData = [
      {
        'Nombre del Producto *': 'COCO RALLADO X 60 G',
        'SKU (Opcional)': '7706286001870',
        'Código de Barras (Opcional)': '7706286001870',
        'Descripción (Opcional)': 'COCO RALLADO X 60 G',
        'Categoría *': 'CONDIMENTOS GUISASON',
        'Precio de Costo': 3500.00,
        'Precio de Venta *': 3500.00,
        'Cantidad Disponible': 8,
        'IVA (%)': 0,
        'ICA (%)': 0,
        'Retención (%)': 0
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /**
   * Valida los datos de importación
   */
  static async validateImportData(
    products: ProductImportData[], 
    config: ImportConfig
  ): Promise<ImportResult> {
    const errors: ImportResult['errors'] = [];
    const warnings: ImportResult['warnings'] = [];
    
    try {
      // Obtener datos existentes en paralelo
      const [categoriesResult, existingProductsResult] = await Promise.all([
        this.supabase
          .from('categories')
          .select('id, name')
          .eq('company_id', config.companyId)
          .eq('is_active', true),
        this.supabase
          .from('products')
          .select('id, sku, barcode, name')
          .eq('company_id', config.companyId)
      ]);

      if (categoriesResult.error) {
        throw new Error(`Error obteniendo categorías: ${categoriesResult.error.message}`);
      }

      if (existingProductsResult.error) {
        throw new Error(`Error obteniendo productos existentes: ${existingProductsResult.error.message}`);
      }

    const categories = categoriesResult.data || [];
    const existingProducts = existingProductsResult.data || [];

      const categoryMap = new Map(categories.map((c: any) => [c.name.toLowerCase(), c.id]));
      const existingSkus = new Set(existingProducts.map((p: any) => p.sku).filter(Boolean));
      const existingBarcodes = new Set(existingProducts.map((p: any) => p.barcode).filter(Boolean));
      const existingNames = new Set(existingProducts.map((p: any) => p.name.toLowerCase()));

    // Validar cada producto
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const rowNumber = i + 2; // +2 porque empezamos desde la fila 2

        // Validaciones básicas
      if (!product.name.trim()) {
          errors.push({
          row: rowNumber,
          field: 'name',
          message: 'El nombre del producto es requerido',
            data: product
          });
          continue;
      }

      if (product.cost_price < 0) {
          errors.push({
          row: rowNumber,
          field: 'cost_price',
          message: 'El precio de costo no puede ser negativo',
          data: product
        });
        }

        if (product.selling_price < 0) {
          errors.push({
            row: rowNumber,
            field: 'selling_price',
            message: 'El precio de venta no puede ser negativo',
            data: product
          });
        }

        // Verificar categoría
        const categoryExists = categoryMap.has(product.category_name.toLowerCase());
        if (!categoryExists && !config.createMissingCategories) {
          errors.push({
            row: rowNumber,
            field: 'category_name',
            message: `La categoría "${product.category_name}" no existe`,
            data: product
          });
        }

        // Verificar productos duplicados
        if (product.sku && existingSkus.has(product.sku)) {
          if (config.updateExistingProducts) {
            warnings.push({
            row: rowNumber,
              message: `El producto con SKU "${product.sku}" será actualizado`,
            data: product
          });
          } else {
            errors.push({
          row: rowNumber,
          field: 'sku',
              message: `Ya existe un producto con SKU "${product.sku}"`,
          data: product
        });
          }
        }

        if (product.barcode && existingBarcodes.has(product.barcode)) {
          if (config.updateExistingProducts) {
            warnings.push({
          row: rowNumber,
              message: `El producto con código de barras "${product.barcode}" será actualizado`,
          data: product
        });
          } else {
            errors.push({
          row: rowNumber,
          field: 'barcode',
              message: `Ya existe un producto con código de barras "${product.barcode}"`,
          data: product
        });
          }
        }

        if (existingNames.has(product.name.toLowerCase())) {
          if (config.updateExistingProducts) {
            warnings.push({
          row: rowNumber,
              message: `El producto con nombre "${product.name}" será actualizado`,
          data: product
        });
          } else {
            errors.push({
          row: rowNumber,
              field: 'name',
              message: `Ya existe un producto con nombre "${product.name}"`,
          data: product
        });
      }
        }
      }

      return {
        success: errors.length === 0,
        imported: products.length - errors.length,
        errors,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: [{
          row: 0,
          field: 'validation',
          message: `Error durante la validación: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          data: null
        }],
        warnings: []
      };
    }
  }

  /**
   * Importa productos con procesamiento en lotes
   */
  static async importProducts(
    products: ProductImportData[],
    config: ImportConfig,
    onProgress?: (progress: number) => void
  ): Promise<ImportResult> {
    const errors: ImportResult['errors'] = [];
    const warnings: ImportResult['warnings'] = [];
    let importedCount = 0;
    let updatedCount = 0;

    try {
      // Obtener datos existentes
      const [categoriesResult, existingProductsResult, warehousesResult] = await Promise.all([
        this.supabase
          .from('categories')
          .select('id, name')
          .eq('company_id', config.companyId)
          .eq('is_active', true),
        this.supabase
          .from('products')
          .select('id, sku, barcode, name')
          .eq('company_id', config.companyId),
        this.supabase
          .from('warehouses')
          .select('id, name')
          .eq('company_id', config.companyId)
          .eq('is_active', true)
      ]);

      if (categoriesResult.error) throw new Error(`Error obteniendo categorías: ${categoriesResult.error.message}`);
      if (existingProductsResult.error) throw new Error(`Error obteniendo productos: ${existingProductsResult.error.message}`);
      if (warehousesResult.error) throw new Error(`Error obteniendo bodegas: ${warehousesResult.error.message}`);

      const categories = categoriesResult.data || [];
      const existingProducts = existingProductsResult.data || [];
      const warehouses = warehousesResult.data || [];

      // Crear mapas para búsqueda rápida
      const categoryMap = new Map(categories.map((c: any) => [c.name.toLowerCase(), c.id]));
      const warehouseMap = new Map(warehouses.map((w: any) => [w.name.toLowerCase(), w.id]));
      const existingProductMap = new Map();
      
      existingProducts.forEach((p: any) => {
        if (p.sku) existingProductMap.set(`sku:${p.sku}`, p);
        if (p.barcode) existingProductMap.set(`barcode:${p.barcode}`, p);
        existingProductMap.set(`name:${p.name.toLowerCase()}`, p);
      });

      // Procesar productos en lotes
      const batchSize = 10;
      const totalBatches = Math.ceil(products.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, products.length);
        const batch = products.slice(startIndex, endIndex);

        // Procesar lote en paralelo
        const batchPromises = batch.map(async (product, index) => {
          const globalIndex = startIndex + index;
          
          try {
            return await this.processProduct(
              product,
              config,
              categoryMap,
              warehouseMap,
              existingProductMap,
              globalIndex + 2
            );
          } catch (error) {
            return {
              success: false,
              error: {
                row: globalIndex + 2,
                field: 'import',
                message: `Error procesando producto: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                data: product
              }
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);

        // Procesar resultados del lote
        for (const result of batchResults) {
          if (result.success) {
            if (result.updated) {
              updatedCount++;
            } else {
              importedCount++;
            }
          } else {
            errors.push(result.error);
          }
        }

        // Actualizar progreso
        const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
        onProgress?.(progress);
      }

      return {
        success: errors.length === 0,
        imported: importedCount,
        updated: updatedCount,
        errors,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: [{
          row: 0,
          field: 'import',
          message: `Error durante la importación: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          data: null
        }],
        warnings
      };
    }
  }

  /**
   * Procesa un producto individual
   */
  private static async processProduct(
    product: ProductImportData,
    config: ImportConfig,
    categoryMap: Map<string, string>,
    warehouseMap: Map<string, string>,
    existingProductMap: Map<string, any>,
    rowNumber: number
  ): Promise<{ success: boolean; updated?: boolean; error?: any }> {
    try {
      // Buscar producto existente
      const existingProduct = existingProductMap.get(`sku:${product.sku}`) ||
                            existingProductMap.get(`barcode:${product.barcode}`) ||
                            existingProductMap.get(`name:${product.name.toLowerCase()}`);

      // Obtener o crear categoría
      let categoryId = categoryMap.get(product.category_name.toLowerCase());
      if (!categoryId && config.createMissingCategories) {
        categoryId = await this.createCategory(product.category_name, config.companyId);
        categoryMap.set(product.category_name.toLowerCase(), categoryId);
      }

      // Obtener o crear bodega
      let warehouseId = null;
      if (product.warehouse_name) {
        warehouseId = warehouseMap.get(product.warehouse_name.toLowerCase());
        if (!warehouseId && config.createMissingWarehouses) {
          warehouseId = await this.createWarehouse(product.warehouse_name, config.companyId);
          warehouseMap.set(product.warehouse_name.toLowerCase(), warehouseId);
        }
      } else {
        // Si no se especifica bodega, usar la bodega principal del usuario
        warehouseId = await this.getMainWarehouse(config.companyId);
      }

      let productId: string;

      if (existingProduct && config.updateExistingProducts) {
        // Actualizar producto existente
        const { error: updateError } = await this.supabase
          .from('products')
          .update({
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            description: product.description,
            category_id: categoryId,
            cost_price: product.cost_price,
            selling_price: product.selling_price,
            iva_rate: product.iva_rate,
            ica_rate: product.ica_rate,
            retencion_rate: product.retencion_rate,
            warehouse_id: warehouseId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProduct.id);

        if (updateError) {
          throw new Error(`Error actualizando producto: ${updateError.message}`);
        }

        productId = existingProduct.id;
      } else {
        // Crear nuevo producto
        const { data: newProduct, error: insertError } = await this.supabase
            .from('products')
            .insert({
              name: product.name,
              sku: product.sku,
              barcode: product.barcode,
              description: product.description,
              category_id: categoryId,
              cost_price: product.cost_price,
              selling_price: product.selling_price,
              iva_rate: product.iva_rate,
              ica_rate: product.ica_rate,
              retencion_rate: product.retencion_rate,
            warehouse_id: warehouseId,
            company_id: config.companyId,
              is_active: true
            })
          .select('id')
            .single();

        if (insertError) {
          throw new Error(`Error creando producto: ${insertError.message}`);
        }

        productId = newProduct.id;
      }

      // Actualizar inventario si es necesario
      if (product.available_quantity > 0) {
        await this.updateInventory(productId, product.available_quantity, warehouseId || null, config.companyId);
      }

      return {
        success: true,
        updated: !!existingProduct && config.updateExistingProducts
      };
        } catch (error) {
      return {
        success: false,
        error: {
          row: rowNumber,
            field: 'import',
          message: error instanceof Error ? error.message : 'Error desconocido',
            data: product
        }
      };
    }
  }

  /**
   * Crea una nueva categoría
   */
  private static async createCategory(name: string, companyId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('categories')
      .insert({
        name,
        company_id: companyId,
        is_active: true
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error creando categoría: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Crea una nueva bodega
   */
  private static async createWarehouse(name: string, companyId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('warehouses')
      .insert({
        name,
        code: name.toUpperCase().replace(/\s+/g, '_'),
        company_id: companyId,
        is_active: true
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error creando bodega: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Obtiene la bodega principal de la empresa
   */
  private static async getMainWarehouse(companyId: string): Promise<string> {
    // Primero intentar obtener la bodega principal existente
    const { data: existingWarehouse, error: fetchError } = await this.supabase
      .from('warehouses')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_main', true)
      .eq('is_active', true)
      .single();

    if (existingWarehouse && !fetchError) {
      return existingWarehouse.id;
    }

    // Si no existe, crear la bodega principal
    const { data, error } = await this.supabase
      .from('warehouses')
      .insert({
        name: 'Bodega Principal',
        code: 'MAIN',
        description: 'Bodega principal de la empresa',
        is_main: true,
        company_id: companyId,
        is_active: true
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error obteniendo/creando bodega principal: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Actualiza el inventario de un producto
   */
  private static async updateInventory(
    productId: string,
    quantity: number,
    warehouseId: string | null,
    companyId: string
  ): Promise<void> {
    try {
      // Si no se especifica bodega, usar la bodega principal
      let targetWarehouseId = warehouseId;
      if (!targetWarehouseId) {
        targetWarehouseId = await this.getMainWarehouse(companyId);
      }

      // Buscar inventario existente en la tabla inventory (sistema tradicional)
      const { data: existingInventory } = await this.supabase
        .from('inventory')
        .select('id')
        .eq('product_id', productId)
        .eq('company_id', companyId)
        .eq('warehouse_id', targetWarehouseId)
        .maybeSingle();

      if (existingInventory) {
        // Actualizar inventario existente
        await this.supabase
          .from('inventory')
          .update({
            quantity,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingInventory.id);
      } else {
        // Crear nuevo inventario
        await this.supabase
          .from('inventory')
          .insert({
            product_id: productId,
            quantity,
            company_id: companyId,
            warehouse_id: targetWarehouseId,
            last_updated: new Date().toISOString()
          });
      }

      // También actualizar warehouse_inventory (sistema de bodegas)
      const { data: existingWarehouseInventory } = await this.supabase
        .from('warehouse_inventory')
        .select('id')
        .eq('product_id', productId)
        .eq('warehouse_id', targetWarehouseId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (existingWarehouseInventory) {
        // Actualizar inventario existente en warehouse_inventory
        await this.supabase
          .from('warehouse_inventory')
          .update({
            quantity,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingWarehouseInventory.id);
      } else {
        // Crear nuevo inventario en warehouse_inventory
        await this.supabase
          .from('warehouse_inventory')
          .insert({
            product_id: productId,
            warehouse_id: targetWarehouseId,
            quantity,
            company_id: companyId,
            last_updated: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error actualizando inventario:', error);
      // No lanzar error para no interrumpir la importación
    }
  }

  /**
   * Obtiene el historial de importaciones
   */
  static async getImportHistory(companyId: string): Promise<ImportHistory[]> {
      const { data, error } = await this.supabase
        .from('product_import_history')
        .select('*')
        .eq('company_id', companyId)
        .order('uploaded_at', { ascending: false });

      if (error) {
      console.error('Error obteniendo historial de importaciones:', error);
      return [];
      }

      return data || [];
  }

  /**
   * Guarda el historial de una importación
   */
  static async saveImportHistory(history: Partial<ImportHistory>): Promise<void> {
    const { error } = await this.supabase
      .from('product_import_history')
      .insert({
        filename: history.filename || 'unknown',
        file_path: history.file_path || '',
        company_id: history.company_id || '',
        uploaded_by: history.uploaded_by || '',
        total_rows: history.total_rows || 0,
        imported_rows: history.imported_rows || 0,
        error_rows: history.error_rows || 0,
        status: history.status || 'completed',
        errors: history.errors || null
      });

    if (error) {
      console.error('Error guardando historial de importación:', error);
    }
  }
}