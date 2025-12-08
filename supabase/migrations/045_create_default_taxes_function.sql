-- Crear función para generar impuestos por defecto de Colombia al crear una empresa
-- 045_create_default_taxes_function.sql

-- Función para crear impuestos por defecto de Colombia para una empresa
CREATE OR REPLACE FUNCTION public.create_default_taxes_for_company(
    p_company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Crear IVA del 19% (Impuesto al Valor Agregado)
    INSERT INTO public.taxes (
        company_id,
        name,
        description,
        tax_type,
        percentage,
        is_inclusive,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'IVA 19%',
        'Impuesto al Valor Agregado del 19% - Colombia',
        'VAT',
        19.00,
        false, -- No incluido en el precio base
        true,
        true,
        auth.uid()
    );

    -- Crear IVA del 5% (para algunos productos básicos)
    INSERT INTO public.taxes (
        company_id,
        name,
        description,
        tax_type,
        percentage,
        is_inclusive,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'IVA 5%',
        'Impuesto al Valor Agregado del 5% - Productos básicos',
        'VAT',
        5.00,
        false,
        true,
        true,
        auth.uid()
    );

    -- Crear IVA del 0% (productos exentos)
    INSERT INTO public.taxes (
        company_id,
        name,
        description,
        tax_type,
        percentage,
        is_inclusive,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'IVA 0%',
        'Impuesto al Valor Agregado del 0% - Productos exentos',
        'VAT',
        0.00,
        false,
        true,
        true,
        auth.uid()
    );

    -- Crear Retención en la Fuente del 3.5% (servicios)
    INSERT INTO public.taxes (
        company_id,
        name,
        description,
        tax_type,
        percentage,
        is_inclusive,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'Retención en la Fuente 3.5%',
        'Retención en la Fuente del 3.5% - Servicios',
        'WITHHOLDING',
        3.50,
        false,
        true,
        true,
        auth.uid()
    );

    -- Crear Retención en la Fuente del 1% (compras)
    INSERT INTO public.taxes (
        company_id,
        name,
        description,
        tax_type,
        percentage,
        is_inclusive,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'Retención en la Fuente 1%',
        'Retención en la Fuente del 1% - Compras',
        'WITHHOLDING',
        1.00,
        false,
        true,
        true,
        auth.uid()
    );

    -- Crear ICA (Impuesto de Industria y Comercio) - 0.96% (promedio)
    INSERT INTO public.taxes (
        company_id,
        name,
        description,
        tax_type,
        percentage,
        is_inclusive,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'ICA 0.96%',
        'Impuesto de Industria y Comercio del 0.96%',
        'INDUSTRY',
        0.96,
        false,
        true,
        true,
        auth.uid()
    );

    -- Crear Impuesto al Consumo del 8% (bebidas alcohólicas)
    INSERT INTO public.taxes (
        company_id,
        name,
        description,
        tax_type,
        percentage,
        is_inclusive,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'Impuesto al Consumo 8%',
        'Impuesto al Consumo del 8% - Bebidas alcohólicas',
        'CONSUMPTION',
        8.00,
        false,
        true,
        true,
        auth.uid()
    );

    -- Crear Impuesto al Consumo del 16% (cigarrillos)
    INSERT INTO public.taxes (
        company_id,
        name,
        description,
        tax_type,
        percentage,
        is_inclusive,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'Impuesto al Consumo 16%',
        'Impuesto al Consumo del 16% - Cigarrillos',
        'CONSUMPTION',
        16.00,
        false,
        true,
        true,
        auth.uid()
    );

    -- Registrar en el historial que se crearon los impuestos por defecto
    INSERT INTO public.tax_history (
        tax_id,
        old_percentage,
        new_percentage,
        change_reason,
        changed_by,
        company_id
    )
    SELECT 
        id,
        0.00,
        percentage,
        'Creación automática de impuesto por defecto',
        auth.uid(),
        p_company_id
    FROM public.taxes 
    WHERE company_id = p_company_id 
    AND created_by = auth.uid()
    AND created_at = now();

END;
$$;

-- Modificar el trigger existente para incluir la creación de impuestos
-- Primero eliminamos el trigger existente
DROP TRIGGER IF EXISTS trigger_company_created ON public.companies;

-- Recrear el trigger que ahora incluye cuentas, numeraciones e impuestos
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
    
    RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER trigger_company_created
    AFTER INSERT ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_company_created();

-- Comentarios para documentación
COMMENT ON FUNCTION public.create_default_taxes_for_company IS 'Crea impuestos por defecto de Colombia para una empresa recién creada';

COMMENT ON FUNCTION public.trigger_company_created IS 'Trigger que crea cuentas, numeraciones e impuestos por defecto al crear una empresa';