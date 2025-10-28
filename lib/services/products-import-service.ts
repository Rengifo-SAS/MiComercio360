import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';

/**
 * Interfaz para los datos de importación de productos desde Excel
 */
export interface ProductImportData {
  // Campos básicos
  name: string;
  sku: string;
  barcode?: string;
  description?: string;

  // Categoría y bodega
  category_name: string;
  warehouse_name?: string;

  // Precios (siempre en números, no strings)
  cost_price: number;
  selling_price: number;

  // Stock
  available_quantity: number;
  min_stock?: number;
  max_stock?: number;
  unit?: string;

  // Impuestos (en porcentaje: 19 para 19%)
  iva_rate: number;
  ica_rate: number;
  retencion_rate: number;

  // Clasificación fiscal
  fiscal_classification?: string;
  excise_tax?: boolean;
}

/**
 * Resultado de la importación
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
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

/**
 * Configuración de importación
 */
export interface ImportConfig {
  companyId: string;
  userId: string;
  updateExistingProducts: boolean;
  createMissingCategories: boolean;
  createMissingWarehouses: boolean;
  skipProductsWithErrors?: boolean;
}

/**
 * Historial de importación
 */
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

/**
 * Servicio mejorado para importación de productos desde Excel
 * 
 * Características:
 * - Validación robusta de datos
 * - Manejo correcto de formatos numéricos (colombianos e internacionales)
 * - Prevención de códigos de barras en notación científica
 * - Sincronización correcta de inventarios
 * - Manejo de transacciones para integridad de datos
 */
export class ProductsImportService {
  private static supabase = createClient();

  /**
   * Parsea un valor numérico manejando múltiples formatos
   * Soporta: 3500, 3.500, 3,500, 3.500,00, 3,500.00
   */
  private static parseNumericValue(value: string | number | null | undefined, defaultValue: number = 0): number {
    // Casos edge
    if (value === null || value === undefined) return defaultValue;
    if (value === '') return defaultValue;
    if (typeof value === 'number') return isNaN(value) ? defaultValue : value;

    let cleaned = value.toString().trim();
    if (cleaned === '') return defaultValue;

    // Remover símbolos de moneda y espacios
    cleaned = cleaned.replace(/[$\s]/g, '');

    // Detectar formato basado en posición de comas y puntos
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    const commaCount = (cleaned.match(/,/g) || []).length;
    const dotCount = (cleaned.match(/\./g) || []).length;

    // Caso 1: Solo números, sin separadores
    if (lastComma === -1 && lastDot === -1) {
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? defaultValue : parsed;
    }

    // Caso 2: Solo comas
    if (lastDot === -1 && lastComma > -1) {
      if (commaCount === 1) {
        // Verificar si es decimal (ej: 3500,50) o separador de miles (ej: 3,500)
        const afterComma = cleaned.substring(lastComma + 1);
        if (afterComma.length <= 2 && afterComma.length > 0) {
          // Es separador decimal: 3500,50 -> 3500.50
          cleaned = cleaned.replace(',', '.');
        } else {
          // Es separador de miles: 3,500 -> 3500
          cleaned = cleaned.replace(/,/g, '');
        }
      } else {
        // Múltiples comas: separadores de miles excepto la última
        // Ej: 1,234,567,89 -> última coma es decimal
        const parts = cleaned.split(',');
        const lastPart = parts[parts.length - 1];
        if (lastPart.length <= 2) {
          // Última es decimal
          cleaned = parts.slice(0, -1).join('') + '.' + lastPart;
        } else {
          // Todas son separadores de miles
          cleaned = cleaned.replace(/,/g, '');
        }
      }
    }
    // Caso 3: Solo puntos
    else if (lastComma === -1 && lastDot > -1) {
      if (dotCount === 1) {
        // Verificar si es decimal o separador de miles
        const afterDot = cleaned.substring(lastDot + 1);
        if (afterDot.length === 3 && !cleaned.includes(',')) {
          // Probablemente separador de miles: 3.500 -> 3500
          cleaned = cleaned.replace(/\./g, '');
        }
        // Si tiene 1 o 2 dígitos después del punto, es decimal
        // Si tiene más de 3, es decimal (ej: 3.14159)
        // Dejar como está
      } else {
        // Múltiples puntos: separadores de miles excepto el último
        const parts = cleaned.split('.');
        const lastPart = parts[parts.length - 1];
        if (lastPart.length <= 2) {
          // Último es decimal
          cleaned = parts.slice(0, -1).join('') + '.' + lastPart;
        } else {
          // Todos son separadores de miles
          cleaned = cleaned.replace(/\./g, '');
        }
      }
    }
    // Caso 4: Mezcla de comas y puntos
    else {
      if (lastComma > lastDot) {
        // La coma viene después: formato europeo (3.500,00)
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // El punto viene después: formato anglosajón (3,500.00)
        cleaned = cleaned.replace(/,/g, '');
      }
    }

    // Remover cualquier carácter no numérico excepto el punto decimal
    cleaned = cleaned.replace(/[^\d.]/g, '');

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Convierte códigos de barras evitando notación científica
   * Maneja correctamente códigos largos como EAN-13
   */
  private static parseBarcodeValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';

    let cleaned = value.toString().trim();
    if (cleaned === '') return '';

    // Si está en notación científica, convertir
    if (/[eE][+\-]?\d+/.test(cleaned)) {
      try {
        const numericValue = parseFloat(cleaned);
        if (!isNaN(numericValue) && isFinite(numericValue)) {
          // Convertir a entero para evitar decimales en códigos de barras
          cleaned = Math.floor(Math.abs(numericValue)).toString();
        }
      } catch (error) {
        console.warn('Error convirtiendo notación científica:', error);
      }
    }

    // Remover todo excepto números
    cleaned = cleaned.replace(/[^\d]/g, '');

    return cleaned;
  }

