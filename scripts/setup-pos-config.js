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

async function checkTablesExist() {
    console.log('🔍 Verificando estado de las tablas...');

    // Verificar si la tabla pos_configurations existe
    const { data: posConfigTable, error: posConfigError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'pos_configurations')
        .single();

    if (posConfigError && posConfigError.code !== 'PGRST116') {
        console.error('❌ Error verificando tabla pos_configurations:', posConfigError);
        return false;
    }

    const posConfigExists = !!posConfigTable;
    console.log(`📋 Tabla pos_configurations: ${posConfigExists ? '✅ Existe' : '❌ No existe'}`);

    // Verificar si la columna numeration_id existe en sales
    const { data: numerationColumn, error: numerationError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'sales')
        .eq('column_name', 'numeration_id')
        .single();

    if (numerationError && numerationError.code !== 'PGRST116') {
        console.error('❌ Error verificando columna numeration_id:', numerationError);
        return false;
    }

    const numerationExists = !!numerationColumn;
    console.log(`📋 Columna numeration_id en sales: ${numerationExists ? '✅ Existe' : '❌ No existe'}`);

    return { posConfigExists, numerationExists };
}

async function createPosConfigTable() {
    console.log('🔄 Creando tabla pos_configurations...');

    try {
        // Crear tabla usando una consulta simple
        const { error } = await supabase
            .from('pos_configurations')
            .select('id')
            .limit(1);

        if (error && error.code === 'PGRST205') {
            console.log('📝 La tabla no existe, creándola...');

            // Como no podemos ejecutar DDL directamente, vamos a intentar crear un registro
            // Esto fallará pero nos dará información sobre la estructura
            const { error: createError } = await supabase
                .from('pos_configurations')
                .insert({
                    id: '00000000-0000-0000-0000-000000000000',
                    company_id: '00000000-0000-0000-0000-000000000000',
                    user_id: '00000000-0000-0000-0000-000000000000',
                    terminal_name: 'test'
                });

            if (createError) {
                console.log('ℹ️  Error esperado (tabla no existe):', createError.message);
            }
        } else {
            console.log('✅ La tabla pos_configurations ya existe');
        }

    } catch (error) {
        console.error('❌ Error verificando tabla pos_configurations:', error.message);
    }
}

async function testPosConfigOperations() {
    console.log('🧪 Probando operaciones en pos_configurations...');

    try {
        // Intentar hacer un SELECT simple
        const { data, error } = await supabase
            .from('pos_configurations')
            .select('id')
            .limit(1);

        if (error) {
            console.error('❌ Error en SELECT pos_configurations:', error.message);
            return false;
        }

        console.log('✅ SELECT en pos_configurations funciona');
        return true;

    } catch (error) {
        console.error('❌ Error probando pos_configurations:', error.message);
        return false;
    }
}

async function testSalesNumerationColumn() {
    console.log('🧪 Probando columna numeration_id en sales...');

    try {
        // Intentar hacer un SELECT que incluya numeration_id
        const { data, error } = await supabase
            .from('sales')
            .select('id, numeration_id')
            .limit(1);

        if (error) {
            console.error('❌ Error en SELECT sales con numeration_id:', error.message);
            return false;
        }

        console.log('✅ SELECT en sales con numeration_id funciona');
        return true;

    } catch (error) {
        console.error('❌ Error probando sales numeration_id:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Verificando configuración del POS...');

    try {
        // Verificar estado actual
        const { posConfigExists, numerationExists } = await checkTablesExist();

        if (!posConfigExists) {
            console.log('⚠️  La tabla pos_configurations no existe. Necesita ser creada manualmente.');
            console.log('📝 Ejecute el siguiente SQL en su base de datos:');
            console.log('');
            console.log('-- Crear tabla pos_configurations');
            console.log('CREATE TABLE IF NOT EXISTS public.pos_configurations (');
            console.log('  id uuid NOT NULL DEFAULT gen_random_uuid(),');
            console.log('  company_id uuid NOT NULL,');
            console.log('  user_id uuid NOT NULL,');
            console.log('  terminal_name text NOT NULL DEFAULT \'Terminal Principal\',');
            console.log('  default_account_id uuid,');
            console.log('  default_customer_id uuid,');
            console.log('  default_numeration_id uuid,');
            console.log('  created_at timestamp with time zone DEFAULT now(),');
            console.log('  updated_at timestamp with time zone DEFAULT now(),');
            console.log('  created_by uuid,');
            console.log('  updated_by uuid,');
            console.log('  CONSTRAINT pos_configurations_pkey PRIMARY KEY (id),');
            console.log('  CONSTRAINT pos_configurations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,');
            console.log('  CONSTRAINT pos_configurations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,');
            console.log('  CONSTRAINT pos_configurations_default_account_id_fkey FOREIGN KEY (default_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL,');
            console.log('  CONSTRAINT pos_configurations_default_customer_id_fkey FOREIGN KEY (default_customer_id) REFERENCES public.customers(id) ON DELETE SET NULL,');
            console.log('  CONSTRAINT pos_configurations_default_numeration_id_fkey FOREIGN KEY (default_numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL,');
            console.log('  CONSTRAINT pos_configurations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,');
            console.log('  CONSTRAINT pos_configurations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,');
            console.log('  CONSTRAINT pos_configurations_unique_user_company UNIQUE (user_id, company_id)');
            console.log(');');
            console.log('');
            console.log('-- Habilitar RLS');
            console.log('ALTER TABLE public.pos_configurations ENABLE ROW LEVEL SECURITY;');
        } else {
            await testPosConfigOperations();
        }

        if (!numerationExists) {
            console.log('⚠️  La columna numeration_id no existe en sales. Necesita ser agregada manualmente.');
            console.log('📝 Ejecute el siguiente SQL en su base de datos:');
            console.log('');
            console.log('-- Agregar columna numeration_id a sales');
            console.log('ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS numeration_id uuid;');
            console.log('ALTER TABLE public.sales ADD CONSTRAINT IF NOT EXISTS sales_numeration_id_fkey FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL;');
            console.log('CREATE INDEX IF NOT EXISTS idx_sales_numeration_id ON public.sales(numeration_id);');
        } else {
            await testSalesNumerationColumn();
        }

        if (posConfigExists && numerationExists) {
            console.log('✅ Todas las estructuras necesarias están disponibles');
        } else {
            console.log('⚠️  Algunas estructuras necesitan ser creadas manualmente');
        }

    } catch (error) {
        console.error('❌ Error verificando configuración:', error);
    }
}

// Ejecutar verificación
main();
