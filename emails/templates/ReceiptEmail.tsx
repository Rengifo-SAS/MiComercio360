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

interface ReceiptEmailProps {
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
}

export const ReceiptEmail = ({
  receiptNumber,
  receiptDate,
  amount,
  paymentMethod,
  reference,
  customerName,
  receivedBy,
  companyName,
  companyEmail,
  companyPhone,
  concept,
}: ReceiptEmailProps) => {
  const preview = `Recibo de Pago ${receiptNumber} - ${companyName}`;

  return (
    <EmailLayout
      preview={preview}
      companyName={companyName}
      companyEmail={companyEmail}
      companyPhone={companyPhone}
    >
      <Section>
        <Heading style={h2}>Recibo de Pago Recibido</Heading>
        <Text style={text}>
          Hemos recibido tu pago con el recibo <strong>N° {receiptNumber}</strong>, con fecha{' '}
          <strong>{receiptDate}</strong>, procesado por <strong>{receivedBy}</strong>.
        </Text>
        {customerName && (
          <Text style={text}>
            Cliente: <strong>{customerName}</strong>
          </Text>
        )}
      </Section>

      <Section style={detailsCard}>
        <Heading style={h3}>Detalles del Recibo</Heading>
        <Hr style={divider} />

        <Row style={detailRow}>
          <Column style={labelColumn}>
            <Text style={label}>Número de Recibo:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{receiptNumber}</Text>
          </Column>
        </Row>

        <Row style={detailRow}>
          <Column style={labelColumn}>
            <Text style={label}>Fecha:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{receiptDate}</Text>
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

        {reference && (
          <Row style={detailRow}>
            <Column style={labelColumn}>
              <Text style={label}>Referencia:</Text>
            </Column>
            <Column style={valueColumn}>
              <Text style={value}>{reference}</Text>
            </Column>
          </Row>
        )}

        {concept && (
          <Row style={detailRow}>
            <Column style={labelColumn}>
              <Text style={label}>Concepto:</Text>
            </Column>
            <Column style={valueColumn}>
              <Text style={value}>{concept}</Text>
            </Column>
          </Row>
        )}

        <Hr style={divider} />

        <Row style={totalRow}>
          <Column style={labelColumn}>
            <Text style={totalLabel}>Monto Recibido:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={totalValue}>${amount}</Text>
          </Column>
        </Row>
      </Section>

      <Section style={successSection}>
        <Text style={successText}>
          ✓ Pago recibido exitosamente. El PDF adjunto contiene el comprobante completo.
        </Text>
      </Section>

      <Section style={helpSection}>
        <Text style={helpText}>
          Conserva este recibo como comprobante de tu pago. Si tienes alguna pregunta, contáctanos.
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
  color: '#28a745',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const successSection = {
  margin: '24px 0',
  padding: '20px',
  backgroundColor: '#d4edda',
  borderRadius: '8px',
  borderLeft: '4px solid #28a745',
};

const successText = {
  color: '#155724',
  fontSize: '16px',
  fontWeight: '600',
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

export default ReceiptEmail;
