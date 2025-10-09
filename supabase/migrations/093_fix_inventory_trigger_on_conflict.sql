-- Corregir el trigger que causa el error de ON CONFLICT en inventory
-- El problema está en que el trigger intenta hacer ON CONFLICT en una tabla sin constraint único

-- Eliminar el trigger problemático
DROP TRIGGER IF EXISTS sync_inventory_trigger ON public.warehouse_inventory;
DROP FUNCTION IF EXISTS public.trigger_sync_inventory();

-- Crear función corregida sin ON CONFLICT problemático
CREATE OR REPLACE FUNCTION public.trigger_sync_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Si se inserta o actualiza en warehouse_inventory, sincronizar inventory
    IF TG_TABLE_NAME = 'warehouse_inventory' THEN
        -- Verificar si existe registro en inventory para este producto y bodega
        IF EXISTS (
            SELECT 1 FROM public.inventory 
            WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id
        ) THEN
            -- Actualizar existente
            UPDATE public.inventory
            SET
                quantity = NEW.quantity,
                last_updated = NEW.last_updated
            WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;
        ELSE
            -- Crear nuevo registro
            INSERT INTO public.inventory (product_id, warehouse_id, quantity, company_id, last_updated)
            VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity, NEW.company_id, NEW.last_updated);
        END IF;
            
        -- Actualizar inventario general (suma de todas las bodegas)
        UPDATE public.inventory
        SET quantity = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM public.warehouse_inventory
            WHERE product_id = NEW.product_id
        ),
        last_updated = now()
        WHERE product_id = NEW.product_id AND warehouse_id IS NULL;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Recrear el trigger con la función corregida
CREATE TRIGGER sync_inventory_trigger
    AFTER INSERT OR UPDATE ON public.warehouse_inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sync_inventory();
