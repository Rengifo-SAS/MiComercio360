-- Añadir columna warehouse_id a la tabla products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses (id);

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_products_warehouse_id ON public.products (warehouse_id);

-- Actualizar políticas RLS para warehouses
-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view warehouses in their company" ON public.warehouses;

DROP POLICY IF EXISTS "Users can insert warehouses in their company" ON public.warehouses;

DROP POLICY IF EXISTS "Users can update warehouses in their company" ON public.warehouses;

DROP POLICY IF EXISTS "Users can delete warehouses in their company" ON public.warehouses;

-- Crear políticas RLS simplificadas para warehouses
CREATE POLICY "Users can manage warehouses in their company" ON public.warehouses FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);