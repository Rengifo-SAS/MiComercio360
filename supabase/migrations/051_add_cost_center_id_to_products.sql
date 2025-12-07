-- Agregar campo cost_center_id a la tabla products
-- 051_add_cost_center_id_to_products.sql

-- Agregar columna cost_center_id a la tabla products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers (id);

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_products_cost_center_id ON public.products (cost_center_id);

-- Agregar comentario
COMMENT ON COLUMN public.products.cost_center_id IS 'Centro de costos asignado al producto';