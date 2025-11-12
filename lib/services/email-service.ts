import { Sale } from '@/lib/types/sales';
import { Quote } from '@/lib/types/quotes';
import { ServerPrintService } from './server-print-service';
import { createClient } from '@/lib/supabase/server';
import { EmailRenderer } from '@/lib/utils/email-renderer';
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export class EmailService {
  private supabase = createClient();
  private transporter: nodemailer.Transporter | null = null;

  /**
   * Crea una instancia del servicio de email usando SMTP
   */
  static create(): EmailService {
    return new EmailService();
  }

  /**
   * Obtiene el transporter de nodemailer (inicializado solo si está configurado)
   */
  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
      const secure = process.env.SMTP_SECURE === 'true';
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (!host || !user || !pass) {
        throw new Error('SERVICE_UNAVAILABLE: Configuración SMTP incompleta. Verifica las variables de entorno SMTP_HOST, SMTP_USER y SMTP_PASS.');
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Envía un correo electrónico usando SMTP
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const transporter = this.getTransporter();
      const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';

      // Preparar destinatarios
      const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

      // Preparar attachments para nodemailer
      const attachments = options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/octet-stream',
      }));

      // Enviar email usando SMTP
      const info = await transporter.sendMail({
        from: fromEmail,
        to: recipients,
          subject: options.subject,
          html: options.html,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      });

      console.log('Email sent successfully:', info.messageId);
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Re-lanzar errores de servicio no disponible tal cual
      if (error instanceof Error && error.message.includes('SERVICE_UNAVAILABLE')) {
        throw error;
      }
      
      throw new Error('Error al enviar el correo electrónico');
    }
  }

  /**
   * Envía una factura por correo electrónico
   */
  async sendInvoice(
    sale: Sale,
    companyId: string,
    customerEmail: string,
    paperSize: 'letter' | 'thermal-80mm' = 'thermal-80mm'
  ): Promise<void> {
    try {
      // Generar PDF como adjunto (usar servicio del servidor)
      const pdfBuffer = await ServerPrintService.generateSalePDFBuffer(
        sale,
        companyId,
        paperSize
      );

      const subject = `Factura #${sale.sale_number} - ${process.env.COMPANY_NAME || 'MiComercio360'}`;

      // Obtener datos de la empresa para personalizar el correo
      const supabase = await this.supabase;
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      const companyName = company?.name || process.env.COMPANY_NAME || 'MiComercio360';
      const companyEmail = company?.email || process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
      const companyPhone = company?.phone || '';
      const cashierName = sale.cashier?.full_name || sale.cashier?.email || 'Sistema';

      // Preparar items para el email
      const items = sale.items?.map(item => ({
        name: item.product?.name || 'Producto',
        quantity: item.quantity,
        price: item.unit_price.toLocaleString('es-CO'),
        total: item.total_price.toLocaleString('es-CO'),
      })) || [];

      // Renderizar email usando react.email
      const emailHTML = await EmailRenderer.renderInvoiceEmail({
        invoiceNumber: sale.sale_number,
        invoiceDate: new Date(sale.created_at).toLocaleDateString('es-CO'),
        totalAmount: sale.total_amount.toLocaleString('es-CO'),
        paymentMethod: sale.payment_method,
        customerName: sale.customer?.business_name || sale.customer?.name,
        cashierName,
        companyName,
        companyEmail,
        companyPhone,
        items: items.length > 0 ? items : undefined,
      });

      await this.sendEmail({
        to: customerEmail,
        subject,
        html: emailHTML,
        attachments: [
          {
            filename: `Factura_${sale.sale_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
    } catch (error) {
      console.error('Error sending invoice email:', error);
      throw new Error('Error al enviar la factura por correo electrónico');
    }
  }

  /**
   * Envía una cotización por correo electrónico
   */
  async sendQuote(
    quote: Quote,
    companyId: string,
    customerEmail: string,
    paperSize: 'letter' | 'thermal-80mm' = 'letter'
  ): Promise<void> {
    try {
      // Generar PDF como adjunto (usar servicio del servidor)
      const pdfBuffer = await ServerPrintService.generateQuotePDFBuffer(
        quote,
        companyId,
        paperSize
      );

      const subject = `Cotización #${quote.quote_number || 'N/A'} - ${process.env.COMPANY_NAME || 'MiComercio360'}`;

      // Obtener datos de la empresa para personalizar el correo
      const supabase = await this.supabase;
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      const companyName = company?.name || process.env.COMPANY_NAME || 'MiComercio360';
      const companyEmail = company?.email || process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
      const companyPhone = company?.phone || '';
      const salespersonName = quote.salesperson?.full_name || quote.salesperson?.email || 'Sistema';

      // Preparar items para el email
      const items = quote.items?.map(item => ({
        name: item.product?.name || item.description || 'Producto',
        quantity: item.quantity,
        price: item.unit_price.toLocaleString('es-CO'),
        total: item.total_price.toLocaleString('es-CO'),
      })) || [];

      // Formatear fecha de validez
      const validUntil = quote.expiration_date 
        ? new Date(quote.expiration_date).toLocaleDateString('es-CO')
        : 'No especificada';

      // Renderizar email usando react.email
      const emailHTML = await EmailRenderer.renderQuoteEmail({
        quoteNumber: quote.quote_number || 'N/A',
        quoteDate: new Date(quote.quote_date).toLocaleDateString('es-CO'),
        validUntil,
        totalAmount: quote.total_amount.toLocaleString('es-CO'),
        customerName: quote.customer?.business_name || 'Cliente',
        createdBy: salespersonName,
        companyName,
        companyEmail,
        companyPhone,
        items: items.length > 0 ? items : undefined,
      });

      await this.sendEmail({
        to: customerEmail,
        subject,
        html: emailHTML,
        attachments: [
          {
            filename: `Cotizacion_${quote.quote_number || quote.id.substring(0, 8)}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
    } catch (error) {
      console.error('Error sending quote email:', error);
      
      // Re-lanzar errores de servicio no disponible tal cual
      if (error instanceof Error && error.message.includes('SERVICE_UNAVAILABLE')) {
        throw error;
      }
      
      throw new Error('Error al enviar la cotización por correo electrónico');
    }
  }

  /**
   * Verifica la conexión con el servicio de emails
   */
  async verifyConnection(): Promise<boolean> {
    try {
      // Verificar que SMTP esté configurado
      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      
      if (!host || !user || !pass) {
        return false;
      }

      // Intentar verificar la conexión SMTP
      const transporter = this.getTransporter();
      await transporter.verify();
      return true;
    } catch (error) {
      console.error('Error verificando conexión de email:', error);
      return false;
    }
  }
}
