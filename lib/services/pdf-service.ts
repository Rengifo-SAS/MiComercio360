import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class PDFService {
  /**
   * Genera un PDF de factura de venta profesional
   * Basado en el diseño proporcionado
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
      margin = 19.05, // 0.75in en mm
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
    const ITEMS_POR_PAGINA = 12;

    // Colores
    const black: [number, number, number] = [0, 0, 0];
    const lightGray: [number, number, number] = [240, 240, 240];
    const borderGray: [number, number, number] = [200, 200, 200];

    let currentY = margin;

    // Función para verificar si se necesita nueva página
    const checkNewPage = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - margin - 20) {
        pdf.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    // Formatear fecha: DD-MM-YYYY HH:MM:SS AM/PM
    const formatearFecha = (fecha: string | Date) => {
      const date = new Date(fecha);
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const año = date.getFullYear();
      let horas = date.getHours();
      const minutos = String(date.getMinutes()).padStart(2, '0');
      const segundos = String(date.getSeconds()).padStart(2, '0');
      const ampm = horas >= 12 ? 'PM' : 'AM';
      horas = horas % 12;
      horas = horas ? horas : 12;
      const horasStr = String(horas).padStart(2, '0');
      return `${dia}-${mes}-${año} ${horasStr}:${minutos}:${segundos} ${ampm}`;
    };

    // Calcular totales (igual que en el HTML)
    const calcularTotales = (items: any[]) => {
      let subtotal = 0;
      let totalIva = 0;
      let totalDescuento = 0;

      items.forEach((item: any) => {
        const iva = item.tax?.rate ? parseFloat(String(item.tax.rate)) : 0;
        const valItem = item.total_price || 0;
        const divisor = 1 + iva;
        const baseImponible = divisor !== 0 ? valItem / divisor : valItem;
        subtotal += baseImponible;
        totalIva += valItem - baseImponible;
        totalDescuento += item.discount_amount || 0;
      });

      const total = subtotal + totalIva;
      return {
        valorBruto: subtotal,
        baseImponible: subtotal,
        iva: totalIva,
        descuento: totalDescuento,
        recargo: 0,
        total: total
      };
    };

    try {
      if (!saleData) {
        throw new Error('No se proporcionaron datos de la venta');
      }

      if (!companyData) {
        throw new Error('No se proporcionaron datos de la empresa');
      }

      const items = saleData.items || [];
      const totalPaginas = Math.ceil(items.length / ITEMS_POR_PAGINA);
      const totales = calcularTotales(items);
      currentY = margin;

      for (let pagina = 0; pagina < totalPaginas; pagina++) {
        if (pagina > 0) {
          pdf.addPage();
          currentY = margin;
        }

        const inicio = pagina * ITEMS_POR_PAGINA;
        const fin = Math.min(inicio + ITEMS_POR_PAGINA, items.length);
        const esUltimaPagina = (pagina === totalPaginas - 1);
        const esContinuacion = (pagina > 0);

        // Número de página
        pdf.setFontSize(7); // 9px = 7pt
        pdf.setTextColor(70, 70, 70); // Más oscuro para mejor legibilidad
        pdf.setFont('helvetica', 'normal');
        pdf.text(`página ${pagina + 1} de ${totalPaginas}`, pageWidth - margin, currentY, { align: 'right' });
        currentY += 2.6;

        // HEADER - Estilo Alegra optimizado
        const headerStartY = currentY;
        const dividerX = pageWidth / 2 + 10; // División entre izquierda y derecha
        let leftY = currentY;
        let rightY = currentY;

        // LADO IZQUIERDO: Logo y datos de empresa
        const logoSize = 18; // Logo más pequeño
        const companyLogoUrl = companyData.logo_url || logo;
        let logoLoaded = false;
        
        if (companyLogoUrl) {
          try {
            pdf.addImage(companyLogoUrl, 'PNG', margin, leftY, 35, 18);
            leftY += 20;
            logoLoaded = true;
          } catch (e) {
            console.warn('No se pudo cargar el logo de la empresa:', e);
          }
        } else {
          leftY += 2;
        }

        // Nombre de la empresa
        pdf.setTextColor(...black);
        pdf.setFontSize(9); // 12px = 9pt
        pdf.setFont('helvetica', 'bold');
        const companyName = companyData.name || 'EMPRESA';
        pdf.text(companyName, margin, leftY);
        leftY += 4;

        // Datos de empresa compactos (estilo Alegra)
        pdf.setFontSize(7); // 10px = 7pt
        pdf.setFont('helvetica', 'normal');
        
        // Información fiscal y contacto
        if (companyData.tax_id) {
          const sellerInfo = companyData.business_name 
            ? `${companyData.business_name} - NIT ${companyData.tax_id}`
            : `NIT: ${companyData.tax_id}`;
          pdf.text(sellerInfo, margin, leftY);
          leftY += 3;
        }

        const addressLine = companyData.address || '';
        if (addressLine) {
          pdf.text(addressLine, margin, leftY);
          leftY += 3;
        }

        const cityLine = [
          companyData.city || '',
          companyData.state || ''
        ].filter(Boolean).join(', ');
        if (cityLine) {
          pdf.text(cityLine, margin, leftY);
          leftY += 3;
        }

        if (companyData.phone) {
          pdf.text(`Tel: ${companyData.phone}`, margin, leftY);
          leftY += 3;
        }

        if (companyData.email) {
          pdf.text(companyData.email, margin, leftY);
          leftY += 3;
        }

        // LADO DERECHO: Título y número de factura
        pdf.setTextColor(...black);
        pdf.setFontSize(9); // 12px = 9pt
        pdf.setFont('helvetica', 'bold');
        pdf.text('FACTURA DE VENTA', dividerX, rightY, { align: 'right' });
        rightY += 4;

        pdf.setFontSize(10); // 13px = 10pt
        pdf.setFont('helvetica', 'bold');
        pdf.text(`No. ${saleData.sale_number || saleData.id || '0000'}`, dividerX, rightY, { align: 'right' });
        rightY += 4;

        pdf.setFontSize(7); // 10px = 7pt
        pdf.setFont('helvetica', 'normal');
        if (saleData.dian_authorization) {
          pdf.text(`Res. ${saleData.dian_authorization}`, dividerX, rightY, { align: 'right' });
        }

        // Ajustar currentY según la altura máxima de ambos lados
        currentY = Math.max(leftY, rightY) + 3;

        // Línea divisoria (borde inferior del header)
        pdf.setDrawColor(...black);
        pdf.setLineWidth(0.3);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 4;

        // FECHAS (solo primera página)
        if (pagina === 0) {
          const fechaBoxHeight = 8;
          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.rect(margin, currentY, contentWidth, fechaBoxHeight);

          const fechaWidth = contentWidth / 2;
          pdf.line(margin + fechaWidth, currentY, margin + fechaWidth, currentY + fechaBoxHeight);

          // Fecha expedición
          pdf.setFontSize(7); // 9px = 7pt
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text('Fecha expedición:', margin + 2.65, currentY + 5);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          const fechaExp = formatearFecha(saleData.created_at || saleData.sale_date || new Date());
          pdf.text(fechaExp, margin + fechaWidth / 2, currentY + 5, { align: 'center' });

          // Fecha vencimiento
          pdf.setFontSize(7); // 9px = 7pt
          pdf.setFont('helvetica', 'bold');
          pdf.text('Fecha vencimiento:', margin + fechaWidth + 2.65, currentY + 5);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          const fechaVen = saleData.due_date 
            ? formatearFecha(saleData.due_date)
            : formatearFecha(new Date(saleData.created_at || new Date()));
          pdf.text(fechaVen, margin + fechaWidth + fechaWidth / 2, currentY + 5, { align: 'center' });

          currentY += fechaBoxHeight;
        }

        // DATOS DEL CLIENTE (solo primera página)
        if (pagina === 0) {
          const customer = saleData.customer;
          if (customer) {
            const clienteBoxHeight = 18;
            pdf.setDrawColor(...black);
            pdf.setLineWidth(0.3);
            pdf.rect(margin, currentY, contentWidth, clienteBoxHeight);

            // Primera fila
            pdf.line(margin, currentY + 6, pageWidth - margin, currentY + 6);
            pdf.line(margin + contentWidth / 2, currentY, margin + contentWidth / 2, currentY + 6);

            // Segunda fila
            pdf.line(margin, currentY + 12, pageWidth - margin, currentY + 12);
            pdf.line(margin + contentWidth / 2, currentY + 6, margin + contentWidth / 2, currentY + 12);

            pdf.setFontSize(8); // 10px = 8pt
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...black);

            // CC/NIT
            pdf.text('CC/NIT:', margin + 2.65, currentY + 4.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.identification_number || 'N/A', margin + 15.9, currentY + 4.5);

            // Cliente
            pdf.setFont('helvetica', 'bold');
            pdf.text('Cliente:', margin + contentWidth / 2 + 2.65, currentY + 4.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.business_name || customer.name || 'N/A', margin + contentWidth / 2 + 15.9, currentY + 4.5);

            // Dirección
            pdf.setFont('helvetica', 'bold');
            pdf.text('Dirección:', margin + 2.65, currentY + 10.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.address || 'Sin dirección', margin + 15.9, currentY + 10.5);

            // Municipio
            pdf.setFont('helvetica', 'bold');
            pdf.text('Municipio:', margin + contentWidth / 2 + 2.65, currentY + 10.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.city || 'N/A', margin + contentWidth / 2 + 15.9, currentY + 10.5);

            // Email
            pdf.setFont('helvetica', 'bold');
            pdf.text('Email:', margin + 2.65, currentY + 16.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.email || 'N/A', margin + 15.9, currentY + 16.5);

            currentY += clienteBoxHeight + 5;
          }
        }

        // Tabla de productos
        if (esContinuacion) {
          pdf.setFillColor(...lightGray);
          pdf.rect(margin, currentY, contentWidth, 6, 'F');
          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text('CONTINUACIÓN DE PRODUCTOS', pageWidth / 2, currentY + 4, { align: 'center' });
          currentY += 8;
        }

        // Encabezados de tabla - Anchos en mm directamente (más precisos)
        const tableHeaders = ['#', 'Código', 'Descripción', 'Val. Unit', 'Cantidad', 'Descuento', 'IVA', 'INC', 'Val. Item'];
        // Anchos en mm: #=8, Código=22, Descripción=flexible, Val.Unit=18, Cantidad=12, Descuento=18, IVA=10, INC=10, Val.Item=20
        const colWidths = [8, 22, 0, 18, 12, 18, 10, 10, 20];
        // Calcular ancho de Descripción como el resto
        const totalFixedWidth = colWidths.reduce((sum, w, i) => i !== 2 ? sum + w : sum, 0);
        colWidths[2] = Math.max(30, contentWidth - totalFixedWidth); // Mínimo 30mm para descripción

        pdf.setFillColor(...lightGray);
        pdf.rect(margin, currentY, contentWidth, 6, 'F');

        pdf.setFontSize(8); // 10px = 8pt
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...black);

        let colX = margin;
        tableHeaders.forEach((header, idx) => {
          pdf.text(header, colX + colWidths[idx] / 2, currentY + 4, { align: 'center' });
          if (idx < tableHeaders.length - 1) {
            pdf.setDrawColor(...black);
            pdf.line(colX + colWidths[idx], currentY, colX + colWidths[idx], currentY + 6);
          }
          colX += colWidths[idx];
        });

        pdf.setDrawColor(...black);
        pdf.setLineWidth(0.3);
        pdf.line(margin, currentY, margin, currentY + 6);
        pdf.line(pageWidth - margin, currentY, pageWidth - margin, currentY + 6);
        pdf.line(margin, currentY + 6, pageWidth - margin, currentY + 6);

        currentY += 8;

        // Filas de productos
        for (let i = inicio; i < fin; i++) {
          const item = items[i];
          const itemNum = i + 1;
          const codigo = item.product_reference || item.product?.sku || item.product?.code || item.sku || '';
          const descripcion = item.description || item.product?.name || item.product_name || 'Producto';
          const valUnit = item.unit_price || 0;
          const cantidad = item.quantity || 0;
          const descuento = item.discount_amount || 0;
          const taxRate = item.tax?.rate || 0;
          const iva = taxRate ? (taxRate * 100).toFixed(0) : '0';
          const inc = ''; // Incremento si aplica
          const valItem = item.total_price || (valUnit * cantidad - descuento);

          const rowHeight = 8;
          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.rect(margin, currentY, contentWidth, rowHeight);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);

          colX = margin;
          // # - Asegurar que sea solo el número
          const itemNumStr = String(itemNum); // Solo el número secuencial
          pdf.setFontSize(8);
          pdf.text(itemNumStr, colX + colWidths[0] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[0], currentY, colX + colWidths[0], currentY + rowHeight);
          colX += colWidths[0];

          // Código - truncar correctamente respetando el ancho de columna
          const codigoMaxWidth = colWidths[1] - 3; // Dejar margen interno
          pdf.setFontSize(7); // Tamaño más pequeño para códigos
          // Truncar código usando splitTextToSize
          const codigoLines = pdf.splitTextToSize(codigo, codigoMaxWidth);
          let codigoText = codigoLines[0] || codigo;
          // Si el texto original es más largo, agregar ellipsis si cabe
          if (codigo.length > codigoText.length && codigoText.length > 5) {
            const testEllipsis = pdf.splitTextToSize(codigoText.substring(0, codigoText.length - 3) + '...', codigoMaxWidth);
            if (testEllipsis[0] && testEllipsis[0].length <= codigoMaxWidth) {
              codigoText = codigoText.substring(0, codigoText.length - 3) + '...';
            }
          }
          // Asegurar que el texto no exceda el ancho
          const finalCodigoLines = pdf.splitTextToSize(codigoText, codigoMaxWidth);
          pdf.text(finalCodigoLines[0], colX + 1.5, currentY + 5, { maxWidth: codigoMaxWidth, align: 'left' });
          pdf.setFontSize(8); // Restaurar tamaño normal
          pdf.line(colX + colWidths[1], currentY, colX + colWidths[1], currentY + rowHeight);
          colX += colWidths[1];

          // Descripción - usar splitTextToSize para evitar superposición
          const descMaxWidth = colWidths[2] - 3; // Dejar margen interno
          pdf.setFontSize(8); // Asegurar tamaño correcto
          const descLines = pdf.splitTextToSize(descripcion, descMaxWidth);
          // Solo mostrar la primera línea para mantener altura de fila consistente
          pdf.text(descLines[0] || descripcion.substring(0, 50), colX + 1.5, currentY + 5, { maxWidth: descMaxWidth, align: 'left' });
          pdf.line(colX + colWidths[2], currentY, colX + colWidths[2], currentY + rowHeight);
          colX += colWidths[2];

          // Val. Unit
          const valUnitFormatted = parseFloat(String(valUnit)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text(valUnitFormatted, colX + colWidths[3] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[3], currentY, colX + colWidths[3], currentY + rowHeight);
          colX += colWidths[3];

          // Cantidad
          pdf.text(cantidad.toFixed(2), colX + colWidths[4] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[4], currentY, colX + colWidths[4], currentY + rowHeight);
          colX += colWidths[4];

          // Descuento
          const descuentoFormatted = parseFloat(String(descuento)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text(descuentoFormatted, colX + colWidths[5] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[5], currentY, colX + colWidths[5], currentY + rowHeight);
          colX += colWidths[5];

          // IVA
          pdf.text(`${iva}%`, colX + colWidths[6] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[6], currentY, colX + colWidths[6], currentY + rowHeight);
          colX += colWidths[6];

          // INC
          pdf.text(inc, colX + colWidths[7] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[7], currentY, colX + colWidths[7], currentY + rowHeight);
          colX += colWidths[7];

          // Val. Item
          const valItemFormatted = parseFloat(String(valItem)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text(valItemFormatted, colX + colWidths[8] / 2, currentY + 5, { align: 'center' });

          currentY += rowHeight;
        }

        // Footer solo en última página
        if (esUltimaPagina) {
          currentY += 5;

          // Footer section
          const footerY = currentY;

          // Observaciones (izquierda)
          const totalesWidth = 68.8;
          const observacionesWidth = contentWidth - totalesWidth - 6.6;
          pdf.setFontSize(8); // 11px = 8pt
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text('Observaciones', margin, footerY);

          pdf.setFontSize(7); // 9px = 7pt
          pdf.setFont('helvetica', 'normal');
          const observaciones = saleData.notes || 'Este documento se asimila en todos sus efectos a una letra de cambio de conformidad con el Art. 774 del código de comercio. Autorizo que en caso de incumplimiento de esta obligación sea reportado a las centrales de riesgo, se cobrarán intereses por mora.';
          const obsLines = pdf.splitTextToSize(observaciones, observacionesWidth);
          pdf.text(obsLines, margin, footerY + 5);

          // Totales (derecha)
          const totalesX = pageWidth - margin - totalesWidth;
          const totalesHeight = 40;

          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.rect(totalesX, footerY, totalesWidth, totalesHeight);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);

          let totalY = footerY + 5;
          const totalesData = [
            { label: 'Valor Bruto', value: totales.valorBruto },
            { label: 'Base Imponible', value: totales.baseImponible },
            { label: 'IVA', value: totales.iva },
            { label: 'Descuento global(-)', value: totales.descuento },
            { label: 'Recargo global(+)', value: totales.recargo },
            { label: 'Total Factura', value: totales.total }
          ];

          totalesData.forEach((item, idx) => {
            pdf.text(item.label, totalesX + 2.65, totalY);
            pdf.setFont('helvetica', idx === totalesData.length - 1 ? 'bold' : 'normal');
            const formattedValue = item.value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            pdf.text(`$ ${formattedValue}`, totalesX + totalesWidth - 2.65, totalY, { align: 'right' });
            pdf.setFont('helvetica', 'normal');
            if (idx < totalesData.length - 1) {
              pdf.line(totalesX, totalY + 3, totalesX + totalesWidth, totalY + 3);
            }
            totalY += 5.5;
          });

          currentY = footerY + Math.max(obsLines.length * 4 + 8, totalesHeight) + 5;

          // QR Code y CUFE (si existe)
          if (qrCode || saleData.cufe) {
            const qrY = currentY;
            const qrSize = 35;
            
            if (qrCode) {
              try {
                pdf.addImage(qrCode, 'PNG', margin, qrY, qrSize, qrSize);
              } catch (e) {
                console.warn('No se pudo cargar el QR code');
              }
            }

            if (saleData.cufe) {
              pdf.setFontSize(7); // 9px = 7pt
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(...black);
              const cufeX = qrCode ? margin + qrSize + 5 : margin;
              const cufeY = qrY + 5;
              pdf.text('CUFE:', cufeX, cufeY);
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(6); // 8px = 6pt
              const cufeLines = pdf.splitTextToSize(saleData.cufe, contentWidth - (qrCode ? qrSize + 10 : 0));
              pdf.text(cufeLines, cufeX, cufeY + 4);
              currentY = qrY + Math.max(qrSize, cufeLines.length * 3 + 5) + 5;
            } else {
              currentY = qrY + (qrCode ? qrSize : 0) + 5;
            }
          }

          // Información de pago
          const pagoY = currentY;
          const pagoWidth = (contentWidth - 13.2) / 3;
          const pagoItems = [
            { label: 'Tipo de operación', value: saleData.operation_type || 'Estándar' },
            { label: 'Forma de pago', value: this.getPaymentMethodLabel(saleData.payment_method || 'cash') },
            { label: 'Medio de pago', value: this.getPaymentMethodLabel(saleData.payment_method || 'cash') }
          ];

          pagoItems.forEach((item, idx) => {
            pdf.setFontSize(8); // 10px = 8pt
            pdf.setFont('helvetica', 'bold');
            pdf.text(item.label, margin + idx * (pagoWidth + 6.6), pagoY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(item.value, margin + idx * (pagoWidth + 6.6), pagoY + 4);
          });

          currentY = pagoY + 10;

          // Footer note
          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 5;

          // Verificar si hay espacio antes de agregar footer
          const footerSpace = 15; // Espacio necesario para el footer
          if (currentY + footerSpace > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
          }
          
          pdf.setFontSize(6); // 8px = 6pt
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          const footerNote = [
            `Actividad económica: ${companyData.economic_activity || 'Desarrollo de sistemas informáticos'}`,
            saleData.dian_authorization ? `Autorización de numeración de facturación No ${saleData.dian_authorization} de ${new Date().getFullYear()} vigencia hasta ${new Date().getFullYear() + 2}` : '',
            `Factura electrónica generada por ${companyData.name || 'Sistema'}`
          ].filter(Boolean);
          footerNote.forEach((line, idx) => {
            const lineY = currentY + idx * 3.5; // Reducir espaciado vertical
            if (lineY < pageHeight - margin - 5) {
              pdf.text(line, pageWidth / 2, lineY, { align: 'center' });
            }
          });
        }
      }

      // Guardar PDF
      pdf.save(filename);

    } catch (error) {
      console.error('Error generando PDF de factura:', error);
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
      margin = 19.05, // 0.75in en mm
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
    const ITEMS_POR_PAGINA = 12;

    // Colores
    const black: [number, number, number] = [0, 0, 0];
    const lightGray: [number, number, number] = [240, 240, 240];
    const borderGray: [number, number, number] = [200, 200, 200];

    let currentY = margin;

    // Función para verificar si se necesita nueva página
    const checkNewPage = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - margin - 20) {
        pdf.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    // Formatear fecha: DD-MM-YYYY HH:MM:SS AM/PM
    const formatearFecha = (fecha: string | Date) => {
      const date = new Date(fecha);
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const año = date.getFullYear();
      let horas = date.getHours();
      const minutos = String(date.getMinutes()).padStart(2, '0');
      const segundos = String(date.getSeconds()).padStart(2, '0');
      const ampm = horas >= 12 ? 'PM' : 'AM';
      horas = horas % 12;
      horas = horas ? horas : 12;
      const horasStr = String(horas).padStart(2, '0');
      return `${dia}-${mes}-${año} ${horasStr}:${minutos}:${segundos} ${ampm}`;
    };

    // Calcular totales (igual que en el HTML)
    const calcularTotales = (items: any[]) => {
      let subtotal = 0;
      let totalIva = 0;
      let totalDescuento = 0;

      items.forEach((item: any) => {
        const iva = item.tax?.rate ? parseFloat(String(item.tax.rate)) : 0;
        const valItem = item.total_price || 0;
        const divisor = 1 + iva;
        const baseImponible = divisor !== 0 ? valItem / divisor : valItem;
        subtotal += baseImponible;
        totalIva += valItem - baseImponible;
        totalDescuento += item.discount_amount || 0;
      });

      const total = subtotal + totalIva;
      return {
        valorBruto: subtotal,
        baseImponible: subtotal,
        iva: totalIva,
        descuento: totalDescuento,
        recargo: 0,
        total: total
      };
    };

    try {
      if (!saleData) {
        throw new Error('No se proporcionaron datos de la venta');
      }

      if (!companyData) {
        throw new Error('No se proporcionaron datos de la empresa');
      }

      const items = saleData.items || [];
      const totalPaginas = Math.ceil(items.length / ITEMS_POR_PAGINA);
      const totales = calcularTotales(items);
      currentY = margin;

      for (let pagina = 0; pagina < totalPaginas; pagina++) {
        if (pagina > 0) {
          pdf.addPage();
          currentY = margin;
        }

        const inicio = pagina * ITEMS_POR_PAGINA;
        const fin = Math.min(inicio + ITEMS_POR_PAGINA, items.length);
        const esUltimaPagina = (pagina === totalPaginas - 1);
        const esContinuacion = (pagina > 0);

        // Número de página
        pdf.setFontSize(7); // 9px = 7pt
        pdf.setTextColor(70, 70, 70); // Más oscuro para mejor legibilidad
        pdf.setFont('helvetica', 'normal');
        pdf.text(`página ${pagina + 1} de ${totalPaginas}`, pageWidth - margin, currentY, { align: 'right' });
        currentY += 2.6;

        // HEADER - Estilo Alegra optimizado
        const headerStartY = currentY;
        const dividerX = pageWidth / 2 + 10; // División entre izquierda y derecha
        let leftY = currentY;
        let rightY = currentY;

        // LADO IZQUIERDO: Logo y datos de empresa
        const logoSize = 18; // Logo más pequeño
        const companyLogoUrl = companyData.logo_url || logo;
        let logoLoaded = false;
        
        if (companyLogoUrl) {
          try {
            pdf.addImage(companyLogoUrl, 'PNG', margin, leftY, 35, 18);
            leftY += 20;
            logoLoaded = true;
          } catch (e) {
            console.warn('No se pudo cargar el logo de la empresa:', e);
          }
        } else {
          leftY += 2;
        }

        // Nombre de la empresa
        pdf.setTextColor(...black);
        pdf.setFontSize(9); // 12px = 9pt
        pdf.setFont('helvetica', 'bold');
        const companyName = companyData.name || 'EMPRESA';
        pdf.text(companyName, margin, leftY);
        leftY += 4;

        // Datos de empresa compactos (estilo Alegra)
        pdf.setFontSize(7); // 10px = 7pt
        pdf.setFont('helvetica', 'normal');
        
        // Información fiscal y contacto
        if (companyData.tax_id) {
          const sellerInfo = companyData.business_name 
            ? `${companyData.business_name} - NIT ${companyData.tax_id}`
            : `NIT: ${companyData.tax_id}`;
          pdf.text(sellerInfo, margin, leftY);
          leftY += 3;
        }

        const addressLine = companyData.address || '';
        if (addressLine) {
          pdf.text(addressLine, margin, leftY);
          leftY += 3;
        }

        const cityLine = [
          companyData.city || '',
          companyData.state || ''
        ].filter(Boolean).join(', ');
        if (cityLine) {
          pdf.text(cityLine, margin, leftY);
          leftY += 3;
        }

        if (companyData.phone) {
          pdf.text(`Tel: ${companyData.phone}`, margin, leftY);
          leftY += 3;
        }

        if (companyData.email) {
          pdf.text(companyData.email, margin, leftY);
          leftY += 3;
        }

        // LADO DERECHO: Título y número de factura
        pdf.setTextColor(...black);
        pdf.setFontSize(9); // 12px = 9pt
        pdf.setFont('helvetica', 'bold');
        pdf.text('FACTURA DE VENTA', dividerX, rightY, { align: 'right' });
        rightY += 4;

        pdf.setFontSize(10); // 13px = 10pt
        pdf.setFont('helvetica', 'bold');
        pdf.text(`No. ${saleData.sale_number || saleData.id || '0000'}`, dividerX, rightY, { align: 'right' });
        rightY += 4;

        pdf.setFontSize(7); // 10px = 7pt
        pdf.setFont('helvetica', 'normal');
        if (saleData.dian_authorization) {
          pdf.text(`Res. ${saleData.dian_authorization}`, dividerX, rightY, { align: 'right' });
        }

        // Ajustar currentY según la altura máxima de ambos lados
        currentY = Math.max(leftY, rightY) + 3;

        // Línea divisoria (borde inferior del header)
        pdf.setDrawColor(...black);
        pdf.setLineWidth(0.3);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 4;

        // FECHAS (solo primera página)
        if (pagina === 0) {
          const fechaBoxHeight = 8;
          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.rect(margin, currentY, contentWidth, fechaBoxHeight);

          const fechaWidth = contentWidth / 2;
          pdf.line(margin + fechaWidth, currentY, margin + fechaWidth, currentY + fechaBoxHeight);

          // Fecha expedición
          pdf.setFontSize(7); // 9px = 7pt
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text('Fecha expedición:', margin + 2.65, currentY + 5);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          const fechaExp = formatearFecha(saleData.created_at || saleData.sale_date || new Date());
          pdf.text(fechaExp, margin + fechaWidth / 2, currentY + 5, { align: 'center' });

          // Fecha vencimiento
          pdf.setFontSize(7); // 9px = 7pt
          pdf.setFont('helvetica', 'bold');
          pdf.text('Fecha vencimiento:', margin + fechaWidth + 2.65, currentY + 5);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          const fechaVen = saleData.due_date 
            ? formatearFecha(saleData.due_date)
            : formatearFecha(new Date(saleData.created_at || new Date()));
          pdf.text(fechaVen, margin + fechaWidth + fechaWidth / 2, currentY + 5, { align: 'center' });

          currentY += fechaBoxHeight;
        }

        // DATOS DEL CLIENTE (solo primera página)
        if (pagina === 0) {
          const customer = saleData.customer;
          if (customer) {
            const clienteBoxHeight = 18;
            pdf.setDrawColor(...black);
            pdf.setLineWidth(0.3);
            pdf.rect(margin, currentY, contentWidth, clienteBoxHeight);

            // Primera fila
            pdf.line(margin, currentY + 6, pageWidth - margin, currentY + 6);
            pdf.line(margin + contentWidth / 2, currentY, margin + contentWidth / 2, currentY + 6);

            // Segunda fila
            pdf.line(margin, currentY + 12, pageWidth - margin, currentY + 12);
            pdf.line(margin + contentWidth / 2, currentY + 6, margin + contentWidth / 2, currentY + 12);

            pdf.setFontSize(8); // 10px = 8pt
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...black);

            // CC/NIT
            pdf.text('CC/NIT:', margin + 2.65, currentY + 4.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.identification_number || 'N/A', margin + 15.9, currentY + 4.5);

            // Cliente
            pdf.setFont('helvetica', 'bold');
            pdf.text('Cliente:', margin + contentWidth / 2 + 2.65, currentY + 4.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.business_name || customer.name || 'N/A', margin + contentWidth / 2 + 15.9, currentY + 4.5);

            // Dirección
            pdf.setFont('helvetica', 'bold');
            pdf.text('Dirección:', margin + 2.65, currentY + 10.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.address || 'Sin dirección', margin + 15.9, currentY + 10.5);

            // Municipio
            pdf.setFont('helvetica', 'bold');
            pdf.text('Municipio:', margin + contentWidth / 2 + 2.65, currentY + 10.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.city || 'N/A', margin + contentWidth / 2 + 15.9, currentY + 10.5);

            // Email
            pdf.setFont('helvetica', 'bold');
            pdf.text('Email:', margin + 2.65, currentY + 16.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.email || 'N/A', margin + 15.9, currentY + 16.5);

            currentY += clienteBoxHeight + 5;
          }
        }

        // Tabla de productos
        if (esContinuacion) {
          pdf.setFillColor(...lightGray);
          pdf.rect(margin, currentY, contentWidth, 6, 'F');
          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text('CONTINUACIÓN DE PRODUCTOS', pageWidth / 2, currentY + 4, { align: 'center' });
          currentY += 8;
        }

        // Encabezados de tabla - Anchos en mm directamente (más precisos)
        const tableHeaders = ['#', 'Código', 'Descripción', 'Val. Unit', 'Cantidad', 'Descuento', 'IVA', 'INC', 'Val. Item'];
        // Anchos en mm: #=8, Código=22, Descripción=flexible, Val.Unit=18, Cantidad=12, Descuento=18, IVA=10, INC=10, Val.Item=20
        const colWidths = [8, 22, 0, 18, 12, 18, 10, 10, 20];
        // Calcular ancho de Descripción como el resto
        const totalFixedWidth = colWidths.reduce((sum, w, i) => i !== 2 ? sum + w : sum, 0);
        colWidths[2] = Math.max(30, contentWidth - totalFixedWidth); // Mínimo 30mm para descripción

        pdf.setFillColor(...lightGray);
        pdf.rect(margin, currentY, contentWidth, 6, 'F');

        pdf.setFontSize(8); // 10px = 8pt
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...black);

        let colX = margin;
        tableHeaders.forEach((header, idx) => {
          pdf.text(header, colX + colWidths[idx] / 2, currentY + 4, { align: 'center' });
          if (idx < tableHeaders.length - 1) {
            pdf.setDrawColor(...black);
            pdf.line(colX + colWidths[idx], currentY, colX + colWidths[idx], currentY + 6);
          }
          colX += colWidths[idx];
        });

        pdf.setDrawColor(...black);
        pdf.setLineWidth(0.3);
        pdf.line(margin, currentY, margin, currentY + 6);
        pdf.line(pageWidth - margin, currentY, pageWidth - margin, currentY + 6);
        pdf.line(margin, currentY + 6, pageWidth - margin, currentY + 6);

        currentY += 8;

        // Filas de productos
        for (let i = inicio; i < fin; i++) {
          const item = items[i];
          const itemNum = i + 1;
          const codigo = item.product_reference || item.product?.sku || item.product?.code || item.sku || '';
          const descripcion = item.description || item.product?.name || item.product_name || 'Producto';
          const valUnit = item.unit_price || 0;
          const cantidad = item.quantity || 0;
          const descuento = item.discount_amount || 0;
          const taxRate = item.tax?.rate || 0;
          const iva = taxRate ? (taxRate * 100).toFixed(0) : '0';
          const inc = ''; // Incremento si aplica
          const valItem = item.total_price || (valUnit * cantidad - descuento);

          const rowHeight = 8;
          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.rect(margin, currentY, contentWidth, rowHeight);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);

          colX = margin;
          // # - Asegurar que sea solo el número
          const itemNumStr = String(itemNum); // Solo el número secuencial
          pdf.setFontSize(8);
          pdf.text(itemNumStr, colX + colWidths[0] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[0], currentY, colX + colWidths[0], currentY + rowHeight);
          colX += colWidths[0];

          // Código - truncar correctamente respetando el ancho de columna
          const codigoMaxWidth = colWidths[1] - 3; // Dejar margen interno
          pdf.setFontSize(7); // Tamaño más pequeño para códigos
          // Truncar código usando splitTextToSize
          const codigoLines = pdf.splitTextToSize(codigo, codigoMaxWidth);
          let codigoText = codigoLines[0] || codigo;
          // Si el texto original es más largo, agregar ellipsis si cabe
          if (codigo.length > codigoText.length && codigoText.length > 5) {
            const testEllipsis = pdf.splitTextToSize(codigoText.substring(0, codigoText.length - 3) + '...', codigoMaxWidth);
            if (testEllipsis[0] && testEllipsis[0].length <= codigoMaxWidth) {
              codigoText = codigoText.substring(0, codigoText.length - 3) + '...';
            }
          }
          // Asegurar que el texto no exceda el ancho
          const finalCodigoLines = pdf.splitTextToSize(codigoText, codigoMaxWidth);
          pdf.text(finalCodigoLines[0], colX + 1.5, currentY + 5, { maxWidth: codigoMaxWidth, align: 'left' });
          pdf.setFontSize(8); // Restaurar tamaño normal
          pdf.line(colX + colWidths[1], currentY, colX + colWidths[1], currentY + rowHeight);
          colX += colWidths[1];

          // Descripción - usar splitTextToSize para evitar superposición
          const descMaxWidth = colWidths[2] - 3; // Dejar margen interno
          pdf.setFontSize(8); // Asegurar tamaño correcto
          const descLines = pdf.splitTextToSize(descripcion, descMaxWidth);
          // Solo mostrar la primera línea para mantener altura de fila consistente
          pdf.text(descLines[0] || descripcion.substring(0, 50), colX + 1.5, currentY + 5, { maxWidth: descMaxWidth, align: 'left' });
          pdf.line(colX + colWidths[2], currentY, colX + colWidths[2], currentY + rowHeight);
          colX += colWidths[2];

          // Val. Unit
          const valUnitFormatted = parseFloat(String(valUnit)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text(valUnitFormatted, colX + colWidths[3] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[3], currentY, colX + colWidths[3], currentY + rowHeight);
          colX += colWidths[3];

          // Cantidad
          pdf.text(cantidad.toFixed(2), colX + colWidths[4] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[4], currentY, colX + colWidths[4], currentY + rowHeight);
          colX += colWidths[4];

          // Descuento
          const descuentoFormatted = parseFloat(String(descuento)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text(descuentoFormatted, colX + colWidths[5] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[5], currentY, colX + colWidths[5], currentY + rowHeight);
          colX += colWidths[5];

          // IVA
          pdf.text(`${iva}%`, colX + colWidths[6] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[6], currentY, colX + colWidths[6], currentY + rowHeight);
          colX += colWidths[6];

          // INC
          pdf.text(inc, colX + colWidths[7] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[7], currentY, colX + colWidths[7], currentY + rowHeight);
          colX += colWidths[7];

          // Val. Item
          const valItemFormatted = parseFloat(String(valItem)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text(valItemFormatted, colX + colWidths[8] / 2, currentY + 5, { align: 'center' });

          currentY += rowHeight;
        }

        // Footer solo en última página
        if (esUltimaPagina) {
          currentY += 5;

          // Footer section
          const footerY = currentY;

          // Observaciones (izquierda)
          const totalesWidth = 68.8;
          const observacionesWidth = contentWidth - totalesWidth - 6.6;
          pdf.setFontSize(8); // 11px = 8pt
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text('Observaciones', margin, footerY);

          pdf.setFontSize(7); // 9px = 7pt
          pdf.setFont('helvetica', 'normal');
          const observaciones = saleData.notes || 'Este documento se asimila en todos sus efectos a una letra de cambio de conformidad con el Art. 774 del código de comercio. Autorizo que en caso de incumplimiento de esta obligación sea reportado a las centrales de riesgo, se cobrarán intereses por mora.';
          const obsLines = pdf.splitTextToSize(observaciones, observacionesWidth);
          pdf.text(obsLines, margin, footerY + 5);

          // Totales (derecha)
          const totalesX = pageWidth - margin - totalesWidth;
          const totalesHeight = 40;

          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.rect(totalesX, footerY, totalesWidth, totalesHeight);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);

          let totalY = footerY + 5;
          const totalesData = [
            { label: 'Valor Bruto', value: totales.valorBruto },
            { label: 'Base Imponible', value: totales.baseImponible },
            { label: 'IVA', value: totales.iva },
            { label: 'Descuento global(-)', value: totales.descuento },
            { label: 'Recargo global(+)', value: totales.recargo },
            { label: 'Total Factura', value: totales.total }
          ];

          totalesData.forEach((item, idx) => {
            pdf.text(item.label, totalesX + 2.65, totalY);
            pdf.setFont('helvetica', idx === totalesData.length - 1 ? 'bold' : 'normal');
            const formattedValue = item.value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            pdf.text(`$ ${formattedValue}`, totalesX + totalesWidth - 2.65, totalY, { align: 'right' });
            pdf.setFont('helvetica', 'normal');
            if (idx < totalesData.length - 1) {
              pdf.line(totalesX, totalY + 3, totalesX + totalesWidth, totalY + 3);
            }
            totalY += 5.5;
          });

          currentY = footerY + Math.max(obsLines.length * 4 + 8, totalesHeight) + 5;

          // QR Code y CUFE (si existe)
          if (qrCode || saleData.cufe) {
            const qrY = currentY;
            const qrSize = 35;
            
            if (qrCode) {
              try {
                pdf.addImage(qrCode, 'PNG', margin, qrY, qrSize, qrSize);
              } catch (e) {
                console.warn('No se pudo cargar el QR code');
              }
            }

            if (saleData.cufe) {
              pdf.setFontSize(7); // 9px = 7pt
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(...black);
              const cufeX = qrCode ? margin + qrSize + 5 : margin;
              const cufeY = qrY + 5;
              pdf.text('CUFE:', cufeX, cufeY);
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(6); // 8px = 6pt
              const cufeLines = pdf.splitTextToSize(saleData.cufe, contentWidth - (qrCode ? qrSize + 10 : 0));
              pdf.text(cufeLines, cufeX, cufeY + 4);
              currentY = qrY + Math.max(qrSize, cufeLines.length * 3 + 5) + 5;
            } else {
              currentY = qrY + (qrCode ? qrSize : 0) + 5;
            }
          }

          // Información de pago
          const pagoY = currentY;
          const pagoWidth = (contentWidth - 13.2) / 3;
          const pagoItems = [
            { label: 'Tipo de operación', value: saleData.operation_type || 'Estándar' },
            { label: 'Forma de pago', value: this.getPaymentMethodLabel(saleData.payment_method || 'cash') },
            { label: 'Medio de pago', value: this.getPaymentMethodLabel(saleData.payment_method || 'cash') }
          ];

          pagoItems.forEach((item, idx) => {
            pdf.setFontSize(8); // 10px = 8pt
            pdf.setFont('helvetica', 'bold');
            pdf.text(item.label, margin + idx * (pagoWidth + 6.6), pagoY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(item.value, margin + idx * (pagoWidth + 6.6), pagoY + 4);
          });

          currentY = pagoY + 10;

          // Footer note
          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 5;

          // Verificar si hay espacio antes de agregar footer
          const footerSpace = 15; // Espacio necesario para el footer
          if (currentY + footerSpace > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
          }
          
          pdf.setFontSize(6); // 8px = 6pt
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          const footerNote = [
            `Actividad económica: ${companyData.economic_activity || 'Desarrollo de sistemas informáticos'}`,
            saleData.dian_authorization ? `Autorización de numeración de facturación No ${saleData.dian_authorization} de ${new Date().getFullYear()} vigencia hasta ${new Date().getFullYear() + 2}` : '',
            `Factura electrónica generada por ${companyData.name || 'Sistema'}`
          ].filter(Boolean);
          footerNote.forEach((line, idx) => {
            const lineY = currentY + idx * 3.5; // Reducir espaciado vertical
            if (lineY < pageHeight - margin - 5) {
              pdf.text(line, pageWidth / 2, lineY, { align: 'center' });
            }
          });
        }
      }

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

  /**
   * Genera un PDF de cotización profesional estilo carta
   * Basado en el diseño proporcionado
   */
  static async generateQuotePDF(
    quoteData: any,
    companyData: any,
    filename: string,
    options: {
      format?: 'a4' | 'letter' | 'legal' | 'custom';
      orientation?: 'portrait' | 'landscape';
      margin?: number;
      customWidth?: number;
      customHeight?: number;
      logo?: string;
      qrCode?: string;
    } = {}
  ): Promise<void> {
    const {
      format = 'letter',
      orientation = 'portrait',
      margin = 19.05, // 0.75in en mm
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
    const ITEMS_POR_PAGINA = 12;

    // Colores
    const black: [number, number, number] = [0, 0, 0];
    const lightGray: [number, number, number] = [240, 240, 240];
    const borderGray: [number, number, number] = [200, 200, 200];
    const gradientStart: [number, number, number] = [78, 84, 200]; // #4E54C8
    const gradientEnd: [number, number, number] = [143, 148, 251]; // #8F94FB

    let currentY = margin;

    // Función para verificar si se necesita nueva página
    const checkNewPage = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - margin - 20) {
        pdf.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    // Formatear fecha: DD-MM-YYYY HH:MM:SS AM/PM
    const formatearFecha = (fecha: string | Date) => {
      const date = new Date(fecha);
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const año = date.getFullYear();
      let horas = date.getHours();
      const minutos = String(date.getMinutes()).padStart(2, '0');
      const segundos = String(date.getSeconds()).padStart(2, '0');
      const ampm = horas >= 12 ? 'PM' : 'AM';
      horas = horas % 12;
      horas = horas ? horas : 12;
      const horasStr = String(horas).padStart(2, '0');
      return `${dia}-${mes}-${año} ${horasStr}:${minutos}:${segundos} ${ampm}`;
    };

    // Calcular totales (igual que en el HTML)
    const calcularTotales = (items: any[]) => {
      let subtotal = 0;
      let totalIva = 0;
      let totalDescuento = 0;

      items.forEach((item: any) => {
        const iva = item.tax?.rate ? parseFloat(String(item.tax.rate)) : 0;
        const valItem = item.total_price || 0;
        const divisor = 1 + iva;
        const baseImponible = divisor !== 0 ? valItem / divisor : valItem;
        subtotal += baseImponible;
        totalIva += valItem - baseImponible;
        totalDescuento += item.discount_amount || 0;
      });

      const total = subtotal + totalIva;
      return {
        valorBruto: subtotal,
        baseImponible: subtotal,
        iva: totalIva,
        descuento: totalDescuento,
        recargo: 0,
        total: total
      };
    };

    try {
      if (!quoteData) {
        throw new Error('No se proporcionaron datos de la cotización');
      }

      if (!companyData) {
        throw new Error('No se proporcionaron datos de la empresa');
      }

      const items = quoteData.items || [];
      const totalPaginas = Math.ceil(items.length / ITEMS_POR_PAGINA);
      const totales = calcularTotales(items);
      currentY = margin;

      for (let pagina = 0; pagina < totalPaginas; pagina++) {
        if (pagina > 0) {
          pdf.addPage();
          currentY = margin;
        }

        const inicio = pagina * ITEMS_POR_PAGINA;
        const fin = Math.min(inicio + ITEMS_POR_PAGINA, items.length);
        const esUltimaPagina = (pagina === totalPaginas - 1);
        const esContinuacion = (pagina > 0);

        // Número de página
        pdf.setFontSize(7); // 9px = 7pt
        pdf.setTextColor(70, 70, 70); // Más oscuro para mejor legibilidad
        pdf.setFont('helvetica', 'normal');
        pdf.text(`página ${pagina + 1} de ${totalPaginas}`, pageWidth - margin, currentY, { align: 'right' });
        currentY += 2.6;

        // HEADER - Estilo Alegra optimizado
        const headerStartY = currentY;
        const dividerX = pageWidth / 2 + 10; // División entre izquierda y derecha
        let leftY = currentY;
        let rightY = currentY;

        // LADO IZQUIERDO: Logo y datos de empresa
        const logoSize = 18; // Logo más pequeño
        const companyLogoUrl = companyData.logo_url || logo;
        let logoLoaded = false;
        
        if (companyLogoUrl) {
          try {
            pdf.addImage(companyLogoUrl, 'PNG', margin, leftY, 35, 18);
            leftY += 20;
            logoLoaded = true;
          } catch (e) {
            console.warn('No se pudo cargar el logo de la empresa:', e);
          }
        } else {
          leftY += 2;
        }

        // Nombre de la empresa
        pdf.setTextColor(...black);
        pdf.setFontSize(9); // 12px = 9pt
        pdf.setFont('helvetica', 'bold');
        const companyName = companyData.name || 'EMPRESA';
        pdf.text(companyName, margin, leftY);
        leftY += 4;

        // Datos de empresa compactos (estilo Alegra)
        pdf.setFontSize(7); // 10px = 7pt
        pdf.setFont('helvetica', 'normal');
        
        // Información fiscal y contacto
        if (companyData.tax_id) {
          const sellerInfo = companyData.business_name 
            ? `${companyData.business_name} - NIT ${companyData.tax_id}`
            : `NIT: ${companyData.tax_id}`;
          pdf.text(sellerInfo, margin, leftY);
          leftY += 3;
        }

        const addressLine = companyData.address || '';
        if (addressLine) {
          pdf.text(addressLine, margin, leftY);
          leftY += 3;
        }

        const cityLine = [
          companyData.city || '',
          companyData.state || ''
        ].filter(Boolean).join(', ');
        if (cityLine) {
          pdf.text(cityLine, margin, leftY);
          leftY += 3;
        }

        if (companyData.phone) {
          pdf.text(`Tel: ${companyData.phone}`, margin, leftY);
          leftY += 3;
        }

        if (companyData.email) {
          pdf.text(companyData.email, margin, leftY);
          leftY += 3;
        }

        // LADO DERECHO: Título y número de cotización
        pdf.setTextColor(...black);
        pdf.setFontSize(9); // 12px = 9pt
        pdf.setFont('helvetica', 'bold');
        pdf.text('COTIZACIÓN', dividerX, rightY, { align: 'right' });
        rightY += 4;

        pdf.setFontSize(10); // 13px = 10pt
        pdf.setFont('helvetica', 'bold');
        pdf.text(`No. ${quoteData.quote_number || 'COT-001'}`, dividerX, rightY, { align: 'right' });
        rightY += 4;

        pdf.setFontSize(7); // 10px = 7pt
        pdf.setFont('helvetica', 'normal');
        pdf.text('Cotización válida por 15 días', dividerX, rightY, { align: 'right' });

        // Ajustar currentY según la altura máxima de ambos lados
        currentY = Math.max(leftY, rightY) + 3;

        // Línea divisoria (borde inferior del header)
        pdf.setDrawColor(...black);
        pdf.setLineWidth(0.3);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 4;

        // FECHAS (solo primera página)
        if (pagina === 0) {
          const fechaBoxHeight = 8;
          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.rect(margin, currentY, contentWidth, fechaBoxHeight);

          const fechaWidth = contentWidth / 2;
          pdf.line(margin + fechaWidth, currentY, margin + fechaWidth, currentY + fechaBoxHeight);

          // Fecha generación
          pdf.setFontSize(7); // 9px = 7pt
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text('Fecha generación:', margin + 2.65, currentY + 5);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          const fechaGen = formatearFecha(quoteData.quote_date || quoteData.created_at || new Date());
          pdf.text(fechaGen, margin + fechaWidth / 2, currentY + 5, { align: 'center' });

          // Válida hasta
          pdf.setFontSize(7); // 9px = 7pt
          pdf.setFont('helvetica', 'bold');
          pdf.text('Válida hasta:', margin + fechaWidth + 2.65, currentY + 5);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          const fechaVal = quoteData.expiration_date 
            ? formatearFecha(quoteData.expiration_date)
            : formatearFecha(new Date(new Date(quoteData.quote_date || new Date()).getTime() + 15 * 24 * 60 * 60 * 1000));
          pdf.text(fechaVal, margin + fechaWidth + fechaWidth / 2, currentY + 5, { align: 'center' });

          currentY += fechaBoxHeight;
        }

        // DATOS DEL CLIENTE (solo primera página)
        if (pagina === 0) {
          const customer = quoteData.customer;
          if (customer) {
            const clienteBoxHeight = 18;
            pdf.setDrawColor(...black);
            pdf.setLineWidth(0.3);
            pdf.rect(margin, currentY, contentWidth, clienteBoxHeight);

            // Primera fila
            pdf.line(margin, currentY + 6, pageWidth - margin, currentY + 6);
            pdf.line(margin + contentWidth / 2, currentY, margin + contentWidth / 2, currentY + 6);

            // Segunda fila
            pdf.line(margin, currentY + 12, pageWidth - margin, currentY + 12);
            pdf.line(margin + contentWidth / 2, currentY + 6, margin + contentWidth / 2, currentY + 12);

            pdf.setFontSize(8); // 10px = 8pt
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...black);

            // CC/NIT
            pdf.text('CC/NIT:', margin + 2.65, currentY + 4.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.identification_number || 'N/A', margin + 15.9, currentY + 4.5);

            // Cliente
            pdf.setFont('helvetica', 'bold');
            pdf.text('Cliente:', margin + contentWidth / 2 + 2.65, currentY + 4.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.business_name || customer.name || 'N/A', margin + contentWidth / 2 + 15.9, currentY + 4.5);

            // Dirección
            pdf.setFont('helvetica', 'bold');
            pdf.text('Dirección:', margin + 2.65, currentY + 10.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.address || 'Sin dirección', margin + 15.9, currentY + 10.5);

            // Municipio
            pdf.setFont('helvetica', 'bold');
            pdf.text('Municipio:', margin + contentWidth / 2 + 2.65, currentY + 10.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.city || 'N/A', margin + contentWidth / 2 + 15.9, currentY + 10.5);

            // Email
            pdf.setFont('helvetica', 'bold');
            pdf.text('Email:', margin + 2.65, currentY + 16.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.email || 'N/A', margin + 15.9, currentY + 16.5);

            currentY += clienteBoxHeight + 5;
          }
        }

        // Tabla de productos
        if (esContinuacion) {
          pdf.setFillColor(...lightGray);
          pdf.rect(margin, currentY, contentWidth, 6, 'F');
          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text('CONTINUACIÓN DE PRODUCTOS', pageWidth / 2, currentY + 4, { align: 'center' });
          currentY += 8;
        }

        // Encabezados de tabla - Anchos en mm directamente (más precisos)
        const tableHeaders = ['#', 'Código', 'Descripción', 'Val. Unit', 'Cantidad', 'Descuento', 'IVA', 'INC', 'Val. Item'];
        // Anchos en mm: #=8, Código=22, Descripción=flexible, Val.Unit=18, Cantidad=12, Descuento=18, IVA=10, INC=10, Val.Item=20
        const colWidths = [8, 22, 0, 18, 12, 18, 10, 10, 20];
        // Calcular ancho de Descripción como el resto
        const totalFixedWidth = colWidths.reduce((sum, w, i) => i !== 2 ? sum + w : sum, 0);
        colWidths[2] = Math.max(30, contentWidth - totalFixedWidth); // Mínimo 30mm para descripción

        pdf.setFillColor(...lightGray);
        pdf.rect(margin, currentY, contentWidth, 6, 'F');

        pdf.setFontSize(8); // 10px = 8pt
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...black);

        let colX = margin;
        tableHeaders.forEach((header, idx) => {
          pdf.text(header, colX + colWidths[idx] / 2, currentY + 4, { align: 'center' });
          if (idx < tableHeaders.length - 1) {
            pdf.setDrawColor(...black);
            pdf.line(colX + colWidths[idx], currentY, colX + colWidths[idx], currentY + 6);
          }
          colX += colWidths[idx];
        });

        pdf.setDrawColor(...black);
        pdf.setLineWidth(0.3);
        pdf.line(margin, currentY, margin, currentY + 6);
        pdf.line(pageWidth - margin, currentY, pageWidth - margin, currentY + 6);
        pdf.line(margin, currentY + 6, pageWidth - margin, currentY + 6);

        currentY += 8;

        // Filas de productos
        for (let i = inicio; i < fin; i++) {
          const item = items[i];
          const itemNum = i + 1;
          const codigo = item.product_reference || item.product?.sku || item.product?.code || '';
          const descripcion = item.description || item.product?.name || 'Producto';
          const valUnit = item.unit_price || 0;
          const cantidad = item.quantity || 0;
          const descuento = item.discount_amount || 0;
          const taxRate = item.tax?.rate || 0;
          const iva = taxRate ? (taxRate * 100).toFixed(0) : '0';
          const inc = ''; // Incremento si aplica
          const valItem = item.total_price || (valUnit * cantidad - descuento);

          const rowHeight = 8;
          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.rect(margin, currentY, contentWidth, rowHeight);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);

          colX = margin;
          // # - Asegurar que sea solo el número
          const itemNumStr = String(itemNum); // Solo el número secuencial
          pdf.setFontSize(8);
          pdf.text(itemNumStr, colX + colWidths[0] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[0], currentY, colX + colWidths[0], currentY + rowHeight);
          colX += colWidths[0];

          // Código - truncar correctamente respetando el ancho de columna
          const codigoMaxWidth = colWidths[1] - 3; // Dejar margen interno
          pdf.setFontSize(7); // Tamaño más pequeño para códigos
          // Truncar código usando splitTextToSize
          const codigoLines = pdf.splitTextToSize(codigo, codigoMaxWidth);
          let codigoText = codigoLines[0] || codigo;
          // Si el texto original es más largo, agregar ellipsis si cabe
          if (codigo.length > codigoText.length && codigoText.length > 5) {
            const testEllipsis = pdf.splitTextToSize(codigoText.substring(0, codigoText.length - 3) + '...', codigoMaxWidth);
            if (testEllipsis[0] && testEllipsis[0].length <= codigoMaxWidth) {
              codigoText = codigoText.substring(0, codigoText.length - 3) + '...';
            }
          }
          // Asegurar que el texto no exceda el ancho
          const finalCodigoLines = pdf.splitTextToSize(codigoText, codigoMaxWidth);
          pdf.text(finalCodigoLines[0], colX + 1.5, currentY + 5, { maxWidth: codigoMaxWidth, align: 'left' });
          pdf.setFontSize(8); // Restaurar tamaño normal
          pdf.line(colX + colWidths[1], currentY, colX + colWidths[1], currentY + rowHeight);
          colX += colWidths[1];

          // Descripción - usar splitTextToSize para evitar superposición
          const descMaxWidth = colWidths[2] - 3; // Dejar margen interno
          pdf.setFontSize(8); // Asegurar tamaño correcto
          const descLines = pdf.splitTextToSize(descripcion, descMaxWidth);
          // Solo mostrar la primera línea para mantener altura de fila consistente
          pdf.text(descLines[0] || descripcion.substring(0, 50), colX + 1.5, currentY + 5, { maxWidth: descMaxWidth, align: 'left' });
          pdf.line(colX + colWidths[2], currentY, colX + colWidths[2], currentY + rowHeight);
          colX += colWidths[2];

          // Val. Unit
          const valUnitFormatted = parseFloat(String(valUnit)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text(valUnitFormatted, colX + colWidths[3] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[3], currentY, colX + colWidths[3], currentY + rowHeight);
          colX += colWidths[3];

          // Cantidad
          pdf.text(cantidad.toFixed(2), colX + colWidths[4] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[4], currentY, colX + colWidths[4], currentY + rowHeight);
          colX += colWidths[4];

          // Descuento
          const descuentoFormatted = parseFloat(String(descuento)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text(descuentoFormatted, colX + colWidths[5] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[5], currentY, colX + colWidths[5], currentY + rowHeight);
          colX += colWidths[5];

          // IVA
          pdf.text(`${iva}%`, colX + colWidths[6] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[6], currentY, colX + colWidths[6], currentY + rowHeight);
          colX += colWidths[6];

          // INC
          pdf.text(inc, colX + colWidths[7] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[7], currentY, colX + colWidths[7], currentY + rowHeight);
          colX += colWidths[7];

          // Val. Item
          const valItemFormatted = parseFloat(String(valItem)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text(valItemFormatted, colX + colWidths[8] / 2, currentY + 5, { align: 'center' });

          currentY += rowHeight;
        }

        // Footer solo en última página
        if (esUltimaPagina) {
          currentY += 5;

          // Footer section
          const footerY = currentY;

          // Observaciones (izquierda)
          const totalesWidth = 68.8;
          const observacionesWidth = contentWidth - totalesWidth - 6.6;
          pdf.setFontSize(8); // 11px = 8pt
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text('Observaciones', margin, footerY);

          pdf.setFontSize(7); // 9px = 7pt
          pdf.setFont('helvetica', 'normal');
          const observaciones = quoteData.notes || 'Esta cotización tiene validez de 15 días calendario a partir de la fecha de emisión. Los precios están sujetos a disponibilidad de inventario.';
          const obsLines = pdf.splitTextToSize(observaciones, observacionesWidth);
          pdf.text(obsLines, margin, footerY + 5);

          // Totales (derecha)
          const totalesX = pageWidth - margin - totalesWidth;
          const totalesHeight = 40;

          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.rect(totalesX, footerY, totalesWidth, totalesHeight);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);

          let totalY = footerY + 5;
          const totalesData = [
            { label: 'Valor Bruto', value: totales.valorBruto },
            { label: 'Base Imponible', value: totales.baseImponible },
            { label: 'IVA', value: totales.iva },
            { label: 'Descuento global(-)', value: totales.descuento },
            { label: 'Recargo global(+)', value: totales.recargo },
            { label: 'Total Cotización', value: totales.total }
          ];

          totalesData.forEach((item, idx) => {
            pdf.text(item.label, totalesX + 2.65, totalY);
            pdf.setFont('helvetica', idx === totalesData.length - 1 ? 'bold' : 'normal');
            const formattedValue = item.value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            pdf.text(`$ ${formattedValue}`, totalesX + totalesWidth - 2.65, totalY, { align: 'right' });
            pdf.setFont('helvetica', 'normal');
            if (idx < totalesData.length - 1) {
              pdf.line(totalesX, totalY + 3, totalesX + totalesWidth, totalY + 3);
            }
            totalY += 5.5;
          });

          currentY = footerY + Math.max(obsLines.length * 4 + 8, totalesHeight) + 5;

          // Información de pago
          const pagoY = currentY;
          const pagoWidth = (contentWidth - 13.2) / 3;
          const pagoItems = [
            { label: 'Tipo de operación', value: 'Estándar' },
            { label: 'Forma de pago', value: 'Pago de contado' },
            { label: 'Medio de pago', value: 'Efectivo' }
          ];

          pagoItems.forEach((item, idx) => {
            pdf.setFontSize(8); // 10px = 8pt
            pdf.setFont('helvetica', 'bold');
            pdf.text(item.label, margin + idx * (pagoWidth + 6.6), pagoY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(item.value, margin + idx * (pagoWidth + 6.6), pagoY + 4);
          });

          currentY = pagoY + 10;

          // Footer note
          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 5;

          pdf.setFontSize(6); // 8px = 6pt
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          const footerNote = [
            `Actividad económica: ${companyData.economic_activity || 'Desarrollo de sistemas informáticos'}`,
            'Cotización válida por 15 días calendario',
            'Cotización generada con software propio'
          ];
          footerNote.forEach((line, idx) => {
            pdf.text(line, pageWidth / 2, currentY + idx * 4, { align: 'center' });
          });
        }
      }

      // Guardar PDF
      pdf.save(filename);

    } catch (error) {
      console.error('Error generando PDF de cotización:', error);
      let errorMessage = 'No se pudo generar el PDF de la cotización';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * Genera un PDF de cotización como buffer para envío por correo
   */
  static async generateQuotePDFBuffer(
    quoteData: any,
    companyData: any,
    options: {
      format?: 'a4' | 'letter' | 'legal' | 'custom';
      orientation?: 'portrait' | 'landscape';
      margin?: number;
      customWidth?: number;
      customHeight?: number;
      logo?: string;
      qrCode?: string;
    } = {}
  ): Promise<Buffer> {
    const {
      format = 'letter',
      orientation = 'portrait',
      margin = 19.05,
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
    const ITEMS_POR_PAGINA = 12;

    const black: [number, number, number] = [0, 0, 0];
    const lightGray: [number, number, number] = [240, 240, 240];
    const borderGray: [number, number, number] = [200, 200, 200];
    const gradientStart: [number, number, number] = [78, 84, 200];
    const gradientEnd: [number, number, number] = [143, 148, 251];

    let currentY = margin;

    const formatearFecha = (fecha: string | Date) => {
      const date = new Date(fecha);
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const año = date.getFullYear();
      let horas = date.getHours();
      const minutos = String(date.getMinutes()).padStart(2, '0');
      const segundos = String(date.getSeconds()).padStart(2, '0');
      const ampm = horas >= 12 ? 'PM' : 'AM';
      horas = horas % 12;
      horas = horas ? horas : 12;
      const horasStr = String(horas).padStart(2, '0');
      return `${dia}-${mes}-${año} ${horasStr}:${minutos}:${segundos} ${ampm}`;
    };

    const calcularTotales = (items: any[]) => {
      let subtotal = 0;
      let totalIva = 0;
      let totalDescuento = 0;

      items.forEach((item: any) => {
        const iva = item.tax?.rate ? parseFloat(String(item.tax.rate)) : 0;
        const baseImponible = item.total_price / (1 + iva);
        subtotal += baseImponible;
        totalIva += item.total_price - baseImponible;
        totalDescuento += item.discount_amount || 0;
      });

      const total = subtotal + totalIva;
      return {
        valorBruto: subtotal,
        baseImponible: subtotal,
        iva: totalIva,
        descuento: totalDescuento,
        recargo: 0,
        total: total
      };
    };

    try {
      if (!quoteData) {
        throw new Error('No se proporcionaron datos de la cotización');
      }

      if (!companyData) {
        throw new Error('No se proporcionaron datos de la empresa');
      }

      const items = quoteData.items || [];
      const totalPaginas = Math.ceil(items.length / ITEMS_POR_PAGINA);
      const totales = calcularTotales(items);
      currentY = margin;

      for (let pagina = 0; pagina < totalPaginas; pagina++) {
        if (pagina > 0) {
          pdf.addPage();
          currentY = margin;
        }

        const inicio = pagina * ITEMS_POR_PAGINA;
        const fin = Math.min(inicio + ITEMS_POR_PAGINA, items.length);
        const esUltimaPagina = (pagina === totalPaginas - 1);
        const esContinuacion = (pagina > 0);

        pdf.setFontSize(7); // 9px = 7pt
        pdf.setTextColor(102, 102, 102);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`página ${pagina + 1} de ${totalPaginas}`, pageWidth - margin, currentY, { align: 'right' });
        currentY += 2.6;

        const headerStartY = currentY;
        const dividerX = pageWidth / 2 + 10; // División entre izquierda y derecha
        let leftY = currentY;
        let rightY = currentY;

        // LADO IZQUIERDO: Logo y datos de empresa
        const logoSize = 18; // Logo más pequeño
        const companyLogoUrl = companyData.logo_url || logo;
        let logoLoaded = false;

        if (companyLogoUrl) {
          try {
            pdf.addImage(companyLogoUrl, 'PNG', margin, leftY, 35, 18);
            leftY += 20;
            logoLoaded = true;
          } catch (e) {
            console.warn('No se pudo cargar el logo de la empresa:', e);
          }
        } else {
          leftY += 2;
        }

        // Nombre de la empresa
        pdf.setTextColor(...black);
        pdf.setFontSize(9); // 12px = 9pt
        pdf.setFont('helvetica', 'bold');
        const companyName = companyData.name || 'EMPRESA';
        pdf.text(companyName, margin, leftY);
        leftY += 4;

        // Datos de empresa compactos (estilo Alegra)
        pdf.setFontSize(7); // 10px = 7pt
        pdf.setFont('helvetica', 'normal');
        
        // Información fiscal y contacto
        if (companyData.tax_id) {
          const sellerInfo = companyData.business_name 
            ? `${companyData.business_name} - NIT ${companyData.tax_id}`
            : `NIT: ${companyData.tax_id}`;
          pdf.text(sellerInfo, margin, leftY);
          leftY += 3;
        }

        const addressLine = companyData.address || '';
        if (addressLine) {
          pdf.text(addressLine, margin, leftY);
          leftY += 3;
        }

        const cityLine = [
          companyData.city || '',
          companyData.state || ''
        ].filter(Boolean).join(', ');
        if (cityLine) {
          pdf.text(cityLine, margin, leftY);
          leftY += 3;
        }

        if (companyData.phone) {
          pdf.text(`Tel: ${companyData.phone}`, margin, leftY);
          leftY += 3;
        }

        if (companyData.email) {
          pdf.text(companyData.email, margin, leftY);
          leftY += 3;
        }

        // LADO DERECHO: Título y número de cotización
        pdf.setTextColor(...black);
        pdf.setFontSize(9); // 12px = 9pt
        pdf.setFont('helvetica', 'bold');
        pdf.text('COTIZACIÓN', dividerX, rightY, { align: 'right' });
        rightY += 4;

        pdf.setFontSize(10); // 13px = 10pt
        pdf.setFont('helvetica', 'bold');
        pdf.text(`No. ${quoteData.quote_number || 'COT-001'}`, dividerX, rightY, { align: 'right' });
        rightY += 4;

        pdf.setFontSize(7); // 10px = 7pt
        pdf.setFont('helvetica', 'normal');
        pdf.text('Cotización válida por 15 días', dividerX, rightY, { align: 'right' });

        // Ajustar currentY según la altura máxima de ambos lados
        currentY = Math.max(leftY, rightY) + 3;

        // Línea divisoria (borde inferior del header)
        pdf.setDrawColor(...black);
        pdf.setLineWidth(0.3);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 4;

        if (pagina === 0) {
          const fechaBoxHeight = 8;
          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.rect(margin, currentY, contentWidth, fechaBoxHeight);

          const fechaWidth = contentWidth / 2;
          pdf.line(margin + fechaWidth, currentY, margin + fechaWidth, currentY + fechaBoxHeight);

          pdf.setFontSize(7); // 9px = 7pt
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text('Fecha generación:', margin + 2.65, currentY + 5);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          const fechaGen = formatearFecha(quoteData.quote_date || quoteData.created_at || new Date());
          pdf.text(fechaGen, margin + fechaWidth / 2, currentY + 5, { align: 'center' });

          pdf.setFontSize(7); // 9px = 7pt
          pdf.setFont('helvetica', 'bold');
          pdf.text('Válida hasta:', margin + fechaWidth + 2.65, currentY + 5);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          const fechaVal = quoteData.expiration_date 
            ? formatearFecha(quoteData.expiration_date)
            : formatearFecha(new Date(new Date(quoteData.quote_date || new Date()).getTime() + 15 * 24 * 60 * 60 * 1000));
          pdf.text(fechaVal, margin + fechaWidth + fechaWidth / 2, currentY + 5, { align: 'center' });

          currentY += fechaBoxHeight;
        }

        if (pagina === 0) {
          const customer = quoteData.customer;
          if (customer) {
            const clienteBoxHeight = 18;
            pdf.setDrawColor(...black);
            pdf.setLineWidth(0.3);
            pdf.rect(margin, currentY, contentWidth, clienteBoxHeight);

            pdf.line(margin, currentY + 6, pageWidth - margin, currentY + 6);
            pdf.line(margin + contentWidth / 2, currentY, margin + contentWidth / 2, currentY + 6);
            pdf.line(margin, currentY + 12, pageWidth - margin, currentY + 12);
            pdf.line(margin + contentWidth / 2, currentY + 6, margin + contentWidth / 2, currentY + 12);

            pdf.setFontSize(8); // 10px = 8pt
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...black);

            pdf.text('CC/NIT:', margin + 2.65, currentY + 4.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.identification_number || 'N/A', margin + 15.9, currentY + 4.5);

            pdf.setFont('helvetica', 'bold');
            pdf.text('Cliente:', margin + contentWidth / 2 + 2.65, currentY + 4.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.business_name || customer.name || 'N/A', margin + contentWidth / 2 + 15.9, currentY + 4.5);

            pdf.setFont('helvetica', 'bold');
            pdf.text('Dirección:', margin + 2.65, currentY + 10.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.address || 'Sin dirección', margin + 15.9, currentY + 10.5);

            pdf.setFont('helvetica', 'bold');
            pdf.text('Municipio:', margin + contentWidth / 2 + 2.65, currentY + 10.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.city || 'N/A', margin + contentWidth / 2 + 15.9, currentY + 10.5);

            pdf.setFont('helvetica', 'bold');
            pdf.text('Email:', margin + 2.65, currentY + 16.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(customer.email || 'N/A', margin + 15.9, currentY + 16.5);

            currentY += clienteBoxHeight + 5;
          }
        }

        if (esContinuacion) {
          pdf.setFillColor(...lightGray);
          pdf.rect(margin, currentY, contentWidth, 6, 'F');
          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text('CONTINUACIÓN DE PRODUCTOS', pageWidth / 2, currentY + 4, { align: 'center' });
          currentY += 8;
        }

        // Encabezados de tabla - Anchos según HTML (convertidos de px a mm)
        const tableHeaders = ['#', 'Código', 'Descripción', 'Val. Unit', 'Cantidad', 'Descuento', 'IVA', 'INC', 'Val. Item'];
        const colWidthsPx = [30, 75, 0, 75, 65, 75, 50, 50, 85];
        const colWidths = colWidthsPx.map(w => w === 0 ? 0 : w * 0.264583); // Convertir px a mm
        const totalFixedWidth = colWidths.reduce((sum, w, i) => i !== 2 ? sum + w : sum, 0);
        colWidths[2] = contentWidth - totalFixedWidth;

        pdf.setFillColor(...lightGray);
        pdf.rect(margin, currentY, contentWidth, 6, 'F');

        pdf.setFontSize(8); // 10px = 8pt
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...black);

        let colX = margin;
        tableHeaders.forEach((header, idx) => {
          pdf.text(header, colX + colWidths[idx] / 2, currentY + 4, { align: 'center' });
          if (idx < tableHeaders.length - 1) {
            pdf.setDrawColor(...black);
            pdf.line(colX + colWidths[idx], currentY, colX + colWidths[idx], currentY + 6);
          }
          colX += colWidths[idx];
        });

        pdf.setDrawColor(...black);
        pdf.setLineWidth(0.3);
        pdf.line(margin, currentY, margin, currentY + 6);
        pdf.line(pageWidth - margin, currentY, pageWidth - margin, currentY + 6);
        pdf.line(margin, currentY + 6, pageWidth - margin, currentY + 6);

        currentY += 8;

        for (let i = inicio; i < fin; i++) {
          const item = items[i];
          const itemNum = i + 1;
          const codigo = item.product_reference || item.product?.sku || item.product?.code || '';
          const descripcion = item.description || item.product?.name || 'Producto';
          const valUnit = item.unit_price || 0;
          const cantidad = item.quantity || 0;
          const descuento = item.discount_amount || 0;
          const taxRate = item.tax?.rate || 0;
          const iva = taxRate ? (taxRate * 100).toFixed(0) : '0';
          const inc = '';
          const valItem = item.total_price || (valUnit * cantidad - descuento);

          const rowHeight = 8;
          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.rect(margin, currentY, contentWidth, rowHeight);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);

          colX = margin;
          pdf.text(String(itemNum), colX + colWidths[0] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[0], currentY, colX + colWidths[0], currentY + rowHeight);
          colX += colWidths[0];

          pdf.text(codigo, colX + colWidths[1] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[1], currentY, colX + colWidths[1], currentY + rowHeight);
          colX += colWidths[1];

          pdf.text(descripcion.substring(0, 50), colX + 2.1, currentY + 5);
          pdf.line(colX + colWidths[2], currentY, colX + colWidths[2], currentY + rowHeight);
          colX += colWidths[2];

          const valUnitFormatted = parseFloat(String(valUnit)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text(valUnitFormatted, colX + colWidths[3] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[3], currentY, colX + colWidths[3], currentY + rowHeight);
          colX += colWidths[3];

          pdf.text(cantidad.toFixed(2), colX + colWidths[4] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[4], currentY, colX + colWidths[4], currentY + rowHeight);
          colX += colWidths[4];

          const descuentoFormatted = parseFloat(String(descuento)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text(descuentoFormatted, colX + colWidths[5] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[5], currentY, colX + colWidths[5], currentY + rowHeight);
          colX += colWidths[5];

          pdf.text(`${iva}%`, colX + colWidths[6] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[6], currentY, colX + colWidths[6], currentY + rowHeight);
          colX += colWidths[6];

          pdf.text(inc, colX + colWidths[7] / 2, currentY + 5, { align: 'center' });
          pdf.line(colX + colWidths[7], currentY, colX + colWidths[7], currentY + rowHeight);
          colX += colWidths[7];

          const valItemFormatted = parseFloat(String(valItem)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          pdf.text(valItemFormatted, colX + colWidths[8] / 2, currentY + 5, { align: 'center' });

          currentY += rowHeight;
        }

        if (esUltimaPagina) {
          currentY += 5.3;

          const footerY = currentY;
          const totalesWidth = 68.8;
          const observacionesWidth = contentWidth - totalesWidth - 6.6;
          pdf.setFontSize(8); // 11px = 8pt
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...black);
          pdf.text('Observaciones', margin, footerY);

          pdf.setFontSize(7); // 9px = 7pt
          pdf.setFont('helvetica', 'normal');
          const observaciones = quoteData.notes || 'Esta cotización tiene validez de 15 días calendario a partir de la fecha de emisión. Los precios están sujetos a disponibilidad de inventario.';
          const obsLines = pdf.splitTextToSize(observaciones, observacionesWidth);
          pdf.text(obsLines, margin, footerY + 5);

          const totalesX = pageWidth - margin - totalesWidth;
          const totalesHeight = 40;

          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.rect(totalesX, footerY, totalesWidth, totalesHeight);

          pdf.setFontSize(8); // 10px = 8pt
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);

          let totalY = footerY + 5;
          const totalesData = [
            { label: 'Valor Bruto', value: totales.valorBruto },
            { label: 'Base Imponible', value: totales.baseImponible },
            { label: 'IVA', value: totales.iva },
            { label: 'Descuento global(-)', value: totales.descuento },
            { label: 'Recargo global(+)', value: totales.recargo },
            { label: 'Total Cotización', value: totales.total }
          ];

          totalesData.forEach((item, idx) => {
            pdf.text(item.label, totalesX + 2.65, totalY);
            pdf.setFont('helvetica', idx === totalesData.length - 1 ? 'bold' : 'normal');
            const formattedValue = item.value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            pdf.text(`$ ${formattedValue}`, totalesX + totalesWidth - 2.65, totalY, { align: 'right' });
            pdf.setFont('helvetica', 'normal');
            if (idx < totalesData.length - 1) {
              pdf.line(totalesX, totalY + 3, totalesX + totalesWidth, totalY + 3);
            }
            totalY += 5.5;
          });

          currentY = footerY + Math.max(obsLines.length * 4 + 8, totalesHeight) + 5;

          const pagoY = currentY;
          const pagoWidth = (contentWidth - 13.2) / 3;
          const pagoItems = [
            { label: 'Tipo de operación', value: 'Estándar' },
            { label: 'Forma de pago', value: 'Pago de contado' },
            { label: 'Medio de pago', value: 'Efectivo' }
          ];

          pagoItems.forEach((item, idx) => {
            pdf.setFontSize(8); // 10px = 8pt
            pdf.setFont('helvetica', 'bold');
            pdf.text(item.label, margin + idx * (pagoWidth + 6.6), pagoY);
            pdf.setFont('helvetica', 'normal');
            pdf.text(item.value, margin + idx * (pagoWidth + 6.6), pagoY + 4);
          });

          currentY = pagoY + 10;

          pdf.setDrawColor(...black);
          pdf.setLineWidth(0.3);
          pdf.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 5;

          pdf.setFontSize(6); // 8px = 6pt
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...black);
          const footerNote = [
            `Actividad económica: ${companyData.economic_activity || 'Desarrollo de sistemas informáticos'}`,
            'Cotización válida por 15 días calendario',
            'Cotización generada con software propio'
          ];
          footerNote.forEach((line, idx) => {
            pdf.text(line, pageWidth / 2, currentY + idx * 4, { align: 'center' });
          });
        }
      }

      return Buffer.from(pdf.output('arraybuffer'));

    } catch (error) {
      console.error('Error generando PDF buffer de cotización:', error);
      let errorMessage = 'No se pudo generar el PDF de la cotización';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      throw new Error(errorMessage);
    }
  }
}