-- =====================================================
-- MIGRACIÓN 078: Corrección de políticas RLS duplicadas
-- =====================================================

-- Esta migración corrige el problema de políticas duplicadas que puede ocurrir
-- cuando las migraciones 076 y 078 se ejecutan en secuencia

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Users can view their own POS configurations" ON public.pos_configurations;
DROP POLICY IF EXISTS "Users can insert their own POS configurations" ON public.pos_configurations;
DROP POLICY IF EXISTS "Users can update their own POS configurations" ON public.pos_configurations;
DROP POLICY IF EXISTS "Users can delete their own POS configurations" ON public.pos_configurations;

-- Recrear las políticas con nombres únicos
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

-- =====================================================
-- MIGRACIÓN COMPLETADA
-- =====================================================