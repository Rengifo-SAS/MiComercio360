-- Crear trigger para crear roles por defecto cuando se crea una nueva empresa
-- 058_create_default_roles_trigger.sql

-- Función para crear roles por defecto cuando se crea una empresa
CREATE OR REPLACE FUNCTION public.create_default_roles_for_new_company()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear roles por defecto para la nueva empresa
  PERFORM public.create_default_roles_for_company(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecuta después de insertar una nueva empresa
CREATE TRIGGER trigger_create_default_roles_for_company
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_roles_for_new_company();

-- Comentario
COMMENT ON FUNCTION public.create_default_roles_for_new_company () IS 'Crea roles por defecto automáticamente cuando se crea una nueva empresa';