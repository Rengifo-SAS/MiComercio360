import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

export class ReportExportService {
  /**
   * Exporta un reporte a PDF con formato profesional
   */
  static async exportToPDF(
    reportData: any,
    reportType: string,
    companyInfo: {
      name: string;
      nit: string;
      address?: string;
      phone?: string;
    },
    options: {
      orientation?: 'portrait' | 'landscape';
      title?: string;
      period?: string;
    } = {}
  ): Promise<void> {
    const {
      orientation = 'portrait',
      title = 'Reporte',
      period = 'N/A',
    } = options;

    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 15;

    // Encabezado
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(companyInfo.name.toUpperCase(), pageWidth / 2, currentY, {
      align: 'center',
    });
    currentY += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (companyInfo.nit) {
      doc.text(`NIT: ${companyInfo.nit}`, pageWidth / 2, currentY, {
        align: 'center',
      });
      currentY += 5;
    }
    if (companyInfo.address) {
      doc.text(companyInfo.address, pageWidth / 2, currentY, {
        align: 'center',
      });
      currentY += 5;
    }
    if (companyInfo.phone) {
      doc.text(`Tel: ${companyInfo.phone}`, pageWidth / 2, currentY, {
        align: 'center',
      });
      currentY += 5;
    }

    currentY += 5;

    // Título del reporte
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;

    // Período
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${period}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Contenido según tipo de reporte
    if (reportType === 'sales' && reportData.summary) {
      this.addSalesSummaryToPDF(doc, reportData, currentY);
    } else if (reportType === 'inventory' && reportData.summary) {
      this.addInventorySummaryToPDF(doc, reportData, currentY);
    } else if (reportType === 'accounting') {
      this.addAccountingToPDF(doc, reportData, currentY);
    } else if (reportType === 'tax') {
      this.addTaxToPDF(doc, reportData, currentY);
    }

    // Pie de página con número de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generado: ${new Date().toLocaleString('es-CO')}`,
        15,
        pageHeight - 10
      );
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth - 15,
        pageHeight - 10,
        { align: 'right' }
      );
    }

    // Descargar PDF
    const fileName = `${title.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  }

  private static addSalesSummaryToPDF(
    doc: jsPDF,
    reportData: any,
    startY: number
  ): void {
    const { summary, sales_trend, top_products } = reportData;

    // Resumen de ventas
    autoTable(doc, {
      startY,
      head: [['Métrica', 'Valor']],
      body: [
        ['Ventas Totales', formatCurrency(summary.total_sales)],
        ['Costo Total', formatCurrency(summary.total_cost)],
        ['Utilidad Bruta', formatCurrency(summary.gross_profit)],
        ['Margen de Utilidad', formatPercent(summary.profit_margin)],
        ['Transacciones', summary.total_transactions.toString()],
        ['Ticket Promedio', formatCurrency(summary.avg_ticket)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] },
      margin: { left: 15, right: 15 },
    });

    // Top productos
    if (top_products && top_products.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Producto', 'Cantidad', 'Total']],
        body: top_products.slice(0, 10).map((p: any) => [
          p.product_name,
          formatNumber(p.quantity, 0),
          formatCurrency(p.total),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 15, right: 15 },
      });
    }
  }

  private static addInventorySummaryToPDF(
    doc: jsPDF,
    reportData: any,
    startY: number
  ): void {
    const { summary, inventory } = reportData;

    // Resumen de inventario
    autoTable(doc, {
      startY,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total Productos', summary.total_products.toString()],
        ['Valor Inventario', formatCurrency(summary.total_stock_value)],
        ['Stock Bajo', summary.low_stock_count.toString()],
        ['Sin Stock', summary.out_of_stock_count.toString()],
        ['Sobre Stock', summary.overstock_count.toString()],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 15, right: 15 },
    });

    // Detalle de productos
    if (inventory && inventory.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Producto', 'SKU', 'Stock', 'Mín', 'Estado']],
        body: inventory.slice(0, 20).map((p: any) => [
          p.product_name,
          p.sku,
          formatNumber(p.current_stock, 0),
          formatNumber(p.min_stock, 0),
          p.status.toUpperCase(),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        margin: { left: 15, right: 15 },
      });
    }
  }

  private static addAccountingToPDF(
    doc: jsPDF,
    reportData: any,
    startY: number
  ): void {
    if (reportData.balance_sheet) {
      const bs = reportData.balance_sheet;

      // Balance General
      autoTable(doc, {
        startY,
        head: [['BALANCE GENERAL', 'Valor']],
        body: [
          ['ACTIVOS', ''],
          ['Activos Corrientes', formatCurrency(bs.assets.current_total || 0)],
          ['Activos Fijos', formatCurrency(bs.assets.fixed_total || 0)],
          ['Total Activos', formatCurrency(bs.assets.total)],
          ['', ''],
          ['PASIVOS', ''],
          ['Pasivos Corrientes', formatCurrency(bs.liabilities.current_total || 0)],
          ['Pasivos Largo Plazo', formatCurrency(bs.liabilities.longTerm_total || 0)],
          ['Total Pasivos', formatCurrency(bs.liabilities.total)],
          ['', ''],
          ['PATRIMONIO', ''],
          ['Total Patrimonio', formatCurrency(bs.equity.total)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 15, right: 15 },
      });
    }

    if (reportData.income_statement) {
      const is = reportData.income_statement;

      // Estado de Resultados
      autoTable(doc, {
        startY: (doc as any).lastAutoTable?.finalY + 10 || startY,
        head: [['ESTADO DE RESULTADOS', 'Valor']],
        body: [
          ['Ingresos Totales', formatCurrency(is.revenue.total)],
          ['Costo de Ventas', `(${formatCurrency(is.cost_of_sales.total)})`],
          ['Utilidad Bruta', formatCurrency(is.gross_profit)],
          ['Gastos Operacionales', `(${formatCurrency(is.operating_expenses.total)})`],
          ['Utilidad Operacional', formatCurrency(is.operating_profit)],
          ['Otros Ingresos', formatCurrency(is.other_income || 0)],
          ['Otros Gastos', `(${formatCurrency(is.other_expenses || 0)})`],
          ['Utilidad Neta', formatCurrency(is.net_profit)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] },
        margin: { left: 15, right: 15 },
      });
    }
  }

  private static addTaxToPDF(doc: jsPDF, reportData: any, startY: number): void {
    if (reportData.retencion_fuente) {
      autoTable(doc, {
        startY,
        head: [['Fecha', 'Descripción', 'Base', 'Tarifa', 'Retención']],
        body: reportData.retencion_fuente.map((r: any) => [
          r.period,
          r.description || '',
          formatCurrency(r.base),
          formatPercent(r.rate),
          formatCurrency(r.tax_amount),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        margin: { left: 15, right: 15 },
      });
    }
  }

  /**
   * Exporta un reporte a Excel
   */
  static async exportToExcel(
    reportData: any,
    reportType: string,
    title: string
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();

    if (reportType === 'sales' && reportData.summary) {
      // Hoja de resumen
      const summaryData = [
        ['RESUMEN DE VENTAS'],
        [''],
        ['Métrica', 'Valor'],
        ['Ventas Totales', reportData.summary.total_sales],
        ['Costo Total', reportData.summary.total_cost],
        ['Utilidad Bruta', reportData.summary.gross_profit],
        ['Margen de Utilidad', reportData.summary.profit_margin / 100],
        ['Transacciones', reportData.summary.total_transactions],
        ['Ticket Promedio', reportData.summary.avg_ticket],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

      // Hoja de productos
      if (reportData.top_products && reportData.top_products.length > 0) {
        const productsData = [
          ['PRODUCTOS MÁS VENDIDOS'],
          [''],
          ['Producto', 'Cantidad', 'Total'],
          ...reportData.top_products.map((p: any) => [
            p.product_name,
            p.quantity,
            p.total,
          ]),
        ];

        const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
        XLSX.utils.book_append_sheet(workbook, productsSheet, 'Productos');
      }
    } else if (reportType === 'inventory' && reportData.inventory) {
      const inventoryData = [
        ['INVENTARIO'],
        [''],
        ['Producto', 'SKU', 'Stock Actual', 'Stock Mínimo', 'Valor', 'Estado'],
        ...reportData.inventory.map((p: any) => [
          p.product_name,
          p.sku,
          p.current_stock,
          p.min_stock,
          p.stock_value,
          p.status,
        ]),
      ];

      const inventorySheet = XLSX.utils.aoa_to_sheet(inventoryData);
      XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventario');
    }

    // Descargar archivo
    const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Exporta un reporte a CSV
   */
  static async exportToCSV(
    reportData: any,
    reportType: string,
    title: string
  ): Promise<void> {
    let csvContent = '';

    if (reportType === 'sales' && reportData.top_products) {
      csvContent = 'Producto,Cantidad,Total\n';
      reportData.top_products.forEach((p: any) => {
        csvContent += `"${p.product_name}",${p.quantity},${p.total}\n`;
      });
    } else if (reportType === 'inventory' && reportData.inventory) {
      csvContent = 'Producto,SKU,Stock Actual,Stock Mínimo,Valor,Estado\n';
      reportData.inventory.forEach((p: any) => {
        csvContent += `"${p.product_name}","${p.sku}",${p.current_stock},${p.min_stock},${p.stock_value},"${p.status}"\n`;
      });
    }

    // Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Prepara el documento para impresión optimizada
   */
  static preparePrintView(reportData: any, reportType: string): string {
    // Retorna HTML optimizado para impresión
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte - Impresión</title>
          <style>
            @media print {
              @page { margin: 1cm; }
              body { margin: 0; padding: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .summary {
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte</h1>
          </div>
          <div class="content">
            <!-- Contenido del reporte -->
          </div>
        </body>
      </html>
    `;
  }
}
