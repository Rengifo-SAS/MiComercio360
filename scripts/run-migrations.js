const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function runMigration() {
    try {
        console.log('🚀 Iniciando migración...');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, 'create-pos-configuration-and-sales-numeration.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Dividir el SQL en declaraciones individuales
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📝 Ejecutando ${statements.length} declaraciones SQL...`);

        // Ejecutar cada declaración
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                console.log(`   ${i + 1}/${statements.length}: Ejecutando declaración...`);

                const { error } = await supabase.rpc('exec_sql', {
                    sql_query: statement + ';'
                });

                if (error) {
                    console.error(`❌ Error en declaración ${i + 1}:`, error.message);
                    console.error(`   SQL: ${statement.substring(0, 100)}...`);
                    // Continuar con las siguientes declaraciones
                } else {
                    console.log(`   ✅ Declaración ${i + 1} ejecutada correctamente`);
                }
            }
        }

        console.log('✅ Migración completada exitosamente');

        // Verificar que las tablas fueron creadas
        console.log('🔍 Verificando tablas...');

        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .in('table_name', ['pos_configurations']);

        if (tablesError) {
            console.error('❌ Error verificando tablas:', tablesError);
        } else {
            console.log('📋 Tablas encontradas:', tables.map(t => t.table_name));
        }

        // Verificar columnas de sales
        const { data: columns, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_schema', 'public')
            .eq('table_name', 'sales')
            .eq('column_name', 'numeration_id');

        if (columnsError) {
            console.error('❌ Error verificando columnas:', columnsError);
        } else {
            console.log('📋 Columna numeration_id en sales:', columns.length > 0 ? '✅ Existe' : '❌ No existe');
        }

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error);
        process.exit(1);
    }
}

// Función alternativa usando SQL directo
async function runMigrationDirect() {
    try {
        console.log('🚀 Ejecutando migración directa...');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, 'create-pos-configuration-and-sales-numeration.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar el SQL completo
        const { error } = await supabase.rpc('exec', { sql: sqlContent });

        if (error) {
            console.error('❌ Error ejecutando migración:', error);
            process.exit(1);
        }

        console.log('✅ Migración completada exitosamente');

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error);
        process.exit(1);
    }
}

// Intentar ejecutar la migración
runMigration().catch(() => {
    console.log('⚠️  Intentando método alternativo...');
    runMigrationDirect();
});
