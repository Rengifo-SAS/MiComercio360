-- Agregar columna account_id a la tabla sales para registrar en qué cuenta se recibe el dinero
-- Fecha: 2025-01-27

-- Agregar columna account_id a sales
ALTER TABLE public.sales 
ADD COLUMN account_id uuid;

-- Agregar restricción de clave foránea
ALTER TABLE public.sales 
ADD CONSTRAINT sales_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_sales_account_id ON public.sales(account_id);

-- Agregar comentario
COMMENT ON COLUMN public.sales.account_id IS 'Cuenta bancaria o de efectivo donde se registra el ingreso de la venta';

-- Actualizar las ventas existentes para que apunten a la cuenta "Efectivo POS" por defecto
-- (solo si existe la cuenta)
UPDATE public.sales 
SET account_id = (
  SELECT id FROM public.accounts 
  WHERE account_name = 'Efectivo POS' 
    AND company_id = sales.company_id 
    AND is_active = true 
  LIMIT 1
)
WHERE account_id IS NULL;
