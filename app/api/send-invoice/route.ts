import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/email-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const { saleId, companyId, email, paperSize } = await request.json();

        // Validar datos requeridos
        if (!saleId || !companyId || !email) {
            return NextResponse.json(
                { error: 'Faltan datos requeridos: saleId, companyId, email' },
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

        // Obtener la venta completa con relaciones
        const supabase = await createClient();
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .select(`
                *,
                customer:customers(*),
                cashier:profiles(*),
                shift:shifts(*),
                items:sale_items(
                    *,
                    product:products(*)
                )
            `)
            .eq('id', saleId)
            .single();

        if (saleError || !sale) {
            return NextResponse.json(
                { error: 'No se encontró la venta' },
                { status: 404 }
            );
        }

        // Crear servicio de correo
        const emailService = EmailService.createGmailService();

        // Verificar conexión SMTP
        const isConnected = await emailService.verifyConnection();
        if (!isConnected) {
            return NextResponse.json(
                { error: 'Error de conexión SMTP. Verifique la configuración.' },
                { status: 500 }
            );
        }

        // Enviar factura por correo (siempre usar tamaño carta para correos)
        await emailService.sendInvoice(
            sale,
            companyId,
            email,
            'letter' // Siempre usar tamaño carta para correos electrónicos
        );

        return NextResponse.json({
            success: true,
            message: `Factura enviada exitosamente a ${email}`
        });

    } catch (error) {
        return NextResponse.json(
            {
                error: 'Error interno del servidor'
            },
            { status: 500 }
        );
    }
}
