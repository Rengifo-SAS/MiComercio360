import { PrintTemplatesPageClient } from '@/components/print-templates-page-client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plantillas de Impresión',
  description:
    'Gestiona las plantillas de impresión para diferentes tipos de documentos de tu empresa.',
};

export default function PrintTemplatesPage() {
  return <PrintTemplatesPageClient />;
}
