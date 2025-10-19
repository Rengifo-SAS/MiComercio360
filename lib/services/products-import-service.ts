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
   * Parsea un valor numérico manejando formatos colombianos/latinoamericanos
   */
  private static parseNumericValue(value: string | number, defaultValue: number = 0): number {
    if (!value && value !== 0) return defaultValue;

    let cleaned = value.toString().trim();

    // Si contiene punto y coma, es formato colombiano (ej: 3500,00)
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      // Formato colombiano: 3500,00 -> 3500.00
      cleaned = cleaned.replace(',', '.');
    } else if (cleaned.includes(',') && cleaned.includes('.')) {
      // Formato con separadores de miles y decimales: 3.500,00 -> 3500.00
      // Buscar el último punto o coma para determinar cuál es el separador decimal
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');

      if (lastComma > lastDot) {
        // La coma es el separador decimal: 3.500,00 -> 3500.00
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // El punto es el separador decimal: 3,500.00 -> 3500.00
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      // Solo hay comas, verificar si es separador decimal o de miles
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Es separador decimal: 3500,00 -> 3500.00
        cleaned = cleaned.replace(',', '.');
      } else {
        // Es separador de miles: 3,500 -> 3500
        cleaned = cleaned.replace(/,/g, '');
      }
    }

    // Limpiar cualquier carácter no numérico excepto punto
    cleaned = cleaned.replace(/[^\d.]/g, '');

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Convierte códigos de barras de notación científica a formato numérico completo
   */
  private static parseBarcodeValue(value: string | number): string {
    if (!value && value !== 0) return '';

    let cleaned = value.toString().trim();

    // Si está en notación científica (ej: 7,70629E+12), convertir a número completo
    if (cleaned.includes('E+') || cleaned.includes('e+')) {
      const numericValue = parseFloat(cleaned);
      if (!isNaN(numericValue)) {
        // Convertir a entero sin decimales para códigos de barras
        cleaned = Math.floor(numericValue).toString();
      }
    } else {
      // Si no está en notación científica, solo limpiar espacios y caracteres no deseados
      // pero mantener el valor numérico tal como está
      cleaned = cleaned.replace(/[^\d]/g, '');
    }

    return cleaned;
  }

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
            'name': ['nombre del producto *', 'nombre del producto', 'nombre', 'producto'],
            'cost_price': ['precio de costo', 'precio costo', 'costo', 'cost_price'],
            'selling_price': ['precio de venta *', 'precio de venta', 'venta', 'selling_price']
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
        // Normalizar header sin quitar paréntesis ni espacios
        const normalizedHeader = header.toLowerCase()
          .replace(/[áéíóúñ]/g, (match) => {
            const map: { [key: string]: string } = {
              'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n'
            };
            return map[match] || match;
          })
          .trim();

        // Agregar tanto la versión original como sin paréntesis
        map[normalizedHeader] = index;
        map[normalizedHeader.replace(/[()]/g, '').trim()] = index;
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
        return this.parseNumericValue(value, defaultValue);
      };

      const name = getValue(['nombre del producto *', 'nombre del producto', 'nombre', 'producto', 'name']);
      if (!name) {
        console.warn(`Fila ${rowNumber}: Nombre del producto es requerido`);
        return null;
      }

      // Obtener código de barras y procesarlo correctamente
      const barcodeValue = getValue([
        'código de barras (opcional)', 'codigo de barras (opcional)', 'código de barras', 'codigo de barras',
        'barcode', 'barcode (opcional)', 'codigo', 'código', 'codigo interno', 'código interno'
      ]);
      const barcode = this.parseBarcodeValue(barcodeValue);

      // Usar código de barras como SKU principal, si no hay código de barras, usar SKU proporcionado
      const skuValue = getValue([
        'sku (opcional)', 'sku', 'codigo', 'código', 'codigo interno', 'código interno',
        'codigo producto', 'código producto'
      ]);
      let sku: string;

      if (barcode && barcode.trim() !== '') {
        // El código de barras es el SKU principal
        sku = barcode;
      } else if (skuValue && skuValue.trim() !== '') {
        // Si no hay código de barras pero sí SKU, usar el SKU
        sku = skuValue;
      } else {
        // Solo generar SKU automático si no hay ni código de barras ni SKU
        sku = `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      return {
        name,
        sku,
        barcode,
        description: getValue(['descripción (opcional)', 'descripcion (opcional)', 'descripción', 'descripcion', 'description']),
        category_name: getValue(['categoría *', 'categoria *', 'categoría', 'categoria', 'category']) || 'General',
        cost_price: getNumber(['precio de costo', 'precio costo', 'costo', 'cost_price']),
        selling_price: getNumber(['precio de venta *', 'precio de venta', 'precio venta', 'venta', 'selling_price']),
        available_quantity: getNumber(['cantidad disponible', 'cantidad', 'stock', 'available_quantity', 'cantidad disponible']),
        iva_rate: getNumber(['iva (%)', 'iva', 'iva_rate']),
        ica_rate: getNumber(['ica (%)', 'ica', 'ica_rate']),
        retencion_rate: getNumber(['retencion (%)', 'retención (%)', 'retencion', 'retención', 'retencion_rate']),
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
        'Precio de Costo': '3500,00',
        'Precio de Venta *': '3500,00',
        'Cantidad Disponible': 8,
        'IVA (%)': 0,
        'ICA (%)': 0,
        'Retención (%)': 0
      },
      {
        'Nombre del Producto *': 'ARROZ INTEGRAL 500G',
        'SKU (Opcional)': '7701234567890',
        'Código de Barras (Opcional)': '7701234567890',
        'Descripción (Opcional)': 'ARROZ INTEGRAL 500G',
        'Categoría *': 'GRANOS',
        'Precio de Costo': '46000,00',
        'Precio de Venta *': '46000,00',
        'Cantidad Disponible': 15,
        'IVA (%)': 19,
        'ICA (%)': 0,
        'Retención (%)': 0
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Configurar formato de celdas para que los precios y códigos de barras se mantengan como texto
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    // Aplicar formato de texto a las columnas de precios y códigos de barras
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];

        if (cell && cell.v) {
          const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
          if (headerCell) {
            // Si es una columna de precio, forzar formato de texto
            if (headerCell.v.includes('Precio') ||
              headerCell.v.includes('Costo') ||
              headerCell.v.includes('Venta')) {
              const numericValue = parseFloat(cell.v);
              if (!isNaN(numericValue)) {
                // Formato simple: 3500 -> "3500,00"
                cell.v = numericValue.toFixed(2).replace('.', ',');
                cell.t = 's'; // Tipo string
              }
            }
            // Si es una columna de código de barras o SKU, forzar formato de texto
            else if (headerCell.v.includes('Código de Barras') ||
              headerCell.v.includes('SKU')) {
              // Asegurar que se mantenga como texto para evitar notación científica
              cell.t = 's'; // Tipo string
              cell.v = String(cell.v);
            }
          }
        }
      }
    }

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
        let productExists = false;

        if (product.sku && existingSkus.has(product.sku)) {
          productExists = true;
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
          productExists = true;
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
          productExists = true;
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


  /**
   * Corrige productos existentes que tengan códigos de barras en formato científico
   */
  static async fixExistingProductsBarcodeFormat(companyId: string): Promise<{
    success: boolean;
    fixed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let fixed = 0;

    try {
      // Buscar productos con códigos de barras que contengan notación científica
      const { data: products, error: fetchError } = await this.supabase
        .from('products')
        .select('id, sku, barcode, name')
        .eq('company_id', companyId)
        .or('barcode.ilike.*E+*,sku.ilike.*E+*');

      if (fetchError) {
        throw new Error(`Error obteniendo productos: ${fetchError.message}`);
      }

      if (!products || products.length === 0) {
        return { success: true, fixed: 0, errors: [] };
      }

      // Procesar cada producto
      for (const product of products) {
        try {
          let needsUpdate = false;
          const updateData: any = {};

          // Corregir código de barras si está en notación científica
          if (product.barcode && (product.barcode.includes('E+') || product.barcode.includes('e+'))) {
            const correctedBarcode = this.parseBarcodeValue(product.barcode);
            if (correctedBarcode && correctedBarcode !== product.barcode) {
              updateData.barcode = correctedBarcode;
              needsUpdate = true;
            }
          }

          // Corregir SKU si está en notación científica
          if (product.sku && (product.sku.includes('E+') || product.sku.includes('e+'))) {
            const correctedSku = this.parseBarcodeValue(product.sku);
            if (correctedSku && correctedSku !== product.sku) {
              updateData.sku = correctedSku;
              needsUpdate = true;
            }
          }

          // Actualizar producto si es necesario
          if (needsUpdate) {
            const { error: updateError } = await this.supabase
              .from('products')
              .update({
                ...updateData,
                updated_at: new Date().toISOString()
              })
              .eq('id', product.id);

            if (updateError) {
              errors.push(`Error actualizando producto ${product.name}: ${updateError.message}`);
            } else {
              fixed++;
            }
          }
        } catch (error) {
          errors.push(`Error procesando producto ${product.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      return {
        success: errors.length === 0,
        fixed,
        errors
      };
    } catch (error) {
      return {
        success: false,
        fixed: 0,
        errors: [`Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`]
      };
    }
  }
}