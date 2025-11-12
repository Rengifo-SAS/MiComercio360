-- Agregar tipos de documentos faltantes a las numeraciones
-- 120_add_missing_numeration_types.sql

-- Primero, actualizar el CHECK constraint para incluir los nuevos tipos de documentos
ALTER TABLE public.numerations 
DROP CONSTRAINT IF EXISTS numerations_document_type_check;

ALTER TABLE public.numerations 
ADD CONSTRAINT numerations_document_type_check 
CHECK (document_type IN (
    'invoice',              -- Factura de venta
    'receipt',              -- Recibo de caja
    'expense_voucher',      -- Comprobante de egreso
    'credit_note',          -- Nota crédito
    'debit_note',           -- Nota débito
    'purchase_order',       -- Orden de compra
    'quotation',            -- Cotización
    'delivery_note',        -- Remisión
    'payment_voucher',     -- Comprobante de pago
    'adjustment_note',      -- Nota de ajuste
    'payment_received',     -- Pagos recibidos
    'recurring_invoice',    -- Facturas Recurrentes
    'sale_return',          -- Devoluciones de venta
    'purchase_invoice',     -- Factura de Compra (Egresos)
    'support_document',     -- Documento de soporte
    'payment',              -- Pagos
    'recurring_payment'     -- Pagos Recurrentes
));

