-- Corregir el trigger para evitar conflictos al eliminar clientes
-- 037_fix_customer_deletion.sql

-- Eliminar el trigger existente
DROP TRIGGER IF EXISTS trigger_log_customer_changes ON customers;

-- Recrear la función del trigger sin el caso DELETE problemático
CREATE OR REPLACE FUNCTION log_customer_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO customer_history (customer_id, company_id, action, created_by)
    VALUES (NEW.id, NEW.company_id, 'CREATED', NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Registrar cambios en campos importantes
    IF OLD.business_name != NEW.business_name THEN
      INSERT INTO customer_history (customer_id, company_id, action, field_name, old_value, new_value, created_by)
      VALUES (NEW.id, NEW.company_id, 'UPDATED', 'business_name', OLD.business_name, NEW.business_name, NEW.updated_by);
    END IF;
    
    IF OLD.email != NEW.email THEN
      INSERT INTO customer_history (customer_id, company_id, action, field_name, old_value, new_value, created_by)
      VALUES (NEW.id, NEW.company_id, 'UPDATED', 'email', OLD.email, NEW.email, NEW.updated_by);
    END IF;
    
    IF OLD.phone != NEW.phone THEN
      INSERT INTO customer_history (customer_id, company_id, action, field_name, old_value, new_value, created_by)
      VALUES (NEW.id, NEW.company_id, 'UPDATED', 'phone', OLD.phone, NEW.phone, NEW.updated_by);
    END IF;
    
    IF OLD.is_active != NEW.is_active THEN
      INSERT INTO customer_history (customer_id, company_id, action, field_name, old_value, new_value, created_by)
      VALUES (NEW.id, NEW.company_id, CASE WHEN NEW.is_active THEN 'ACTIVATED' ELSE 'DEACTIVATED' END, 'is_active', OLD.is_active::text, NEW.is_active::text, NEW.updated_by);
    END IF;
    
    RETURN NEW;
  END IF;
  -- No manejar el caso DELETE para evitar conflictos de clave foránea
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger solo para INSERT y UPDATE
CREATE TRIGGER trigger_log_customer_changes
  AFTER INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION log_customer_changes();

-- Comentario para documentación
COMMENT ON FUNCTION log_customer_changes IS 'Función para registrar cambios en clientes (sin manejo de DELETE para evitar conflictos)';