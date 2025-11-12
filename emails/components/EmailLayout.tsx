import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
}

export const EmailLayout = ({
  preview,
  children,
  companyName = 'Sistema POS',
  companyEmail,
  companyPhone,
}: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>{companyName}</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>Atentamente,</Text>
            <Text style={footerCompany}>{companyName}</Text>

            {(companyEmail || companyPhone) && (
              <Section style={contactInfo}>
                {companyEmail && (
                  <Text style={contactText}>
                    Email: <Link href={`mailto:${companyEmail}`} style={link}>{companyEmail}</Link>
                  </Text>
                )}
                {companyPhone && (
                  <Text style={contactText}>
                    Teléfono: {companyPhone}
                  </Text>
                )}
              </Section>
            )}

            <Text style={disclaimer}>
              Este es un correo automático del sistema. Por favor, no responda a este mensaje.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#0066cc',
  padding: '24px',
  textAlign: 'center' as const,
  borderTopLeftRadius: '8px',
  borderTopRightRadius: '8px',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const content = {
  padding: '32px 24px',
};

const footer = {
  backgroundColor: '#f8f9fa',
  padding: '24px',
  borderTop: '1px solid #e9ecef',
  borderBottomLeftRadius: '8px',
  borderBottomRightRadius: '8px',
};

const footerText = {
  color: '#6c757d',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 8px 0',
};

const footerCompany = {
  color: '#212529',
  fontSize: '16px',
  fontWeight: 'bold',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const contactInfo = {
  backgroundColor: '#e9ecef',
  padding: '16px',
  borderRadius: '6px',
  margin: '16px 0',
};

const contactText = {
  color: '#495057',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const link = {
  color: '#0066cc',
  textDecoration: 'none',
};

const disclaimer = {
  color: '#6c757d',
  fontSize: '12px',
  lineHeight: '18px',
  fontStyle: 'italic',
  margin: '16px 0 0 0',
};

export default EmailLayout;
