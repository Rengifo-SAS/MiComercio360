// Servicio para impresión de ventas
// lib/services/sales-print-service.ts

import { createClient } from '@/lib/supabase/client';
import { PrintTemplatesService } from './print-templates-service';
import { Sale } from '@/lib/types/sales';
import { PrintTemplate } from '@/lib/types/print-templates';
import { PDFService } from './pdf-service';

export class SalesPrintService {
  private static supabase = createClient();

  // Obtener plantilla de impresión para facturas
  static async getInvoiceTemplate(companyId: string): Promise<PrintTemplate | null> {
    try {
      // Obtener plantilla por defecto para facturas
      const defaultTemplate = await PrintTemplatesService.getDefaultTemplate(companyId, 'INVOICE');
      if (defaultTemplate) {
        return defaultTemplate;
      }

      // Si no hay plantilla por defecto, obtener la primera activa
      const activeTemplates = await PrintTemplatesService.getActiveTemplates(companyId);

      // Verificar que activeTemplates sea un array válido
      if (Array.isArray(activeTemplates)) {
        const invoiceTemplate = activeTemplates.find(t => t.document_type === 'INVOICE');
        return invoiceTemplate || null;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo plantilla de factura:', error);
      return null;
    }
  }

  // Generar HTML para impresión de venta
  static async generatePrintHTML(sale: Sale, companyId: string, paperSize: 'letter' | 'thermal-80mm' = 'letter'): Promise<string> {
    try {
      console.log('Generando HTML de impresión para venta:', sale.sale_number);

      // Obtener plantilla de impresión
      const template = await this.getInvoiceTemplate(companyId);
      console.log('Plantilla encontrada:', template ? 'Sí' : 'No');

      if (!template) {
        console.log('Usando plantilla por defecto');
        // Plantilla por defecto si no hay configuración
        return await this.generateDefaultPrintHTML(sale, paperSize);
      }

      // Obtener datos de la empresa
      const { data: company, error: companyError } = await this.supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) {
        console.error('Error obteniendo datos de empresa:', companyError);
        throw new Error('No se encontró la información de la empresa');
      }

      if (!company) {
        throw new Error('No se encontró la información de la empresa');
      }

      console.log('Procesando plantilla personalizada');
      // Procesar plantilla con datos de la venta
      return this.processTemplate(template, sale, company, paperSize);
    } catch (error) {
      console.error('Error generando HTML de impresión:', error);
      // Fallback a plantilla por defecto
      return await this.generateDefaultPrintHTML(sale, paperSize);
    }
  }

