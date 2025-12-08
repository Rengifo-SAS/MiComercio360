-- Agregar creación del cliente Consumidor Final al trigger principal
-- 070_add_consumidor_final_to_trigger.sql

-- Eliminar el trigger existente
DROP TRIGGER IF EXISTS trigger_company_created ON public.companies;

-- Recrear el trigger que incluye TODOS los módulos incluyendo Consumidor Final
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
    
    -- Crear cliente Consumidor Final por defecto
    PERFORM public.create_default_consumidor_final(NEW.id);
    
    RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER trigger_company_created
    AFTER INSERT ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_company_created();

-- Comentarios para documentación
COMMENT ON FUNCTION public.trigger_company_created IS 'Trigger que crea cuentas, numeraciones, impuestos, centros de costos, métodos de pago y cliente Consumidor Final por defecto al crear una empresa';

-- Crear el cliente Consumidor Final para todas las empresas existentes que no lo tengan
DO $$
DECLARE
    company_record RECORD;
BEGIN
    FOR company_record IN 
        SELECT id FROM companies WHERE is_active = true
    LOOP
        PERFORM create_default_consumidor_final(company_record.id);
    END LOOP;
END $$;
