-- Corregir trigger para incluir centros de costos
-- 067_fix_trigger_include_cost_centers.sql

-- Eliminar el trigger existente
DROP TRIGGER IF EXISTS trigger_company_created ON public.companies;

-- Recrear el trigger que incluye TODOS los módulos
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
COMMENT ON FUNCTION public.trigger_company_created IS 'Trigger que crea cuentas, numeraciones, impuestos, centros de costos y métodos de pago por defecto al crear una empresa';

