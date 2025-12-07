-- Crear función para generar métodos de pago por defecto al crear una empresa
-- 066_create_default_payment_methods_function.sql

-- Función para crear métodos de pago por defecto para una empresa
CREATE OR REPLACE FUNCTION public.create_default_payment_methods_for_company(
    p_company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Crear método de pago en efectivo
    INSERT INTO public.payment_methods (
        company_id,
        name,
        description,
        payment_type,
        is_active,
        is_default,
        requires_authorization,
        requires_reference,
        requires_approval,
        fee_percentage,
        fee_fixed,
        min_amount,
        max_amount,
        icon,
        color,
        sort_order,
        created_by
    ) VALUES (
        p_company_id,
        'Efectivo',
        'Pago en efectivo - Moneda local',
        'CASH',
        true,
        true,
        false,
        false,
        false,
        0.00,
        0.00,
        0.00,
        NULL,
        'Banknote',
        '#10B981',
        1,
        auth.uid()
    );

    -- Crear método de pago con tarjeta de crédito
    INSERT INTO public.payment_methods (
        company_id,
        name,
        description,
        payment_type,
        is_active,
        is_default,
        requires_authorization,
        requires_reference,
        requires_approval,
        fee_percentage,
        fee_fixed,
        min_amount,
        max_amount,
        icon,
        color,
        sort_order,
        created_by
    ) VALUES (
        p_company_id,
        'Tarjeta de Crédito',
        'Pago con tarjeta de crédito',
        'CARD',
        true,
        true,
        true,
        true,
        false,
        2.50,
        0.00,
        1000.00,
        5000000.00,
        'CreditCard',
        '#3B82F6',
        2,
        auth.uid()
    );

    -- Crear método de pago con tarjeta de débito
    INSERT INTO public.payment_methods (
        company_id,
        name,
        description,
        payment_type,
        is_active,
        is_default,
        requires_authorization,
        requires_reference,
        requires_approval,
        fee_percentage,
        fee_fixed,
        min_amount,
        max_amount,
        icon,
        color,
        sort_order,
        created_by
    ) VALUES (
        p_company_id,
        'Tarjeta de Débito',
        'Pago con tarjeta de débito',
        'CARD',
        true,
        true,
        true,
        true,
        false,
        1.50,
        0.00,
        1000.00,
        2000000.00,
        'CreditCard',
        '#8B5CF6',
        3,
        auth.uid()
    );

    -- Crear método de pago por transferencia bancaria
    INSERT INTO public.payment_methods (
        company_id,
        name,
        description,
        payment_type,
        is_active,
        is_default,
        requires_authorization,
        requires_reference,
        requires_approval,
        fee_percentage,
        fee_fixed,
        min_amount,
        max_amount,
        icon,
        color,
        sort_order,
        created_by
    ) VALUES (
        p_company_id,
        'Transferencia Bancaria',
        'Transferencia bancaria - PSE, ACH, etc.',
        'TRANSFER',
        true,
        true,
        true,
        true,
        false,
        0.50,
        0.00,
        5000.00,
        NULL,
        'ArrowRightLeft',
        '#F59E0B',
        4,
        auth.uid()
    );

    -- Crear método de pago con cheque
    INSERT INTO public.payment_methods (
        company_id,
        name,
        description,
        payment_type,
        is_active,
        is_default,
        requires_authorization,
        requires_reference,
        requires_approval,
        fee_percentage,
        fee_fixed,
        min_amount,
        max_amount,
        icon,
        color,
        sort_order,
        created_by
    ) VALUES (
        p_company_id,
        'Cheque',
        'Pago con cheque',
        'CHECK',
        true,
        false,
        true,
        true,
        true,
        0.00,
        0.00,
        10000.00,
        NULL,
        'FileText',
        '#6B7280',
        5,
        auth.uid()
    );

    -- Crear método de pago con billetera digital (Nequi)
    INSERT INTO public.payment_methods (
        company_id,
        name,
        description,
        payment_type,
        is_active,
        is_default,
        requires_authorization,
        requires_reference,
        requires_approval,
        fee_percentage,
        fee_fixed,
        min_amount,
        max_amount,
        icon,
        color,
        sort_order,
        created_by
    ) VALUES (
        p_company_id,
        'Nequi',
        'Pago con billetera digital Nequi',
        'DIGITAL_WALLET',
        true,
        false,
        true,
        true,
        false,
        1.00,
        0.00,
        1000.00,
        1000000.00,
        'Smartphone',
        '#00D4AA',
        6,
        auth.uid()
    );

    -- Crear método de pago con Daviplata
    INSERT INTO public.payment_methods (
        company_id,
        name,
        description,
        payment_type,
        is_active,
        is_default,
        requires_authorization,
        requires_reference,
        requires_approval,
        fee_percentage,
        fee_fixed,
        min_amount,
        max_amount,
        icon,
        color,
        sort_order,
        created_by
    ) VALUES (
        p_company_id,
        'Daviplata',
        'Pago con billetera digital Daviplata',
        'DIGITAL_WALLET',
        true,
        false,
        true,
        true,
        false,
        1.00,
        0.00,
        1000.00,
        1000000.00,
        'Smartphone',
        '#FF6B35',
        7,
        auth.uid()
    );

    -- Crear método de pago con Movii
    INSERT INTO public.payment_methods (
        company_id,
        name,
        description,
        payment_type,
        is_active,
        is_default,
        requires_authorization,
        requires_reference,
        requires_approval,
        fee_percentage,
        fee_fixed,
        min_amount,
        max_amount,
        icon,
        color,
        sort_order,
        created_by
    ) VALUES (
        p_company_id,
        'Movii',
        'Pago con billetera digital Movii',
        'DIGITAL_WALLET',
        true,
        false,
        true,
        true,
        false,
        1.00,
        0.00,
        1000.00,
        1000000.00,
        'Smartphone',
        '#8B5CF6',
        8,
        auth.uid()
    );

    -- Registrar en el historial que se crearon los métodos de pago por defecto
    INSERT INTO public.payment_method_history (
        payment_method_id,
        old_fee_percentage,
        new_fee_percentage,
        old_fee_fixed,
        new_fee_fixed,
        change_reason,
        changed_by,
        company_id
    )
    SELECT 
        id,
        0.00,
        fee_percentage,
        0.00,
        fee_fixed,
        'Creación automática de método de pago por defecto',
        auth.uid(),
        p_company_id
    FROM public.payment_methods 
    WHERE company_id = p_company_id 
    AND created_by = auth.uid()
    AND created_at = now();

END;
$$;

-- Modificar el trigger existente para incluir la creación de métodos de pago
-- Primero eliminamos el trigger existente
DROP TRIGGER IF EXISTS trigger_company_created ON public.companies;

-- Recrear el trigger que ahora incluye cuentas, numeraciones, impuestos y métodos de pago
CREATE OR REPLACE FUNCTION public.trigger_company_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Crear cuentas por defecto
    PERFORM public.create_default_accounts_for_company(NEW.id, NEW.created_by);
    
    -- Crear numeraciones por defecto
    PERFORM public.create_default_numerations_for_company(NEW.id);
    
    -- Crear impuestos por defecto
    PERFORM public.create_default_taxes_for_company(NEW.id);
    
    -- Crear métodos de pago por defecto
    PERFORM public.create_default_payment_methods_for_company(NEW.id);
    
    RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER trigger_company_created
    AFTER INSERT ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_company_created();

-- Comentarios para documentación
COMMENT ON FUNCTION public.create_default_payment_methods_for_company IS 'Crea métodos de pago por defecto para una empresa recién creada';
COMMENT ON FUNCTION public.trigger_company_created IS 'Trigger que crea cuentas, numeraciones, impuestos y métodos de pago por defecto al crear una empresa';
