import { render } from '@react-email/components';
import InvoiceEmail from '@/emails/templates/InvoiceEmail';
import QuoteEmail from '@/emails/templates/QuoteEmail';
import PaymentEmail from '@/emails/templates/PaymentEmail';
import ReceiptEmail from '@/emails/templates/ReceiptEmail';

/**
 * Renderiza un template de email a HTML
 */
export class EmailRenderer {
  /**
   * Renderiza el email de factura
   */
  static async renderInvoiceEmail(props: {
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: string;
    paymentMethod: string;
    customerName?: string;
    cashierName: string;
    companyName: string;
    companyEmail?: string;
    companyPhone?: string;
    items?: Array<{
      name: string;
      quantity: number;
      price: string;
      total: string;
    }>;
  }): Promise<string> {
    return render(InvoiceEmail(props));
  }

  /**
   * Renderiza el email de cotización
   */
  static async renderQuoteEmail(props: {
    quoteNumber: string;
    quoteDate: string;
    validUntil: string;
    totalAmount: string;
    customerName?: string;
    createdBy: string;
    companyName: string;
    companyEmail?: string;
    companyPhone?: string;
    items?: Array<{
      name: string;
      quantity: number;
      price: string;
      total: string;
    }>;
  }): Promise<string> {
    return render(QuoteEmail(props));
  }

  /**
   * Renderiza el email de pago
   */
  static async renderPaymentEmail(props: {
    paymentNumber: string;
    paymentDate: string;
    amount: string;
    paymentMethod: string;
    reference?: string;
    supplierName?: string;
    createdBy: string;
    companyName: string;
    companyEmail?: string;
    companyPhone?: string;
  }): Promise<string> {
    return render(PaymentEmail(props));
  }

  /**
   * Renderiza el email de recibo
   */
  static async renderReceiptEmail(props: {
    receiptNumber: string;
    receiptDate: string;
    amount: string;
    paymentMethod: string;
    reference?: string;
    customerName?: string;
    receivedBy: string;
    companyName: string;
    companyEmail?: string;
    companyPhone?: string;
    concept?: string;
  }): Promise<string> {
    return render(ReceiptEmail(props));
  }
}
