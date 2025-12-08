'use client';

import { useState } from 'react';
import {
  TemplateDocumentType,
  getDocumentTypeInfo,
} from '@/lib/types/print-templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Search,
  ZoomIn,
  ZoomOut,
  Plus,
  Edit,
  Type,
  Image,
  Eye,
  ChevronLeft,
  ChevronRight,
  Printer,
} from 'lucide-react';

interface CompanyData {
  name: string;
  legal_name?: string;
  nit?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
}

interface TemplatePreviewProps {
  documentType: TemplateDocumentType;
  templateStyle?: string;
  fontFamily?: string;
  fontSize?: number;
  itemSpacing?: number;
  showTotalItems?: boolean;
  thirdPartyIncome?: boolean;
  taxesIncluded?: boolean;
  showDiscountColumn?: boolean;
  showTaxValueColumn?: boolean;
  showTaxPercentageColumn?: boolean;
  showUnitMeasureColumn?: boolean;
  companyData?: CompanyData;
  onEdit?: () => void;
}

export function TemplatePreview({
  documentType,
  templateStyle = 'CLASSIC',
  fontFamily = 'helvetica',
  fontSize = 12,
  itemSpacing = 1,
  showTotalItems = true,
  thirdPartyIncome = false,
  taxesIncluded = true,
  showDiscountColumn = true,
  showTaxValueColumn = true,
  showTaxPercentageColumn = true,
  showUnitMeasureColumn = true,
  companyData,
  onEdit,
}: TemplatePreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 1;
  const [zoom, setZoom] = useState(100);

  const documentTypeInfo = getDocumentTypeInfo(documentType);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const generateInvoiceHTML = () => {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${documentTypeInfo?.label || documentType}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: ${fontFamily}, Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            font-size: ${fontSize}px;
        }

        .factura-container {
            max-width: 850px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
        }

        .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .logo {
            width: 80px;
            height: 80px;
            background: #1e3a8a;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            border-radius: 5px;
            overflow: hidden;
        }

        .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .logo-text {
            font-size: 24px;
        }

        .logo-subtitle {
            font-size: 10px;
            margin-top: 2px;
        }

        .company-info {
            text-align: center;
        }

        .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .company-details {
            font-size: 11px;
            line-height: 1.4;
        }

        .invoice-info {
            text-align: right;
        }

        .invoice-title {
            font-size: 14px;
            margin-bottom: 5px;
        }

        .invoice-number {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .invoice-status {
            font-size: 11px;
        }

        .client-section {
            background: #e5e7eb;
            padding: 15px;
            margin-bottom: 20px;
        }

        .client-row {
            display: grid;
            grid-template-columns: 150px 1fr 150px 1fr;
            gap: 10px;
            margin-bottom: 10px;
        }

        .client-label {
            font-weight: bold;
            font-size: 12px;
        }

        .client-value {
            font-size: 12px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        thead {
            background: #9ca3af;
            color: white;
        }

        th {
            padding: 12px 8px;
            text-align: left;
            font-size: 12px;
            font-weight: bold;
        }

        td {
            padding: ${12 + itemSpacing * 2}px 8px;
            font-size: ${fontSize}px;
            border-bottom: 1px solid #e5e7eb;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .total-words {
            background: #e5e7eb;
            padding: 10px 15px;
            margin-bottom: 20px;
            font-size: 12px;
        }

        .footer-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
        }

        .qr-section {
            width: 40%;
        }

        .qr-placeholder {
            width: 120px;
            height: 120px;
            background: #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
            font-size: 10px;
            text-align: center;
        }

        .qr-info {
            font-size: 10px;
            line-height: 1.4;
            margin-bottom: 15px;
        }

        .legal-text {
            font-size: 9px;
            line-height: 1.4;
            color: #666;
            margin-top: 10px;
        }

        .totals-section {
            width: 35%;
            text-align: right;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .total-label {
            font-weight: bold;
        }

        .total-value {
            font-weight: bold;
        }

        .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            padding-top: 20px;
        }

        .signature-box {
            width: 45%;
            text-align: center;
        }

        .signature-line {
            border-top: 1px solid #333;
            padding-top: 8px;
            font-size: 11px;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }
            .factura-container {
                box-shadow: none;
                max-width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="factura-container">
        <div class="header">
            <div class="logo-section">
                <div class="logo">
                    ${
                      companyData?.logo_url
                        ? `<img src="${companyData.logo_url}" alt="${
                            companyData?.name || 'Logo'
                          }" />`
                        : `<div class="logo-text">JSR</div><div class="logo-subtitle">SOFTWARE</div>`
                    }
                </div>
            </div>

            <div class="company-info">
                <div class="company-name">${
                  companyData?.name || 'Mi Empresa'
                }</div>
                <div class="company-details">
                    ${companyData?.legal_name || ''}${
      companyData?.nit ? ' - NIT ' + companyData.nit : ''
    }<br>
                    ${companyData?.address || ''}<br>
                    ${companyData?.phone ? 'Tel: ' + companyData.phone : ''}<br>
                    ${companyData?.email || ''}${
      companyData?.website ? ' ; ' + companyData.website : ''
    }
                </div>
            </div>

            <div class="invoice-info">
                <div class="invoice-title">${
                  documentTypeInfo?.label || documentType
                }</div>
                <div class="invoice-number">No. 15</div>
                <div class="invoice-status">
                    ${
                      documentType === 'INVOICE'
                        ? 'No responsable de IVA<br>Factura de venta original'
                        : documentType === 'QUOTATION'
                        ? 'Cotización válida por 30 días'
                        : documentType === 'DELIVERY_NOTE'
                        ? 'Remisión de entrega'
                        : documentType === 'TRANSACTION'
                        ? 'Transacción comercial'
                        : documentType === 'PURCHASE_ORDER'
                        ? 'Orden de compra'
                        : ''
                    }
                </div>
            </div>
        </div>

        <div class="client-section">
            <div class="client-row">
                <div class="client-label">${
                  documentType === 'PURCHASE_ORDER' ? 'PROVEEDOR' : 'SEÑOR(ES)'
                }</div>
                <div class="client-value">ORDOÑEZ MORA JUAN JOSE</div>
                <div class="client-label">FECHA DE EXPEDICIÓN</div>
                <div class="client-value">16/05/2025</div>
            </div>
            <div class="client-row">
                <div class="client-label">DIRECCIÓN</div>
                <div class="client-value">Colombia</div>
                <div class="client-label">FECHA DE VENCIMIENTO</div>
                <div class="client-value">16/05/2025</div>
            </div>
            <div class="client-row">
                <div class="client-label">TELÉFONO</div>
                <div class="client-value"></div>
                <div class="client-label">${
                  documentType === 'PURCHASE_ORDER' ? 'NIT' : 'CC'
                }</div>
                <div class="client-value">1058547398</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Ítem</th>
                    ${showUnitMeasureColumn ? '<th>Unidad</th>' : ''}
                    <th class="text-right">Precio</th>
                    <th class="text-center">Cantidad</th>
                    ${
                      showDiscountColumn
                        ? '<th class="text-right">Descuento</th>'
                        : ''
                    }
                    ${
                      showTaxValueColumn
                        ? '<th class="text-right">Impuesto</th>'
                        : ''
                    }
                    <th class="text-right">Total con impuestos</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Power Bank 20,000 MAH Negro<br>PWB-118B - Ref: 120522</td>
                    ${showUnitMeasureColumn ? '<td>Unidad</td>' : ''}
                    <td class="text-right">$65.000</td>
                    <td class="text-center">1</td>
                    ${showDiscountColumn ? '<td class="text-right"></td>' : ''}
                    ${showTaxValueColumn ? '<td class="text-right"></td>' : ''}
                    <td class="text-right">$65.000</td>
                </tr>
            </tbody>
        </table>

        <div class="total-words">
            Sesenta y cinco mil pesos
        </div>

        <div class="footer-section">
            <div class="qr-section">
                <div class="qr-placeholder">QR factura legal</div>
                <div class="qr-info">
                    Moneda: COP<br>
                    Tipo: ${documentTypeInfo?.label || documentType}<br>
                    Fecha y hora de expedición: 2025-05-16T17:52:37<br>
                    Forma de pago: Contado<br>
                    Medio de pago: Transferencia débito
                </div>
                <div class="legal-text">
                    Esta factura se asimila en todos sus efectos a una letra de cambio de
                    conformidad con el Art. 774 del código de comercio. Autorizo que en
                    caso de incumplimiento de esta obligación sea reportado a las
                    centrales de riesgo, se cobrarán intereses por mora.
                </div>
            </div>

            <div class="totals-section">
                <div class="total-row">
                    <span class="total-label">Subtotal</span>
                    <span class="total-value">$65.000</span>
                </div>
                <div class="total-row">
                    <span class="total-label">Total</span>
                    <span class="total-value">$65.000</span>
                </div>
                ${
                  showTotalItems
                    ? '<div class="total-row"><span>Total de ítems: 1</span></div>'
                    : ''
                }
            </div>
        </div>

        <div class="signatures">
            <div class="signature-box">
                <div class="signature-line">ELABORADO POR</div>
            </div>
            <div class="signature-box">
                <div class="signature-line">ACEPTADA, FIRMA Y/O SELLO Y FECHA</div>
            </div>
        </div>
    </div>

    <script>
        function imprimirFactura() {
            window.print();
        }
    </script>
</body>
</html>`;

    return html;
  };

  const handlePrint = () => {
    const html = generateInvoiceHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <CardTitle className="text-xl font-bold">
          {documentTypeInfo?.label || documentType}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
        <Button variant="ghost" size="sm">
          <FileText className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[60px] text-center">
          {zoom}%
        </span>
        <Button variant="ghost" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1 ml-4">
          <Button variant="ghost" size="sm" onClick={handlePreviousPage}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            {currentPage} de {totalPages}
          </span>
          <Button variant="ghost" size="sm" onClick={handleNextPage}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="sm">
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Type className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Image className="h-4 w-4" />
        </Button>
      </div>

      {/* Document Preview */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div
            className="bg-white border-2 border-gray-300 mx-auto"
            style={{
              width: '210mm',
              minHeight: '297mm',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              marginBottom: `${(zoom - 100) * 2}px`,
            }}
          >
            {/* Document Content - HTML Structure */}
            <div
              className="p-0"
              style={{
                fontFamily:
                  fontFamily === 'helvetica'
                    ? 'Helvetica, Arial, sans-serif'
                    : fontFamily === 'arial'
                    ? 'Arial, sans-serif'
                    : fontFamily === 'times'
                    ? 'Times New Roman, serif'
                    : fontFamily === 'courier'
                    ? 'Courier New, monospace'
                    : fontFamily === 'verdana'
                    ? 'Verdana, sans-serif'
                    : fontFamily === 'georgia'
                    ? 'Georgia, serif'
                    : 'Arial, sans-serif',
                fontSize: `${fontSize}px`,
              }}
            >
              <div
                className="max-w-4xl mx-auto bg-white"
                style={{
                  fontFamily:
                    fontFamily === 'helvetica'
                      ? 'Helvetica, Arial, sans-serif'
                      : fontFamily === 'arial'
                      ? 'Arial, sans-serif'
                      : fontFamily === 'times'
                      ? 'Times New Roman, serif'
                      : fontFamily === 'courier'
                      ? 'Courier New, monospace'
                      : fontFamily === 'verdana'
                      ? 'Verdana, sans-serif'
                      : fontFamily === 'georgia'
                      ? 'Georgia, serif'
                      : 'Arial, sans-serif',
                  fontSize: `${fontSize}px`,
                  lineHeight: '1.4',
                }}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-8 pb-5 border-b-2 border-gray-800">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-20 h-20 bg-blue-800 text-white flex flex-col items-center justify-center font-bold rounded overflow-hidden"
                      style={{ fontSize: '24px' }}
                    >
                      {companyData?.logo_url ? (
                        <img
                          src={companyData.logo_url}
                          alt={companyData?.name || 'Logo'}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <>
                          <div>JSR</div>
                          <div style={{ fontSize: '10px', marginTop: '2px' }}>
                            SOFTWARE
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-center flex-1">
                    <h1
                      className="font-bold"
                      style={{ fontSize: '18px', marginBottom: '5px' }}
                    >
                      {companyData?.name || 'Mi Empresa'}
                    </h1>
                    <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                      {companyData?.legal_name || ''}
                      {companyData?.nit ? ' - NIT ' + companyData.nit : ''}
                      <br />
                      {companyData?.address || ''}
                      <br />
                      {companyData?.phone ? 'Tel: ' + companyData.phone : ''}
                      <br />
                      {companyData?.email || ''}
                      {companyData?.website ? ' ; ' + companyData.website : ''}
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className="font-bold"
                      style={{ fontSize: '14px', marginBottom: '5px' }}
                    >
                      {documentTypeInfo?.label || documentType}
                    </div>
                    <div
                      className="font-bold"
                      style={{ fontSize: '20px', marginBottom: '5px' }}
                    >
                      No. 15
                    </div>
                    <div style={{ fontSize: '11px' }}>
                      {documentType === 'INVOICE' && (
                        <>
                          No responsable de IVA
                          <br />
                          Factura de venta original
                        </>
                      )}
                      {documentType === 'QUOTATION' && (
                        <>Cotización válida por 30 días</>
                      )}
                      {documentType === 'DELIVERY_NOTE' && (
                        <>Remisión de entrega</>
                      )}
                      {documentType === 'TRANSACTION' && (
                        <>Transacción comercial</>
                      )}
                      {documentType === 'PURCHASE_ORDER' && (
                        <>Orden de compra</>
                      )}
                    </div>
                  </div>
                </div>

                {/* Client Section */}
                <div
                  className="bg-gray-200 p-4 mb-5"
                  style={{ backgroundColor: '#e5e7eb' }}
                >
                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div className="font-bold" style={{ fontSize: '12px' }}>
                      {documentType === 'PURCHASE_ORDER'
                        ? 'PROVEEDOR'
                        : 'SEÑOR(ES)'}
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      ORDOÑEZ MORA JUAN JOSE
                    </div>
                    <div className="font-bold" style={{ fontSize: '12px' }}>
                      FECHA DE EXPEDICIÓN
                    </div>
                    <div style={{ fontSize: '12px' }}>16/05/2025</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div className="font-bold" style={{ fontSize: '12px' }}>
                      DIRECCIÓN
                    </div>
                    <div style={{ fontSize: '12px' }}>Colombia</div>
                    <div className="font-bold" style={{ fontSize: '12px' }}>
                      FECHA DE VENCIMIENTO
                    </div>
                    <div style={{ fontSize: '12px' }}>16/05/2025</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="font-bold" style={{ fontSize: '12px' }}>
                      TELÉFONO
                    </div>
                    <div style={{ fontSize: '12px' }}></div>
                    <div className="font-bold" style={{ fontSize: '12px' }}>
                      {documentType === 'PURCHASE_ORDER' ? 'NIT' : 'CC'}
                    </div>
                    <div style={{ fontSize: '12px' }}>1058547398</div>
                  </div>
                </div>

                {/* Items Table */}
                <table
                  className="w-full border-collapse mb-5"
                  style={{ borderCollapse: 'collapse' }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#9ca3af', color: 'white' }}>
                      <th
                        className="p-3 text-left font-bold"
                        style={{ padding: '12px 8px', fontSize: '12px' }}
                      >
                        Ítem
                      </th>
                      {showUnitMeasureColumn && (
                        <th
                          className="p-3 text-left font-bold"
                          style={{ padding: '12px 8px', fontSize: '12px' }}
                        >
                          Unidad
                        </th>
                      )}
                      <th
                        className="p-3 text-right font-bold"
                        style={{ padding: '12px 8px', fontSize: '12px' }}
                      >
                        Precio
                      </th>
                      <th
                        className="p-3 text-center font-bold"
                        style={{ padding: '12px 8px', fontSize: '12px' }}
                      >
                        Cantidad
                      </th>
                      {showDiscountColumn && (
                        <th
                          className="p-3 text-right font-bold"
                          style={{ padding: '12px 8px', fontSize: '12px' }}
                        >
                          Descuento
                        </th>
                      )}
                      {showTaxValueColumn && (
                        <th
                          className="p-3 text-right font-bold"
                          style={{ padding: '12px 8px', fontSize: '12px' }}
                        >
                          Impuesto
                        </th>
                      )}
                      <th
                        className="p-3 text-right font-bold"
                        style={{ padding: '12px 8px', fontSize: '12px' }}
                      >
                        Total con impuestos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        className="p-3 border-b border-gray-200"
                        style={{
                          padding: `${12 + itemSpacing * 2}px 8px`,
                          fontSize: `${fontSize}px`,
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        Power Bank 20,000 MAH Negro
                        <br />
                        PWB-118B - Ref: 120522
                      </td>
                      {showUnitMeasureColumn && (
                        <td
                          className="p-3 border-b border-gray-200"
                          style={{
                            padding: `${12 + itemSpacing * 2}px 8px`,
                            fontSize: `${fontSize}px`,
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          Unidad
                        </td>
                      )}
                      <td
                        className="p-3 border-b border-gray-200 text-right"
                        style={{
                          padding: `${12 + itemSpacing * 2}px 8px`,
                          fontSize: `${fontSize}px`,
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        $65.000
                      </td>
                      <td
                        className="p-3 border-b border-gray-200 text-center"
                        style={{
                          padding: `${12 + itemSpacing * 2}px 8px`,
                          fontSize: `${fontSize}px`,
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        1
                      </td>
                      {showDiscountColumn && (
                        <td
                          className="p-3 border-b border-gray-200 text-right"
                          style={{
                            padding: `${12 + itemSpacing * 2}px 8px`,
                            fontSize: `${fontSize}px`,
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        ></td>
                      )}
                      {showTaxValueColumn && (
                        <td
                          className="p-3 border-b border-gray-200 text-right"
                          style={{
                            padding: `${12 + itemSpacing * 2}px 8px`,
                            fontSize: `${fontSize}px`,
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        ></td>
                      )}
                      <td
                        className="p-3 border-b border-gray-200 text-right"
                        style={{
                          padding: `${12 + itemSpacing * 2}px 8px`,
                          fontSize: `${fontSize}px`,
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        $65.000
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Amount in Words */}
                <div
                  className="bg-gray-200 p-4 mb-5"
                  style={{
                    backgroundColor: '#e5e7eb',
                    fontSize: '12px',
                  }}
                >
                  Sesenta y cinco mil pesos
                </div>

                {/* Footer Section */}
                <div className="flex justify-between mt-8">
                  <div className="w-2/5">
                    <div
                      className="w-30 h-30 bg-gray-200 flex items-center justify-center mb-3"
                      style={{
                        width: '120px',
                        height: '120px',
                        backgroundColor: '#e5e7eb',
                        fontSize: '10px',
                        textAlign: 'center',
                      }}
                    >
                      QR factura legal
                    </div>
                    <div
                      className="mb-4"
                      style={{ fontSize: '10px', lineHeight: '1.4' }}
                    >
                      Moneda: COP
                      <br />
                      Tipo: {documentTypeInfo?.label || documentType}
                      <br />
                      Fecha y hora de expedición: 2025-05-16T17:52:37
                      <br />
                      Forma de pago: Contado
                      <br />
                      Medio de pago: Transferencia débito
                    </div>
                    <div
                      style={{
                        fontSize: '9px',
                        lineHeight: '1.4',
                        color: '#666',
                      }}
                    >
                      Esta factura se asimila en todos sus efectos a una letra
                      de cambio de conformidad con el Art. 774 del código de
                      comercio. Autorizo que en caso de incumplimiento de esta
                      obligación sea reportado a las centrales de riesgo, se
                      cobrarán intereses por mora.
                    </div>
                  </div>

                  <div className="w-1/3 text-right">
                    <div
                      className="flex justify-between mb-2"
                      style={{ fontSize: '14px' }}
                    >
                      <span className="font-bold">Subtotal</span>
                      <span className="font-bold">$65.000</span>
                    </div>
                    <div
                      className="flex justify-between mb-2"
                      style={{ fontSize: '14px' }}
                    >
                      <span className="font-bold">Total</span>
                      <span className="font-bold">$65.000</span>
                    </div>
                    {showTotalItems && (
                      <div style={{ fontSize: `${fontSize}px` }}>
                        Total de ítems: 1
                      </div>
                    )}
                  </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between mt-16 pt-5">
                  <div className="w-2/5 text-center">
                    <div
                      className="border-t border-gray-800 pt-2"
                      style={{ fontSize: '11px' }}
                    >
                      ELABORADO POR
                    </div>
                  </div>
                  <div className="w-2/5 text-center">
                    <div
                      className="border-t border-gray-800 pt-2"
                      style={{ fontSize: '11px' }}
                    >
                      ACEPTADA, FIRMA Y/O SELLO Y FECHA
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