  // Procesar plantilla con datos de la venta
  private static processTemplate(template: PrintTemplate, sale: Sale, company: any, paperSize: 'letter' | 'thermal-80mm' = 'letter'): string {
    let html = template.body_template || '';

    // Reemplazar variables de la empresa
    html = html.replace(/\{\{company\.name\}\}/g, company.name || 'NOMBRE DE LA EMPRESA');
    html = html.replace(/\{\{company\.business_name\}\}/g, company.business_name || '');
    html = html.replace(/\{\{company\.tax_id\}\}/g, company.tax_id || '');
    html = html.replace(/\{\{company\.email\}\}/g, company.email || '');
    html = html.replace(/\{\{company\.phone\}\}/g, company.phone || '');
    html = html.replace(/\{\{company\.address\}\}/g, company.address || '');
    html = html.replace(/\{\{company\.city\}\}/g, company.city || '');
    html = html.replace(/\{\{company\.state\}\}/g, company.state || '');
    html = html.replace(/\{\{company\.postal_code\}\}/g, company.postal_code || '');
    html = html.replace(/\{\{company\.country\}\}/g, company.country || 'Colombia');
    html = html.replace(/\{\{company\.regimen_tributario\}\}/g, company.regimen_tributario || '');
    html = html.replace(/\{\{company\.tipo_documento\}\}/g, company.tipo_documento || 'NIT');

    // Reemplazar variables de la venta
    html = html.replace(/\{\{sale\.sale_number\}\}/g, sale.sale_number || '0000');
    html = html.replace(/\{\{sale\.created_at\}\}/g, this.formatDate(sale.created_at));
    html = html.replace(/\{\{sale\.subtotal\}\}/g, this.formatCurrency(sale.subtotal || 0));
    html = html.replace(/\{\{sale\.tax_amount\}\}/g, this.formatCurrency(sale.tax_amount || 0));
    html = html.replace(/\{\{sale\.discount_amount\}\}/g, this.formatCurrency(sale.discount_amount || 0));
    html = html.replace(/\{\{sale\.total_amount\}\}/g, this.formatCurrency(sale.total_amount || 0));

    // Agregar variables de impuestos específicos
    html = html.replace(/\{\{sale\.iva_amount\}\}/g, this.formatCurrency(sale.iva_amount || 0));
    html = html.replace(/\{\{sale\.ica_amount\}\}/g, this.formatCurrency(sale.ica_amount || 0));
    html = html.replace(/\{\{sale\.retencion_amount\}\}/g, this.formatCurrency(sale.retencion_amount || 0));

    // Reemplazar información del cliente
    if (sale.customer) {
      html = html.replace(/\{\{customer\.business_name\}\}/g, sale.customer.business_name || sale.customer.name || '');
      html = html.replace(/\{\{customer\.identification_number\}\}/g, sale.customer.identification_number || '');
      html = html.replace(/\{\{customer\.identification_type\}\}/g, sale.customer.identification_type || 'CC');
      html = html.replace(/\{\{customer\.email\}\}/g, sale.customer.email || '');
      html = html.replace(/\{\{customer\.phone\}\}/g, sale.customer.phone || '');
      html = html.replace(/\{\{customer\.address\}\}/g, sale.customer.address || '');
      html = html.replace(/\{\{customer\.city\}\}/g, sale.customer.city || '');
      html = html.replace(/\{\{customer\.state\}\}/g, sale.customer.state || '');
    } else {
      html = html.replace(/\{\{customer\.business_name\}\}/g, 'Consumidor Final');
      html = html.replace(/\{\{customer\.identification_number\}\}/g, '22222222-2');
      html = html.replace(/\{\{customer\.identification_type\}\}/g, 'CC');
      html = html.replace(/\{\{customer\.email\}\}/g, '');
      html = html.replace(/\{\{customer\.phone\}\}/g, '');
      html = html.replace(/\{\{customer\.address\}\}/g, '');
      html = html.replace(/\{\{customer\.city\}\}/g, '');
      html = html.replace(/\{\{customer\.state\}\}/g, '');
    }

    // Generar tabla de items
    const itemsTable = this.generateItemsTable(sale.items || []);
    html = html.replace(/\{\{items_table\}\}/g, itemsTable);

    // Aplicar estilos CSS
    const css = template.css_styles || '';
    if (css) {
      html = `<style>${css}</style>${html}`;
    }

    return html;
  }