  /**
   * Genera un SKU único basado en timestamp y aleatorio
   */
  private static generateUniqueSKU(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `SKU-${timestamp}-${random}`;
  }

  /**
   * Parsea un archivo Excel y extrae los datos de productos
   */
  static async parseExcelFile(file: File): Promise<ProductImportData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, {
            type: 'array',
            cellText: false,
            cellDates: false,
            raw: true
          });

          // Obtener la primera hoja
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            reject(new Error('El archivo Excel no contiene hojas'));
            return;
          }

          const worksheet = workbook.Sheets[sheetName];

          // Convertir a JSON preservando los tipos originales
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            raw: false,
            defval: ''
          });

          if (jsonData.length < 2) {
            reject(new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos'));
            return;
          }

          // Obtener encabezados (primera fila)
          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1) as any[][];

          // Crear mapa de encabezados
          const headerMap = this.createHeaderMap(headers);

          // Validar campos requeridos
          const requiredFields = {
            'name': ['nombre del producto', 'nombre', 'producto', 'name'],
            'selling_price': ['precio de venta', 'precio venta', 'venta', 'selling_price', 'selling price']
          };

          const missingFields: string[] = [];
          for (const [field, possibleNames] of Object.entries(requiredFields)) {
            const found = possibleNames.some(name => headerMap[name] !== undefined);
            if (!found) {
              missingFields.push(field);
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

            // Saltar filas vacías
            if (!row || row.length === 0 || row.every(cell => !cell || cell.toString().trim() === '')) {
              continue;
            }

            try {
              const product = this.mapRowToProduct(row, headerMap, i + 2);
              if (product) {
                products.push(product);
              }
            } catch (error) {
              console.warn(`Error parseando fila ${i + 2}:`, error);
              // Continuar con las demás filas
            }
          }

          if (products.length === 0) {
            reject(new Error('No se encontraron productos válidos en el archivo'));
            return;
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
   * Crea un mapa normalizado de encabezados a índices
   */
  private static createHeaderMap(headers: string[]): { [key: string]: number } {
    const map: { [key: string]: number } = {};

    headers.forEach((header, index) => {
      if (!header) return;

      // Normalizar: minúsculas, sin acentos, sin espacios extras
      const normalized = header
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[*()]/g, '') // Remover caracteres especiales
        .trim()
        .replace(/\s+/g, ' '); // Normalizar espacios

      map[normalized] = index;

      // También agregar versiones sin espacios
      map[normalized.replace(/\s/g, '')] = index;
    });

    return map;
  }

  /**
   * Mapea una fila de Excel a un objeto ProductImportData
   */
  private static mapRowToProduct(
    row: any[],
    headerMap: { [key: string]: number },
    rowNumber: number
  ): ProductImportData | null {
    try {
      // Función helper para obtener valor de la celda
      const getValue = (possibleFields: string[]): string => {
        for (const field of possibleFields) {
          const index = headerMap[field];
          if (index !== undefined && row[index] !== undefined && row[index] !== null) {
            const value = row[index].toString().trim();
            if (value !== '') return value;
          }
        }
        return '';
      };

      // Función helper para obtener valor numérico
      const getNumber = (possibleFields: string[], defaultValue: number = 0): number => {
        const value = getValue(possibleFields);
        return this.parseNumericValue(value, defaultValue);
      };

      // Función helper para obtener booleano
      const getBoolean = (possibleFields: string[], defaultValue: boolean = false): boolean => {
        const value = getValue(possibleFields).toLowerCase();
        if (value === 'true' || value === 'sí' || value === 'si' || value === '1' || value === 'yes') {
          return true;
        }
        if (value === 'false' || value === 'no' || value === '0') {
          return false;
        }
        return defaultValue;
      };

      // 1. NOMBRE (requerido)
      const name = getValue([
        'nombre del producto', 'nombredelproducto',
        'nombre', 'producto', 'name', 'product'
      ]);

      if (!name) {
        console.warn(`Fila ${rowNumber}: Nombre del producto es requerido`);
        return null;
      }

      // 2. CÓDIGO DE BARRAS
      const barcodeValue = getValue([
        'codigo de barras', 'codigodebarras', 'codigodebarrasopcional',
        'barcode', 'codigo', 'code', 'ean', 'upc'
      ]);
      const barcode = this.parseBarcodeValue(barcodeValue);

      // 3. SKU
      const skuValue = getValue([
        'sku', 'codigo interno', 'codigointerno', 'skuopcional',
        'referencia', 'ref', 'codigo producto'
      ]);

      // Determinar SKU final
      let finalSKU: string;
      if (skuValue && skuValue.trim() !== '') {
        // Usar SKU del Excel
        finalSKU = skuValue.trim();
      } else if (barcode && barcode.trim() !== '') {
        // Usar código de barras como SKU si no hay SKU
        finalSKU = barcode;
      } else {
        // Generar SKU único
        finalSKU = this.generateUniqueSKU();
      }

      // 4. DESCRIPCIÓN
      const description = getValue([
        'descripcion', 'descripcionopcional',
        'description', 'desc', 'detalle'
      ]);

      // 5. CATEGORÍA
      const categoryName = getValue([
        'categoria', 'category', 'tipo', 'type'
      ]) || 'General';

      // 6. BODEGA
      const warehouseName = getValue([
        'bodega', 'warehouse', 'almacen', 'bodegaopcional'
      ]);

      // 7. PRECIOS (requeridos, no pueden ser negativos)
      const costPrice = Math.max(0, getNumber([
        'precio de costo', 'preciodecosto', 'precio costo', 'preciocosto',
        'costo', 'cost', 'cost price', 'costprice'
      ], 0));

      const sellingPrice = Math.max(0, getNumber([
        'precio de venta', 'preciodeventa', 'precio venta', 'precioventa',
        'venta', 'precio', 'price', 'selling price', 'sellingprice'
      ], 0));

      // 8. INVENTARIO (siempre números enteros)
      const availableQuantity = Math.floor(Math.max(0, getNumber([
        'cantidad disponible', 'cantidaddisponible',
        'cantidad', 'stock', 'inventory', 'qty', 'available'
      ], 0)));

      const minStock = Math.floor(Math.max(0, getNumber([
        'stock minimo', 'stockminimo', 'min stock', 'minstock',
        'minimo', 'min'
      ], 0)));

      const maxStock = Math.floor(getNumber([
        'stock maximo', 'stockmaximo', 'max stock', 'maxstock',
        'maximo', 'max'
      ]));

      // 9. UNIDAD
      const unit = getValue([
        'unidad', 'unit', 'medida', 'uom'
      ]) || 'unidad';

      // 10. IMPUESTOS (en porcentaje)
      const ivaRate = Math.max(0, Math.min(100, getNumber([
        'iva', 'iva %', 'iva rate', 'ivarate', 'impuesto iva'
      ], 0)));

      const icaRate = Math.max(0, Math.min(100, getNumber([
        'ica', 'ica %', 'ica rate', 'icarate', 'impuesto ica'
      ], 0)));

      const retencionRate = Math.max(0, Math.min(100, getNumber([
        'retencion', 'retencion %', 'retencion rate', 'retencionrate',
        'impuesto retencion', 'ret'
      ], 0)));

      // 11. CLASIFICACIÓN FISCAL
      const fiscalClassification = getValue([
        'clasificacion fiscal', 'clasificacionfiscal',
        'fiscal classification', 'tipo fiscal', 'clasificacion'
      ]) || 'Bien';

      // 12. IMPUESTO AL CONSUMO
      const exciseTax = getBoolean([
        'impuesto al consumo', 'impuestoalconsumo',
        'excise tax', 'excisetax', 'consumo'
      ], false);

      return {
        name: name.trim(),
        sku: finalSKU,
        barcode: barcode || undefined,
        description: description || undefined,
        category_name: categoryName.trim(),
        warehouse_name: warehouseName || undefined,
        cost_price: costPrice,
        selling_price: sellingPrice,
        available_quantity: availableQuantity,
        min_stock: minStock > 0 ? minStock : undefined,
        max_stock: maxStock && maxStock > 0 ? maxStock : undefined,
        unit: unit.trim(),
        iva_rate: ivaRate,
        ica_rate: icaRate,
        retencion_rate: retencionRate,
        fiscal_classification: fiscalClassification,
        excise_tax: exciseTax
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
        'Precio de Costo': '2605.00',
        'Precio de Venta *': '3500.00',
        'Cantidad Disponible': 8,
        'IVA (%)': 0,
        'ICA (%)': 0,
        'Retención (%)': 0
      },
      {
        'Nombre del Producto *': 'PAPRIKA 60 GM',
        'SKU (Opcional)': '7706286002266',
        'Código de Barras (Opcional)': '7706286002266',
        'Descripción (Opcional)': 'PAPRIKA 60 GM',
        'Categoría *': 'CONDIMENTOS GUISASON',
        'Precio de Costo': '3361.00',
        'Precio de Venta *': '4500.00',
        'Cantidad Disponible': 8,
        'IVA (%)': 0,
        'ICA (%)': 0,
        'Retención (%)': 0
      },
      {
        'Nombre del Producto *': 'SIETE ESPECIAS',
        'SKU (Opcional)': '7706286004178',
        'Código de Barras (Opcional)': '7706286004178',
        'Descripción (Opcional)': 'SIETE ESPECIAS',
        'Categoría *': 'CONDIMENTOS GUISASON',
        'Precio de Costo': '1429.00',
        'Precio de Venta *': '1900.00',
        'Cantidad Disponible': 5,
        'IVA (%)': 0,
        'ICA (%)': 0,
        'Retención (%)': 0
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Configurar ancho de columnas
    const columnWidths = [
      { wch: 30 }, // Nombre del Producto *
      { wch: 18 }, // SKU (Opcional)
      { wch: 25 }, // Código de Barras (Opcional)
      { wch: 50 }, // Descripción (Opcional)
      { wch: 25 }, // Categoría *
      { wch: 15 }, // Precio de Costo
      { wch: 15 }, // Precio de Venta *
      { wch: 18 }, // Cantidad Disponible
      { wch: 10 }, // IVA (%)
      { wch: 10 }, // ICA (%)
      { wch: 12 }  // Retención (%)
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
      cellStyles: true
    });

    return new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  /**
   * Valida los datos de importación antes de procesarlos
   */
  static async validateImportData(
    products: ProductImportData[],
    config: ImportConfig
  ): Promise<ImportResult> {
    const errors: ImportResult['errors'] = [];
    const warnings: ImportResult['warnings'] = [];

    try {
      // Obtener datos existentes de la empresa
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

      if (categoriesResult.error) {
        throw new Error(`Error obteniendo categorías: ${categoriesResult.error.message}`);
      }

      if (existingProductsResult.error) {
        throw new Error(`Error obteniendo productos existentes: ${existingProductsResult.error.message}`);
      }

      if (warehousesResult.error) {
        throw new Error(`Error obteniendo bodegas: ${warehousesResult.error.message}`);
      }

      const categories = categoriesResult.data || [];
      const existingProducts = existingProductsResult.data || [];
      const warehouses = warehousesResult.data || [];

      // Crear mapas para búsqueda rápida
      const categoryMap = new Map(categories.map((c: any) => [c.name.toLowerCase().trim(), c.id]));
      const warehouseMap = new Map(warehouses.map((w: any) => [w.name.toLowerCase().trim(), w.id]));
      const existingSkus = new Set(existingProducts.map((p: any) => p.sku?.toLowerCase().trim()).filter(Boolean));
      const existingBarcodes = new Set(existingProducts.map((p: any) => p.barcode?.toLowerCase().trim()).filter(Boolean));

      // Validar cada producto
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const rowNumber = i + 2; // +2 porque empezamos desde fila 2 (después de headers)

        // Validación 1: Nombre requerido
        if (!product.name || product.name.trim() === '') {
          errors.push({
            row: rowNumber,
            field: 'name',
            message: 'El nombre del producto es requerido',
            data: product
          });
          continue;
        }

        // Validación 2: Precio de venta debe ser mayor que 0
        if (product.selling_price <= 0) {
          errors.push({
            row: rowNumber,
            field: 'selling_price',
            message: 'El precio de venta debe ser mayor que 0',
            data: product
          });
        }

        // Validación 3: Precios no pueden ser negativos
        if (product.cost_price < 0) {
          errors.push({
            row: rowNumber,
            field: 'cost_price',
            message: 'El precio de costo no puede ser negativo',
            data: product
          });
        }

        // Validación 4: Cantidades no pueden ser negativas
        if (product.available_quantity < 0) {
          errors.push({
            row: rowNumber,
            field: 'available_quantity',
            message: 'La cantidad disponible no puede ser negativa',
            data: product
          });
        }

        // Validación 5: Stock mínimo no puede ser mayor que máximo
        if (product.min_stock && product.max_stock && product.min_stock > product.max_stock) {
          warnings.push({
            row: rowNumber,
            message: 'El stock mínimo es mayor que el stock máximo',
            data: product
          });
        }

        // Validación 6: Impuestos deben estar entre 0 y 100
        if (product.iva_rate < 0 || product.iva_rate > 100) {
          errors.push({
            row: rowNumber,
            field: 'iva_rate',
            message: 'El IVA debe estar entre 0 y 100',
            data: product
          });
        }

        if (product.ica_rate < 0 || product.ica_rate > 100) {
          errors.push({
            row: rowNumber,
            field: 'ica_rate',
            message: 'El ICA debe estar entre 0 y 100',
            data: product
          });
        }

        if (product.retencion_rate < 0 || product.retencion_rate > 100) {
          errors.push({
            row: rowNumber,
            field: 'retencion_rate',
            message: 'La retención debe estar entre 0 y 100',
            data: product
          });
        }

        // Validación 7: Categoría existe o se puede crear
        const categoryExists = categoryMap.has(product.category_name.toLowerCase().trim());
        if (!categoryExists && !config.createMissingCategories) {
          errors.push({
            row: rowNumber,
            field: 'category_name',
            message: `La categoría "${product.category_name}" no existe. Active la opción "Crear categorías faltantes" para crearla automáticamente.`,
            data: product
          });
        } else if (!categoryExists) {
          warnings.push({
            row: rowNumber,
            message: `La categoría "${product.category_name}" será creada automáticamente`,
            data: product
          });
        }

        // Validación 8: Bodega existe o se puede crear
        if (product.warehouse_name) {
          const warehouseExists = warehouseMap.has(product.warehouse_name.toLowerCase().trim());
          if (!warehouseExists && !config.createMissingWarehouses) {
            errors.push({
              row: rowNumber,
              field: 'warehouse_name',
              message: `La bodega "${product.warehouse_name}" no existe. Active la opción "Crear bodegas faltantes" para crearla automáticamente.`,
              data: product
            });
          } else if (!warehouseExists) {
            warnings.push({
              row: rowNumber,
              message: `La bodega "${product.warehouse_name}" será creada automáticamente`,
              data: product
            });
          }
        }

        // Validación 9: Producto duplicado por SKU
        const productSku = product.sku.toLowerCase().trim();
        if (existingSkus.has(productSku)) {
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
              message: `Ya existe un producto con SKU "${product.sku}". Active la opción "Actualizar productos existentes" para actualizarlo.`,
              data: product
            });
          }
        }

        // Validación 10: Producto duplicado por código de barras
        if (product.barcode) {
          const productBarcode = product.barcode.toLowerCase().trim();
          if (existingBarcodes.has(productBarcode)) {
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
                message: `Ya existe un producto con código de barras "${product.barcode}". Active la opción "Actualizar productos existentes" para actualizarlo.`,
                data: product
              });
            }
          }
        }

        // Advertencia: Costo mayor que precio de venta
        if (product.cost_price > product.selling_price) {
          warnings.push({
            row: rowNumber,
            message: `El precio de costo ($${product.cost_price}) es mayor que el precio de venta ($${product.selling_price})`,
            data: product
          });
        }
      }

      return {
        success: errors.length === 0,
        imported: 0,
        updated: 0,
        skipped: errors.length,
        errors,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        skipped: 0,
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
   * Importa productos con procesamiento transaccional
   */
  static async importProducts(
    products: ProductImportData[],
    config: ImportConfig,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ImportResult> {
    const errors: ImportResult['errors'] = [];
    const warnings: ImportResult['warnings'] = [];
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    try {
      onProgress?.(0, 'Cargando datos existentes...');

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
          .select('id, name, is_main')
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
      const categoryMap = new Map(categories.map((c: any) => [c.name.toLowerCase().trim(), c.id]));
      const warehouseMap = new Map(warehouses.map((w: any) => [w.name.toLowerCase().trim(), w.id]));
      const existingProductMap = new Map();

      existingProducts.forEach((p: any) => {
        if (p.sku) existingProductMap.set(`sku:${p.sku.toLowerCase().trim()}`, p);
        if (p.barcode) existingProductMap.set(`barcode:${p.barcode.toLowerCase().trim()}`, p);
      });

      // Obtener bodega principal
      const mainWarehouse = warehouses.find((w: any) => w.is_main);
      const mainWarehouseId = mainWarehouse?.id || (warehouses.length > 0 ? warehouses[0].id : null);

      onProgress?.(5, 'Iniciando importación...');

      // Procesar productos uno por uno
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const rowNumber = i + 2;
        const progress = Math.round(5 + ((i + 1) / products.length) * 90);

        onProgress?.(progress, `Procesando producto ${i + 1} de ${products.length}: ${product.name}`);

        try {
          const result = await this.processProduct(
            product,
            config,
            categoryMap,
            warehouseMap,
            existingProductMap,
            mainWarehouseId,
            rowNumber
          );

          if (result.success) {
            if (result.updated) {
              updatedCount++;
            } else {
              importedCount++;
            }

            if (result.warning) {
              warnings.push(result.warning);
            }
          } else if (result.error) {
            errors.push(result.error);
            skippedCount++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          errors.push({
            row: rowNumber,
            field: 'import',
            message: `Error procesando producto: ${errorMessage}`,
            data: product
          });
          skippedCount++;
        }
      }

      onProgress?.(100, 'Importación completada');

      return {
        success: errors.length === 0,
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        skipped: 0,
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
    mainWarehouseId: string | null,
    rowNumber: number
  ): Promise<{
    success: boolean;
    updated?: boolean;
    error?: any;
    warning?: any;
  }> {
    try {
      // 1. Validación de cantidades (deben ser enteros)
      if (product.available_quantity % 1 !== 0) {
        return {
          success: false,
          error: {
            row: rowNumber,
            field: 'available_quantity',
            message: `La cantidad debe ser un número entero (${product.available_quantity} no es válido)`,
            data: product
          }
        };
      }

      // 2. Buscar producto existente
      const existingProduct = existingProductMap.get(`sku:${product.sku.toLowerCase().trim()}`) ||
        (product.barcode ? existingProductMap.get(`barcode:${product.barcode.toLowerCase().trim()}`) : null);

      // Si existe y no se permite actualizar, saltar
      if (existingProduct && !config.updateExistingProducts) {
        return {
          success: false,
          error: {
            row: rowNumber,
            field: 'sku',
            message: `El producto ya existe (SKU: ${product.sku})`,
            data: product
          }
        };
      }

      // 2. Obtener o crear categoría
      let categoryId = categoryMap.get(product.category_name.toLowerCase().trim());
      if (!categoryId) {
        if (config.createMissingCategories) {
          categoryId = await this.createCategory(product.category_name, config.companyId);
          categoryMap.set(product.category_name.toLowerCase().trim(), categoryId);
        } else {
          return {
            success: false,
            error: {
              row: rowNumber,
              field: 'category_name',
              message: `La categoría "${product.category_name}" no existe`,
              data: product
            }
          };
        }
      }

      // 3. Obtener o crear bodega
      let warehouseId: string | null = null;
      if (product.warehouse_name) {
        warehouseId = warehouseMap.get(product.warehouse_name.toLowerCase().trim()) || null;
        if (!warehouseId) {
          if (config.createMissingWarehouses) {
            warehouseId = await this.createWarehouse(product.warehouse_name, config.companyId);
            warehouseMap.set(product.warehouse_name.toLowerCase().trim(), warehouseId);
          } else {
            return {
              success: false,
              error: {
                row: rowNumber,
                field: 'warehouse_name',
                message: `La bodega "${product.warehouse_name}" no existe`,
                data: product
              }
            };
          }
        }
      } else {
        // Usar bodega principal si no se especifica
        warehouseId = mainWarehouseId;
      }

      // 4. Preparar datos del producto
      const productData: any = {
        name: product.name.trim(),
        sku: product.sku.trim(),
        barcode: product.barcode?.trim() || null,
        description: product.description?.trim() || null,
        category_id: categoryId,
        warehouse_id: warehouseId,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        min_stock: product.min_stock || 0,
        max_stock: product.max_stock || null,
        unit: product.unit || 'unidad',
        iva_rate: product.iva_rate,
        ica_rate: product.ica_rate,
        retencion_rate: product.retencion_rate,
        fiscal_classification: product.fiscal_classification || 'Bien',
        excise_tax: product.excise_tax || false,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      let productId: string;
      let isUpdate = false;

      // 5. Crear o actualizar producto
      if (existingProduct) {
        // Actualizar TODOS los productos con el mismo SKU o barcode
        // (puede haber duplicados en la BD)
        const { error: updateError } = await this.supabase
          .from('products')
          .update(productData)
          .eq('company_id', config.companyId)
          .or(`sku.eq.${product.sku}${product.barcode ? `,barcode.eq.${product.barcode}` : ''}`);

        if (updateError) {
          throw new Error(`Error actualizando producto: ${updateError.message}`);
        }

        productId = existingProduct.id;
        isUpdate = true;
      } else {
        // Crear nuevo producto
        const { data: newProduct, error: insertError } = await this.supabase
          .from('products')
          .insert({
            ...productData,
            company_id: config.companyId
          })
          .select('id')
          .single();

        if (insertError) {
          throw new Error(`Error creando producto: ${insertError.message}`);
        }

        productId = newProduct.id;
        isUpdate = false;
      }

      // 6. Actualizar inventario si se especifica cantidad
      if (product.available_quantity >= 0 && warehouseId) {
        // Asegurar que la cantidad sea un entero
        const integerQuantity = Math.floor(Math.max(0, product.available_quantity));
        await this.syncInventory(
          productId,
          warehouseId,
          integerQuantity,
          config.companyId,
          config.userId
        );
      }

      return {
        success: true,
        updated: isUpdate
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
        name: name.trim(),
        company_id: companyId,
        is_active: true
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error creando categoría "${name}": ${error.message}`);
    }

    return data.id;
  }

  /**
   * Crea una nueva bodega
   */
  private static async createWarehouse(name: string, companyId: string): Promise<string> {
    const code = name.toUpperCase().replace(/\s+/g, '_').substring(0, 20);

    const { data, error } = await this.supabase
      .from('warehouses')
      .insert({
        name: name.trim(),
        code: code,
        company_id: companyId,
        is_active: true,
        is_main: false
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error creando bodega "${name}": ${error.message}`);
    }

    return data.id;
  }

  /**
   * Sincroniza el inventario en ambas tablas (inventory y warehouse_inventory)
   * Usa estrategia de buscar-actualizar-insertar para evitar problemas con constraints
   */
  private static async syncInventory(
    productId: string,
    warehouseId: string,
    quantity: number,
    companyId: string,
    userId: string
  ): Promise<void> {
    try {
      // Asegurar que quantity sea un entero
      const integerQuantity = Math.floor(Math.max(0, quantity));
      const now = new Date().toISOString();

      // 1. Sincronizar tabla inventory
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
        const { error: updateError } = await this.supabase
          .from('inventory')
          .update({
            quantity: integerQuantity,
            last_updated: now,
            updated_by: userId
          })
          .eq('id', existingInventory.id);

        if (updateError) {
          console.error('Error actualizando inventory:', updateError);
          throw new Error(`Error actualizando inventario: ${updateError.message}`);
        }
      } else {
        // Crear nuevo registro
        const { error: insertError } = await this.supabase
          .from('inventory')
          .insert({
            product_id: productId,
            warehouse_id: warehouseId,
            quantity: integerQuantity,
            company_id: companyId,
            last_updated: now,
            updated_by: userId
          });

        if (insertError) {
          console.error('Error insertando inventory:', insertError);
          throw new Error(`Error insertando inventario: ${insertError.message}`);
        }
      }

      // 2. Sincronizar tabla warehouse_inventory
      // Esta tabla SÍ tiene restricción única en (warehouse_id, product_id)
      // por lo que podemos usar upsert de forma segura
      const { error: warehouseInventoryError } = await this.supabase
        .from('warehouse_inventory')
        .upsert({
          product_id: productId,
          warehouse_id: warehouseId,
          quantity: integerQuantity,
          company_id: companyId,
          last_updated: now,
          updated_by: userId
        }, {
          onConflict: 'warehouse_id,product_id',
          ignoreDuplicates: false
        });

      if (warehouseInventoryError) {
        console.error('Error sincronizando warehouse_inventory:', warehouseInventoryError);
        throw new Error(`Error sincronizando inventario de bodega: ${warehouseInventoryError.message}`);
      }
    } catch (error) {
      console.error('Error sincronizando inventario:', error);
      throw error;
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
      .order('uploaded_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error obteniendo historial de importaciones:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Guarda el historial de una importación
   */
  static async saveImportHistory(
    filename: string,
    companyId: string,
    userId: string,
    result: ImportResult
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('product_import_history')
        .insert({
          filename: filename,
          file_path: '',
          company_id: companyId,
          uploaded_by: userId,
          total_rows: result.imported + result.updated + result.skipped,
          imported_rows: result.imported + result.updated,
          error_rows: result.skipped,
          status: result.success ? 'completed' : 'failed',
          errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null
        });

      if (error) {
        console.error('Error guardando historial de importación:', error);
      }
    } catch (error) {
      console.error('Error guardando historial:', error);
    }
  }

  /**
   * Elimina productos duplicados (mismo SKU, múltiples registros)
   * Conserva solo el más reciente y activo
   */
  static async removeDuplicateProducts(companyId: string): Promise<{
    success: boolean;
    duplicatesFound: number;
    duplicatesRemoved: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;

    try {
      // Buscar SKUs duplicados
      const { data: duplicates, error: fetchError } = await this.supabase
        .rpc('find_duplicate_skus', { p_company_id: companyId });

      if (fetchError) {
        // Si la función no existe, buscar manualmente
        const { data: products } = await this.supabase
          .from('products')
          .select('sku, id, is_active, created_at')
          .eq('company_id', companyId)
          .order('sku');

        if (!products) return { success: true, duplicatesFound: 0, duplicatesRemoved: 0, errors: [] };

        const skuMap = new Map<string, any[]>();
        products.forEach(p => {
          if (!skuMap.has(p.sku)) skuMap.set(p.sku, []);
          skuMap.get(p.sku)!.push(p);
        });

        // Procesar duplicados
        for (const [sku, items] of skuMap.entries()) {
          if (items.length > 1) {
            duplicatesFound++;
            // Ordenar: activos primero, luego por fecha
            items.sort((a, b) => {
              if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            // Mantener el primero, marcar los demás como inactivos
            for (let i = 1; i < items.length; i++) {
              const { error } = await this.supabase
                .from('products')
                .update({ is_active: false })
                .eq('id', items[i].id);

              if (!error) duplicatesRemoved++;
            }
          }
        }
      }

      return {
        success: errors.length === 0,
        duplicatesFound,
        duplicatesRemoved,
        errors
      };
    } catch (error) {
      return {
        success: false,
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        errors: [`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`]
      };
    }
  }

  /**
   * Corrige productos existentes con códigos de barras en formato científico
   */
  static async fixExistingProductsBarcodeFormat(companyId: string): Promise<{
    success: boolean;
    fixed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let fixed = 0;

    try {
      // Buscar productos con notación científica
      const { data: products, error: fetchError } = await this.supabase
        .from('products')
        .select('id, sku, barcode, name')
        .eq('company_id', companyId)
        .or('barcode.ilike.%E+%,barcode.ilike.%e+%,sku.ilike.%E+%,sku.ilike.%e+%');

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

          // Corregir código de barras
          if (product.barcode && /[eE][+\-]?\d+/.test(product.barcode)) {
            const correctedBarcode = this.parseBarcodeValue(product.barcode);
            if (correctedBarcode && correctedBarcode !== product.barcode) {
              updateData.barcode = correctedBarcode;
              needsUpdate = true;
            }
          }

          // Corregir SKU
          if (product.sku && /[eE][+\-]?\d+/.test(product.sku)) {
            const correctedSku = this.parseBarcodeValue(product.sku);
            if (correctedSku && correctedSku !== product.sku) {
              updateData.sku = correctedSku;
              needsUpdate = true;
            }
          }

          // Actualizar si es necesario
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
