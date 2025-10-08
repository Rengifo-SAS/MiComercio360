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
    console.error('❌ Error: Variables de entorno requeridas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(sql, description) {
    console.log(`🔄 ${description}...`);

    try {
        // Intentar ejecutar usando rpc exec
        const { data, error } = await supabase.rpc('exec', { sql });

        if (error) {
            console.error(`❌ Error ejecutando ${description}:`, error.message);
            return false;
        }

        console.log(`✅ ${description} completado`);
        return true;

    } catch (error) {
        console.error(`❌ Error en ${description}:`, error.message);
        return false;
    }
}

async function createTables() {
    console.log('🚀 Creando tablas y columnas faltantes...');
    console.log(`📡 Conectando a: ${supabaseUrl}`);
    console.log('');

    try {
        // SQL para crear la tabla pos_configurations
        const createPosConfigSQL = `
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
    `;

        // SQL para habilitar RLS
        const enableRLSSQL = `
      ALTER TABLE public.pos_configurations ENABLE ROW LEVEL SECURITY;
    `;

        // SQL para crear políticas RLS
        const createPoliciesSQL = `
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
    `;

        // SQL para agregar numeration_id a sales
        const addNumerationToSalesSQL = `
      ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS numeration_id uuid;
      ALTER TABLE public.sales ADD CONSTRAINT IF NOT EXISTS sales_numeration_id_fkey FOREIGN KEY (numeration_id) REFERENCES public.numerations(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_sales_numeration_id ON public.sales(numeration_id);
    `;

        // Ejecutar las migraciones
        console.log('1️⃣ Creando tabla pos_configurations...');
        await executeSQL(createPosConfigSQL, 'Creando tabla pos_configurations');

        console.log('2️⃣ Habilitando RLS...');
        await executeSQL(enableRLSSQL, 'Habilitando RLS');

        console.log('3️⃣ Creando políticas RLS...');
        await executeSQL(createPoliciesSQL, 'Creando políticas RLS');

        console.log('4️⃣ Agregando numeration_id a tabla sales...');
        await executeSQL(addNumerationToSalesSQL, 'Agregando numeration_id a sales');

        console.log('');
        console.log('✅ Todas las migraciones completadas');

        // Verificar resultados
        console.log('');
        console.log('🔍 Verificando resultados...');

        const { data: posConfigData, error: posConfigError } = await supabase
            .from('pos_configurations')
            .select('id')
            .limit(1);

        if (posConfigError && posConfigError.code === 'PGRST205') {
            console.log('❌ Tabla pos_configurations aún no existe');
        } else if (posConfigError) {
            console.log('⚠️  Error verificando pos_configurations:', posConfigError.message);
        } else {
            console.log('✅ Tabla pos_configurations creada exitosamente');
        }

        const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select('id, numeration_id')
            .limit(1);

        if (salesError && salesError.code === 'PGRST204') {
            console.log('❌ Columna numeration_id aún no existe en sales');
        } else if (salesError) {
            console.log('⚠️  Error verificando sales numeration_id:', salesError.message);
        } else {
            console.log('✅ Columna numeration_id agregada exitosamente a sales');
        }

    } catch (error) {
        console.error('❌ Error ejecutando migraciones:', error);
    }
}

// Ejecutar migraciones
createTables();
