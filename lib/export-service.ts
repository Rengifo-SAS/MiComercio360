import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  warehouse_id?: string;
  include_images: boolean;
  include_categories: boolean;
  include_suppliers: boolean;
  include_prices: boolean;
  include_stock_levels: boolean;
  title: string;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
  cost_price: number;
  selling_price: number;
  min_stock: number;
  max_stock?: number;
  unit: string;
  image_url?: string;
  is_active: boolean;
  quantity: number;
  last_updated?: string;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export class ExportService {
  static async exportInventory(
    data: InventoryItem[],
    options: ExportOptions
  ): Promise<void> {
    switch (options.format) {
      case 'pdf':
        await this.exportToPDF(data, options);
        break;
      case 'excel':
        await this.exportToExcel(data, options);
        break;
      case 'csv':
        await this.exportToCSV(data, options);
        break;
      default:
        throw new Error('Formato de exportación no soportado');
    }
  }

  // Nueva función que consulta directamente la base de datos
  static async exportInventoryFromDatabase(
    companyId: string,
    options: ExportOptions
  ): Promise<void> {
    try {
      // Obtener datos directamente de la base de datos
      const data = await this.fetchInventoryData(companyId, options);
      
      // Exportar con los datos obtenidos
      await this.exportInventory(data, options);
    } catch (error) {
      console.error('Error exporting inventory from database:', error);
      throw error;
    }
  }

  // Función para obtener datos de inventario desde la base de datos
  private static async fetchInventoryData(
    companyId: string,
    options: ExportOptions
  ): Promise<InventoryItem[]> {
    const supabase = createClient();

    // Construir parámetros para la función RPC
    const rpcParams: any = {
      p_company_id: companyId,
      p_search_term: '',
      p_category_id: null,
      p_supplier_id: null,
      p_warehouse_id: options.warehouse_id || null,
      p_stock_status: '',
      p_sort_by: 'name',
      p_sort_order: 'asc',
      p_limit: 10000, // Límite alto para obtener todos los datos
      p_offset: 0,
    };

    // Obtener datos de inventario
    const { data: inventoryData, error } = await supabase.rpc(
      'search_products_advanced',
      rpcParams
    );

    if (error) {
      console.error('Error fetching inventory data:', error);
      throw new Error('Error al obtener datos del inventario');
    }

    // Transformar datos al formato esperado
    return (inventoryData || []).map((item: any): InventoryItem => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      description: item.description || '',
      category: item.category_name ? {
        id: '',
        name: item.category_name,
        color: item.category_color || '#000000'
      } : undefined,
      supplier: item.supplier_name ? {
        id: '',
        name: item.supplier_name
      } : undefined,
      warehouse: item.warehouse_name ? {
        id: item.warehouse_id || '',
        name: item.warehouse_name,
        code: item.warehouse_code || ''
      } : undefined,
      cost_price: parseFloat(item.cost_price) || 0,
      selling_price: parseFloat(item.selling_price) || 0,
      min_stock: parseInt(item.min_stock) || 0,
      max_stock: item.max_stock ? parseInt(item.max_stock) : undefined,
      unit: item.unit || 'pcs',
      image_url: item.image_url,
      is_active: item.is_active,
      quantity: parseInt(item.quantity) || 0,
      last_updated: item.last_updated,
      stock_status: item.stock_status as 'in_stock' | 'low_stock' | 'out_of_stock'
    }));
  }

  private static async exportToPDF(
    data: InventoryItem[],
    options: ExportOptions
  ): Promise<void> {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Configurar fuente
    doc.setFont('helvetica');

    // Título
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title, pageWidth / 2, 20, { align: 'center' });

    // Información de la empresa y fecha
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-CO')}`, 20, 35);
    doc.text(`Total de productos: ${data.length}`, pageWidth - 20, 35, { align: 'right' });

    // Notas si las hay
    if (options.notes) {
      doc.setFontSize(9);
      doc.text(`Notas: ${options.notes}`, 20, 45);
    }

    // Preparar headers de la tabla
    const headers = ['SKU', 'Producto', 'Cantidad', 'Unidad'];
    
    if (options.include_categories) {
      headers.push('Categoría');
    }
    
    if (options.include_suppliers) {
      headers.push('Proveedor');
    }
    
    if (options.include_prices) {
      headers.push('Precio Costo', 'Precio Venta');
    }
    
    if (options.include_stock_levels) {
      headers.push('Stock Mín.', 'Stock Máx.');
    }
    
    headers.push('Estado');

    // Preparar datos para la tabla
    const tableData = data.map((item) => {
      const row: any[] = [
        item.sku,
        item.name,
        item.quantity.toString(),
        item.unit,
      ];

      if (options.include_categories) {
        row.push(item.category?.name || '');
      }

      if (options.include_suppliers) {
        row.push(item.supplier?.name || '');
      }

      if (options.include_prices) {
        row.push(`$${item.cost_price.toLocaleString('es-CO')}`);
        row.push(`$${item.selling_price.toLocaleString('es-CO')}`);
      }

      if (options.include_stock_levels) {
        row.push(item.min_stock.toString());
        row.push(item.max_stock ? item.max_stock.toString() : '-');
      }

      // Estado de stock
      const statusText = {
        in_stock: 'En Stock',
        low_stock: 'Bajo Stock',
        out_of_stock: 'Sin Stock'
      }[item.stock_status];

      row.push(statusText);

      return row;
    });

    // Generar tabla
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: options.notes ? 55 : 45,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        halign: 'left',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 25 }, // SKU
        1: { cellWidth: 50 }, // Producto
        2: { cellWidth: 20 }, // Cantidad
        3: { cellWidth: 20 }, // Unidad
      },
      didDrawPage: (data: any) => {
        // Pie de página
        const pageNumber = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${data.pageNumber} de ${pageNumber}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      },
    });

    // Guardar archivo
    const fileName = `inventario_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  private static async exportToExcel(
    data: InventoryItem[],
    options: ExportOptions
  ): Promise<void> {
    // Preparar headers de la tabla
    const headers = ['SKU', 'Producto', 'Cantidad', 'Unidad'];
    
    if (options.include_categories) {
      headers.push('Categoría');
    }
    
    if (options.include_suppliers) {
      headers.push('Proveedor');
    }
    
    if (options.include_prices) {
      headers.push('Precio Costo', 'Precio Venta');
    }
    
    if (options.include_stock_levels) {
      headers.push('Stock Mínimo', 'Stock Máximo');
    }
    
    headers.push('Estado');

    // Preparar datos para la tabla
    const tableData = data.map((item) => {
      const row: any[] = [
        item.sku,
        item.name,
        item.quantity,
        item.unit,
      ];

      if (options.include_categories) {
        row.push(item.category?.name || '');
      }

      if (options.include_suppliers) {
        row.push(item.supplier?.name || '');
      }

      if (options.include_prices) {
        row.push(item.cost_price);
        row.push(item.selling_price);
      }

      if (options.include_stock_levels) {
        row.push(item.min_stock);
        row.push(item.max_stock || '');
      }

      // Estado de stock
      const statusText = {
        in_stock: 'En Stock',
        low_stock: 'Bajo Stock',
        out_of_stock: 'Sin Stock'
      }[item.stock_status];

      row.push(statusText);

      return row;
    });

    // Crear libro de trabajo de Excel
    const workbook = XLSX.utils.book_new();
    
    // Crear hoja de trabajo con headers y datos
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...tableData]);
    
    // Configurar ancho de columnas
    const columnWidths = [
      { wch: 15 }, // SKU
      { wch: 30 }, // Producto
      { wch: 10 }, // Cantidad
      { wch: 10 }, // Unidad
    ];

    if (options.include_categories) {
      columnWidths.push({ wch: 20 }); // Categoría
    }

    if (options.include_suppliers) {
      columnWidths.push({ wch: 25 }); // Proveedor
    }

    if (options.include_prices) {
      columnWidths.push({ wch: 15 }, { wch: 15 }); // Precio Costo, Precio Venta
    }

    if (options.include_stock_levels) {
      columnWidths.push({ wch: 12 }, { wch: 12 }); // Stock Mínimo, Stock Máximo
    }

    columnWidths.push({ wch: 15 }); // Estado

    worksheet['!cols'] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');

    // Generar archivo Excel
    const fileName = `inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  private static async exportToCSV(
    data: InventoryItem[],
    options: ExportOptions
  ): Promise<void> {
    const headers = [
      'SKU',
      'Producto',
      'Cantidad',
      'Unidad',
    ];

    if (options.include_categories) {
      headers.push('Categoría');
    }

    if (options.include_suppliers) {
      headers.push('Proveedor');
    }

    if (options.include_prices) {
      headers.push('Precio Costo');
      headers.push('Precio Venta');
    }

    if (options.include_stock_levels) {
      headers.push('Stock Mínimo');
      headers.push('Stock Máximo');
    }

    headers.push('Estado');

    const csvContent = [
      headers.join(','),
      ...data.map((item) => {
        const row = [
          `"${item.sku}"`,
          `"${item.name}"`,
          item.quantity,
          `"${item.unit}"`,
        ];

        if (options.include_categories) {
          row.push(`"${item.category?.name || ''}"`);
        }

        if (options.include_suppliers) {
          row.push(`"${item.supplier?.name || ''}"`);
        }

        if (options.include_prices) {
          row.push(item.cost_price);
          row.push(item.selling_price);
        }

        if (options.include_stock_levels) {
          row.push(item.min_stock);
          row.push(item.max_stock || '');
        }

        const statusText = {
          in_stock: 'En Stock',
          low_stock: 'Bajo Stock',
          out_of_stock: 'Sin Stock'
        }[item.stock_status];

        row.push(`"${statusText}"`);

        return row.join(',');
      }),
    ].join('\n');

    // Crear y descargar archivo con codificación UTF-8 BOM para Excel
    const BOM = '\uFEFF';
    const csvContentWithBOM = BOM + csvContent;
    
    const blob = new Blob([csvContentWithBOM], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static async exportElementToPDF(
    elementId: string,
    filename: string = 'reporte.pdf'
  ): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Elemento no encontrado');
    }

    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    doc.save(filename);
  }
}
