-- Crear función para plantillas de impresión por defecto
-- 053_create_default_print_templates_function.sql

-- Función para crear plantillas por defecto para una empresa
CREATE OR REPLACE FUNCTION public.create_default_print_templates_for_company(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Plantilla para Factura de Venta
    INSERT INTO public.print_templates (
        company_id, name, description, document_type, is_default, is_active,
        paper_size, page_orientation, margin_top, margin_bottom, margin_left, margin_right,
        font_family, font_size, line_height,
        header_template, body_template, footer_template, css_styles,
        show_company_logo, show_company_info, show_document_number, show_document_date,
        show_customer_info, show_items_table, show_totals, show_payment_info, show_notes
    ) VALUES (
        p_company_id, 'Factura Estándar', 'Plantilla estándar para facturas de venta', 'INVOICE', TRUE, TRUE,
        'A4', 'PORTRAIT', 15.0, 15.0, 15.0, 15.0,
        'Arial', 12.0, 1.2,
        '<div class="header"><h1>FACTURA DE VENTA</h1></div>',
        '<div class="body"><!-- Contenido de la factura --></div>',
        '<div class="footer"><p>Gracias por su compra</p></div>',
        '.header { text-align: center; margin-bottom: 20px; } .footer { text-align: center; margin-top: 20px; }',
        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE
    );

    -- Plantilla para Cotización
    INSERT INTO public.print_templates (
        company_id, name, description, document_type, is_default, is_active,
        paper_size, page_orientation, margin_top, margin_bottom, margin_left, margin_right,
        font_family, font_size, line_height,
        header_template, body_template, footer_template, css_styles,
        show_company_logo, show_company_info, show_document_number, show_document_date,
        show_customer_info, show_items_table, show_totals, show_payment_info, show_notes
    ) VALUES (
        p_company_id, 'Cotización Estándar', 'Plantilla estándar para cotizaciones', 'QUOTATION', TRUE, TRUE,
        'A4', 'PORTRAIT', 15.0, 15.0, 15.0, 15.0,
        'Arial', 12.0, 1.2,
        '<div class="header"><h1>COTIZACIÓN</h1></div>',
        '<div class="body"><!-- Contenido de la cotización --></div>',
        '<div class="footer"><p>Válida por 30 días</p></div>',
        '.header { text-align: center; margin-bottom: 20px; } .footer { text-align: center; margin-top: 20px; }',
        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE
    );

    -- Plantilla para Recibo de Caja
    INSERT INTO public.print_templates (
        company_id, name, description, document_type, is_default, is_active,
        paper_size, page_orientation, margin_top, margin_bottom, margin_left, margin_right,
        font_family, font_size, line_height,
        header_template, body_template, footer_template, css_styles,
        show_company_logo, show_company_info, show_document_number, show_document_date,
        show_customer_info, show_items_table, show_totals, show_payment_info, show_notes
    ) VALUES (
        p_company_id, 'Recibo de Caja', 'Plantilla para recibos de caja', 'RECEIPT', TRUE, TRUE,
        'HALF_LETTER', 'PORTRAIT', 10.0, 10.0, 10.0, 10.0,
        'Arial', 11.0, 1.1,
        '<div class="header"><h2>RECIBO DE CAJA</h2></div>',
        '<div class="body"><!-- Contenido del recibo --></div>',
        '<div class="footer"><p>Recibo generado automáticamente</p></div>',
        '.header { text-align: center; margin-bottom: 15px; } .footer { text-align: center; margin-top: 15px; font-size: 10px; }',
        TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, FALSE
    );

    -- Plantilla para Orden de Compra
    INSERT INTO public.print_templates (
        company_id, name, description, document_type, is_default, is_active,
        paper_size, page_orientation, margin_top, margin_bottom, margin_left, margin_right,
        font_family, font_size, line_height,
        header_template, body_template, footer_template, css_styles,
        show_company_logo, show_company_info, show_document_number, show_document_date,
        show_customer_info, show_items_table, show_totals, show_payment_info, show_notes
    ) VALUES (
        p_company_id, 'Orden de Compra', 'Plantilla para órdenes de compra', 'PURCHASE_ORDER', TRUE, TRUE,
        'A4', 'PORTRAIT', 15.0, 15.0, 15.0, 15.0,
        'Arial', 12.0, 1.2,
        '<div class="header"><h1>ORDEN DE COMPRA</h1></div>',
        '<div class="body"><!-- Contenido de la orden --></div>',
        '<div class="footer"><p>Orden de compra</p></div>',
        '.header { text-align: center; margin-bottom: 20px; } .footer { text-align: center; margin-top: 20px; }',
        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE
    );

    -- Plantilla para Remisión
    INSERT INTO public.print_templates (
        company_id, name, description, document_type, is_default, is_active,
        paper_size, page_orientation, margin_top, margin_bottom, margin_left, margin_right,
        font_family, font_size, line_height,
        header_template, body_template, footer_template, css_styles,
        show_company_logo, show_company_info, show_document_number, show_document_date,
        show_customer_info, show_items_table, show_totals, show_payment_info, show_notes
    ) VALUES (
        p_company_id, 'Remisión', 'Plantilla para remisiones de entrega', 'DELIVERY_NOTE', TRUE, TRUE,
        'A4', 'PORTRAIT', 15.0, 15.0, 15.0, 15.0,
        'Arial', 12.0, 1.2,
        '<div class="header"><h1>REMISIÓN</h1></div>',
        '<div class="body"><!-- Contenido de la remisión --></div>',
        '<div class="footer"><p>Documento de entrega</p></div>',
        '.header { text-align: center; margin-bottom: 20px; } .footer { text-align: center; margin-top: 20px; }',
        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE
    );

    -- Plantilla para Comprobante de Pago
    INSERT INTO public.print_templates (
        company_id, name, description, document_type, is_default, is_active,
        paper_size, page_orientation, margin_top, margin_bottom, margin_left, margin_right,
        font_family, font_size, line_height,
        header_template, body_template, footer_template, css_styles,
        show_company_logo, show_company_info, show_document_number, show_document_date,
        show_customer_info, show_items_table, show_totals, show_payment_info, show_notes
    ) VALUES (
        p_company_id, 'Comprobante de Pago', 'Plantilla para comprobantes de pago', 'PAYMENT_VOUCHER', TRUE, TRUE,
        'HALF_LETTER', 'PORTRAIT', 10.0, 10.0, 10.0, 10.0,
        'Arial', 11.0, 1.1,
        '<div class="header"><h2>COMPROBANTE DE PAGO</h2></div>',
        '<div class="body"><!-- Contenido del comprobante --></div>',
        '<div class="footer"><p>Comprobante generado automáticamente</p></div>',
        '.header { text-align: center; margin-bottom: 15px; } .footer { text-align: center; margin-top: 15px; font-size: 10px; }',
        TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, FALSE
    );

    -- Plantilla para Comprobante de Egreso
    INSERT INTO public.print_templates (
        company_id, name, description, document_type, is_default, is_active,
        paper_size, page_orientation, margin_top, margin_bottom, margin_left, margin_right,
        font_family, font_size, line_height,
        header_template, body_template, footer_template, css_styles,
        show_company_logo, show_company_info, show_document_number, show_document_date,
        show_customer_info, show_items_table, show_totals, show_payment_info, show_notes
    ) VALUES (
        p_company_id, 'Comprobante de Egreso', 'Plantilla para comprobantes de egreso', 'EXPENSE_VOUCHER', TRUE, TRUE,
        'HALF_LETTER', 'PORTRAIT', 10.0, 10.0, 10.0, 10.0,
        'Arial', 11.0, 1.1,
        '<div class="header"><h2>COMPROBANTE DE EGRESO</h2></div>',
        '<div class="body"><!-- Contenido del comprobante --></div>',
        '<div class="footer"><p>Comprobante de egreso</p></div>',
        '.header { text-align: center; margin-bottom: 15px; } .footer { text-align: center; margin-top: 15px; font-size: 10px; }',
        TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, FALSE
    );

    -- Plantilla para Reporte de Inventario
    INSERT INTO public.print_templates (
        company_id, name, description, document_type, is_default, is_active,
        paper_size, page_orientation, margin_top, margin_bottom, margin_left, margin_right,
        font_family, font_size, line_height,
        header_template, body_template, footer_template, css_styles,
        show_company_logo, show_company_info, show_document_number, show_document_date,
        show_customer_info, show_items_table, show_totals, show_payment_info, show_notes
    ) VALUES (
        p_company_id, 'Reporte de Inventario', 'Plantilla para reportes de inventario', 'INVENTORY_REPORT', TRUE, TRUE,
        'A4', 'LANDSCAPE', 15.0, 15.0, 15.0, 15.0,
        'Arial', 10.0, 1.1,
        '<div class="header"><h1>REPORTE DE INVENTARIO</h1></div>',
        '<div class="body"><!-- Contenido del reporte --></div>',
        '<div class="footer"><p>Reporte generado el {{fecha}}</p></div>',
        '.header { text-align: center; margin-bottom: 20px; } .footer { text-align: center; margin-top: 20px; font-size: 10px; }',
        TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, FALSE, TRUE
    );

    -- Plantilla para Reporte de Ventas
    INSERT INTO public.print_templates (
        company_id, name, description, document_type, is_default, is_active,
        paper_size, page_orientation, margin_top, margin_bottom, margin_left, margin_right,
        font_family, font_size, line_height,
        header_template, body_template, footer_template, css_styles,
        show_company_logo, show_company_info, show_document_number, show_document_date,
        show_customer_info, show_items_table, show_totals, show_payment_info, show_notes
    ) VALUES (
        p_company_id, 'Reporte de Ventas', 'Plantilla para reportes de ventas', 'SALES_REPORT', TRUE, TRUE,
        'A4', 'LANDSCAPE', 15.0, 15.0, 15.0, 15.0,
        'Arial', 10.0, 1.1,
        '<div class="header"><h1>REPORTE DE VENTAS</h1></div>',
        '<div class="body"><!-- Contenido del reporte --></div>',
        '<div class="footer"><p>Reporte generado el {{fecha}}</p></div>',
        '.header { text-align: center; margin-bottom: 20px; } .footer { text-align: center; margin-top: 20px; font-size: 10px; }',
        TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, FALSE, TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar el trigger de creación de empresa para incluir plantillas por defecto
CREATE OR REPLACE FUNCTION public.trigger_company_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear cuentas por defecto
    PERFORM public.create_default_accounts_for_company(NEW.id, NEW.created_by);
    
    -- Crear numeraciones por defecto
    PERFORM public.create_default_numerations_for_company(NEW.id);
    
    -- Crear impuestos por defecto
    PERFORM public.create_default_taxes_for_company(NEW.id);
    
    -- Crear centros de costos por defecto
    PERFORM public.create_default_cost_centers_for_company(NEW.id);
    
    -- Crear plantillas de impresión por defecto
    PERFORM public.create_default_print_templates_for_company(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;