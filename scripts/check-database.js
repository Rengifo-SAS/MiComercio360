const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Cargar variables de entorno desde .env
function loadEnvFile() {
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        const lines = envContent.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                const value = valueParts.join('=');
                if (key && value) {
                    process.env[key] = value;
                }
            }
        }
    } catch (error) {
        console.error('Error cargando archivo .env:', error.message);
    }
}

// Cargar variables de entorno
loadEnvFile();

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Variables de entorno requeridas:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    console.error('');
    console.error('Asegúrese de que estas variables estén configuradas en su archivo .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
    console.log('🔍 Verificando estado de la base de datos...');
    console.log(`📡 Conectando a: ${supabaseUrl}`);
    console.log('');

    try {
        // Verificar si la tabla pos_configurations existe
        console.log('1️⃣ Verificando tabla pos_configurations...');
        const { data: posConfigData, error: posConfigError } = await supabase
            .from('pos_configurations')
            .select('id')
            .limit(1);

        if (posConfigError && posConfigError.code === 'PGRST205') {
            console.log('❌ Tabla pos_configurations NO existe');
            console.log('');
            console.log('📝 Para crear la tabla, ejecute este SQL en su base de datos:');
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
            console.log('ALTER TABLE public.pos_configurations ENABLE ROW LEVEL SECURITY;');
        } else if (posConfigError) {
            console.error('❌ Error verificando tabla pos_configurations:', posConfigError.message);
        } else {
            console.log('✅ Tabla pos_configurations existe');
        }

        console.log('');

        // Verificar si la columna numeration_id existe en sales
        console.log('2️⃣ Verificando columna numeration_id en tabla sales...');
        const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select('id, numeration_id')
            .limit(1);

        if (salesError && salesError.code === 'PGRST204') {
            console.log('❌ Columna numeration_id NO existe en tabla sales');
            console.log('');
            console.log('📝 Para agregar la columna, ejecute este SQL en su base de datos:');
            console.log('ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS numeration_id uuid;');
            console.log('ALTER TABLE public.sales ADD CONSTRAINT IF NOT EXISTS sales_numeration_id_fkey FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL;');
            console.log('CREATE INDEX IF NOT EXISTS idx_sales_numeration_id ON public.sales(numeration_id);');
        } else if (salesError) {
            console.error('❌ Error verificando columna numeration_id:', salesError.message);
        } else {
            console.log('✅ Columna numeration_id existe en tabla sales');
        }

        console.log('');

        // Verificar si hay datos de prueba
        console.log('3️⃣ Verificando datos de prueba...');
        const { data: companies, error: companiesError } = await supabase
            .from('companies')
            .select('id, name')
            .limit(1);

        if (companiesError) {
            console.error('❌ Error verificando companies:', companiesError.message);
        } else if (companies && companies.length > 0) {
            console.log('✅ Hay empresas en la base de datos');
            console.log(`   Empresa de ejemplo: ${companies[0].name}`);
        } else {
            console.log('⚠️  No hay empresas en la base de datos');
        }

        console.log('');
        console.log('✅ Verificación completada');

    } catch (error) {
        console.error('❌ Error verificando base de datos:', error.message);
    }
}

// Ejecutar verificación
checkDatabase();
