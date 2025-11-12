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


      // Si estamos offline, evitar llamadas de red y usar plantilla por defecto
      const isBrowser = typeof window !== 'undefined';
      const isOffline = isBrowser ? !navigator.onLine : false;

      if (isOffline) {
        return await this.generateDefaultPrintHTML(sale, paperSize);
      }

      // Obtener plantilla de impresión (intenta red, con fallback interno)
      const template = await this.getInvoiceTemplate(companyId);

      if (!template) {
        // Plantilla por defecto si no hay configuración
        return await this.generateDefaultPrintHTML(sale, paperSize);
      }

      // Obtener datos de la empresa
      let company;
      try {
        const { data, error: companyError } = await this.supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (companyError) throw companyError;
        company = data;
      } catch (error) {
        // Fallback a caché offline
        try {
          const { offlineStorage } = await import('./offline-storage-service');
          company = await offlineStorage.getCachedCompany(companyId);

        } catch (cacheError) {
          console.error('Error obteniendo empresa del cache:', cacheError);
        }
      }

      if (!company) {
        throw new Error('No se encontró la información de la empresa');
      }


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
    // Obtener datos de la empresa con preferencia por cache si estamos offline
    let companyData = null;
    const isBrowser = typeof window !== 'undefined';
    const isOffline = isBrowser ? !navigator.onLine : false;

    if (isOffline) {
      try {
        const { offlineStorage } = await import('./offline-storage-service');
        companyData = await offlineStorage.getCachedCompany(sale.company_id);

      } catch (cacheError) {
        console.error('Error obteniendo empresa del cache:', cacheError);
      }
    } else {
      try {
        const { data: company, error } = await this.supabase
          .from('companies')
          .select('*')
          .eq('id', sale.company_id)
          .single();

        if (error) throw error;

        if (company) {
          companyData = company;

        }
      } catch (error) {

        // Fallback a caché offline
        try {
          const { offlineStorage } = await import('./offline-storage-service');
          companyData = await offlineStorage.getCachedCompany(sale.company_id);

        } catch (cacheError) {
          console.error('Error obteniendo empresa del cache:', cacheError);
        }
      }
    }
    // Estilos CSS profesionales y optimizados según el tamaño de papel
    // Mejorados con técnicas de PDF.js para mejor legibilidad y accesibilidad
    const styles = paperSize === 'thermal-80mm' ? `
      /* ===== ESTILOS PROFESIONALES PARA TICKET TÉRMICO 80MM ===== */
      :root {
        --invoice-primary-color: #000;
        --invoice-secondary-color: #333;
        --invoice-tertiary-color: #666;
        --invoice-border-color: #999;
        --invoice-bg-light: #f9f9f9;
        --invoice-bg-medium: #f5f5f5;
        --invoice-separator-color: #ddd;
        --invoice-table-header-bg: #000;
        --invoice-table-header-color: #fff;
        --invoice-table-border: #ddd;
        --invoice-text-primary: #000;
        --invoice-text-secondary: #333;
        --invoice-text-tertiary: #666;
        --invoice-spacing-xs: 1mm;
        --invoice-spacing-sm: 2mm;
        --invoice-spacing-md: 3mm;
        --invoice-spacing-lg: 4mm;
        --invoice-font-family: 'Arial', 'Helvetica', sans-serif;
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: var(--invoice-font-family);
        width: 80mm;
        max-width: 80mm;
        margin: 0 auto;
        padding: var(--invoice-spacing-md);
        color: var(--invoice-text-primary);
        background: #fff;
        font-size: 9pt;
        line-height: 1.4;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      /* Header profesional */
      .header {
        text-align: center;
        margin-bottom: 8mm;
        padding-bottom: 4mm;
        border-bottom: 2px dashed #333;
      }

      /* Logo placeholder */
      .logo-space {
        height: 15mm;
        margin-bottom: 3mm;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Información de empresa */
      .company-info {
        text-align: center;
        margin-bottom: 3mm;
      }

      .company-name {
        font-size: 13pt;
        font-weight: bold;
        margin-bottom: 2mm;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        line-height: 1.2;
      }

      .company-nit {
        font-size: 9pt;
        font-weight: 600;
        margin-bottom: 1.5mm;
      }

      .company-address,
      .company-contact {
        font-size: 8pt;
        line-height: 1.3;
        margin-bottom: 1mm;
        color: #333;
      }

      .company-regime {
        font-size: 8pt;
        margin-top: 2mm;
        padding: 1.5mm 0;
        background: #f5f5f5;
        font-weight: 600;
      }

      /* Información de factura */
      .invoice-box {
        border: 3px solid #000;
        padding: 3mm;
        margin: 3mm 0;
        text-align: center;
        border-radius: 2mm;
      }

      .invoice-title {
        font-size: 10pt;
        font-weight: bold;
        margin-bottom: 1mm;
        text-transform: uppercase;
        color: #000;
      }

      .invoice-number {
        font-size: 14pt;
        font-weight: bold;
        letter-spacing: 1px;
        color: #000;
      }

      .invoice-date {
        font-size: 8pt;
        margin-top: 1.5mm;
        color: #333;
      }

      /* Información de cliente */
      .client-section {
        margin: 4mm 0;
        padding: 2.5mm;
        background: #f9f9f9;
        border-left: 3px solid #333;
      }

      .client-title {
        font-size: 8pt;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 2mm;
        color: #555;
      }

      .client-info {
        font-size: 8.5pt;
        line-height: 1.4;
      }

      .client-info div {
        margin-bottom: 1mm;
      }

      .client-label {
        font-weight: 600;
        display: inline-block;
        min-width: 20mm;
      }

      /* Separador */
      .separator {
        border: none;
        border-top: 1px dashed #999;
        margin: 3mm 0;
      }

      .separator-solid {
        border-top: 2px solid #000;
      }

      /* Tabla de productos mejorada */
      .items-section {
        margin: 4mm 0;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8pt;
      }

      .items-table thead {
        border-top: 2px solid var(--invoice-table-header-bg);
        border-bottom: 2px solid var(--invoice-table-header-bg);
        background-color: var(--invoice-table-header-bg);
      }

      .items-table th {
        padding: 2mm 1mm;
        text-align: left;
        font-weight: bold;
        font-size: 8pt;
        text-transform: uppercase;
        color: var(--invoice-table-header-color);
        background-color: var(--invoice-table-header-bg);
        border-bottom: 2px solid var(--invoice-table-header-bg);
      }

      .items-table th.text-center {
        text-align: center;
      }

      .items-table th.text-right {
        text-align: right;
      }

      .items-table td {
        padding: 2mm 1mm;
        border-bottom: 1px solid var(--invoice-table-border);
        vertical-align: top;
        background-color: #fff;
      }

      .items-table tbody tr:nth-child(even) td {
        background-color: var(--invoice-bg-medium);
      }

      .items-table tbody tr:last-child td {
        border-bottom: 2px solid #333;
      }

      .items-table .description {
        font-weight: 500;
        line-height: 1.3;
      }

      .items-table .description small {
        display: block;
        font-size: 7pt;
        color: #666;
        margin-top: 0.5mm;
      }

      .items-table .text-center {
        text-align: center;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        font-feature-settings: 'tnum';
      }

      .items-table .text-right {
        text-align: right;
        font-weight: bold;
        font-variant-numeric: tabular-nums;
        font-feature-settings: 'tnum';
      }

      /* Totales mejorados */
      .totals-section {
        margin: 4mm 0;
      }

      .totals {
        font-size: 9pt;
      }

      .totals-row {
        display: flex;
        justify-content: space-between;
        padding: 1.5mm 0;
        border-bottom: 1px solid #eee;
      }

      .totals-row:last-child {
        border-bottom: none;
      }

      .totals-label {
        font-weight: 500;
        color: #555;
      }

      .totals-value {
        font-weight: 600;
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-feature-settings: 'tnum';
      }

      .total-final {
        border-top: 3px double #000;
        border-bottom: 3px double #000;
        padding: 3mm;
        margin-top: 2mm;
        font-size: 11pt;
      }

      .total-final .totals-label {
        color: #000;
        font-weight: bold;
        text-transform: uppercase;
      }

      .total-final .totals-value {
        font-weight: bold;
        font-size: 13pt;
        letter-spacing: 0.5px;
        color: #000;
      }

      /* Información de pago */
      .payment-section {
        margin: 4mm 0;
        padding: 2.5mm;
        background: #f9f9f9;
        border-radius: 2mm;
      }

      .payment-title {
        font-size: 8pt;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 2mm;
        text-align: center;
        color: #555;
      }

      .payment-info {
        font-size: 8.5pt;
        line-height: 1.5;
      }

      .payment-info div {
        display: flex;
        justify-content: space-between;
        padding: 1mm 0;
      }

      .payment-label {
        font-weight: 500;
        color: #666;
      }

      .payment-value {
        font-weight: 600;
      }

      /* Footer profesional */
      .footer {
        margin-top: 6mm;
        padding-top: 3mm;
        border-top: 2px dashed #333;
        text-align: center;
      }

      .footer-message {
        font-size: 10pt;
        font-weight: bold;
        margin-bottom: 2mm;
      }

      .footer-legal {
        font-size: 7pt;
        color: #666;
        line-height: 1.3;
        margin-top: 2mm;
      }

      .footer-tech {
        font-size: 6.5pt;
        color: #999;
        margin-top: 3mm;
        font-style: italic;
      }

      /* Estilos de impresión */
      @media print {
        body {
          margin: 0;
          padding: 3mm;
        }
        .no-print {
          display: none !important;
        }
        .separator,
        .header {
          page-break-inside: avoid;
        }
      }

      /* Vista previa en pantalla */
      @media screen {
        body {
          background: #fff;
          box-shadow: 0 0 10mm rgba(0,0,0,0.1);
          margin: 5mm auto;
        }
      }
    ` : `
      /* ===== ESTILOS ESTILO  PARA TAMAÑO CARTA ===== */
      :root {
        --invoice-primary-color: #000;
        --invoice-secondary-color: #333;
        --invoice-tertiary-color: #666;
        --invoice-border-color: #999;
        --invoice-bg-light: #f9f9f9;
        --invoice-bg-medium: #d9d9d9;
        --invoice-separator-color: #ddd;
        --invoice-table-header-bg: #d9d9d9;
        --invoice-table-header-color: #000;
        --invoice-table-border: #999;
        --invoice-text-primary: #000;
        --invoice-text-secondary: #333;
        --invoice-text-tertiary: #666;
        --invoice-spacing-xs: 0.5mm;
        --invoice-spacing-sm: 1mm;
        --invoice-spacing-md: 1.5mm;
        --invoice-spacing-lg: 2mm;
        --invoice-spacing-xl: 3mm;
        --invoice-font-family: 'Arial', 'Helvetica', sans-serif;
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      @page {
        size: letter;
        margin: 0;
      }

      body {
        font-family: var(--invoice-font-family);
        width: 8.5in;
        margin: 0 auto;
        padding: 8mm;
        color: var(--invoice-text-primary);
        background: #fff;
        font-size: 7.5pt;
        line-height: 1.2;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      /* Header limpio estilo  */
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 4mm;
        padding-bottom: 0;
        border-bottom: none;
      }

      .header-left {
        flex: 1;
        max-width: 55%;
      }

      .header-right {
        width: 75mm;
        text-align: right;
        padding: 0;
        background: none;
        box-shadow: none;
        border-radius: 0;
        color: #000;
      }

      /* Información de empresa estilo  */
      .company-logo {
        max-width: 50mm;
        max-height: 16mm;
        margin-bottom: 2mm;
      }

      .company-name {
        font-size: 10pt;
        font-weight: bold;
        color: #000;
        margin-bottom: 0.5mm;
        text-transform: uppercase;
        letter-spacing: 0.2px;
        line-height: 1.2;
      }

      .company-nit {
        font-size: 7.5pt;
        font-weight: normal;
        color: #000;
        margin-bottom: 1mm;
      }

      .company-details {
        font-size: 7pt;
        color: #000;
        line-height: 1.3;
      }

      .company-details div {
        margin-bottom: 0.3mm;
      }

      .company-regime {
        margin-top: 1mm;
        padding: 0;
        font-weight: normal;
        color: #000;
        font-size: 7pt;
      }

      /* Box de factura estilo  */
      .invoice-box {
        text-align: right;
      }

      .invoice-title {
        font-size: 9pt;
        font-weight: bold;
        margin-bottom: 0.5mm;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        color: #000;
      }

      .invoice-number {
        font-size: 13pt;
        font-weight: bold;
        margin-bottom: 1mm;
        letter-spacing: 0.3px;
        color: #000;
      }

      .invoice-meta {
        font-size: 7pt;
        line-height: 1.4;
        color: #000;
      }

      .invoice-meta div {
        margin-bottom: 0.5mm;
      }

      .invoice-label {
        font-weight: normal;
        display: inline;
        text-align: right;
      }

      /* Información del cliente estilo  */
      .client-section {
        background: none;
        padding: 0;
        margin: 3mm 0;
        border: none;
        border-radius: 0;
        box-shadow: none;
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 0;
        font-size: 7.5pt;
      }

      .client-row {
        display: grid;
        grid-template-columns: 2fr 1fr;
        background: #d9d9d9;
        border: 1px solid #999;
        min-height: 6mm;
      }

      .client-row + .client-row {
        border-top: none;
      }

      .client-label {
        background: #d9d9d9;
        padding: 1.5mm 2mm;
        font-weight: bold;
        color: #000;
        text-transform: uppercase;
        font-size: 7pt;
        border-right: 1px solid #999;
        display: flex;
        align-items: center;
      }

      .client-value {
        background: #fff;
        padding: 1.5mm 2mm;
        color: #000;
        display: flex;
        align-items: center;
        font-weight: normal;
        font-size: 7pt;
      }

      .date-label {
        background: #d9d9d9;
        padding: 1.5mm 2mm;
        font-weight: bold;
        color: #000;
        text-transform: uppercase;
        font-size: 7pt;
        border-right: 1px solid #999;
        border-left: 1px solid #999;
        display: flex;
        align-items: center;
      }

      .date-value {
        background: #fff;
        padding: 1.5mm 2mm;
        color: #000;
        display: flex;
        align-items: center;
        font-size: 7pt;
      }

      .section-title {
        display: none;
      }

      .client-grid {
        display: block;
      }

      .client-field {
        display: none;
      }

      .field-label {
        display: none;
      }

      .field-value {
        display: none;
      }

      /* Tabla de productos estilo  */
      .items-section {
        margin: 3mm 0;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 7pt;
        border: 1px solid #999;
      }

      .items-table thead {
        background: var(--invoice-table-header-bg);
        color: var(--invoice-table-header-color);
      }

      .items-table th {
        padding: var(--invoice-spacing-sm) var(--invoice-spacing-md);
        text-align: left;
        font-weight: bold;
        font-size: 7pt;
        text-transform: uppercase;
        border: 1px solid var(--invoice-table-border);
        background: var(--invoice-table-header-bg);
        color: var(--invoice-table-header-color);
      }

      .items-table tbody tr:nth-child(even) {
        background: var(--invoice-bg-light);
      }

      .items-table tbody tr:nth-child(even) td {
        background: var(--invoice-bg-light);
      }

      .items-table th.text-center { text-align: center; }
      .items-table th.text-right { text-align: right; }

      .items-table tbody tr {
        border: none;
      }

      .items-table tbody tr:nth-child(even) {
        background: #fff;
      }

      .items-table tbody tr:hover {
        background: inherit;
      }

      .items-table tbody tr:last-child {
        border-bottom: none;
      }

      .items-table td {
        padding: var(--invoice-spacing-sm) var(--invoice-spacing-md);
        vertical-align: top;
        border: 1px solid var(--invoice-table-border);
        background: #fff;
      }

      .items-table .description {
        font-weight: normal;
        color: #000;
        line-height: 1.2;
      }

      .items-table .description small {
        display: block;
        font-size: 6.5pt;
        color: #666;
        margin-top: 0.3mm;
        font-weight: normal;
      }

      .items-table .text-center {
        text-align: center;
        font-weight: normal;
        font-variant-numeric: tabular-nums;
        font-feature-settings: 'tnum';
      }

      .items-table .text-right {
        text-align: right;
        font-weight: normal;
        color: var(--invoice-text-primary);
        font-variant-numeric: tabular-nums;
        font-feature-settings: 'tnum';
      }

      .items-table .item-id {
        text-align: center;
        font-weight: normal;
        width: 6mm;
        font-variant-numeric: tabular-nums;
        font-feature-settings: 'tnum';
      }

      /* Totales estilo  */
      .totals-section {
        margin-top: 3mm;
        display: flex;
        justify-content: flex-end;
      }

      .totals-box {
        width: 50mm;
        background: #fff;
        border: none;
        border-radius: 0;
        overflow: visible;
        box-shadow: none;
      }

      .totals-row {
        display: flex;
        justify-content: space-between;
        padding: 1mm 0;
        font-size: 7.5pt;
        border-bottom: none;
      }

      .totals-row:last-child {
        border-bottom: none;
      }

      .totals-label {
        font-weight: normal;
        color: #000;
      }

      .totals-value {
        font-weight: normal;
        color: var(--invoice-text-primary);
        font-variant-numeric: tabular-nums;
        font-feature-settings: 'tnum';
        text-align: right;
      }

      .total-final {
        background: var(--invoice-bg-medium);
        color: var(--invoice-text-primary);
        padding: var(--invoice-spacing-md) var(--invoice-spacing-lg);
        margin-top: var(--invoice-spacing-sm);
        border: 1px solid var(--invoice-table-border);
      }

      .total-final .totals-label {
        color: #000;
        font-weight: bold;
        text-transform: none;
        font-size: 7.5pt;
        letter-spacing: 0;
      }

      .total-final .totals-value {
        font-weight: bold;
        font-size: 7.5pt;
        color: #000;
        letter-spacing: 0;
      }

      .total-lines {
        font-size: 6.5pt;
        color: #000;
        margin-top: 1mm;
        text-align: right;
      }

      /* Información de pago */
      .payment-section {
        display: none;
      }

      .payment-title {
        display: none;
      }

      .payment-grid {
        display: none;
      }

      .payment-item {
        display: none;
      }

      .payment-label {
        display: none;
      }

      .payment-value {
        display: none;
      }

      /* Total en letras */
      .total-words {
        font-size: 7pt;
        color: #000;
        margin: 3mm 0;
        padding: 1mm 0;
        font-weight: normal;
      }

      /* Footer estilo  */
      .footer {
        margin-top: 6mm;
        padding-top: 0;
        border-top: none;
      }

      .footer-message {
        display: none;
      }

      .footer-legal {
        font-size: 6pt;
        color: #000;
        line-height: 1.3;
        text-align: justify;
        margin-bottom: 3mm;
        padding: 0;
      }

      .footer-signatures {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15mm;
        margin-top: 10mm;
        padding: 0;
      }

      .signature-box {
        text-align: center;
      }

      .signature-line {
        border-top: 1px solid #000;
        margin-bottom: 1.5mm;
        padding-top: 0;
        min-height: 12mm;
      }

      .signature-label {
        font-size: 6.5pt;
        font-weight: normal;
        text-transform: uppercase;
        color: #000;
        letter-spacing: 0;
      }

      .footer-tech {
        text-align: center;
        font-size: 5.5pt;
        color: #666;
        margin-top: 3mm;
        font-style: normal;
      }

      .qr-section {
        margin: 5mm 0;
        text-align: left;
        font-size: 7pt;
        line-height: 1.5;
        color: #000;
      }

      .cufe-text {
        word-break: break-all;
        font-family: monospace;
        font-size: 6.5pt;
      }

      /* Numeración de páginas */
      .page-number {
        position: fixed;
        bottom: 8mm;
        right: 15mm;
        font-size: 8pt;
        color: #999;
      }

      /* Estilos de impresión */
      @media print {
        body {
          margin: 0;
          padding: 15mm;
        }
        .no-print {
          display: none !important;
        }
        .items-table tbody tr:hover {
          background: inherit;
        }
        .page-header,
        .items-section {
          page-break-inside: avoid;
        }
      }

      /* Vista previa en pantalla */
      @media screen {
        body {
          background: #f5f5f5;
          box-shadow: 0 0 10mm rgba(0,0,0,0.1);
          margin: 10mm auto;
        }
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
        <!-- ============================================ -->
        <!-- FORMATO PROFESIONAL PARA TICKET TÉRMICO 80MM -->
        <!-- ============================================ -->

        <div class="header">
          <div class="company-info">
            <div class="company-name">${companyData?.name || 'NOMBRE DE EMPRESA'}</div>
            ${companyData?.tax_id ? `<div class="company-nit">NIT: ${companyData.tax_id}</div>` : ''}
            ${companyData?.address ? `<div class="company-address">${companyData.address}</div>` : ''}
            ${companyData?.city || companyData?.state ? `<div class="company-contact">${[companyData?.city, companyData?.state].filter(Boolean).join(', ')}</div>` : ''}
            ${companyData?.phone ? `<div class="company-contact">Tel: ${companyData.phone}</div>` : ''}
            ${companyData?.email ? `<div class="company-contact">${companyData.email}</div>` : ''}
            ${companyData?.regimen_tributario ? `<div class="company-regime">${companyData.regimen_tributario}</div>` : ''}
          </div>
        </div>

        <div class="invoice-box">
          <div class="invoice-title">Factura de Venta</div>
          <div class="invoice-number">${sale.sale_number || '0000'}</div>
          <div class="invoice-date">Fecha: ${this.formatDate(sale.created_at)}</div>
        </div>

        <div class="client-section">
          <div class="client-title">Información del Cliente</div>
          <div class="client-info">
            <div><span class="client-label">Cliente:</span> ${sale.customer?.business_name || sale.customer?.name || 'Consumidor Final'}</div>
            ${sale.customer?.identification_number ? `<div><span class="client-label">${sale.customer?.identification_type || 'CC'}:</span> ${sale.customer.identification_number}</div>` : ''}
            ${sale.customer?.phone ? `<div><span class="client-label">Tel:</span> ${sale.customer.phone}</div>` : ''}
          </div>
        </div>

        <hr class="separator" />
        ` : `
        <!-- ============================================ -->
        <!-- FORMATO PROFESIONAL PARA TAMAÑO CARTA -->
        <!-- ============================================ -->

        <div class="page-header">
          <div class="header-left">
            <div class="company-name">${companyData?.name || 'NOMBRE DE EMPRESA'}</div>
            ${companyData?.tax_id ? `<div class="company-nit">NIT: ${companyData.tax_id}</div>` : ''}
            <div class="company-details">
              ${companyData?.address ? `<div>${companyData.address}</div>` : ''}
              ${companyData?.city || companyData?.state ? `<div>${[companyData?.city, companyData?.state].filter(Boolean).join(', ')}</div>` : ''}
              ${companyData?.phone ? `<div>Tel: ${companyData.phone}</div>` : ''}
              ${companyData?.email ? `<div>${companyData.email}</div>` : ''}
            </div>
            ${companyData?.regimen_tributario ? `<div class="company-regime">Régimen: ${companyData.regimen_tributario}</div>` : ''}
          </div>

          <div class="header-right">
            <div class="invoice-box">
              <div class="invoice-title">Factura de Venta</div>
              <div class="invoice-number">${sale.sale_number || '0000'}</div>
              <div class="invoice-meta">
                <div><span class="invoice-label">Fecha de Expedición:</span> ${this.formatDate(sale.created_at)}</div>
                <div><span class="invoice-label">Fecha de Vencimiento:</span> ${this.formatDate(sale.created_at)}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sección de cliente estilo  -->
        <div class="client-row">
          <div class="client-label">SEÑOR(ES)</div>
          <div class="client-value">${sale.customer?.business_name || sale.customer?.name || 'Consumidor Final'}</div>
          <div class="date-label">FECHA DEL DOCUMENTO (DD/MM/AA)</div>
          <div class="date-value">${this.formatDate(sale.created_at)}</div>
        </div>
        <div class="client-row">
          <div class="client-label">DIRECCIÓN</div>
          <div class="client-value">${sale.customer?.address || ''}</div>
          <div class="date-label">FECHA DE VENCIMIENTO</div>
          <div class="date-value">${this.formatDate(sale.created_at)}</div>
        </div>
        <div class="client-row">
          <div class="client-label">TELÉFONO</div>
          <div class="client-value">${sale.customer?.phone || ''}</div>
          <div class="date-label">${sale.customer?.identification_type || 'NIT'}</div>
          <div class="date-value">${sale.customer?.identification_number || ''}</div>
        </div>
        `}

        ${paperSize === 'thermal-80mm' ? `
        <!-- Tabla de Productos para 80mm -->
        <div class="items-section">
          <table class="items-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-center">Cant</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(sale.items || []).map(item => {
        const itemSubtotal = item.quantity * item.unit_price;
        const discount = item.discount_amount || 0;
        const itemTotal = itemSubtotal - discount;

        let productName = 'Producto/Servicio';
        let productSku = '';

        if (item.product && item.product.name) {
          productName = item.product.name.length > 35 ?
            item.product.name.substring(0, 32) + '...' :
            item.product.name;
          if (item.product.sku) {
            productSku = item.product.sku;
          }
        } else if (item.product_name) {
          productName = item.product_name.length > 35 ?
            item.product_name.substring(0, 32) + '...' :
            item.product_name;
        }

        return `
                <tr>
                  <td class="description">
                    ${productName}
                    ${productSku ? `<small>SKU: ${productSku}</small>` : ''}
                  </td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${this.formatCurrencyCompact(itemTotal)}</td>
                </tr>`;
      }).join('')}
            </tbody>
          </table>
        </div>
        ` : `
        <!-- Tabla de Productos estilo  para Letter -->
        <div class="items-section">
          <table class="items-table">
            <thead>
              <tr>
                <th class="item-id">ID</th>
                <th>Ítem</th>
                <th class="text-center">Unidad</th>
                <th class="text-right">Precio</th>
                <th class="text-center">Cantidad</th>
                <th class="text-right">Descuento</th>
                <th class="text-right">Impuesto</th>
                <th class="text-right">Total con impuestos</th>
              </tr>
            </thead>
            <tbody>
              ${(sale.items || []).map((item, index) => {
        const itemSubtotal = item.quantity * item.unit_price;
        const discount = item.discount_amount || 0;
        const itemTotal = itemSubtotal - discount;

        let productName = 'Producto/Servicio';
        let productSku = '';

        if (item.product && item.product.name) {
          productName = item.product.name;
          if (item.product.sku) {
            productSku = item.product.sku;
          }
        } else if (item.product_name) {
          productName = item.product_name;
        }

        return `
                <tr>
                  <td class="item-id">${index + 1}</td>
                  <td class="description">
                    ${productName}
                    ${productSku ? `<small>(${productName}) - Ref: ${productSku}</small>` : ''}
                  </td>
                  <td class="text-center">Unidad</td>
                  <td class="text-right">${this.formatCurrency(item.unit_price)}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${discount > 0 ? this.formatCurrency(discount) : '-'}</td>
                  <td class="text-right">-</td>
                  <td class="text-right">${this.formatCurrency(itemTotal)}</td>
                </tr>`;
      }).join('')}
            </tbody>
          </table>
        </div>
        `}

        ${paperSize === 'thermal-80mm' ? `
        <!-- Totales para 80mm -->
        <div class="totals-section">
          <div class="totals">
            <div class="totals-row">
              <span class="totals-label">Subtotal:</span>
              <span class="totals-value">${this.formatCurrencyCompact(sale.subtotal || 0)}</span>
            </div>
            ${sale.discount_amount && sale.discount_amount > 0 ? `
            <div class="totals-row">
              <span class="totals-label">Descuento:</span>
              <span class="totals-value">-${this.formatCurrencyCompact(sale.discount_amount)}</span>
            </div>` : ''}
            ${sale.iva_amount && sale.iva_amount > 0 ? `
            <div class="totals-row">
              <span class="totals-label">IVA (19%):</span>
              <span class="totals-value">${this.formatCurrencyCompact(sale.iva_amount)}</span>
            </div>` : ''}
            ${sale.ica_amount && sale.ica_amount > 0 ? `
            <div class="totals-row">
              <span class="totals-label">ICA:</span>
              <span class="totals-value">${this.formatCurrencyCompact(sale.ica_amount)}</span>
            </div>` : ''}
            ${sale.retencion_amount && sale.retencion_amount > 0 ? `
            <div class="totals-row">
              <span class="totals-label">Retención:</span>
              <span class="totals-value">-${this.formatCurrencyCompact(sale.retencion_amount)}</span>
            </div>` : ''}
            ${sale.tax_amount && sale.tax_amount > 0 && (!sale.iva_amount && !sale.ica_amount && !sale.retencion_amount) ? `
            <div class="totals-row">
              <span class="totals-label">Impuestos:</span>
              <span class="totals-value">${this.formatCurrencyCompact(sale.tax_amount)}</span>
            </div>` : ''}
          </div>
          <div class="total-final">
            <div class="totals-row">
              <span class="totals-label">Total a Pagar:</span>
              <span class="totals-value">${this.formatCurrencyCompact(sale.total_amount || 0)}</span>
            </div>
          </div>
        </div>
        ` : `
        <div class="total-words">
          ${this.numberToWords(sale.total_amount || 0)}
        </div>

        <!-- Totales estilo  para Letter -->
        <div class="totals-section">
          <div class="totals-box">
            <div class="totals-row">
              <span class="totals-label">Subtotal</span>
              <span class="totals-value">${this.formatCurrency(sale.subtotal || 0)}</span>
            </div>
            <div class="total-final">
              <div class="totals-row">
                <span class="totals-label">Total</span>
                <span class="totals-value">${this.formatCurrency(sale.total_amount || 0)}</span>
              </div>
            </div>
            <div class="total-lines">
              <div>Total de líneas: ${(sale.items || []).length}</div>
              <div>Cantidad total: ${(sale.items || []).reduce((sum, item) => sum + item.quantity, 0)}</div>
            </div>
          </div>
        </div>
        `}
        
        ${paperSize === 'thermal-80mm' ? `
        <!-- Información de Pago para 80mm -->
        <div class="payment-section">
          <div class="payment-title">Información de Pago</div>
          <div class="payment-info">
            <div>
              <span class="payment-label">Método de Pago:</span>
              <span class="payment-value">${this.getPaymentMethodName(sale.payment_method)}</span>
            </div>
            ${sale.payment_reference ? `
            <div>
              <span class="payment-label">Referencia:</span>
              <span class="payment-value">${sale.payment_reference}</span>
            </div>` : ''}
            ${sale.payment_amount_received ? `
            <div>
              <span class="payment-label">Pago Recibido:</span>
              <span class="payment-value">${this.formatCurrencyCompact(sale.payment_amount_received)}</span>
            </div>` : ''}
            ${sale.payment_change !== undefined && sale.payment_change !== null && sale.payment_change > 0 ? `
            <div>
              <span class="payment-label">Cambio:</span>
              <span class="payment-value">${this.formatCurrencyCompact(sale.payment_change)}</span>
            </div>` : ''}
          </div>
        </div>

        <!-- Footer para 80mm -->
        <div class="footer">
          <div class="footer-message">¡Gracias por su compra!</div>
          <div class="footer-legal">
            Este documento es válido como comprobante de pago. Conserve para cualquier reclamación o garantía.
          </div>
          <div class="footer-tech">
            Powered by MiComercio360 • ${new Date().toLocaleString('es-CO')}
          </div>
        </div>
        ` : `
        <!-- Footer para Letter -->
        <div class="footer">
          <div class="footer-legal">
            Con esta factura de venta el comprador declara haber recibido de forma real y materialmente las mercancías y/o servicios descritos en este título valor.
          </div>

          <div class="footer-legal" style="margin-top: 3mm;">
            Esta factura se asimila en todos sus efectos a una letra de cambio de conformidad con el Art. 774 del código de comercio. Autorizo que en caso de incumplimiento de esta obligación sea reportado a las centrales de riesgo, se cobrarán intereses por mora.
          </div>

          <div class="footer-signatures">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">ELABORADO POR</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">ACEPTADA, FIRMA Y/O SELLO Y FECHA</div>
            </div>
          </div>
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
      // Generar PDF primero para evitar espacios en blanco
      const pdfBuffer = await this.generatePDFBuffer(sale, companyId, paperSize);
      
      // Convertir buffer a blob (Buffer es compatible en navegador)
      const bufferArray = new Uint8Array(pdfBuffer);
      const blob = new Blob([bufferArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Abrir PDF en nueva ventana para imprimir
      const printWindow = window.open(url, '_blank');
      if (!printWindow) {
        throw new Error('No se pudo abrir la ventana de impresión. Verifique que los pop-ups estén habilitados.');
      }

      // Función para limpiar URL y cerrar ventana de forma segura
      const cleanup = () => {
        try {
          URL.revokeObjectURL(url);
          if (printWindow && !printWindow.closed) {
            printWindow.close();
          }
        } catch (e) {
          // Ignorar errores de limpieza
          console.warn('Error al limpiar recursos de impresión:', e);
        }
      };

      // Esperar a que el PDF se cargue y luego imprimir
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();

            // Intentar usar onafterprint si está disponible (puede fallar por CORS)
            try {
              if ('onafterprint' in printWindow) {
                printWindow.onafterprint = () => {
                  cleanup();
                };
              }
            } catch (e) {
              // Si no se puede establecer onafterprint, usar timeout como fallback
              setTimeout(cleanup, 5000);
            }
          } catch (e) {
            console.warn('Error al imprimir:', e);
            cleanup();
          }
        }, 500);
      };

      // Fallback: si onload no se dispara, intentar imprimir después de un delay
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          try {
            printWindow.focus();
            printWindow.print();

            // Intentar usar onafterprint si está disponible
            try {
              if ('onafterprint' in printWindow) {
                printWindow.onafterprint = () => {
                  cleanup();
                };
              }
            } catch (e) {
              // Si no se puede establecer onafterprint, usar timeout como fallback
              setTimeout(cleanup, 5000);
            }
          } catch (e) {
            console.warn('Error al imprimir (fallback):', e);
            cleanup();
          }
        }
      }, 1000);
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
        format: 'letter' as const,
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
        format: 'letter' as const,
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

  /**
   * Convierte números a palabras en español (formato )
   */
  private static numberToWords(num: number): string {
    if (num === 0) return 'Cero pesos';

    const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const twenties = ['veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n === 100) return 'cien';

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
        if (u > 0) result += ' y ' + units[u];
      } else if (remainder > 0) {
        result += units[remainder];
      }

      return result;
    };

    const floorNum = Math.floor(num);

    if (floorNum >= 1000000) {
      const millions = Math.floor(floorNum / 1000000);
      const remainder = floorNum % 1000000;
      let result = millions === 1 ? 'Un millón' : this.capitalize(convertLessThanThousand(millions)) + ' millones';
      if (remainder > 0) {
        const remainderWords = this.numberToWords(remainder);
        result += ' ' + remainderWords.replace(' pesos', '');
      }
      return result + ' pesos';
    }

    if (floorNum >= 1000) {
      const thousands = Math.floor(floorNum / 1000);
      const remainder = floorNum % 1000;
      let result = thousands === 1 ? 'Mil' : this.capitalize(convertLessThanThousand(thousands)) + ' mil';
      if (remainder > 0) result += ' ' + convertLessThanThousand(remainder);
      return this.capitalize(result) + ' pesos';
    }

    return this.capitalize(convertLessThanThousand(floorNum)) + ' pesos';
  }

  /**
   * Capitaliza la primera letra de una cadena
   */
  private static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
