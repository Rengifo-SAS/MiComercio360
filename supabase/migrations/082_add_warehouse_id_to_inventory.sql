-- Agregar columna warehouse_id a la tabla inventory para compatibilidad con importación
-- Esta migración permite que la tabla inventory tradicional también maneje bodegas

-- Agregar columna warehouse_id a la tabla inventory
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id ON public.inventory(warehouse_id);

-- Crear índice compuesto para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_inventory_product_warehouse ON public.inventory(product_id, warehouse_id);

-- Actualizar comentarios
COMMENT ON COLUMN public.inventory.warehouse_id IS 'ID de la bodega donde se encuentra el inventario. NULL significa inventario general sin bodega específica';

-- Función para sincronizar inventario tradicional con warehouse_inventory
-- (Función ya existe en migraciones anteriores, solo agregamos la columna warehouse_id)

-- Trigger para mantener sincronización automática
CREATE OR REPLACE FUNCTION public.trigger_sync_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Si se inserta o actualiza en warehouse_inventory, sincronizar inventory
    IF TG_TABLE_NAME = 'warehouse_inventory' THEN
        -- Insertar o actualizar en inventory
        INSERT INTO public.inventory (product_id, warehouse_id, quantity, company_id, last_updated)
        VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity, NEW.company_id, NEW.last_updated)
        ON CONFLICT (product_id, warehouse_id) 
        DO UPDATE SET
            quantity = NEW.quantity,
            last_updated = NEW.last_updated;
            
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

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS sync_inventory_trigger ON public.warehouse_inventory;
CREATE TRIGGER sync_inventory_trigger
    AFTER INSERT OR UPDATE ON public.warehouse_inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sync_inventory();

-- Política RLS para la nueva columna
-- Permitir que los usuarios vean solo el inventario de su compañía
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Política para lectura
DROP POLICY IF EXISTS "Users can view inventory of their company" ON public.inventory;
CREATE POLICY "Users can view inventory of their company" ON public.inventory
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Política para inserción
DROP POLICY IF EXISTS "Users can insert inventory for their company" ON public.inventory;
CREATE POLICY "Users can insert inventory for their company" ON public.inventory
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Política para actualización
DROP POLICY IF EXISTS "Users can update inventory of their company" ON public.inventory;
CREATE POLICY "Users can update inventory of their company" ON public.inventory
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Política para eliminación
DROP POLICY IF EXISTS "Users can delete inventory of their company" ON public.inventory;
CREATE POLICY "Users can delete inventory of their company" ON public.inventory
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );
