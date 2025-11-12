import {
  Button,
  Column,
  Heading,
  Hr,
  Link,
  Row,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';

interface InvoiceEmailProps {
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
}

export const InvoiceEmail = ({
  invoiceNumber,
  invoiceDate,
  totalAmount,
  paymentMethod,
  customerName,
  cashierName,
  companyName,
  companyEmail,
  companyPhone,
  items,
}: InvoiceEmailProps) => {
  const preview = `Factura ${invoiceNumber} - ${companyName}`;

  return (
    <EmailLayout
      preview={preview}
      companyName={companyName}
      companyEmail={companyEmail}
      companyPhone={companyPhone}
    >
      {/* Welcome Section */}
      <Section>
        <Heading style={h2}>¡Factura Recibida!</Heading>
        <Text style={text}>
          Ya puedes consultar la factura <strong>N° {invoiceNumber}</strong>, con fecha{' '}
          <strong>{invoiceDate}</strong>, enviada por <strong>{cashierName}</strong>.
        </Text>
        {customerName && (
          <Text style={text}>
            Cliente: <strong>{customerName}</strong>
          </Text>
        )}
      </Section>

      {/* Invoice Details Card */}
      <Section style={detailsCard}>
        <Heading style={h3}>Detalles de la Factura</Heading>
        <Hr style={divider} />

        <Row style={detailRow}>
          <Column style={labelColumn}>
            <Text style={label}>Número de Factura:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{invoiceNumber}</Text>
          </Column>
        </Row>

        <Row style={detailRow}>
          <Column style={labelColumn}>
            <Text style={label}>Fecha:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{invoiceDate}</Text>
          </Column>
        </Row>

        <Row style={detailRow}>
          <Column style={labelColumn}>
            <Text style={label}>Método de Pago:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{paymentMethod}</Text>
          </Column>
        </Row>

        <Hr style={divider} />

        <Row style={totalRow}>
          <Column style={labelColumn}>
            <Text style={totalLabel}>Total:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={totalValue}>${totalAmount}</Text>
          </Column>
        </Row>
      </Section>

      {/* Items Table (if provided) */}
      {items && items.length > 0 && (
        <Section style={itemsSection}>
          <Heading style={h3}>Productos</Heading>
          <table style={table}>
            <thead>
              <tr>
                <th style={tableHeader}>Producto</th>
                <th style={tableHeaderCenter}>Cant.</th>
                <th style={tableHeaderRight}>Precio</th>
                <th style={tableHeaderRight}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} style={tableRow}>
                  <td style={tableCell}>{item.name}</td>
                  <td style={tableCellCenter}>{item.quantity}</td>
                  <td style={tableCellRight}>${item.price}</td>
                  <td style={tableCellRight}>${item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Action Section */}
      <Section style={actionSection}>
        <Text style={text}>
          El PDF adjunto contiene la factura completa que puedes descargar o imprimir.
        </Text>
      </Section>

      {/* Help Section */}
      <Section style={helpSection}>
        <Text style={helpText}>
          Si necesitas ayuda o tienes alguna pregunta sobre esta factura, no dudes en contactarnos.
        </Text>
      </Section>
    </EmailLayout>
  );
};

// Styles
const h2 = {
  color: '#212529',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  padding: '0',
};

const h3 = {
  color: '#212529',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
  padding: '0',
};

const text = {
  color: '#495057',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const detailsCard = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #e9ecef',
};

const divider = {
  borderColor: '#dee2e6',
  margin: '16px 0',
};

const detailRow = {
  marginBottom: '12px',
};

const labelColumn = {
  width: '50%',
  verticalAlign: 'top',
};

const valueColumn = {
  width: '50%',
  verticalAlign: 'top',
};

const label = {
  color: '#6c757d',
  fontSize: '14px',
  margin: '0',
};

const value = {
  color: '#212529',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const totalRow = {
  marginTop: '8px',
};

const totalLabel = {
  color: '#212529',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const totalValue = {
  color: '#0066cc',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const itemsSection = {
  margin: '24px 0',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  margin: '16px 0',
};

const tableHeader = {
  backgroundColor: '#e9ecef',
  padding: '12px',
  textAlign: 'left' as const,
  color: '#495057',
  fontSize: '14px',
  fontWeight: 'bold',
  borderBottom: '2px solid #dee2e6',
};

const tableHeaderCenter = {
  ...tableHeader,
  textAlign: 'center' as const,
};

const tableHeaderRight = {
  ...tableHeader,
  textAlign: 'right' as const,
};

const tableRow = {
  borderBottom: '1px solid #e9ecef',
};

const tableCell = {
  padding: '12px',
  color: '#495057',
  fontSize: '14px',
};

const tableCellCenter = {
  ...tableCell,
  textAlign: 'center' as const,
};

const tableCellRight = {
  ...tableCell,
  textAlign: 'right' as const,
};

const actionSection = {
  margin: '24px 0',
  padding: '20px',
  backgroundColor: '#e7f3ff',
  borderRadius: '8px',
  borderLeft: '4px solid #0066cc',
};

const helpSection = {
  margin: '24px 0',
  padding: '16px',
  backgroundColor: '#fff3cd',
  borderRadius: '8px',
  borderLeft: '4px solid #ffc107',
};

const helpText = {
  color: '#856404',
  fontSize: '14px',
  margin: '0',
};

export default InvoiceEmail;
