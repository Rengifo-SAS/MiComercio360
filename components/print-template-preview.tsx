'use client';

import { useState, useEffect } from 'react';
import { PrintTemplate } from '@/lib/types/print-templates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Eye,
  Download,
  Printer,
  FileText,
  Calculator,
  Receipt,
  ShoppingCart,
  Truck,
  ArrowUpCircle,
  ArrowDownCircle,
  CreditCard,
  Package,
  TrendingUp,
} from 'lucide-react';

interface PrintTemplatePreviewProps {
  template: PrintTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintTemplatePreview({
  template,
  open,
  onOpenChange,
}: PrintTemplatePreviewProps) {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (template && open) {
      generatePreview();
    }
  }, [template, open]);

  const generatePreview = () => {
    setLoading(true);
    try {
      // Datos de ejemplo para la vista previa
      const sampleData = {
        company: {
          name: 'Mi Empresa S.A.S.',
          nit: '900.123.456-7',
          address: 'Calle 123 #45-67',
          city: 'Bogotá, D.C.',
          phone: '+57 (1) 234-5678',
          email: 'contacto@miempresa.com',
          website: 'www.miempresa.com',
        },
        document: {
          number: 'FAC-001',
          date: new Date().toLocaleDateString('es-CO'),
          dueDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toLocaleDateString('es-CO'),
          type: template.document_type,
        },
        customer: {
          name: 'Cliente de Ejemplo',
          document: 'CC 12.345.678',
          address: 'Calle 456 #78-90',
          city: 'Medellín, Antioquia',
          phone: '+57 (4) 567-8901',
          email: 'cliente@ejemplo.com',
        },
        items: [
          {
            code: 'PROD-001',
            description: 'Producto de Ejemplo 1',
            quantity: 2,
            unitPrice: 50000,
            total: 100000,
          },
          {
            code: 'PROD-002',
            description: 'Producto de Ejemplo 2',
            quantity: 1,
            unitPrice: 75000,
            total: 75000,
          },
        ],
        totals: {
          subtotal: 175000,
          tax: 33250,
          total: 208250,
        },
        payment: {
          method: 'Transferencia Bancaria',
          reference: 'REF-123456',
          bank: 'Banco de Bogotá',
        },
        notes: 'Gracias por su compra. Términos y condiciones aplican.',
      };

      // Generar HTML de la vista previa
      const html = generatePreviewHtml(template, sampleData);
      setPreviewHtml(html);
    } catch (error) {
      console.error('Error generando vista previa:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePreviewHtml = (template: PrintTemplate, data: any): string => {
    const { company, document, customer, items, totals, payment, notes } = data;

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vista Previa - ${template.name}</title>
        <style>
          ${template.css_styles || ''}
          
          body {
            font-family: ${template.font_family || 'Arial'};
            font-size: ${template.font_size || 10}pt;
            line-height: ${template.line_height || 1.2};
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
          
          .preview-container {
            max-width: ${getPaperWidth(template)}mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            min-height: ${getPaperHeight(template)}mm;
            position: relative;
          }
          
          .header {
            padding: ${template.margin_top || 10}mm ${
      template.margin_right || 10
    }mm 0 ${template.margin_left || 10}mm;
            border-bottom: 2px solid #333;
            margin-bottom: 20px;
          }
          
          .company-info {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
          }
          
          .company-details h1 {
            margin: 0;
            font-size: 18pt;
            color: #333;
          }
          
          .company-details p {
            margin: 2px 0;
            font-size: 9pt;
            color: #666;
          }
          
          .document-info {
            text-align: right;
          }
          
          .document-info h2 {
            margin: 0;
            font-size: 16pt;
            color: #333;
          }
          
          .document-details {
            margin-top: 10px;
          }
          
          .document-details p {
            margin: 2px 0;
            font-size: 9pt;
          }
          
          .customer-info {
            padding: 0 ${template.margin_right || 10}mm 0 ${
      template.margin_left || 10
    }mm;
            margin-bottom: 20px;
          }
          
          .customer-info h3 {
            margin: 0 0 10px 0;
            font-size: 12pt;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          
          .customer-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          
          .customer-details p {
            margin: 2px 0;
            font-size: 9pt;
          }
          
          .items-table {
            padding: 0 ${template.margin_right || 10}mm 0 ${
      template.margin_left || 10
    }mm;
            margin-bottom: 20px;
          }
          
          .items-table h3 {
            margin: 0 0 10px 0;
            font-size: 12pt;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }
          
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          
          th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          
          .text-right {
            text-align: right;
          }
          
          .totals {
            padding: 0 ${template.margin_right || 10}mm 0 ${
      template.margin_left || 10
    }mm;
            margin-bottom: 20px;
          }
          
          .totals-table {
            width: 300px;
            margin-left: auto;
          }
          
          .totals-table td {
            padding: 5px 10px;
            border: none;
          }
          
          .totals-table .total-row {
            font-weight: bold;
            border-top: 2px solid #333;
            font-size: 11pt;
          }
          
          .payment-info {
            padding: 0 ${template.margin_right || 10}mm 0 ${
      template.margin_left || 10
    }mm;
            margin-bottom: 20px;
          }
          
          .payment-info h3 {
            margin: 0 0 10px 0;
            font-size: 12pt;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          
          .payment-details p {
            margin: 2px 0;
            font-size: 9pt;
          }
          
          .notes {
            padding: 0 ${template.margin_right || 10}mm 0 ${
      template.margin_left || 10
    }mm;
            margin-bottom: 20px;
          }
          
          .notes h3 {
            margin: 0 0 10px 0;
            font-size: 12pt;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          
          .notes p {
            margin: 2px 0;
            font-size: 9pt;
            font-style: italic;
          }
          
          .footer {
            position: absolute;
            bottom: ${template.margin_bottom || 10}mm;
            left: ${template.margin_left || 10}mm;
            right: ${template.margin_right || 10}mm;
            text-align: center;
            font-size: 8pt;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          ${
            template.header_template ||
            `
            <div class="header">
              <div class="company-info">
                <div class="company-details">
                  <h1>${company.name}</h1>
                  <p>NIT: ${company.nit}</p>
                  <p>${company.address}</p>
                  <p>${company.city}</p>
                  <p>Tel: ${company.phone} | Email: ${company.email}</p>
                </div>
                <div class="document-info">
                  <h2>${getDocumentTypeLabel(template.document_type)}</h2>
                  <div class="document-details">
                    <p><strong>No:</strong> ${document.number}</p>
                    <p><strong>Fecha:</strong> ${document.date}</p>
                    ${
                      document.dueDate
                        ? `<p><strong>Vencimiento:</strong> ${document.dueDate}</p>`
                        : ''
                    }
                  </div>
                </div>
              </div>
            </div>
          `
          }
          
          ${
            template.body_template ||
            `
            ${
              template.show_customer_info
                ? `
              <div class="customer-info">
                <h3>Información del Cliente</h3>
                <div class="customer-details">
                  <div>
                    <p><strong>Nombre:</strong> ${customer.name}</p>
                    <p><strong>Documento:</strong> ${customer.document}</p>
                  </div>
                  <div>
                    <p><strong>Dirección:</strong> ${customer.address}</p>
                    <p><strong>Ciudad:</strong> ${customer.city}</p>
                    <p><strong>Teléfono:</strong> ${customer.phone}</p>
                  </div>
                </div>
              </div>
            `
                : ''
            }
            
            ${
              template.show_items_table
                ? `
              <div class="items-table">
                <h3>Detalle de Productos/Servicios</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th class="text-right">Cantidad</th>
                      <th class="text-right">Precio Unit.</th>
                      <th class="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items
                      .map(
                        (item: any) => `
                      <tr>
                        <td>${item.code}</td>
                        <td>${item.description}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-right">$${item.unitPrice.toLocaleString(
                          'es-CO'
                        )}</td>
                        <td class="text-right">$${item.total.toLocaleString(
                          'es-CO'
                        )}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
                : ''
            }
            
            ${
              template.show_totals
                ? `
              <div class="totals">
                <table class="totals-table">
                  <tr>
                    <td>Subtotal:</td>
                    <td class="text-right">$${totals.subtotal.toLocaleString(
                      'es-CO'
                    )}</td>
                  </tr>
                  <tr>
                    <td>IVA (19%):</td>
                    <td class="text-right">$${totals.tax.toLocaleString(
                      'es-CO'
                    )}</td>
                  </tr>
                  <tr class="total-row">
                    <td>TOTAL:</td>
                    <td class="text-right">$${totals.total.toLocaleString(
                      'es-CO'
                    )}</td>
                  </tr>
                </table>
              </div>
            `
                : ''
            }
            
            ${
              template.show_payment_info
                ? `
              <div class="payment-info">
                <h3>Información de Pago</h3>
                <div class="payment-details">
                  <p><strong>Método:</strong> ${payment.method}</p>
                  <p><strong>Referencia:</strong> ${payment.reference}</p>
                  <p><strong>Banco:</strong> ${payment.bank}</p>
                </div>
              </div>
            `
                : ''
            }
            
            ${
              template.show_notes && notes
                ? `
              <div class="notes">
                <h3>Notas</h3>
                <p>${notes}</p>
              </div>
            `
                : ''
            }
          `
          }
          
          ${
            template.footer_template ||
            `
            <div class="footer">
              <p>Este documento fue generado electrónicamente y es válido sin firma autógrafa</p>
              <p>${company.website} | ${company.email}</p>
            </div>
          `
          }
        </div>
      </body>
      </html>
    `;
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      INVOICE: 'FACTURA DE VENTA',
      QUOTATION: 'COTIZACIÓN',
      RECEIPT: 'RECIBO DE CAJA',
      PURCHASE_ORDER: 'ORDEN DE COMPRA',
      DELIVERY_NOTE: 'REMISIÓN',
      CREDIT_NOTE: 'NOTA CRÉDITO',
      DEBIT_NOTE: 'NOTA DÉBITO',
      PAYMENT_VOUCHER: 'COMPROBANTE DE PAGO',
      EXPENSE_VOUCHER: 'COMPROBANTE DE EGRESO',
      INVENTORY_REPORT: 'REPORTE DE INVENTARIO',
      SALES_REPORT: 'REPORTE DE VENTAS',
      OTHER: 'DOCUMENTO',
    };
    return labels[type] || 'DOCUMENTO';
  };

  const getPaperWidth = (template: PrintTemplate): number => {
    if (template.paper_size === 'CUSTOM' && template.custom_width) {
      return template.custom_width;
    }

    const widths: Record<string, number> = {
      A4: 210,
      A5: 148,
      LETTER: 216,
      LEGAL: 216,
      HALF_LETTER: 140,
    };
    return widths[template.paper_size] || 210;
  };

  const getPaperHeight = (template: PrintTemplate): number => {
    if (template.paper_size === 'CUSTOM' && template.custom_height) {
      return template.custom_height;
    }

    const heights: Record<string, number> = {
      A4: 297,
      A5: 210,
      LETTER: 279,
      LEGAL: 356,
      HALF_LETTER: 216,
    };
    return heights[template.paper_size] || 297;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(previewHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}_preview.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getDocumentTypeIcon = (type: string) => {
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      INVOICE: FileText,
      QUOTATION: Calculator,
      RECEIPT: Receipt,
      PURCHASE_ORDER: ShoppingCart,
      DELIVERY_NOTE: Truck,
      CREDIT_NOTE: ArrowUpCircle,
      DEBIT_NOTE: ArrowDownCircle,
      PAYMENT_VOUCHER: CreditCard,
      EXPENSE_VOUCHER: Receipt,
      INVENTORY_REPORT: Package,
      SALES_REPORT: TrendingUp,
      OTHER: FileText,
    };
    return iconMap[type] || FileText;
  };

  const DocumentIcon = getDocumentTypeIcon(template.document_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-hidden sm:w-[90vw] md:w-[85vw] lg:w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Vista Previa - {template.name}
          </DialogTitle>
          <DialogDescription>
            Vista previa de cómo se verá el documento impreso
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Barra de herramientas */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <DocumentIcon className="h-4 w-4" />
              <span className="font-medium">
                {getDocumentTypeLabel(template.document_type)}
              </span>
              <Badge variant="outline">
                {template.paper_size} - {template.page_orientation}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar HTML
              </Button>
              <Button size="sm" onClick={handlePrint} disabled={loading}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>

          {/* Contenido de la vista previa */}
          <div className="flex-1 overflow-auto p-4 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    Generando vista previa...
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full min-h-[600px] border-0"
                  title="Vista previa de la plantilla"
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
