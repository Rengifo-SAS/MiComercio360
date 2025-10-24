-- Crear función para generar centros de costos por defecto al crear una empresa
-- 047_create_default_cost_centers_function.sql

-- Función para crear centros de costos por defecto para una empresa
CREATE OR REPLACE FUNCTION public.create_default_cost_centers_for_company(
    p_company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Crear centro de costos administrativo
    INSERT INTO public.cost_centers (
        company_id,
        code,
        name,
        description,
        cost_center_type,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'ADM001',
        'Administración General',
        'Centro de costos para gastos administrativos generales de la empresa',
        'ADMINISTRATIVE',
        true,
        true,
        auth.uid()
    );

    -- Crear centro de costos de ventas
    INSERT INTO public.cost_centers (
        company_id,
        code,
        name,
        description,
        cost_center_type,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'VEN001',
        'Ventas y Comercial',
        'Centro de costos para actividades de ventas y comercialización',
        'SALES',
        true,
        true,
        auth.uid()
    );

    -- Crear centro de costos de producción
    INSERT INTO public.cost_centers (
        company_id,
        code,
        name,
        description,
        cost_center_type,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'PRO001',
        'Producción',
        'Centro de costos para actividades de producción y manufactura',
        'PRODUCTION',
        true,
        true,
        auth.uid()
    );

    -- Crear centro de costos de marketing
    INSERT INTO public.cost_centers (
        company_id,
        code,
        name,
        description,
        cost_center_type,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'MAR001',
        'Marketing y Publicidad',
        'Centro de costos para actividades de marketing y publicidad',
        'MARKETING',
        true,
        true,
        auth.uid()
    );

    -- Crear centro de costos de recursos humanos
    INSERT INTO public.cost_centers (
        company_id,
        code,
        name,
        description,
        cost_center_type,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'RRH001',
        'Recursos Humanos',
        'Centro de costos para actividades de recursos humanos y nómina',
        'HUMAN_RESOURCES',
        true,
        true,
        auth.uid()
    );

    -- Crear centro de costos de tecnología
    INSERT INTO public.cost_centers (
        company_id,
        code,
        name,
        description,
        cost_center_type,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'TIC001',
        'Tecnología e Informática',
        'Centro de costos para gastos de tecnología e informática',
        'IT',
        true,
        true,
        auth.uid()
    );

    -- Crear centro de costos de finanzas
    INSERT INTO public.cost_centers (
        company_id,
        code,
        name,
        description,
        cost_center_type,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'FIN001',
        'Finanzas y Contabilidad',
        'Centro de costos para actividades financieras y contables',
        'FINANCE',
        true,
        true,
        auth.uid()
    );

    -- Crear centro de costos de logística
    INSERT INTO public.cost_centers (
        company_id,
        code,
        name,
        description,
        cost_center_type,
        is_active,
        is_default,
        created_by
    ) VALUES (
        p_company_id,
        'LOG001',
        'Logística y Almacén',
        'Centro de costos para actividades de logística y almacén',
        'LOGISTICS',
        true,
        true,
        auth.uid()
    );

    -- Registrar en el historial que se crearon los centros de costos por defecto
    INSERT INTO public.cost_center_history (
        cost_center_id,
        change_type,
        old_values,
        new_values,
        change_reason,
        changed_by,
        company_id
    )
    SELECT 
        id,
        'CREATED',
        '{}'::jsonb,
        jsonb_build_object(
            'code', code,
            'name', name,
            'cost_center_type', cost_center_type
        ),
        'Creación automática de centro de costos por defecto',
        auth.uid(),
        p_company_id
    FROM public.cost_centers 
    WHERE company_id = p_company_id 
    AND created_by = auth.uid()
    AND created_at = now();

END;
$$;

-- Modificar el trigger existente para incluir la creación de centros de costos
-- Primero eliminamos el trigger existente
DROP TRIGGER IF EXISTS trigger_company_created ON public.companies;

-- Recrear el trigger que ahora incluye cuentas, numeraciones, impuestos y centros de costos
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
    
    -- Crear centros de costos por defecto
    PERFORM public.create_default_cost_centers_for_company(NEW.id);
    
    RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER trigger_company_created
    AFTER INSERT ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_company_created();

-- Comentarios para documentación
COMMENT ON FUNCTION public.create_default_cost_centers_for_company IS 'Crea centros de costos por defecto para una empresa recién creada';

COMMENT ON FUNCTION public.trigger_company_created IS 'Trigger que crea cuentas, numeraciones, impuestos y centros de costos por defecto al crear una empresa';