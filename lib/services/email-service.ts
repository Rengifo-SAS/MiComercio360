import nodemailer from 'nodemailer';
import { Sale } from '@/lib/types/sales';
import { ServerPrintService } from './server-print-service';
import { createClient } from '@/lib/supabase/server';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private supabase = createClient();

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransport(config);
  }

  /**
   * Configura el servicio de correo con las credenciales de Gmail
   */
  static createGmailService(): EmailService {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '', // Contraseña de aplicación de Gmail
      },
    };

    return new EmailService(config);
  }

  /**
   * Envía un correo electrónico
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'Sistema POS'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
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
      // Generar el HTML de la factura (usar el método original del cliente)
      const { SalesPrintService } = await import('./sales-print-service');
      const invoiceHTML = await SalesPrintService.generatePrintHTML(
        sale,
        companyId,
        paperSize
      );

      // Generar PDF como adjunto (usar servicio del servidor)
      const pdfBuffer = await ServerPrintService.generateSalePDFBuffer(
        sale,
        companyId,
        paperSize
      );

      const subject = `Factura #${sale.sale_number} - ${process.env.COMPANY_NAME || 'Sistema POS'}`;

      // Obtener datos de la empresa para personalizar el correo
      const supabase = await this.supabase;
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      const companyName = company?.name || process.env.COMPANY_NAME || 'Sistema POS';
      const companyEmail = company?.email || process.env.SMTP_FROM || process.env.SMTP_USER;
      const companyPhone = company?.phone || '';
      const cashierName = sale.cashier?.full_name || sale.cashier?.email || 'Sistema';

      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Factura ${sale.sale_number}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .header { 
              background-color: #f8f9fa; 
              padding: 20px; 
              border-radius: 8px; 
              margin-bottom: 20px; 
              text-align: center;
            }
            .footer { 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #eee; 
              font-size: 12px; 
              color: #666; 
            }
            .invoice-details { 
              background-color: #f8f9fa; 
              padding: 15px; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
            .action-button {
              display: inline-block;
              background-color: #007bff;
              color: white;
              padding: 10px 20px;
              text-decoration: none;
              border-radius: 5px;
              margin: 10px 0;
            }
            .contact-info {
              background-color: #e9ecef;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>¡Has recibido tu factura ${sale.sale_number}!</h2>
          </div>
          
          <p>Hola, ya puedes consultar la factura N° ${sale.sale_number}, con fecha ${new Date(sale.created_at).toLocaleDateString('es-CO')}, enviada por ${cashierName}. Desde el siguiente enlace podrás:</p>
          
          <ul>
            <li>Ver el detalle de la factura</li>
            <li>Descargarla o imprimirla</li>
          </ul>
          
          <div class="invoice-details">
            <h3>Detalles de la Factura:</h3>
            <p><strong>Número:</strong> ${sale.sale_number}</p>
            <p><strong>Fecha:</strong> ${new Date(sale.created_at).toLocaleDateString('es-CO')}</p>
            <p><strong>Total:</strong> $${sale.total_amount.toLocaleString('es-CO')}</p>
            <p><strong>Método de Pago:</strong> ${sale.payment_method}</p>
            ${sale.customer ? `<p><strong>Cliente:</strong> ${sale.customer.business_name || sale.customer.name || 'Consumidor Final'}</p>` : ''}
          </div>

          <p>Este mensaje es informativo. Si necesitas ayuda, escribe a ${companyEmail}${companyPhone ? ` o comunícate al número ${companyPhone}` : ''}.</p>
          
          <div class="footer">
            <p>Atentamente,</p>
            <p><strong>${companyName}</strong></p>
            <p><em>Este es un correo automático del sistema. Por favor, no responda a este mensaje.</em></p>
          </div>
        </body>
        </html>
      `;

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
      throw new Error('Error al enviar la factura por correo electrónico');
    }
  }

  /**
   * Verifica la conexión SMTP
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Error verificando conexión SMTP:', error);
      return false;
    }
  }
}
