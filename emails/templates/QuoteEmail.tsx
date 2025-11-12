import {
  Column,
  Heading,
  Hr,
  Row,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';

interface QuoteEmailProps {
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
}

export const QuoteEmail = ({
  quoteNumber,
  quoteDate,
  validUntil,
  totalAmount,
  customerName,
  createdBy,
  companyName,
  companyEmail,
  companyPhone,
  items,
}: QuoteEmailProps) => {
  const preview = `Cotización ${quoteNumber} - ${companyName}`;

  return (
    <EmailLayout
      preview={preview}
      companyName={companyName}
      companyEmail={companyEmail}
      companyPhone={companyPhone}
    >
      <Section>
        <Heading style={h2}>¡Nueva Cotización!</Heading>
        <Text style={text}>
          Te enviamos la cotización <strong>N° {quoteNumber}</strong>, con fecha{' '}
          <strong>{quoteDate}</strong>, preparada por <strong>{createdBy}</strong>.
        </Text>
        {customerName && (
          <Text style={text}>
            Cliente: <strong>{customerName}</strong>
          </Text>
        )}
      </Section>

      <Section style={detailsCard}>
        <Heading style={h3}>Detalles de la Cotización</Heading>
        <Hr style={divider} />

        <Row style={detailRow}>
          <Column style={labelColumn}>
            <Text style={label}>Número:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{quoteNumber}</Text>
          </Column>
        </Row>

        <Row style={detailRow}>
          <Column style={labelColumn}>
            <Text style={label}>Fecha:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{quoteDate}</Text>
          </Column>
        </Row>

        <Row style={detailRow}>
          <Column style={labelColumn}>
            <Text style={label}>Válida hasta:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{validUntil}</Text>
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

      {items && items.length > 0 && (
        <Section style={itemsSection}>
          <Heading style={h3}>Productos Cotizados</Heading>
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

      <Section style={actionSection}>
        <Text style={actionText}>
          Esta cotización es válida hasta el <strong>{validUntil}</strong>. El PDF adjunto contiene todos los detalles.
        </Text>
      </Section>

      <Section style={helpSection}>
        <Text style={helpText}>
          Si deseas proceder con esta cotización o tienes alguna pregunta, por favor contáctanos.
        </Text>
      </Section>
    </EmailLayout>
  );
};

// Styles (reutilizando los mismos que InvoiceEmail)
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
  color: '#28a745',
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
  backgroundColor: '#d4edda',
  borderRadius: '8px',
  borderLeft: '4px solid #28a745',
};

const actionText = {
  color: '#155724',
  fontSize: '14px',
  margin: '0',
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

export default QuoteEmail;
