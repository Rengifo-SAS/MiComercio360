-- Corregir relación entre sales y customers
-- 071_fix_sales_customers_relationship.sql

-- Verificar si existe la restricción de clave foránea
DO $$
BEGIN
    -- Si no existe la restricción, crearla
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_customer_id_fkey' 
        AND table_name = 'sales'
    ) THEN
        -- Agregar la restricción de clave foránea
        ALTER TABLE sales 
        ADD CONSTRAINT sales_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Restricción de clave foránea sales_customer_id_fkey creada';
    ELSE
        RAISE NOTICE 'Restricción de clave foránea sales_customer_id_fkey ya existe';
    END IF;
END $$;

-- Verificar que la relación funciona correctamente
DO $$
DECLARE
    constraint_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_customer_id_fkey' 
        AND table_name = 'sales'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE '✅ Relación entre sales y customers configurada correctamente';
    ELSE
        RAISE NOTICE '❌ Error: No se pudo configurar la relación entre sales y customers';
    END IF;
END $$;
