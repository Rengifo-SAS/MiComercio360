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

  // Plantilla Excel para descarga
  static generateTemplate(): Blob {
    const templateData = [
      {
        'Nombre del Producto *': 'Ejemplo: Coca Cola 350ml',
        'SKU (Opcional)': 'CC001',
        'Código de Barras (Opcional)': '1234567890123',
        'Descripción (Opcional)': 'Bebida gaseosa sabor cola',
        'Categoría *': 'Bebidas',
        'Precio de Costo': 2500,
        'Precio de Venta *': 4500,
        'Cantidad Disponible': 100,
        'IVA (%)': 19,
        'ICA (%)': 0,
        'Retención (%)': 0,
        'Bodega (Opcional)': 'Bodega Principal'
      },
      {
        'Nombre del Producto *': 'Ejemplo: Agua Natural 500ml',
        'SKU (Opcional)': '',
        'Código de Barras (Opcional)': '',
        'Descripción (Opcional)': '',
        'Categoría *': 'Bebidas',
        'Precio de Costo': 1200,
        'Precio de Venta *': 2500,
        'Cantidad Disponible': 50,
        'IVA (%)': 0,
        'ICA (%)': 0,
        'Retención (%)': 0,
        'Bodega (Opcional)': ''
      },
      {
        'Nombre del Producto *': 'Ejemplo: Laptop Gaming',
        'SKU (Opcional)': '',
        'Código de Barras (Opcional)': '',
        'Descripción (Opcional)': 'Laptop para gaming',
        'Categoría *': 'Tecnología',
        'Precio de Costo': 1500000,
        'Precio de Venta *': 2500000,
        'Cantidad Disponible': 5,
        'IVA (%)': 19,
        'ICA (%)': 0,
        'Retención (%)': 0,
        'Bodega (Opcional)': 'Bodega Secundaria'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 25 }, // Nombre del Producto
      { wch: 15 }, // SKU
      { wch: 20 }, // Código de Barras
      { wch: 30 }, // Descripción
      { wch: 15 }, // Categoría
      { wch: 15 }, // Precio de Costo
      { wch: 15 }, // Precio de Venta
      { wch: 15 }, // Cantidad Disponible
      { wch: 10 }, // IVA
      { wch: 10 }, // ICA
      { wch: 12 }, // Retención
      { wch: 20 }  // Bodega
    ];

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' as any });
    return new Blob([excelBuffer as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  // Subir archivo a Supabase Storage
  static async uploadFile(file: File, companyId: string, userId: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `imports/products/${companyId}/${timestamp}-${file.name}`;

      const { data, error } = await this.supabase.storage
        .from('product-imports')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error subiendo archivo:', error);
        throw new Error('Error al subir el archivo');
      }

      return data.path;
    } catch (error) {
      console.error('Error en uploadFile:', error);
      throw error;
    }
  }

  // Generar SKU automático
  private static generateSKU(productName: string, index: number): string {
    const cleanName = productName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 4);
    const timestamp = Date.now().toString().substring(-4);
    const indexStr = (index + 1).toString().padStart(2, '0');
    return `${cleanName}${indexStr}${timestamp}`;
  }

  // Generar código de barras automático
  private static generateBarcode(index: number): string {
    const base = '200000000000';
    const increment = (index + 1).toString().padStart(3, '0');
    return base.substring(0, base.length - increment.length) + increment;
  }

  // Crear categoría si no existe
  private static async createCategoryIfNotExists(categoryName: string, companyId: string): Promise<string> {
    try {
      // Buscar si la categoría ya existe
      const { data: existingCategory } = await this.supabase
        .from('categories')
        .select('id')
        .eq('company_id', companyId)
        .eq('name', categoryName)
        .eq('is_active', true)
        .single();

      if (existingCategory) {
        return existingCategory.id;
      }

      // Si no existe, crear la categoría
      const { data: newCategory, error } = await this.supabase
        .from('categories')
        .insert({
          name: categoryName,
          description: `Categoría creada automáticamente durante importación`,
          company_id: companyId,
          is_active: true,
          color: '#3B82F6' // Color azul por defecto
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creando categoría:', error);
        throw new Error(`Error al crear la categoría "${categoryName}"`);
      }

      return newCategory.id;
    } catch (error) {
      console.error('Error en createCategoryIfNotExists:', error);
      throw error;
    }
  }

  // Obtener bodega principal de la empresa
  private static async getMainWarehouse(companyId: string): Promise<string | null> {
    try {
      const { data: warehouse, error } = await this.supabase
        .from('warehouses')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_main', true)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error obteniendo bodega principal:', error);
        return null;
      }

      return warehouse?.id || null;
    } catch (error) {
      console.error('Error en getMainWarehouse:', error);
      return null;
    }
  }

  // Obtener o crear bodega por nombre
  private static async getOrCreateWarehouse(warehouseName: string, companyId: string): Promise<string | null> {
    try {
      // Si no se especifica bodega, usar la principal
      if (!warehouseName.trim()) {
        return await this.getMainWarehouse(companyId);
      }

      // Verificar si la bodega ya existe
      const { data: existingWarehouse } = await this.supabase
        .from('warehouses')
        .select('id')
        .eq('company_id', companyId)
        .eq('name', warehouseName)
        .eq('is_active', true)
        .single();

      if (existingWarehouse) {
        return existingWarehouse.id;
      }

      // Crear nueva bodega
      const { data: newWarehouse, error } = await this.supabase
        .from('warehouses')
        .insert({
          name: warehouseName,
          code: warehouseName.toUpperCase().replace(/\s+/g, '_'),
          description: `Bodega creada automáticamente durante importación`,
          company_id: companyId,
          is_active: true,
          is_main: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando bodega:', error);
        // Si falla la creación, usar la bodega principal
        return await this.getMainWarehouse(companyId);
      }

      return newWarehouse.id;
    } catch (error) {
      console.error('Error en getOrCreateWarehouse:', error);
      // Si hay error, usar la bodega principal
      return await this.getMainWarehouse(companyId);
    }
  }

  // Procesar archivo Excel
  static async processExcelFile(file: File, companyId: string): Promise<ProductImportData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Omitir la primera fila (headers)
          const rows = jsonData.slice(1) as any[][];
          
          const products: ProductImportData[] = rows
            .filter(row => row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
            .map((row, index) => {
              const productName = row[0]?.toString().trim() || '';
              const originalSku = row[1]?.toString().trim() || '';
              const originalBarcode = row[2]?.toString().trim() || '';
              const description = row[3]?.toString().trim() || '';
              const categoryName = row[4]?.toString().trim() || 'General';
              const costPrice = parseFloat(row[5]) || 0;
              const sellingPrice = parseFloat(row[6]) || 0;
              const availableQuantity = Math.max(0, parseInt(row[7]) || 0);
              let ivaRate = parseFloat(row[8]) || 0;
              let icaRate = parseFloat(row[9]) || 0;
              let retencionRate = parseFloat(row[10]) || 0;
              const warehouseName = row[11]?.toString().trim() || '';

              // Normalizar impuestos: si no existe el porcentaje configurado, usar 0
              // Esto se validará después contra los impuestos configurados
              
              return {
                name: productName,
                sku: originalSku || this.generateSKU(productName, index),
                barcode: originalBarcode || this.generateBarcode(index),
                description: description,
                category_name: categoryName,
                cost_price: costPrice,
                selling_price: sellingPrice,
                available_quantity: availableQuantity,
                iva_rate: ivaRate,
                ica_rate: icaRate,
                retencion_rate: retencionRate,
                warehouse_name: warehouseName
              };
            });

          resolve(products);
        } catch (error) {
          console.error('Error procesando archivo Excel:', error);
          reject(new Error('Error al procesar el archivo Excel'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  // Validar datos antes de importar
  static async validateImportData(
    products: ProductImportData[], 
    companyId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      errors: [],
      warnings: []
    };

    // Obtener categorías, impuestos y productos existentes
    const [categoriesResult, taxesResult, existingProductsResult] = await Promise.all([
      this.supabase.from('categories').select('id, name').eq('company_id', companyId).eq('is_active', true),
      this.supabase.from('taxes').select('id, name, percentage, tax_type').eq('company_id', companyId).eq('is_active', true),
      this.supabase.from('products').select('sku, barcode').eq('company_id', companyId)
    ]);

    const categories = categoriesResult.data || [];
    const taxes = taxesResult.data || [];
    const existingProducts = existingProductsResult.data || [];

    const categoryMap = new Map(categories.map((c: any) => [c.name.toLowerCase(), c.id]));
    
    // Crear mapas para búsqueda rápida de duplicados
    const existingSkus = new Set(existingProducts.map(p => p.sku).filter(Boolean));
    const existingBarcodes = new Set(existingProducts.map(p => p.barcode).filter(Boolean));

    // Crear mapas de impuestos
    const vatTaxes = new Map(taxes?.filter(t => t.tax_type === 'VAT').map(t => [t.percentage, t.id]) || []);
    const industryTaxes = new Map(taxes?.filter(t => t.tax_type === 'INDUSTRY').map(t => [t.percentage, t.id]) || []);
    const withholdingTaxes = new Map(taxes?.filter(t => t.tax_type === 'WITHHOLDING').map(t => [t.percentage, t.id]) || []);

    // Validar cada producto
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const rowNumber = i + 2; // +2 porque empezamos desde la fila 2

      // Validaciones obligatorias
      if (!product.name.trim()) {
        result.errors.push({
          row: rowNumber,
          field: 'name',
          message: 'El nombre del producto es requerido',
          data: product
        });
        result.success = false;
      }

      // Validar categoría - si no existe, se creará automáticamente
      if (!product.category_name.trim()) {
        result.errors.push({
          row: rowNumber,
          field: 'category_name',
          message: 'La categoría es requerida',
          data: product
        });
        result.success = false;
      } else {
        // Si la categoría no existe en el mapa, se creará automáticamente durante la importación
        const categoryId = categoryMap.get(product.category_name.toLowerCase());
        if (!categoryId) {
          result.warnings.push({
            row: rowNumber,
            message: `La categoría "${product.category_name}" será creada automáticamente`,
            data: product
          });
        }
      }

      if (product.selling_price <= 0) {
        result.errors.push({
          row: rowNumber,
          field: 'selling_price',
          message: 'El precio de venta debe ser mayor a 0',
          data: product
        });
        result.success = false;
      }

      if (product.cost_price < 0) {
        result.errors.push({
          row: rowNumber,
          field: 'cost_price',
          message: 'El precio de costo no puede ser negativo',
          data: product
        });
        result.success = false;
      }

      // Las cantidades negativas se convierten automáticamente a 0 durante el procesamiento

      // Validar impuestos
      if (product.iva_rate > 0) {
        const ivaTaxId = vatTaxes.get(product.iva_rate);
        if (!ivaTaxId) {
          result.warnings.push({
            row: rowNumber,
            message: `No existe un impuesto IVA del ${product.iva_rate}% configurado. Se usará 0%`,
            data: product
          });
          product.iva_rate = 0;
        }
      }

      if (product.ica_rate > 0) {
        const icaTaxId = industryTaxes.get(product.ica_rate);
        if (!icaTaxId) {
          result.warnings.push({
            row: rowNumber,
            message: `No existe un impuesto ICA del ${product.ica_rate}% configurado. Se usará 0%`,
            data: product
          });
          product.ica_rate = 0;
        }
      }

      if (product.retencion_rate > 0) {
        const retencionTaxId = withholdingTaxes.get(product.retencion_rate);
        if (!retencionTaxId) {
          result.warnings.push({
            row: rowNumber,
            message: `No existe un impuesto de retención del ${product.retencion_rate}% configurado. Se usará 0%`,
            data: product
          });
          product.retencion_rate = 0;
        }
      }

      // Validar que no exista un producto con el mismo SKU en el archivo actual
      const duplicateSkuInFile = products.slice(0, i).find(p => p.sku === product.sku);
      if (duplicateSkuInFile) {
        result.errors.push({
          row: rowNumber,
          field: 'sku',
          message: `El SKU "${product.sku}" está duplicado en el archivo (fila ${i + 1})`,
          data: product
        });
        result.success = false;
      }

      // Validar que no exista un producto con el mismo SKU en la base de datos
      if (existingSkus.has(product.sku)) {
        result.errors.push({
          row: rowNumber,
          field: 'sku',
          message: `Ya existe un producto con el SKU "${product.sku}"`,
          data: product
        });
        result.success = false;
      }

      // Validar que no exista un producto con el mismo código de barras en el archivo actual
      const duplicateBarcodeInFile = products.slice(0, i).find(p => p.barcode === product.barcode);
      if (duplicateBarcodeInFile) {
        result.errors.push({
          row: rowNumber,
          field: 'barcode',
          message: `El código de barras "${product.barcode}" está duplicado en el archivo (fila ${i + 1})`,
          data: product
        });
        result.success = false;
      }

      // Validar que no exista un producto con el mismo código de barras en la base de datos
      if (existingBarcodes.has(product.barcode)) {
        result.errors.push({
          row: rowNumber,
          field: 'barcode',
          message: `Ya existe un producto con el código de barras "${product.barcode}"`,
          data: product
        });
        result.success = false;
      }

      // Warnings
      if (product.cost_price === 0) {
        result.warnings.push({
          row: rowNumber,
          message: 'El precio de costo es 0',
          data: product
        });
      }

      if (product.available_quantity === 0) {
        result.warnings.push({
          row: rowNumber,
          message: 'La cantidad disponible es 0',
          data: product
        });
      }

      if (!product.description.trim()) {
        result.warnings.push({
          row: rowNumber,
          message: 'La descripción está vacía',
          data: product
        });
      }
    }

    result.imported = products.length - result.errors.length;
    return result;
  }

  // Importar productos a la base de datos
  static async importProducts(
    products: ProductImportData[],
    companyId: string,
    userId: string,
    filename: string,
    filePath: string
  ): Promise<ImportResult> {
    try {
      // Validar datos primero
      const validation = await this.validateImportData(products, companyId);
      
      if (!validation.success) {
        // Guardar registro de importación fallida
        await this.saveImportHistory({
          filename,
          file_path: filePath,
          company_id: companyId,
          uploaded_by: userId,
          total_rows: products.length,
          imported_rows: 0,
          error_rows: validation.errors.length,
          status: 'failed',
          errors: JSON.stringify(validation.errors)
        });

        return validation;
      }

      // Obtener categorías y bodega principal para mapeo
      const [categoriesResult, mainWarehouseId] = await Promise.all([
        this.supabase
          .from('categories')
          .select('id, name')
          .eq('company_id', companyId)
          .eq('is_active', true),
        this.getMainWarehouse(companyId)
      ]);

      const categories = categoriesResult.data || [];
      const categoryMap = new Map(categories.map((c: any) => [c.name.toLowerCase(), c.id]));

      let importedCount = 0;
      const errors: ImportResult['errors'] = [];

      // Importar productos uno por uno
      for (const product of products) {
        try {
          // Obtener o crear la categoría
          let categoryId = categoryMap.get(product.category_name.toLowerCase());
          
          if (!categoryId) {
            try {
              categoryId = await this.createCategoryIfNotExists(product.category_name, companyId);
              // Actualizar el mapa para futuras referencias
              categoryMap.set(product.category_name.toLowerCase(), categoryId);
            } catch (categoryError) {
              errors.push({
                row: 0,
                field: 'category_name',
                message: `Error creando categoría "${product.category_name}": ${categoryError instanceof Error ? categoryError.message : 'Error desconocido'}`,
                data: product
              });
              continue;
            }
          }

          // Obtener o crear la bodega para el producto
          const warehouseId = await this.getOrCreateWarehouse(
            product.warehouse_name || '', 
            companyId
          );

          // Crear producto
          const { data: newProduct, error: productError } = await this.supabase
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
              company_id: companyId,
              warehouse_id: warehouseId, // Asignar bodega al producto
              is_active: true
            })
            .select()
            .single();

          if (productError) {
            errors.push({
              row: 0,
              field: 'database',
              message: `Error creando producto: ${productError.message}`,
              data: product
            });
            continue;
          }

          // Crear registro de inventario si hay cantidad
          if (product.available_quantity > 0) {
            const inventoryData: any = {
              product_id: newProduct.id,
              quantity: product.available_quantity,
              company_id: companyId
            };

            // Agregar bodega si se encontró una
            if (warehouseId) {
              inventoryData.warehouse_id = warehouseId;
            }

            const { error: inventoryError } = await this.supabase
              .from('inventory')
              .upsert(inventoryData);

            if (inventoryError) {
              console.error('Error creando inventario:', inventoryError);
              // No fallamos la importación por esto
            }
          }

          importedCount++;
        } catch (error) {
          errors.push({
            row: 0,
            field: 'import',
            message: `Error importando producto: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            data: product
          });
        }
      }

      // Guardar registro de importación
      await this.saveImportHistory({
        filename,
        file_path: filePath,
        company_id: companyId,
        uploaded_by: userId,
        total_rows: products.length,
        imported_rows: importedCount,
        error_rows: errors.length,
        status: errors.length > 0 ? 'failed' : 'completed',
        errors: errors.length > 0 ? JSON.stringify(errors) : undefined
      });

      return {
        success: errors.length === 0,
        imported: importedCount,
        errors,
        warnings: validation.warnings
      };

    } catch (error) {
      console.error('Error en importProducts:', error);
      throw error;
    }
  }

  // Guardar historial de importación
  static async saveImportHistory(data: {
    filename: string;
    file_path: string;
    company_id: string;
    uploaded_by: string;
    total_rows: number;
    imported_rows: number;
    error_rows: number;
    status: 'processing' | 'completed' | 'failed';
    errors?: string;
  }): Promise<ImportHistory> {
    const { data: history, error } = await this.supabase
      .from('product_import_history')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error guardando historial:', error);
      throw new Error('Error al guardar el historial de importación');
    }

    return history;
  }

  // Obtener historial de importaciones
  static async getImportHistory(companyId: string): Promise<ImportHistory[]> {
    try {
      // Obtener solo los datos básicos del historial
      const { data, error } = await this.supabase
        .from('product_import_history')
        .select('*')
        .eq('company_id', companyId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error obteniendo historial:', error);
        throw new Error('Error al obtener el historial de importaciones');
      }

      // Obtener información de usuarios por separado si es necesario
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(item => item.uploaded_by))];
        const { data: profiles } = await this.supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        // Combinar datos
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        return data.map(item => ({
          ...item,
          uploaded_by_user: profilesMap.get(item.uploaded_by) || null
        }));
      }

      return data || [];
    } catch (error) {
      console.error('Error en getImportHistory:', error);
      throw new Error('Error al obtener el historial de importaciones');
    }
  }

  // Descargar archivo desde Storage
  static async downloadFile(filePath: string): Promise<Blob> {
    const { data, error } = await this.supabase.storage
      .from('product-imports')
      .download(filePath);

    if (error) {
      console.error('Error descargando archivo:', error);
      throw new Error('Error al descargar el archivo');
    }

    return data;
  }
}
