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

interface PaymentEmailProps {
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
}

export const PaymentEmail = ({
  paymentNumber,
  paymentDate,
  amount,
  paymentMethod,
  reference,
  supplierName,
  createdBy,
  companyName,
  companyEmail,
  companyPhone,
}: PaymentEmailProps) => {
  const preview = `Comprobante de Pago ${paymentNumber} - ${companyName}`;

  return (
    <EmailLayout
      preview={preview}
      companyName={companyName}
      companyEmail={companyEmail}
      companyPhone={companyPhone}
    >
      <Section>
        <Heading style={h2}>Comprobante de Pago</Heading>
        <Text style={text}>
          Se ha registrado el pago <strong>N° {paymentNumber}</strong>, con fecha{' '}
          <strong>{paymentDate}</strong>, procesado por <strong>{createdBy}</strong>.
        </Text>
        {supplierName && (
          <Text style={text}>
            Proveedor: <strong>{supplierName}</strong>
          </Text>
        )}
      </Section>

      <Section style={detailsCard}>
        <Heading style={h3}>Detalles del Pago</Heading>
        <Hr style={divider} />

        <Row style={detailRow}>
          <Column style={labelColumn}>
            <Text style={label}>Número de Pago:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{paymentNumber}</Text>
          </Column>
        </Row>

        <Row style={detailRow}>
          <Column style={labelColumn}>
            <Text style={label}>Fecha:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={value}>{paymentDate}</Text>
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

        <Hr style={divider} />

        <Row style={totalRow}>
          <Column style={labelColumn}>
            <Text style={totalLabel}>Monto Pagado:</Text>
          </Column>
          <Column style={valueColumn}>
            <Text style={totalValue}>${amount}</Text>
          </Column>
        </Row>
      </Section>

      <Section style={actionSection}>
        <Text style={actionText}>
          El PDF adjunto contiene el comprobante completo del pago que puedes descargar o imprimir.
        </Text>
      </Section>

      <Section style={helpSection}>
        <Text style={helpText}>
          Si tienes alguna pregunta sobre este pago, no dudes en contactarnos.
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
  color: '#dc3545',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const actionSection = {
  margin: '24px 0',
  padding: '20px',
  backgroundColor: '#e7f3ff',
  borderRadius: '8px',
  borderLeft: '4px solid #0066cc',
};

const actionText = {
  color: '#004085',
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

export default PaymentEmail;
