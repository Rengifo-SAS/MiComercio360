-- =====================================================
-- MIGRACIÓN: Crear tabla pos_configurations y agregar numeration_id a sales
-- =====================================================

-- 1. Crear tabla para configuración del POS
CREATE TABLE IF NOT EXISTS public.pos_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  terminal_name text NOT NULL DEFAULT 'Terminal Principal',
  default_account_id uuid,
  default_customer_id uuid,
  default_numeration_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT pos_configurations_pkey PRIMARY KEY (id),
  CONSTRAINT pos_configurations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT pos_configurations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT pos_configurations_default_account_id_fkey FOREIGN KEY (default_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL,
  CONSTRAINT pos_configurations_default_customer_id_fkey FOREIGN KEY (default_customer_id) REFERENCES public.customers(id) ON DELETE SET NULL,
  CONSTRAINT pos_configurations_default_numeration_id_fkey FOREIGN KEY (default_numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL,
  CONSTRAINT pos_configurations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT pos_configurations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT pos_configurations_unique_user_company UNIQUE (user_id, company_id)
);

-- 2. Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pos_configurations_company_id ON public.pos_configurations(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_configurations_user_id ON public.pos_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_configurations_company_user ON public.pos_configurations(company_id, user_id);

-- 3. Habilitar RLS
ALTER TABLE public.pos_configurations ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
CREATE POLICY "Users can view their own POS configurations" ON public.pos_configurations
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.company_id = pos_configurations.company_id
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can insert their own POS configurations" ON public.pos_configurations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own POS configurations" ON public.pos_configurations
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.company_id = pos_configurations.company_id
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can delete their own POS configurations" ON public.pos_configurations
  FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.company_id = pos_configurations.company_id
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- 5. Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_pos_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS trigger_update_pos_configurations_updated_at ON public.pos_configurations;
CREATE TRIGGER trigger_update_pos_configurations_updated_at
  BEFORE UPDATE ON public.pos_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_pos_configurations_updated_at();

-- 7. Comentarios
COMMENT ON TABLE public.pos_configurations IS 'Configuraciones específicas del POS para cada usuario y empresa';
COMMENT ON COLUMN public.pos_configurations.terminal_name IS 'Nombre de la terminal POS';
COMMENT ON COLUMN public.pos_configurations.default_account_id IS 'Cuenta contable por defecto para las ventas';
COMMENT ON COLUMN public.pos_configurations.default_customer_id IS 'Cliente por defecto para las ventas';
COMMENT ON COLUMN public.pos_configurations.default_numeration_id IS 'Numeración por defecto para las facturas';

-- =====================================================
-- AGREGAR COLUMNA NUMERATION_ID A LA TABLA SALES
-- =====================================================

-- 8. Agregar columna numeration_id a la tabla sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS numeration_id uuid;

-- 9. Agregar foreign key constraint
ALTER TABLE public.sales ADD CONSTRAINT IF NOT EXISTS sales_numeration_id_fkey 
FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL;

-- 10. Crear índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_numeration_id ON public.sales(numeration_id);

-- 11. Comentario
COMMENT ON COLUMN public.sales.numeration_id IS 'Referencia a la numeración utilizada para generar el número de venta';

-- =====================================================
-- MIGRACIÓN COMPLETADA
-- =====================================================