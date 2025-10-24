-- Crear cliente "Consumidor Final" por defecto según estándares colombianos
-- Este cliente se crea automáticamente para cada empresa

-- Función para crear el cliente Consumidor Final
CREATE OR REPLACE FUNCTION create_default_consumidor_final(company_id_param UUID)
RETURNS UUID AS $$
DECLARE
    customer_id UUID;
BEGIN
    -- Verificar si ya existe un cliente Consumidor Final para esta empresa
    SELECT id INTO customer_id
    FROM customers 
    WHERE company_id = company_id_param 
    AND identification_number = '22222222-2'
    AND identification_type = 'NIT'
    AND business_name = 'Consumidor Final';
    
    -- Si no existe, crearlo
    IF customer_id IS NULL THEN
        INSERT INTO customers (
            id,
            company_id,
            business_name,
            identification_type,
            identification_number,
            email,
            phone,
            address,
            department,
            municipality,
            person_type,
            tax_responsibility,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            company_id_param,
            'Consumidor Final',
            'NIT',
            '22222222-2',
            'consumidor.final@empresa.com',
            NULL,
            'Bogotá D.C.',
            'Cundinamarca',
            'Bogotá',
            'JURIDICA',
            'NO_OBLIGADO_A_FACTURAR',
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO customer_id;
    END IF;
    
    RETURN customer_id;
END;
$$ LANGUAGE plpgsql;

-- Crear el cliente Consumidor Final para todas las empresas existentes
DO $$
DECLARE
    company_record RECORD;
BEGIN
    FOR company_record IN 
        SELECT id FROM companies WHERE is_active = true
    LOOP
        PERFORM create_default_consumidor_final(company_record.id);
    END LOOP;
END $$;

-- Comentario explicativo
COMMENT ON FUNCTION create_default_consumidor_final(UUID) IS 
'Crea automáticamente el cliente "Consumidor Final" con NIT 22222222-2 según estándares colombianos para facturación';
