// Servicio de impresión específico para el servidor
// lib/services/server-print-service.ts

import { Sale } from '@/lib/types/sales';
import { Quote } from '@/lib/types/quotes';
import { PDFService } from './pdf-service';

export class ServerPrintService {
    /**
     * Genera un PDF de factura como buffer para envío por correo (solo servidor)
     */
    static async generateSalePDFBuffer(
        sale: Sale,
        companyId: string,
        paperSize: 'letter' | 'thermal-80mm' = 'letter'
    ): Promise<Buffer> {
        try {
            // Validar datos de la venta
            if (!sale) {
                throw new Error('No se proporcionaron datos de la venta');
            }

            if (!companyId) {
                throw new Error('No se proporcionó el ID de la empresa');
            }

            // Usar el cliente del servidor
            const { createClient } = await import('@/lib/supabase/server');
            const supabase = await createClient();

            // Obtener datos de la empresa
            const { data: company, error: companyError } = await supabase
                .from('companies')
                .select('*')
                .eq('id', companyId)
                .single();

            if (companyError) {
                throw new Error('No se encontró la información de la empresa');
            }

            if (!company) {
                throw new Error('No se encontró la información de la empresa');
            }

            // Configurar formato según el tamaño de papel
            const pdfOptions = paperSize === 'thermal-80mm' ? {
                format: 'custom' as const,
                orientation: 'portrait' as const,
                margin: 5,
                customWidth: 80,
                customHeight: 200
            } : {
                format: 'a4' as const,
                orientation: 'portrait' as const,
                margin: 20
            };

            const pdfBuffer = await PDFService.generateSalePDFBuffer(sale, company, pdfOptions);

            return pdfBuffer;
        } catch (error) {
            throw new Error('No se pudo generar el PDF de la factura');
        }
    }

    /**
     * Genera un PDF de cotización como buffer para envío por correo (solo servidor)
     */
    static async generateQuotePDFBuffer(
        quote: Quote,
        companyId: string,
        paperSize: 'letter' | 'thermal-80mm' = 'letter'
    ): Promise<Buffer> {
        try {
            // Validar datos de la cotización
            if (!quote) {
                throw new Error('No se proporcionaron datos de la cotización');
            }

            if (!companyId) {
                throw new Error('No se proporcionó el ID de la empresa');
            }

            // Usar el cliente del servidor
            const { createClient } = await import('@/lib/supabase/server');
            const supabase = await createClient();

            // Obtener datos de la empresa
            const { data: company, error: companyError } = await supabase
                .from('companies')
                .select('*')
                .eq('id', companyId)
                .single();

            if (companyError) {
                throw new Error('No se encontró la información de la empresa');
            }

            if (!company) {
                throw new Error('No se encontró la información de la empresa');
            }

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
                margin: 19.05
            };

            const pdfBuffer = await PDFService.generateQuotePDFBuffer(quote, company, pdfOptions);

            return pdfBuffer;
        } catch (error) {
            console.error('Error generando PDF de cotización:', error);
            throw new Error('No se pudo generar el PDF de la cotización');
        }
    }
}