-- Actualizar la función get_next_number para incluir los prefijos de los nuevos tipos
CREATE OR REPLACE FUNCTION public.get_next_number(
    p_company_id uuid,
    p_document_type text,
    p_name text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_numeration public.numerations%ROWTYPE;
    v_next_number integer;
    v_formatted_number text;
BEGIN
    -- Buscar la numeración activa
    SELECT * INTO v_numeration
    FROM public.numerations
    WHERE company_id = p_company_id
      AND document_type = p_document_type
      AND is_active = true
      AND (p_name IS NULL OR name = p_name)
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Si no existe numeración, crear una por defecto
    IF NOT FOUND THEN
        INSERT INTO public.numerations (
            company_id,
            document_type,
            name,
            prefix,
            current_number,
            number_length,
            suffix
        ) VALUES (
            p_company_id,
            p_document_type,
            COALESCE(p_name, 'Principal'),
            CASE p_document_type
                WHEN 'invoice' THEN 'FAC'
                WHEN 'receipt' THEN 'REC'
                WHEN 'expense_voucher' THEN 'EGR'
                WHEN 'credit_note' THEN 'NC'
                WHEN 'debit_note' THEN 'ND'
                WHEN 'purchase_order' THEN 'OC'
                WHEN 'quotation' THEN 'COT'
                WHEN 'delivery_note' THEN 'REM'
                WHEN 'payment_voucher' THEN 'CP'
                WHEN 'adjustment_note' THEN 'NA'
                WHEN 'payment_received' THEN 'PR'
                WHEN 'recurring_invoice' THEN 'FREC'
                WHEN 'sale_return' THEN 'DEV'
                WHEN 'purchase_invoice' THEN 'FAC-C'
                WHEN 'support_document' THEN 'DS'
                WHEN 'payment' THEN 'PAG'
                WHEN 'recurring_payment' THEN 'PAG-REC'
                ELSE 'DOC'
            END,
            0,
            6,
            ''
        ) RETURNING * INTO v_numeration;
    END IF;
    
    -- Incrementar el número actual
    v_next_number := v_numeration.current_number + 1;
    
    -- Actualizar el número actual en la numeración
    UPDATE public.numerations
    SET current_number = v_next_number,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = v_numeration.id;
    
    -- Formatear el número con ceros a la izquierda
    v_formatted_number := lpad(v_next_number::text, v_numeration.number_length, '0');
    
    -- Registrar en el historial
    INSERT INTO public.numeration_history (
        numeration_id,
        old_number,
        new_number,
        change_reason,
        changed_by,
        company_id
    ) VALUES (
        v_numeration.id,
        v_numeration.current_number,
        v_next_number,
        'Generación automática',
        auth.uid(),
        p_company_id
    );
    
    -- Retornar el número formateado completo
    RETURN v_numeration.prefix || v_formatted_number || v_numeration.suffix;
END;
$$;

-- Actualizar la función create_default_numerations_for_company para incluir las nuevas numeraciones
CREATE OR REPLACE FUNCTION public.create_default_numerations_for_company(
    p_company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Crear numeración principal de Facturas de Venta
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'invoice',
        'Facturas de Venta Principal',
        'FAC',
        0,
        6,
        '',
        true,
        'Numeración principal para facturas de venta de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Recibos de Caja
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'receipt',
        'Recibos de Caja Principal',
        'REC',
        0,
        6,
        '',
        true,
        'Numeración principal para recibos de caja de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Comprobantes de Egreso
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'expense_voucher',
        'Comprobantes de Egreso Principal',
        'EGR',
        0,
        6,
        '',
        true,
        'Numeración principal para comprobantes de egreso de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Cotizaciones
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'quotation',
        'Cotizaciones Principal',
        'COT',
        0,
        6,
        '',
        true,
        'Numeración principal para cotizaciones de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Notas Crédito
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'credit_note',
        'Notas Crédito Principal',
        'NC',
        0,
        6,
        '',
        true,
        'Numeración principal para notas crédito de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Notas Débito
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'debit_note',
        'Notas Débito Principal',
        'ND',
        0,
        6,
        '',
        true,
        'Numeración principal para notas débito de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Órdenes de Compra
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'purchase_order',
        'Órdenes de Compra Principal',
        'OC',
        0,
        6,
        '',
        true,
        'Numeración principal para órdenes de compra de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Remisiones
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'delivery_note',
        'Remisiones Principal',
        'REM',
        0,
        6,
        '',
        true,
        'Numeración principal para remisiones de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Comprobantes de Pago
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'payment_voucher',
        'Comprobantes de Pago Principal',
        'CP',
        0,
        6,
        '',
        true,
        'Numeración principal para comprobantes de pago de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Notas de Ajuste
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'adjustment_note',
        'Notas de Ajuste Principal',
        'NA',
        0,
        6,
        '',
        true,
        'Numeración principal para notas de ajuste de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Pagos Recibidos
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'payment_received',
        'Pagos Recibidos Principal',
        'PR',
        0,
        6,
        '',
        true,
        'Numeración principal para pagos recibidos de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Facturas Recurrentes
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'recurring_invoice',
        'Facturas Recurrentes Principal',
        'FREC',
        0,
        6,
        '',
        true,
        'Numeración principal para facturas recurrentes de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Devoluciones de Venta
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'sale_return',
        'Devoluciones de Venta Principal',
        'DEV',
        0,
        6,
        '',
        true,
        'Numeración principal para devoluciones de venta de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Facturas de Compra (Egresos)
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'purchase_invoice',
        'Facturas de Compra Principal',
        'FAC-C',
        0,
        6,
        '',
        true,
        'Numeración principal para facturas de compra de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Documentos de Soporte
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'support_document',
        'Documentos de Soporte Principal',
        'DS',
        0,
        6,
        '',
        true,
        'Numeración principal para documentos de soporte de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Pagos
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'payment',
        'Pagos Principal',
        'PAG',
        0,
        6,
        '',
        true,
        'Numeración principal para pagos de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Crear numeración de Pagos Recurrentes
    INSERT INTO public.numerations (
        company_id,
        document_type,
        name,
        prefix,
        current_number,
        number_length,
        suffix,
        is_active,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'recurring_payment',
        'Pagos Recurrentes Principal',
        'PAG-REC',
        0,
        6,
        '',
        true,
        'Numeración principal para pagos recurrentes de la empresa',
        auth.uid()
    ) ON CONFLICT (company_id, document_type, name) DO NOTHING;

    -- Registrar en el historial que se crearon las numeraciones por defecto
    INSERT INTO public.numeration_history (
        numeration_id,
        old_number,
        new_number,
        change_reason,
        changed_by,
        company_id
    )
    SELECT 
        id,
        0,
        0,
        'Creación automática de numeración por defecto',
        auth.uid(),
        p_company_id
    FROM public.numerations 
    WHERE company_id = p_company_id 
    AND created_by = auth.uid()
    AND created_at >= now() - INTERVAL '1 minute'
    ON CONFLICT DO NOTHING;

END;
$$;

-- Comentarios para documentación
COMMENT ON FUNCTION public.create_default_numerations_for_company IS 'Crea numeraciones por defecto para una empresa recién creada, incluyendo todos los tipos de documentos soportados';

