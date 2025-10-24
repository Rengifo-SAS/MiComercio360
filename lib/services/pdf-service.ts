import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class PDFService {
  /**
   * Genera un PDF de factura profesional estilo Alegra/Siigo para Colombia
   * Basado en el análisis de factura real de Alegra
   */
  static async generateSalePDF(
    saleData: any,
    companyData: any,
    filename: string,
    options: {
      format?: 'a4' | 'letter' | 'legal' | 'custom';
      orientation?: 'portrait' | 'landscape';
      margin?: number;
      customWidth?: number;
      customHeight?: number;
      logo?: string; // Base64 o URL del logo
      qrCode?: string; // QR para validación DIAN
    } = {}
  ): Promise<void> {
    const {
      format = 'letter',
      orientation = 'portrait',
      margin = 15,
      customWidth = 80,
      customHeight = 200,
      logo = null,
      qrCode = null
    } = options;

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: format === 'custom' ? [customWidth, customHeight] : format,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;

    // Colores (estilo Alegra - minimalista y profesional)
    const darkGray: [number, number, number] = [70, 70, 70];
    const mediumGray: [number, number, number] = [130, 130, 130];
    const lightGray: [number, number, number] = [240, 240, 240];
    const borderGray: [number, number, number] = [200, 200, 200];

    const checkNewPage = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - margin - 20) {
        this.addFooter(pdf, pageWidth, pageHeight, margin, companyData, saleData);
        pdf.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    try {
      // Validar datos básicos
      if (!saleData) {
        throw new Error('No se proporcionaron datos de la venta');
      }

      if (!companyData) {
        throw new Error('No se proporcionaron datos de la empresa');
      }

      // ==================== SECCIÓN SUPERIOR: EMPRESA Y FACTURA ====================
      const headerHeight = 45;
      const dividerX = pageWidth / 2 + 10;

      // LADO IZQUIERDO: LOGO Y DATOS DE EMPRESA
      let leftY = currentY;

      // Logo de la empresa
      if (logo) {
        try {
          pdf.addImage(logo, 'PNG', margin, leftY, 35, 20);
          leftY += 22;
        } catch (e) {
          console.warn('No se pudo cargar el logo');
        }
      } else {
        // Espacio para logo si no existe
        leftY += 5;
      }

      // Nombre de la empresa
      pdf.setTextColor(...darkGray);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(companyData.name || 'NOMBRE DE LA EMPRESA', margin, leftY);
      leftY += 5;

      // Datos de la empresa (compactos)
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');

      // NIT y información fiscal
      if (companyData.tax_id) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`NIT: ${companyData.tax_id}`, margin, leftY);
        leftY += 3.5;
      }

      if (companyData.regimen_tributario) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Régimen: ${companyData.regimen_tributario}`, margin, leftY);
        leftY += 3.5;
      }

      const companyInfo = [
        companyData.address || 'Dirección no especificada',
        [companyData.city, companyData.state].filter(Boolean).join(', ') || 'Ciudad no especificada',
        companyData.phone ? `Tel: ${companyData.phone}` : null,
        companyData.email || null
      ].filter(Boolean);

      companyInfo.forEach(info => {
        pdf.setFont('helvetica', 'normal');
        pdf.text(info, margin, leftY);
        leftY += 3.5;
      });

      // LADO DERECHO: BOX DE FACTURA (estilo Alegra)
      const boxWidth = 75;
      const boxX = pageWidth - margin - boxWidth;
      let boxY = currentY;

      // Fondo gris claro para el box
      pdf.setFillColor(...lightGray);
      pdf.setDrawColor(...borderGray);
      pdf.setLineWidth(0.3);
      pdf.rect(boxX, boxY, boxWidth, 40, 'FD');

      boxY += 5;

      // "Factura de venta" centrado
      pdf.setTextColor(...darkGray);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Factura de venta', boxX + boxWidth / 2, boxY, { align: 'center' });
      boxY += 6;

      // Número de factura destacado
      pdf.setFontSize(14);
      pdf.text(`No. ${saleData.sale_number || '0000'}`, boxX + boxWidth / 2, boxY, { align: 'center' });
      boxY += 7;

      // Información adicional en el box
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');

      // Manejar fechas con validación
      const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        try {
          return new Date(dateString).toLocaleDateString('es-CO');
        } catch (e) {
          return 'N/A';
        }
      };

      const boxInfo = [
        { label: 'Fecha de expedición:', value: formatDate(saleData.created_at) },
        { label: 'Fecha de vencimiento:', value: formatDate(saleData.due_date || saleData.created_at) }
      ];

      boxInfo.forEach(info => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(info.label, boxX + 2, boxY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(info.value, boxX + boxWidth - 2, boxY, { align: 'right' });
        boxY += 4;
      });

      currentY = Math.max(leftY, boxY) + 8;

      // ==================== INFORMACIÓN DEL CLIENTE ====================
      // Header gris para "Cliente"
      pdf.setFillColor(...lightGray);
      pdf.rect(margin, currentY, contentWidth, 6, 'F');

      pdf.setTextColor(...darkGray);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Cliente', margin + 2, currentY + 4);

      // Número de cliente/documento alineado a la derecha
      const customer = saleData.customer;
      const customerDoc = customer?.identification_number || '22222222-2';
      const customerType = customer?.identification_type || 'CC';
      pdf.text(`${customerType}: ${customerDoc}`, pageWidth - margin - 2, currentY + 4, { align: 'right' });

      currentY += 8;

      // Datos del cliente en tabla compacta
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');

      if (customer) {
        const clientData = [
          { label: 'Nombre:', value: customer.business_name || customer.name || 'N/A' },
          { label: 'Identificación:', value: `${customer.identification_type || 'CC'} ${customerDoc}` },
          { label: 'Dirección:', value: customer.address || 'N/A' },
          { label: 'Teléfono:', value: customer.phone || 'N/A' },
          { label: 'Email:', value: customer.email || 'N/A' }
        ];

        // Disposición en 2 columnas
        const col1 = clientData.slice(0, 3);
        const col2 = clientData.slice(3);
        const colWidth = contentWidth / 2;

        col1.forEach((item, idx) => {
          pdf.setFont('helvetica', 'bold');
          pdf.text(item.label, margin, currentY + (idx * 4));
          pdf.setFont('helvetica', 'normal');
          pdf.text(item.value, margin + 25, currentY + (idx * 4));
        });

        col2.forEach((item, idx) => {
          pdf.setFont('helvetica', 'bold');
          pdf.text(item.label, margin + colWidth, currentY + (idx * 4));
          pdf.setFont('helvetica', 'normal');
          pdf.text(item.value, margin + colWidth + 25, currentY + (idx * 4));
        });

        currentY += Math.max(col1.length, col2.length) * 4 + 5;
      } else {
        pdf.text('Consumidor Final', margin, currentY);
        currentY += 8;
      }

      // ==================== TABLA DE PRODUCTOS ====================
      checkNewPage(80);

      // Header de tabla (estilo Alegra - simple y limpio)
      pdf.setFillColor(...lightGray);
      pdf.rect(margin, currentY, contentWidth, 6, 'F');

      pdf.setTextColor(...darkGray);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Ítem', margin + 2, currentY + 4);

      currentY += 8;

      // Preparar datos de tabla (estilo Alegra - minimalista)
      const tableData = (saleData.items && saleData.items.length > 0)
        ? saleData.items.map((item: any, index: number) => {
          const itemSubtotal = item.quantity * item.unit_price;
          const discount = item.discount_amount || 0;
          const itemTotal = itemSubtotal - discount;

          // Obtener nombre del producto desde la relación o datos directos
          let productName = 'Producto/Servicio';
          if (item.product && item.product.name) {
            productName = item.product.name;
          } else if (item.product_name) {
            productName = item.product_name;
          } else if (item.description) {
            productName = item.description;
          }

          // Agregar SKU si está disponible
          const sku = item.product?.sku || item.sku;
          const productDisplay = sku ? `${productName}\nSKU: ${sku}` : productName;

          return [
            productDisplay,
            this.formatCurrency(item.unit_price),
            item.quantity.toString(),
            discount > 0 ? this.formatCurrency(discount) : '-',
            this.formatCurrency(itemTotal)
          ];
        })
        : [[{
          content: 'No hay productos en esta factura',
          colSpan: 5,
          styles: { halign: 'center', fontStyle: 'italic' }
        }]];

      autoTable(pdf, {
        startY: currentY,
        head: [['Descripción', 'Precio', 'Cantidad', 'Descuento', 'Total']],
        body: tableData,
        margin: { left: margin, right: margin },
        theme: 'plain',
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
          textColor: darkGray,
          lineColor: borderGray,
          lineWidth: { bottom: 0.1 }
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: darkGray,
          fontStyle: 'bold',
          lineWidth: { bottom: 0.3 },
          lineColor: darkGray
        },
        bodyStyles: {
          lineWidth: { bottom: 0.1 },
          lineColor: borderGray
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 28, halign: 'right' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        }
      });

      const lastTable: any = (pdf as any).lastAutoTable;
      currentY = lastTable?.finalY ? lastTable.finalY + 5 : currentY + 5;

      // ==================== SECCIÓN DE TOTALES (Estilo Alegra) ====================
      checkNewPage(50);

      const totalsBoxWidth = 65;
      const totalsX = pageWidth - margin - totalsBoxWidth;
      const labelX = totalsX + 2;
      const valueX = pageWidth - margin - 2;

      // Fondo gris claro para totales
      const totalsHeight = 45;
      pdf.setFillColor(...lightGray);
      pdf.rect(totalsX, currentY, totalsBoxWidth, totalsHeight, 'F');

      currentY += 5;

      // Líneas de totales
      pdf.setFontSize(8.5);
      pdf.setTextColor(...darkGray);

      const totalsData = [
        { label: 'Subtotal', value: this.formatCurrency(saleData.subtotal || 0) }
      ];

      if (saleData.discount_amount && saleData.discount_amount > 0) {
        totalsData.push({
          label: 'Descuento',
          value: `-${this.formatCurrency(saleData.discount_amount)}`
        });
      }

      // Mostrar impuestos si existen
      if (saleData.tax_amount && saleData.tax_amount > 0) {
        totalsData.push({
          label: 'Impuestos',
          value: this.formatCurrency(saleData.tax_amount)
        });
      }

      if (saleData.iva_amount && saleData.iva_amount > 0) {
        totalsData.push({
          label: 'IVA',
          value: this.formatCurrency(saleData.iva_amount)
        });
      }

      if (saleData.ica_amount && saleData.ica_amount > 0) {
        totalsData.push({
          label: 'ICA',
          value: this.formatCurrency(saleData.ica_amount)
        });
      }

      if (saleData.retencion_amount && saleData.retencion_amount > 0) {
        totalsData.push({
          label: 'Retención',
          value: `-${this.formatCurrency(saleData.retencion_amount)}`
        });
      }

      // Renderizar subtotales
      totalsData.forEach(item => {
        pdf.setFont('helvetica', 'normal');
        pdf.text(item.label, labelX, currentY);
        pdf.text(item.value, valueX, currentY, { align: 'right' });
        currentY += 5;
      });

      // Línea separadora antes del total
      pdf.setDrawColor(...borderGray);
      pdf.setLineWidth(0.3);
      pdf.line(totalsX + 2, currentY, valueX, currentY);
      currentY += 5;

      // TOTAL FINAL (destacado)
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total', labelX, currentY);
      pdf.text(this.formatCurrency(saleData.total_amount || 0), valueX, currentY, { align: 'right' });

      currentY += 15;

      // ==================== QR CODE Y METADATOS ====================
      checkNewPage(50);

      const qrSize = 35;
      const qrX = margin;
      const qrY = currentY + 5;

      // QR Code (si existe)
      if (qrCode) {
        try {
          pdf.addImage(qrCode, 'PNG', qrX, qrY, qrSize, qrSize);
        } catch (e) {
          console.warn('No se pudo cargar el QR');
        }
      }

      // Metadatos junto al QR (estilo Alegra)
      const metaX = qrX + qrSize + 5;
      let metaY = qrY + 3;

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...mediumGray);

      const metadata = [
        `Moneda: COP`,
        `Fecha y hora de expedición: ${formatDate(saleData.created_at)}`,
        `Fecha y hora de validación: ${new Date().toLocaleString('es-CO')}`,
        `Forma de pago: ${this.getPaymentMethodLabel(saleData.payment_method)}`,
        `Medio de pago: ${this.getPaymentMethodLabel(saleData.payment_method)}`
      ];

      metadata.forEach(text => {
        pdf.text(text, metaX, metaY);
        metaY += 3.5;
      });

      currentY = qrY + qrSize + 10;

      // ==================== INFORMACIÓN LEGAL ====================
      checkNewPage(25);

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...mediumGray);

      const legalText = `Este documento se asimila en todos sus efectos a una letra de cambio de conformidad con el Art. 774 del código de comercio. Autorizo que en caso de incumplimiento de esta obligación sea reportado a las centrales de riesgo, se cobrarán intereses por mora.`;

      const legalLines = pdf.splitTextToSize(legalText, contentWidth);
      pdf.text(legalLines, margin, currentY);
      currentY += legalLines.length * 3 + 8;

      // ==================== FIRMAS (Estilo minimalista) ====================
      checkNewPage(25);

      const sigWidth = 60;
      const sigGap = 20;
      const sig1X = margin + 10;
      const sig2X = pageWidth - margin - sigWidth - 10;

      // Líneas de firma
      pdf.setDrawColor(...darkGray);
      pdf.setLineWidth(0.3);
      pdf.line(sig1X, currentY, sig1X + sigWidth, currentY);
      pdf.line(sig2X, currentY, sig2X + sigWidth, currentY);
      currentY += 4;

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkGray);
      pdf.text('ELABORADOR', sig1X + sigWidth / 2, currentY, { align: 'center' });
      pdf.text('ACEPTADA, FIRMA Y/O SELLO Y FECHA', sig2X + sigWidth / 2, currentY, { align: 'center' });

      // ==================== PIE DE PÁGINA ====================
      this.addFooter(pdf, pageWidth, pageHeight, margin, companyData, saleData);

      // Guardar PDF
      pdf.save(filename);

    } catch (error) {
      console.error('Error generando PDF estilo Alegra:', error);

      // Proporcionar información más específica del error
      let errorMessage = 'No se pudo generar el PDF de la factura';

      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Agrega pie de página estilo Alegra
   */
  private static addFooter(
    pdf: jsPDF,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    companyData: any,
    saleData: any
  ): void {
    const footerY = pageHeight - 8;

    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);

    // Texto legal en el margen derecho (sin rotación por compatibilidad)
    const rightText = `Autorización de numeración de facturación No ${saleData.dian_authorization || 'N/A'} de ${new Date().getFullYear()} vigencia hasta ${new Date().getFullYear() + 2}`;
    pdf.text(rightText, pageWidth - 5, footerY - 5, { align: 'right' });

    // Footer inferior centrado
    const footerText = `Factura electrónica generada por ${companyData.name || 'Sistema'}`;
    pdf.text(footerText, pageWidth / 2, footerY, { align: 'center' });
  }

  /**
   * Obtiene la etiqueta del método de pago
   */
  private static getPaymentMethodLabel(method: string): string {
    const methods: { [key: string]: string } = {
      'cash': 'Contado',
      'credit': 'Crédito',
      'transfer': 'Transferencia',
      'card': 'Tarjeta'
    };
    return methods[method] || 'Contado';
  }

  /**
   * Formatea valores monetarios
   */
  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Genera un PDF de factura como buffer para envío por correo
   */
  static async generateSalePDFBuffer(
    saleData: any,
    companyData: any,
    options: {
      format?: 'a4' | 'letter' | 'legal' | 'custom';
      orientation?: 'portrait' | 'landscape';
      margin?: number;
      customWidth?: number;
      customHeight?: number;
      logo?: string; // Base64 o URL del logo
      qrCode?: string; // QR para validación DIAN
    } = {}
  ): Promise<Buffer> {
    const {
      format = 'letter',
      orientation = 'portrait',
      margin = 15,
      customWidth = 80,
      customHeight = 200,
      logo = null,
      qrCode = null
    } = options;

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: format === 'custom' ? [customWidth, customHeight] : format,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;

    // Colores (estilo Alegra - minimalista y profesional)
    const darkGray: [number, number, number] = [70, 70, 70];
    const mediumGray: [number, number, number] = [130, 130, 130];
    const lightGray: [number, number, number] = [240, 240, 240];
    const borderGray: [number, number, number] = [200, 200, 200];

    const checkNewPage = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - margin - 20) {
        this.addFooter(pdf, pageWidth, pageHeight, margin, companyData, saleData);
        pdf.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    try {
      // Validar datos básicos
      if (!saleData) {
        throw new Error('No se proporcionaron datos de la venta');
      }

      if (!companyData) {
        throw new Error('No se proporcionaron datos de la empresa');
      }

      // ==================== SECCIÓN SUPERIOR: EMPRESA Y FACTURA ====================
      const headerHeight = 45;
      const dividerX = pageWidth / 2 + 10;

      // LADO IZQUIERDO: LOGO Y DATOS DE EMPRESA
      let leftY = currentY;

      // Logo de la empresa
      if (logo) {
        try {
          pdf.addImage(logo, 'PNG', margin, leftY, 35, 20);
          leftY += 22;
        } catch (e) {
          console.warn('No se pudo cargar el logo');
        }
      } else {
        // Espacio para logo si no existe
        leftY += 5;
      }

      // Nombre de la empresa
      pdf.setTextColor(...darkGray);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(companyData.name || 'NOMBRE DE LA EMPRESA', margin, leftY);
      leftY += 5;

      // Datos de la empresa (compactos)
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');

      // NIT y información fiscal
      if (companyData.tax_id) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`NIT: ${companyData.tax_id}`, margin, leftY);
        leftY += 3.5;
      }

      if (companyData.regimen_tributario) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Régimen: ${companyData.regimen_tributario}`, margin, leftY);
        leftY += 3.5;
      }

      const companyInfo = [
        companyData.address || 'Dirección no especificada',
        [companyData.city, companyData.state].filter(Boolean).join(', ') || 'Ciudad no especificada',
        companyData.phone ? `Tel: ${companyData.phone}` : null,
        companyData.email || null
      ].filter(Boolean);

      companyInfo.forEach(info => {
        pdf.setFont('helvetica', 'normal');
        pdf.text(info, margin, leftY);
        leftY += 3.5;
      });

      // LADO DERECHO: BOX DE FACTURA (estilo Alegra)
      const boxWidth = 75;
      const boxX = pageWidth - margin - boxWidth;
      let boxY = currentY;

      // Fondo gris claro para el box
      pdf.setFillColor(...lightGray);
      pdf.setDrawColor(...borderGray);
      pdf.setLineWidth(0.3);
      pdf.rect(boxX, boxY, boxWidth, 40, 'FD');

      boxY += 5;

      // "Factura de venta" centrado
      pdf.setTextColor(...darkGray);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Factura de venta', boxX + boxWidth / 2, boxY, { align: 'center' });
      boxY += 6;

      // Número de factura destacado
      pdf.setFontSize(14);
      pdf.text(`No. ${saleData.sale_number || '0000'}`, boxX + boxWidth / 2, boxY, { align: 'center' });
      boxY += 7;

      // Información adicional en el box
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');

      // Manejar fechas con validación
      const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        try {
          return new Date(dateString).toLocaleDateString('es-CO');
        } catch (e) {
          return 'N/A';
        }
      };

      const boxInfo = [
        { label: 'Fecha de expedición:', value: formatDate(saleData.created_at) },
        { label: 'Fecha de vencimiento:', value: formatDate(saleData.due_date || saleData.created_at) }
      ];

      boxInfo.forEach(info => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(info.label, boxX + 2, boxY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(info.value, boxX + boxWidth - 2, boxY, { align: 'right' });
        boxY += 4;
      });

      currentY = Math.max(leftY, boxY) + 8;

      // ==================== INFORMACIÓN DEL CLIENTE ====================
      // Header gris para "Cliente"
      pdf.setFillColor(...lightGray);
      pdf.rect(margin, currentY, contentWidth, 6, 'F');

      pdf.setTextColor(...darkGray);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Cliente', margin + 2, currentY + 4);

      // Número de cliente/documento alineado a la derecha
      const customer = saleData.customer;
      const customerDoc = customer?.identification_number || '22222222-2';
      const customerType = customer?.identification_type || 'CC';
      pdf.text(`${customerType}: ${customerDoc}`, pageWidth - margin - 2, currentY + 4, { align: 'right' });

      currentY += 8;

      // Datos del cliente en tabla compacta
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');

      if (customer) {
        const clientData = [
          { label: 'Nombre:', value: customer.business_name || customer.name || 'N/A' },
          { label: 'Identificación:', value: `${customer.identification_type || 'CC'} ${customerDoc}` },
          { label: 'Dirección:', value: customer.address || 'N/A' },
          { label: 'Teléfono:', value: customer.phone || 'N/A' },
          { label: 'Email:', value: customer.email || 'N/A' }
        ];

        // Disposición en 2 columnas
        const col1 = clientData.slice(0, 3);
        const col2 = clientData.slice(3);
        const colWidth = contentWidth / 2;

        col1.forEach((item, idx) => {
          pdf.setFont('helvetica', 'bold');
          pdf.text(item.label, margin, currentY + (idx * 4));
          pdf.setFont('helvetica', 'normal');
          pdf.text(item.value, margin + 25, currentY + (idx * 4));
        });

        col2.forEach((item, idx) => {
          pdf.setFont('helvetica', 'bold');
          pdf.text(item.label, margin + colWidth, currentY + (idx * 4));
          pdf.setFont('helvetica', 'normal');
          pdf.text(item.value, margin + colWidth + 25, currentY + (idx * 4));
        });

        currentY += Math.max(col1.length, col2.length) * 4 + 5;
      } else {
        pdf.text('Consumidor Final', margin, currentY);
        currentY += 8;
      }

      // ==================== TABLA DE PRODUCTOS ====================
      checkNewPage(80);

      // Header de tabla (estilo Alegra - simple y limpio)
      pdf.setFillColor(...lightGray);
      pdf.rect(margin, currentY, contentWidth, 6, 'F');

      pdf.setTextColor(...darkGray);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Ítem', margin + 2, currentY + 4);

      currentY += 8;

      // Preparar datos de tabla (estilo Alegra - minimalista)
      const tableData = (saleData.items && saleData.items.length > 0)
        ? saleData.items.map((item: any, index: number) => {
          const itemSubtotal = item.quantity * item.unit_price;
          const discount = item.discount_amount || 0;
          const itemTotal = itemSubtotal - discount;

          // Obtener nombre del producto desde la relación o datos directos
          let productName = 'Producto/Servicio';
          if (item.product && item.product.name) {
            productName = item.product.name;
          } else if (item.product_name) {
            productName = item.product_name;
          } else if (item.description) {
            productName = item.description;
          }

          // Agregar SKU si está disponible
          const sku = item.product?.sku || item.sku;
          const productDisplay = sku ? `${productName}\nSKU: ${sku}` : productName;

          return [
            productDisplay,
            this.formatCurrency(item.unit_price),
            item.quantity.toString(),
            discount > 0 ? this.formatCurrency(discount) : '-',
            this.formatCurrency(itemTotal)
          ];
        })
        : [[{
          content: 'No hay productos en esta factura',
          colSpan: 5,
          styles: { halign: 'center', fontStyle: 'italic' }
        }]];

      autoTable(pdf, {
        startY: currentY,
        head: [['Descripción', 'Precio', 'Cantidad', 'Descuento', 'Total']],
        body: tableData,
        margin: { left: margin, right: margin },
        theme: 'plain',
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
          textColor: darkGray,
          lineColor: borderGray,
          lineWidth: { bottom: 0.1 }
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: darkGray,
          fontStyle: 'bold',
          lineWidth: { bottom: 0.3 },
          lineColor: darkGray
        },
        bodyStyles: {
          lineWidth: { bottom: 0.1 },
          lineColor: borderGray
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 28, halign: 'right' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        }
      });

      const lastTable: any = (pdf as any).lastAutoTable;
      currentY = lastTable?.finalY ? lastTable.finalY + 5 : currentY + 5;

      // ==================== SECCIÓN DE TOTALES (Estilo Alegra) ====================
      checkNewPage(50);

      const totalsBoxWidth = 65;
      const totalsX = pageWidth - margin - totalsBoxWidth;
      const labelX = totalsX + 2;
      const valueX = pageWidth - margin - 2;

      // Fondo gris claro para totales
      const totalsHeight = 45;
      pdf.setFillColor(...lightGray);
      pdf.rect(totalsX, currentY, totalsBoxWidth, totalsHeight, 'F');

      currentY += 5;

      // Líneas de totales
      pdf.setFontSize(8.5);
      pdf.setTextColor(...darkGray);

      const totalsData = [
        { label: 'Subtotal', value: this.formatCurrency(saleData.subtotal || 0) }
      ];

      if (saleData.discount_amount && saleData.discount_amount > 0) {
        totalsData.push({
          label: 'Descuento',
          value: `-${this.formatCurrency(saleData.discount_amount)}`
        });
      }

      // Mostrar impuestos si existen
      if (saleData.tax_amount && saleData.tax_amount > 0) {
        totalsData.push({
          label: 'Impuestos',
          value: this.formatCurrency(saleData.tax_amount)
        });
      }

      if (saleData.iva_amount && saleData.iva_amount > 0) {
        totalsData.push({
          label: 'IVA',
          value: this.formatCurrency(saleData.iva_amount)
        });
      }

      if (saleData.ica_amount && saleData.ica_amount > 0) {
        totalsData.push({
          label: 'ICA',
          value: this.formatCurrency(saleData.ica_amount)
        });
      }

      if (saleData.retencion_amount && saleData.retencion_amount > 0) {
        totalsData.push({
          label: 'Retención',
          value: `-${this.formatCurrency(saleData.retencion_amount)}`
        });
      }

      // Renderizar subtotales
      totalsData.forEach(item => {
        pdf.setFont('helvetica', 'normal');
        pdf.text(item.label, labelX, currentY);
        pdf.text(item.value, valueX, currentY, { align: 'right' });
        currentY += 5;
      });

      // Línea separadora antes del total
      pdf.setDrawColor(...borderGray);
      pdf.setLineWidth(0.3);
      pdf.line(totalsX + 2, currentY, valueX, currentY);
      currentY += 5;

      // TOTAL FINAL (destacado)
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total', labelX, currentY);
      pdf.text(this.formatCurrency(saleData.total_amount || 0), valueX, currentY, { align: 'right' });

      currentY += 15;

      // ==================== QR CODE Y METADATOS ====================
      checkNewPage(50);

      const qrSize = 35;
      const qrX = margin;
      const qrY = currentY + 5;

      // QR Code (si existe)
      if (qrCode) {
        try {
          pdf.addImage(qrCode, 'PNG', qrX, qrY, qrSize, qrSize);
        } catch (e) {
          console.warn('No se pudo cargar el QR');
        }
      }

      // Metadatos junto al QR (estilo Alegra)
      const metaX = qrX + qrSize + 5;
      let metaY = qrY + 3;

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...mediumGray);

      const metadata = [
        `Moneda: COP`,
        `Fecha y hora de expedición: ${formatDate(saleData.created_at)}`,
        `Fecha y hora de validación: ${new Date().toLocaleString('es-CO')}`,
        `Forma de pago: ${this.getPaymentMethodLabel(saleData.payment_method)}`,
        `Medio de pago: ${this.getPaymentMethodLabel(saleData.payment_method)}`
      ];

      metadata.forEach(text => {
        pdf.text(text, metaX, metaY);
        metaY += 3.5;
      });

      currentY = qrY + qrSize + 10;

      // ==================== INFORMACIÓN LEGAL ====================
      checkNewPage(25);

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...mediumGray);

      const legalText = `Este documento se asimila en todos sus efectos a una letra de cambio de conformidad con el Art. 774 del código de comercio. Autorizo que en caso de incumplimiento de esta obligación sea reportado a las centrales de riesgo, se cobrarán intereses por mora.`;

      const legalLines = pdf.splitTextToSize(legalText, contentWidth);
      pdf.text(legalLines, margin, currentY);
      currentY += legalLines.length * 3 + 8;

      // ==================== FIRMAS (Estilo minimalista) ====================
      checkNewPage(25);

      const sigWidth = 60;
      const sigGap = 20;
      const sig1X = margin + 10;
      const sig2X = pageWidth - margin - sigWidth - 10;

      // Líneas de firma
      pdf.setDrawColor(...darkGray);
      pdf.setLineWidth(0.3);
      pdf.line(sig1X, currentY, sig1X + sigWidth, currentY);
      pdf.line(sig2X, currentY, sig2X + sigWidth, currentY);
      currentY += 4;

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkGray);
      pdf.text('ELABORADOR', sig1X + sigWidth / 2, currentY, { align: 'center' });
      pdf.text('ACEPTADA, FIRMA Y/O SELLO Y FECHA', sig2X + sigWidth / 2, currentY, { align: 'center' });

      // ==================== PIE DE PÁGINA ====================
      this.addFooter(pdf, pageWidth, pageHeight, margin, companyData, saleData);

      // Retornar el PDF como buffer
      return Buffer.from(pdf.output('arraybuffer'));

    } catch (error) {
      console.error('Error generando PDF buffer:', error);

      // Proporcionar información más específica del error
      let errorMessage = 'No se pudo generar el PDF de la factura';

      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Convierte números a palabras en español (completo)
   */
  private static numberToWords(num: number): string {
    if (num === 0) return 'CERO';

    const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const twenties = ['VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
    const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n === 100) return 'CIEN';

      let result = '';
      const h = Math.floor(n / 100);
      const remainder = n % 100;

      if (h > 0) {
        result += hundreds[h];
        if (remainder > 0) result += ' ';
      }

      if (remainder >= 10 && remainder < 20) {
        result += teens[remainder - 10];
      } else if (remainder >= 20 && remainder < 30) {
        result += twenties[remainder - 20];
      } else if (remainder >= 30) {
        const t = Math.floor(remainder / 10);
        const u = remainder % 10;
        result += tens[t];
        if (u > 0) result += ' Y ' + units[u];
      } else if (remainder > 0) {
        result += units[remainder];
      }

      return result;
    };

    const floorNum = Math.floor(num);

    if (floorNum >= 1000000) {
      const millions = Math.floor(floorNum / 1000000);
      const remainder = floorNum % 1000000;
      let result = millions === 1 ? 'UN MILLÓN' : convertLessThanThousand(millions) + ' MILLONES';
      if (remainder > 0) result += ' ' + this.numberToWords(remainder);
      return result;
    }

    if (floorNum >= 1000) {
      const thousands = Math.floor(floorNum / 1000);
      const remainder = floorNum % 1000;
      let result = thousands === 1 ? 'MIL' : convertLessThanThousand(thousands) + ' MIL';
      if (remainder > 0) result += ' ' + convertLessThanThousand(remainder);
      return result;
    }

    return convertLessThanThousand(floorNum);
  }
}