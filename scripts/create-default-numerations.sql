-- Script para crear numeraciones por defecto
-- Ejecutar en Supabase SQL Editor

-- Función para crear numeraciones por defecto para una empresa
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
        0, -- Inicia en 0, el primer número será 1
        6,
        '',
        true,
        'Numeración principal para facturas de venta de la empresa',
        auth.uid()
    );

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
    );

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
    );

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
    );

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
    );

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
    );

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
    );

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
    );

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
    );

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
    );

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
    AND created_at = now();

END;
$$;

-- Modificar el trigger existente para incluir la creación de numeraciones
-- Primero eliminamos el trigger existente
DROP TRIGGER IF EXISTS trigger_company_created ON public.companies;

-- Recrear el trigger que ahora incluye tanto cuentas como numeraciones
CREATE OR REPLACE FUNCTION public.trigger_company_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Crear cuentas por defecto
    PERFORM public.create_default_accounts_for_company(NEW.id);
    
    -- Crear numeraciones por defecto
    PERFORM public.create_default_numerations_for_company(NEW.id);
    
    RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER trigger_company_created
    AFTER INSERT ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_company_created();

-- Comentarios para documentación
COMMENT ON FUNCTION public.create_default_numerations_for_company IS 'Crea numeraciones por defecto para una empresa recién creada';

COMMENT ON FUNCTION public.trigger_company_created IS 'Trigger que crea cuentas y numeraciones por defecto al crear una empresa';