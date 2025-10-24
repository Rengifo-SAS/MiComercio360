const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno requeridas:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SQL para crear la tabla pos_configurations
const createPosConfigTableSQL = `
-- Crear tabla para configuración del POS
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

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pos_configurations_company_id ON public.pos_configurations(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_configurations_user_id ON public.pos_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_configurations_company_user ON public.pos_configurations(company_id, user_id);

-- Habilitar RLS
ALTER TABLE public.pos_configurations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
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

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_pos_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS trigger_update_pos_configurations_updated_at ON public.pos_configurations;
CREATE TRIGGER trigger_update_pos_configurations_updated_at
  BEFORE UPDATE ON public.pos_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_pos_configurations_updated_at();

-- Comentarios
COMMENT ON TABLE public.pos_configurations IS 'Configuraciones específicas del POS para cada usuario y empresa';
COMMENT ON COLUMN public.pos_configurations.terminal_name IS 'Nombre de la terminal POS';
COMMENT ON COLUMN public.pos_configurations.default_account_id IS 'Cuenta contable por defecto para las ventas';
COMMENT ON COLUMN public.pos_configurations.default_customer_id IS 'Cliente por defecto para las ventas';
COMMENT ON COLUMN public.pos_configurations.default_numeration_id IS 'Numeración por defecto para las facturas';
`;

// SQL para agregar numeration_id a sales
const addNumerationToSalesSQL = `
-- Agregar columna numeration_id a la tabla sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS numeration_id uuid;

-- Agregar foreign key constraint
ALTER TABLE public.sales 
ADD CONSTRAINT IF NOT EXISTS sales_numeration_id_fkey 
FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL;

-- Crear índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_numeration_id ON public.sales(numeration_id);

-- Comentario
COMMENT ON COLUMN public.sales.numeration_id IS 'Referencia a la numeración utilizada para generar el número de venta';
`;

async function executeSQL(sql, description) {
  console.log(`🔄 ${description}...`);

  try {
    // Usar el método correcto para ejecutar SQL en Supabase
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error(`   SQL: ${sql.substring(0, 100)}...`);
    } else {
      console.log(`✅ ${description} completado`);
    }
  } catch (error) {
    console.error(`❌ Error en ${description}:`, error.message);
  }
}

async function runMigrations() {
  console.log('🚀 Iniciando aplicación de migraciones...');

  try {
    // Ejecutar migración 1: Crear tabla pos_configurations
    await executeSQL(createPosConfigTableSQL, 'Creando tabla pos_configurations');

    // Ejecutar migración 2: Agregar numeration_id a sales
    await executeSQL(addNumerationToSalesSQL, 'Agregando numeration_id a tabla sales');

    console.log('✅ Todas las migraciones completadas');

    // Verificar resultados
    console.log('🔍 Verificando resultados...');

    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'pos_configurations');

    if (tablesError) {
      console.error('❌ Error verificando tabla pos_configurations:', tablesError);
    } else {
      console.log('📋 Tabla pos_configurations:', tables.length > 0 ? '✅ Existe' : '❌ No existe');
    }

  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    process.exit(1);
  }
}

// Ejecutar migraciones
runMigrations();