  // Generar tabla de items de la venta
  private static generateItemsTable(items: any[]): string {
    if (!items || items.length === 0) {
      return '<p>No hay items en esta venta</p>';
    }

    let table = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descripción</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Cantidad</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Precio Unit.</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Descuento</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
    `;

    items.forEach(item => {
      const itemSubtotal = item.quantity * item.unit_price;
      const discount = item.discount_amount || 0;
      const itemTotal = itemSubtotal - discount;

      // Obtener información del producto
      let productName = 'Producto/Servicio';
      let productSku = '';

      if (item.product && item.product.name) {
        productName = item.product.name;
        if (item.product.sku) {
          productSku = `SKU: ${item.product.sku}`;
        }
      } else if (item.product_name) {
        productName = item.product_name;
      }

      const productDisplay = productSku ? `${productName}\n${productSku}` : productName;

      table += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; white-space: pre-line;">${productDisplay}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(item.unit_price)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${discount > 0 ? this.formatCurrency(discount) : '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${this.formatCurrency(itemTotal)}</td>
        </tr>
      `;
    });

    table += `
        </tbody>
      </table>
    `;

    return table;
  }

  // Generar HTML por defecto si no hay plantilla
  private static async generateDefaultPrintHTML(sale: Sale, paperSize: 'letter' | 'thermal-80mm' = 'letter'): Promise<string> {
    // Obtener datos de la empresa para el formato 80mm
    let companyData = null;
    if (paperSize === 'thermal-80mm') {
      try {
        const { data: company } = await this.supabase
          .from('companies')
          .select('*')
          .eq('id', sale.company_id)
          .single();
        companyData = company;
      } catch (error) {
        console.warn('No se pudieron obtener los datos de la empresa:', error);
      }
    }
    // Estilos CSS optimizados para impresora térmica 80mm con letras MUY grandes y legibles
    const styles = paperSize === 'thermal-80mm' ? `
      body {
        font-family: 'Courier New', monospace;
        margin: 0;
        padding: 2px;
        color: #000;
        font-size: 16px;
        line-height: 1.4;
        max-width: 80mm;
        margin: 0 auto;
      }
      
      /* Header optimizado */
      .header {
        text-align: center;
        margin-bottom: 12px;
      }
      
      /* Información de empresa optimizada con letras MUY grandes */
      .company-info {
        text-align: center;
        margin-bottom: 12px;
        font-size: 16px;
        line-height: 1.3;
      }
      .company-info div {
        margin-bottom: 3px;
      }
      .company-name {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      .company-names {
        font-size: 16px;
        margin-bottom: 4px;
        font-weight: bold;
      }
      .company-num {
        font-size: 16px;
        margin-bottom: 4px;
        font-weight: bold;
      }
      .company-address {
        font-size: 15px;
        margin-bottom: 3px;
        line-height: 1.2;
      }
      .company-contact {
        font-size: 15px;
        margin-bottom: 3px;
      }
      .company-regime {
        font-size: 15px;
        margin-bottom: 8px;
        font-weight: bold;
      }
      
      /* Información de venta optimizada */
      .sale-info {
        margin-bottom: 12px;
        font-size: 16px;
        text-align: center;
      }
      .sale-info div {
        margin-bottom: 4px;
      }
      .sale-number {
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      .sale-date {
        font-size: 16px;
      }
      
      /* Información de cliente optimizada */
      .client-info {
        margin-bottom: 12px;
        font-size: 16px;
        text-align: center;
      }
      .client-info div {
        margin-bottom: 4px;
      }
      .client-label {
        font-weight: bold;
      }
      
      /* Tabla optimizada para 80mm con letras MUY grandes */
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
        font-size: 14px;
      }
      .items-table th,
      .items-table td {
        border: 1px solid #000;
        padding: 6px 3px;
        text-align: left;
        vertical-align: top;
      }
      .items-table th {
        background-color: #f0f0f0;
        font-weight: bold;
        font-size: 13px;
        padding: 7px 3px;
      }
      .items-table .number {
        text-align: right;
        width: 15%;
        font-size: 14px;
        font-weight: bold;
      }
      .items-table .description {
        font-size: 13px;
        line-height: 1.3;
        width: 70%;
        word-wrap: break-word;
        word-break: break-all;
      }
      .items-table .total-col {
        width: 15%;
        font-size: 14px;
        font-weight: bold;
      }
      
      /* Totales optimizados con letras MUY grandes */
      .totals {
        margin-top: 12px;
        text-align: right;
        font-size: 16px;
        line-height: 1.4;
      }
      .totals div {
        margin-bottom: 4px;
      }
      .total-row {
        font-weight: bold;
        font-size: 22px;
        border-top: 3px solid #000;
        border-bottom: 3px solid #000;
        padding: 10px 0;
        margin-top: 10px;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      
      /* Información de pago optimizada */
      .payment-info {
        margin-top: 12px;
        border-top: 2px solid #000;
        padding-top: 8px;
        font-size: 15px;
        line-height: 1.4;
      }
      .payment-info .payment-title {
        font-weight: bold;
        margin-bottom: 6px;
        text-align: center;
        text-transform: uppercase;
        font-size: 16px;
      }
      .payment-info div {
        margin-bottom: 3px;
      }
      
      /* Footer optimizado */
      .footer {
        margin-top: 12px;
        text-align: center;
        font-size: 16px;
        font-weight: bold;
        color: #000;
        line-height: 1.4;
      }
      
      /* Separadores visuales */
      .separator {
        border-top: 2px solid #000;
        margin: 8px 0;
      }
      
      @media print {
        body { 
          margin: 0; 
          padding: 2px; 
          font-size: 15px;
        }
        .no-print { display: none; }
      }
      @media screen {
        body {
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          border-radius: 5px;
          padding: 12px;
        }
      }
    ` : `
      body {
        font-family: Arial, sans-serif;
        margin: 20px;
        color: #333;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #333;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .company-info {
        margin-bottom: 20px;
      }
      .sale-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
      }
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      .items-table th,
      .items-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      .items-table th {
        background-color: #f5f5f5;
      }
      .items-table .number {
        text-align: right;
      }
      .totals {
        margin-top: 20px;
        text-align: right;
      }
      .total-row {
        font-weight: bold;
        font-size: 1.1em;
        border-top: 2px solid #333;
        padding-top: 10px;
      }
      @media print {
        body { margin: 0; }
        .no-print { display: none; }
      }
    `;

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura de Venta - ${sale.sale_number}</title>
        <style>
          ${styles}
        </style>
      </head>
      <body>
        ${paperSize === 'thermal-80mm' ? `
        <!-- Formato optimizado para impresora térmica 80mm -->
        <div class="header">
          <div class="company-info">
            <div class="company-name">${companyData?.name || 'EMPRESA'}</div>
            ${companyData?.business_name ? `<div class="company-names">${companyData.business_name}</div>` : ''}
            <div class="company-num">NIT ${companyData?.tax_id || '0000000000-0'}</div>
            ${companyData?.address ? `<div class="company-address">${companyData.address}</div>` : ''}
            ${companyData?.city || companyData?.state ? `<div class="company-address">${[companyData?.city, companyData?.state].filter(Boolean).join(', ')}</div>` : ''}
            ${companyData?.phone ? `<div class="company-contact">Tel: ${companyData.phone}</div>` : ''}
            ${companyData?.email ? `<div class="company-contact">${companyData.email}</div>` : ''}
            ${companyData?.regimen_tributario ? `<div class="company-regime">Régimen: ${companyData.regimen_tributario}</div>` : ''}
          </div>
          
          <div class="separator"></div>
          
          <div class="sale-info">
            <div class="sale-number">N° ${sale.sale_number}</div>
            <div class="sale-date">Fecha: ${this.formatDate(sale.created_at)}</div>
          </div>
          
          <div class="separator"></div>
          
          <div class="client-info">
            <div><span class="client-label">Cliente:</span> ${sale.customer?.business_name || sale.customer?.name || 'Consumidor Final'}</div>
            ${sale.customer?.identification_number ? `<div>NIT: ${sale.customer.identification_number}</div>` : ''}
          </div>
        </div>
        ` : `
        <!-- Formato para tamaño carta -->
        <div class="header">
          <h1>FACTURA DE VENTA</h1>
          <h2>N° ${sale.sale_number}</h2>
        </div>

        <div class="sale-info">
          <div>
            <strong>Fecha:</strong> ${this.formatDate(sale.created_at)}
          </div>
          <div>
            <strong>Cliente:</strong> ${sale.customer?.business_name || sale.customer?.name || 'Consumidor Final'}
            ${sale.customer?.identification_number ? ` (${sale.customer.identification_type || 'CC'}: ${sale.customer.identification_number})` : ''}
          </div>
        </div>
        `}

        ${paperSize === 'thermal-80mm' ? `
        <!-- Tabla optimizada para 80mm -->
        <table class="items-table">
          <thead>
            <tr>
              <th class="description">Descripción</th>
              <th class="number">Cant.</th>
              <th class="total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(sale.items || []).map(item => {
      const itemSubtotal = item.quantity * item.unit_price;
      const discount = item.discount_amount || 0;
      const itemTotal = itemSubtotal - discount;

      // Obtener información del producto optimizada
      let productName = 'Producto/Servicio';
      let productSku = '';

      if (item.product && item.product.name) {
        // Truncar nombre de producto largo para mejor visualización
        productName = item.product.name.length > 30 ?
          item.product.name.substring(0, 27) + '...' :
          item.product.name;

        if (item.product.sku) {
          // Truncar SKU largo para mejor visualización
          const sku = item.product.sku.length > 20 ?
            item.product.sku.substring(0, 17) + '...' :
            item.product.sku;
          productSku = `SKU: ${sku}`;
        }
      } else if (item.product_name) {
        productName = item.product_name.length > 30 ?
          item.product_name.substring(0, 27) + '...' :
          item.product_name;
      }

      // Formato optimizado para mostrar nombre y SKU en líneas separadas
      const productDisplay = productSku ?
        `${productName}<br/>${productSku}` :
        productName;

      return `
                <tr>
                  <td class="description">${productDisplay}</td>
                  <td class="number">${item.quantity}</td>
                  <td class="total-col">${this.formatCurrencyCompact(itemTotal)}</td>
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
        ` : `
        <!-- Tabla completa para tamaño carta -->
        <table class="items-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th class="number">Cantidad</th>
              <th class="number">Precio Unit.</th>
              <th class="number">Descuento</th>
              <th class="number">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(sale.items || []).map(item => {
      const itemSubtotal = item.quantity * item.unit_price;
      const discount = item.discount_amount || 0;
      const itemTotal = itemSubtotal - discount;

      // Obtener información del producto
      let productName = 'Producto/Servicio';
      let productSku = '';

      if (item.product && item.product.name) {
        productName = item.product.name;
        if (item.product.sku) {
          productSku = `SKU: ${item.product.sku}`;
        }
      } else if (item.product_name) {
        productName = item.product_name;
      }

      const productDisplay = productSku ? `${productName} - ${productSku}` : productName;

      return `
                <tr>
                  <td>${productDisplay}</td>
                  <td class="number">${item.quantity}</td>
                  <td class="number">${this.formatCurrency(item.unit_price)}</td>
                  <td class="number">${discount > 0 ? this.formatCurrency(discount) : '-'}</td>
                  <td class="number">${this.formatCurrency(itemTotal)}</td>
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
        `}

        ${paperSize === 'thermal-80mm' ? `
        <div class="totals">
          <div>Subtotal: ${this.formatCurrencyCompact(sale.subtotal || 0)}</div>
          ${sale.discount_amount && sale.discount_amount > 0 ? `<div>Descuento: -${this.formatCurrencyCompact(sale.discount_amount)}</div>` : ''}
          ${sale.iva_amount && sale.iva_amount > 0 ? `<div>IVA: ${this.formatCurrencyCompact(sale.iva_amount)}</div>` : ''}
          ${sale.ica_amount && sale.ica_amount > 0 ? `<div>ICA: ${this.formatCurrencyCompact(sale.ica_amount)}</div>` : ''}
          ${sale.retencion_amount && sale.retencion_amount > 0 ? `<div>Retención: -${this.formatCurrencyCompact(sale.retencion_amount)}</div>` : ''}
          ${sale.tax_amount && sale.tax_amount > 0 && (!sale.iva_amount && !sale.ica_amount && !sale.retencion_amount) ? `<div>Impuestos: ${this.formatCurrencyCompact(sale.tax_amount)}</div>` : ''}
          <div class="total-row">TOTAL: ${this.formatCurrencyCompact(sale.total_amount || 0)}</div>
        </div>
        ` : `
        <div class="totals">
          <div>Subtotal: ${this.formatCurrency(sale.subtotal || 0)}</div>
          ${sale.discount_amount && sale.discount_amount > 0 ? `<div>Descuento: -${this.formatCurrency(sale.discount_amount)}</div>` : ''}
          ${sale.iva_amount && sale.iva_amount > 0 ? `<div>IVA: ${this.formatCurrency(sale.iva_amount)}</div>` : ''}
          ${sale.ica_amount && sale.ica_amount > 0 ? `<div>ICA: ${this.formatCurrency(sale.ica_amount)}</div>` : ''}
          ${sale.retencion_amount && sale.retencion_amount > 0 ? `<div>Retención: -${this.formatCurrency(sale.retencion_amount)}</div>` : ''}
          ${sale.tax_amount && sale.tax_amount > 0 && (!sale.iva_amount && !sale.ica_amount && !sale.retencion_amount) ? `<div>Impuestos: ${this.formatCurrency(sale.tax_amount)}</div>` : ''}
          <div class="total-row">TOTAL: ${this.formatCurrency(sale.total_amount || 0)}</div>
        </div>
        `}
        
        ${paperSize === 'thermal-80mm' ? `
        <!-- Información de pago optimizada para 80mm -->
        <div class="payment-info">
          <div class="payment-title">INFORMACIÓN DE PAGO</div>
          <div>Método: ${this.getPaymentMethodName(sale.payment_method)}</div>
          ${sale.payment_reference ? `<div>Referencia: ${sale.payment_reference}</div>` : ''}
          ${sale.payment_amount_received ? `<div>Recibido: ${this.formatCurrencyCompact(sale.payment_amount_received)}</div>` : ''}
          ${sale.payment_change !== undefined && sale.payment_change !== null ? `<div>Cambio: ${this.formatCurrencyCompact(sale.payment_change)}</div>` : ''}
        </div>
        ` : `
        <!-- Información de pago para tamaño carta -->
          <div style="margin-top: 15px; border-top: 1px solid #000; padding-top: 10px;">
            <div style="font-weight: bold; margin-bottom: 5px;">INFORMACIÓN DE PAGO</div>
            <div>Método: ${this.getPaymentMethodName(sale.payment_method)}</div>
            ${sale.payment_reference ? `<div>Referencia: ${sale.payment_reference}</div>` : ''}
            ${sale.payment_amount_received ? `<div>Recibido: ${this.formatCurrency(sale.payment_amount_received)}</div>` : ''}
            ${sale.payment_change !== undefined && sale.payment_change !== null ? `<div>Cambio: ${this.formatCurrency(sale.payment_change)}</div>` : ''}
          </div>
        `}

        ${paperSize === 'thermal-80mm' ? `
        <!-- Footer optimizado para 80mm -->
        <div class="footer">
          ¡Gracias por su compra!
        </div>
        ` : `
        <!-- Footer para tamaño carta -->
        <div style="margin-top: 50px; text-align: center; font-size: 0.9em; color: #666;">
          <p>Gracias por su compra</p>
        </div>
        `}
      </body>
      </html>
    `;
  }

  // Formatear moneda optimizado para impresoras térmicas
  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Formatear moneda compacto para 80mm con mejor legibilidad
  private static formatCurrencyCompact(amount: number): string {
    return `$${amount.toLocaleString('es-CO')}`;
  }

  // Formatear fecha
  private static formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-CO');
    } catch (e) {
      return 'N/A';
    }
  }

  // Obtener nombre del método de pago
  private static getPaymentMethodName(paymentMethod: any): string {
    if (!paymentMethod) return 'No especificado';

    // Si es un objeto PaymentMethod, usar el name
    if (typeof paymentMethod === 'object' && paymentMethod.name) {
      return paymentMethod.name;
    }

    // Si es un string, mapear a nombres legibles
    if (typeof paymentMethod === 'string') {
      const methodNames: { [key: string]: string } = {
        'cash': 'Efectivo',
        'card': 'Tarjeta',
        'transfer': 'Transferencia',
        'check': 'Cheque',
        'digital_wallet': 'Billetera Digital',
        'CASH': 'Efectivo',
        'CARD': 'Tarjeta',
        'TRANSFER': 'Transferencia',
        'CHECK': 'Cheque',
        'DIGITAL_WALLET': 'Billetera Digital'
      };
      return methodNames[paymentMethod] || paymentMethod;
    }

    return 'No especificado';
  }

  // Imprimir venta
  static async printSale(sale: Sale, companyId: string, paperSize: 'letter' | 'thermal-80mm' = 'letter'): Promise<void> {
    try {
      const html = await this.generatePrintHTML(sale, companyId, paperSize);

      // Crear ventana de impresión
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('No se pudo abrir la ventana de impresión. Verifique que los pop-ups estén habilitados.');
      }

      printWindow.document.write(html);
      printWindow.document.close();

      // Esperar a que se cargue el contenido y luego imprimir
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();

        // Cerrar la ventana después de imprimir
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      };
    } catch (error) {
      console.error('Error imprimiendo venta:', error);
      throw error;
    }
  }

  // Generar PDF de la venta
  static async generatePDF(sale: Sale, companyId: string, paperSize: 'letter' | 'thermal-80mm' = 'letter'): Promise<void> {
    try {
      console.log('Generando PDF para venta:', sale.sale_number);

      // Validar datos de la venta
      if (!sale) {
        throw new Error('No se proporcionaron datos de la venta');
      }

      if (!companyId) {
        throw new Error('No se proporcionó el ID de la empresa');
      }

      // Obtener datos de la empresa
      const { data: company, error: companyError } = await this.supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) {
        console.error('Error obteniendo datos de empresa:', companyError);
        throw new Error('No se encontró la información de la empresa');
      }

      if (!company) {
        throw new Error('No se encontró la información de la empresa');
      }

      console.log('Datos de empresa obtenidos:', company.name);

      const filename = `factura-${sale.sale_number || '0000'}.pdf`;

      // Configurar formato según el tamaño de papel
      const pdfOptions = paperSize === 'thermal-80mm' ? {
        format: 'custom' as const,
        orientation: 'portrait' as const,
        margin: 5,
        customWidth: 80,
        customHeight: 200
      } : {
        format: 'a4' as const,
        orientation: 'portrait' as const,
        margin: 20
      };

      await PDFService.generateSalePDF(sale, company, filename, pdfOptions);

      console.log('PDF generado exitosamente:', filename);
    } catch (error) {
      console.error('Error generando PDF:', error);

      // Proporcionar información más específica del error
      let errorMessage = 'No se pudo generar el PDF de la factura';

      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  }


  // Generar PDF como buffer para envío por correo (versión para cliente)
  static async generatePDFBuffer(sale: Sale, companyId: string, paperSize: 'letter' | 'thermal-80mm' = 'letter'): Promise<Buffer> {
    try {
      console.log('Generando PDF buffer para venta:', sale.sale_number);

      // Validar datos de la venta
      if (!sale) {
        throw new Error('No se proporcionaron datos de la venta');
      }

      if (!companyId) {
        throw new Error('No se proporcionó el ID de la empresa');
      }

      // Obtener datos de la empresa usando el cliente del lado del cliente
      const { data: company, error: companyError } = await this.supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) {
        console.error('Error obteniendo datos de empresa:', companyError);
        throw new Error('No se encontró la información de la empresa');
      }

      if (!company) {
        throw new Error('No se encontró la información de la empresa');
      }

      console.log('Datos de empresa obtenidos:', company.name);

      // Configurar formato según el tamaño de papel
      const pdfOptions = paperSize === 'thermal-80mm' ? {
        format: 'custom' as const,
        orientation: 'portrait' as const,
        margin: 5,
        customWidth: 80,
        customHeight: 200
      } : {
        format: 'a4' as const,
        orientation: 'portrait' as const,
        margin: 20
      };

      const pdfBuffer = await PDFService.generateSalePDFBuffer(sale, company, pdfOptions);

      console.log('PDF buffer generado exitosamente');
      return pdfBuffer;
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
}
