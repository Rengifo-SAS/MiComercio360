import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/email-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const { quoteId, companyId, email, paperSize } = await request.json();

        // Validar datos requeridos
        if (!quoteId || !companyId || !email) {
            return NextResponse.json(
                { error: 'Faltan datos requeridos: quoteId, companyId, email' },
                { status: 400 }
            );
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Formato de email inválido' },
                { status: 400 }
            );
        }

        // Obtener la cotización completa con relaciones
        const supabase = await createClient();
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select(`
                *,
                customer:customers(*),
                salesperson:profiles!quotes_salesperson_id_fkey(*),
                items:quote_items(
                    *,
                    product:products(*),
                    tax:taxes(*)
                )
            `)
            .eq('id', quoteId)
            .single();

        if (quoteError || !quote) {
            return NextResponse.json(
                { error: 'No se encontró la cotización' },
                { status: 404 }
            );
        }

        // Crear servicio de correo
        const emailService = EmailService.create();

        try {
            // Enviar cotización por correo (siempre usar tamaño carta para correos)
            await emailService.sendQuote(
                quote,
                companyId,
                email,
                'letter' // Siempre usar tamaño carta para correos electrónicos
            );

            return NextResponse.json({
                success: true,
                message: `Cotización enviada exitosamente a ${email}`
            });
        } catch (emailError: any) {
            // Si es un error de servicio no disponible, devolver un error más descriptivo
            if (emailError.message?.includes('SERVICE_UNAVAILABLE') || 
                emailError.message?.includes('503') || 
                emailError.message?.includes('Service Temporarily Unavailable')) {
                return NextResponse.json(
                    { 
                        error: 'El servicio de correo no está disponible. Verifica que las variables de entorno SMTP_HOST, SMTP_USER y SMTP_PASS estén configuradas.',
                        details: 'El servicio de correo electrónico no está disponible en este momento.'
                    },
                    { status: 503 }
                );
            }
            
            // Re-lanzar otros errores
            throw emailError;
        }

    } catch (error: any) {
        console.error('Error enviando cotización:', error);
        return NextResponse.json(
            {
                error: error.message || 'Error interno del servidor al enviar la cotización'
            },
            { status: 500 }
        );
    }
}
