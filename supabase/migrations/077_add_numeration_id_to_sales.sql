-- Agregar columna numeration_id a la tabla sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS numeration_id uuid;

-- Agregar foreign key constraint
ALTER TABLE public.sales 
ADD CONSTRAINT sales_numeration_id_fkey 
FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL;

-- Crear índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_numeration_id ON public.sales(numeration_id);

-- Comentario
COMMENT ON COLUMN public.sales.numeration_id IS 'Referencia a la numeración utilizada para generar el número de venta';
