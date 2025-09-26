-- Crear módulo completo de clientes para Colombia
-- 036_create_customers_module.sql

-- Eliminar tablas relacionadas con clientes si existen
DROP TABLE IF EXISTS customer_contacts CASCADE;

DROP TABLE IF EXISTS customer_history CASCADE;

DROP TABLE IF EXISTS customers CASCADE;

-- Crear tabla de clientes con campos específicos para Colombia
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

-- Identificación básica
identification_type VARCHAR(20) NOT NULL CHECK (
    identification_type IN (
        'CC',
        'CE',
        'NIT',
        'PP',
        'TI',
        'RC',
        'PA'
    )
),
identification_number VARCHAR(20) NOT NULL,

-- Información personal/empresarial
business_name VARCHAR(255) NOT NULL, -- Razón social o nombre completo
person_type VARCHAR(10) NOT NULL CHECK (
    person_type IN ('NATURAL', 'JURIDICA')
),

-- Responsabilidad tributaria (DIAN Colombia)
tax_responsibility VARCHAR(50) NOT NULL CHECK (
    tax_responsibility IN (
        'RESPONSABLE_DE_IVA',
        'NO_RESPONSABLE_DE_IVA',
        'RESPONSABLE_DE_IVA_REINCORPORADO',
        'NO_RESPONSABLE_DE_IVA_POR_ARTICULO_23',
        'REGIMEN_SIMPLIFICADO',
        'REGIMEN_COMUN',
        'REGIMEN_ESPECIAL',
        'AUTORRETENEDOR',
        'AGENTE_RETENCION_IVA',
        'AGENTE_RETENCION_ICA',
        'AGENTE_RETENCION_FUENTE',
        'GRAN_CONTRIBUYENTE',
        'AUTORRETENEDOR_ICA',
        'AUTORRETENEDOR_IVA',
        'AUTORRETENEDOR_FUENTE',
        'NO_OBLIGADO_A_FACTURAR'
    )
),

-- Ubicación geográfica
department VARCHAR(100) NOT NULL,
municipality VARCHAR(100) NOT NULL,
address TEXT NOT NULL,
postal_code VARCHAR(10),

-- Información de contacto
email VARCHAR(255),
phone VARCHAR(20),
mobile_phone VARCHAR(20),
website VARCHAR(255),

-- Información tributaria adicional
tax_id VARCHAR(20), -- NIT para personas jurídicas
tax_regime VARCHAR(50), -- Régimen tributario
economic_activity_code VARCHAR(10), -- Código CIIU
economic_activity_description TEXT,

-- Información bancaria
bank_name VARCHAR(100),
account_type VARCHAR(20) CHECK (
    account_type IN (
        'AHORROS',
        'CORRIENTE',
        'FIDUCIARIA'
    )
),
account_number VARCHAR(20),

-- Información comercial
credit_limit DECIMAL(15, 2) DEFAULT 0,
payment_terms INTEGER DEFAULT 0, -- Días de pago
discount_percentage DECIMAL(5, 2) DEFAULT 0,

-- Estados y fechas
is_active BOOLEAN DEFAULT true,
is_vip BOOLEAN DEFAULT false,
notes TEXT,

-- Auditoría
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
created_by UUID REFERENCES profiles (id),
updated_by UUID REFERENCES profiles (id),

-- Constraints
UNIQUE(company_id, identification_type, identification_number),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^[0-9+\-\s()]+$'),
  CONSTRAINT valid_mobile CHECK (mobile_phone IS NULL OR mobile_phone ~ '^[0-9+\-\s()]+$'),
  CONSTRAINT valid_credit_limit CHECK (credit_limit >= 0),
  CONSTRAINT valid_payment_terms CHECK (payment_terms >= 0),
  CONSTRAINT valid_discount CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers (company_id);

CREATE INDEX IF NOT EXISTS idx_customers_identification ON customers (
    company_id,
    identification_type,
    identification_number
);

CREATE INDEX IF NOT EXISTS idx_customers_business_name ON customers (company_id, business_name);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (company_id, email)
WHERE
    email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (company_id, phone)
WHERE
    phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_person_type ON customers (company_id, person_type);

CREATE INDEX IF NOT EXISTS idx_customers_tax_responsibility ON customers (
    company_id,
    tax_responsibility
);

CREATE INDEX IF NOT EXISTS idx_customers_department ON customers (company_id, department);

CREATE INDEX IF NOT EXISTS idx_customers_municipality ON customers (company_id, municipality);

CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers (company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers (company_id, created_at);

-- Crear tabla de historial de clientes
CREATE TABLE IF NOT EXISTS customer_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    customer_id UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- CREATED, UPDATED, DEACTIVATED, ACTIVATED, etc.
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles (id)
);

-- Crear índices para historial
CREATE INDEX IF NOT EXISTS idx_customer_history_customer_id ON customer_history (customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_history_company_id ON customer_history (company_id);

CREATE INDEX IF NOT EXISTS idx_customer_history_created_at ON customer_history (created_at);

-- Crear tabla de contactos de clientes (para empresas)
CREATE TABLE IF NOT EXISTS customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    customer_id UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile_phone VARCHAR(20),
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles (id),
    CONSTRAINT valid_contact_email CHECK (
        email IS NULL
        OR email ~ * '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT valid_contact_phone CHECK (
        phone IS NULL
        OR phone ~ '^[0-9+\-\s()]+$'
    ),
    CONSTRAINT valid_contact_mobile CHECK (
        mobile_phone IS NULL
        OR mobile_phone ~ '^[0-9+\-\s()]+$'
    )
);

-- Crear índices para contactos
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts (customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_company_id ON customer_contacts (company_id);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_is_primary ON customer_contacts (customer_id, is_primary);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at
CREATE TRIGGER trigger_update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Crear función para registrar historial
CREATE OR REPLACE FUNCTION log_customer_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO customer_history (customer_id, company_id, action, created_by)
    VALUES (NEW.id, NEW.company_id, 'CREATED', NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Registrar cambios en campos importantes
    IF OLD.business_name != NEW.business_name THEN
      INSERT INTO customer_history (customer_id, company_id, action, field_name, old_value, new_value, created_by)
      VALUES (NEW.id, NEW.company_id, 'UPDATED', 'business_name', OLD.business_name, NEW.business_name, NEW.updated_by);
    END IF;
    
    IF OLD.email != NEW.email THEN
      INSERT INTO customer_history (customer_id, company_id, action, field_name, old_value, new_value, created_by)
      VALUES (NEW.id, NEW.company_id, 'UPDATED', 'email', OLD.email, NEW.email, NEW.updated_by);
    END IF;
    
    IF OLD.phone != NEW.phone THEN
      INSERT INTO customer_history (customer_id, company_id, action, field_name, old_value, new_value, created_by)
      VALUES (NEW.id, NEW.company_id, 'UPDATED', 'phone', OLD.phone, NEW.phone, NEW.updated_by);
    END IF;
    
    IF OLD.is_active != NEW.is_active THEN
      INSERT INTO customer_history (customer_id, company_id, action, field_name, old_value, new_value, created_by)
      VALUES (NEW.id, NEW.company_id, CASE WHEN NEW.is_active THEN 'ACTIVATED' ELSE 'DEACTIVATED' END, 'is_active', OLD.is_active::text, NEW.is_active::text, NEW.updated_by);
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO customer_history (customer_id, company_id, action, created_by)
    VALUES (OLD.id, OLD.company_id, 'DELETED', OLD.updated_by);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para historial
CREATE TRIGGER trigger_log_customer_changes
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION log_customer_changes();

-- Crear función para validar identificación colombiana
CREATE OR REPLACE FUNCTION validate_colombian_identification(
  p_identification_type VARCHAR(20),
  p_identification_number VARCHAR(20)
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validar formato básico según tipo
  CASE p_identification_type
    WHEN 'CC' THEN -- Cédula de ciudadanía (8-10 dígitos)
      RETURN p_identification_number ~ '^[0-9]{8,10}$';
    WHEN 'CE' THEN -- Cédula de extranjería (6-10 dígitos)
      RETURN p_identification_number ~ '^[0-9]{6,10}$';
    WHEN 'NIT' THEN -- NIT (9-10 dígitos con dígito verificador)
      RETURN p_identification_number ~ '^[0-9]{9,10}[-]?[0-9]$';
    WHEN 'TI' THEN -- Tarjeta de identidad (6-10 dígitos)
      RETURN p_identification_number ~ '^[0-9]{6,10}$';
    WHEN 'PP' THEN -- Pasaporte (6-12 caracteres alfanuméricos)
      RETURN p_identification_number ~ '^[A-Za-z0-9]{6,12}$';
    WHEN 'RC' THEN -- Registro civil (6-10 dígitos)
      RETURN p_identification_number ~ '^[0-9]{6,10}$';
    WHEN 'PA' THEN -- Permiso por nacimiento (6-10 dígitos)
      RETURN p_identification_number ~ '^[0-9]{6,10}$';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Crear función para obtener departamentos de Colombia
CREATE OR REPLACE FUNCTION get_colombian_departments()
RETURNS TABLE (
  code VARCHAR(5),
  name VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  VALUES 
    ('05', 'ANTIOQUIA'),
    ('08', 'ATLÁNTICO'),
    ('11', 'BOGOTÁ D.C.'),
    ('13', 'BOLÍVAR'),
    ('15', 'BOYACÁ'),
    ('17', 'CALDAS'),
    ('18', 'CAQUETÁ'),
    ('19', 'CAUCA'),
    ('20', 'CESAR'),
    ('23', 'CÓRDOBA'),
    ('25', 'CUNDINAMARCA'),
    ('27', 'CHOCÓ'),
    ('41', 'HUILA'),
    ('44', 'LA GUAJIRA'),
    ('47', 'MAGDALENA'),
    ('50', 'META'),
    ('52', 'NARIÑO'),
    ('54', 'NORTE DE SANTANDER'),
    ('63', 'QUINDÍO'),
    ('66', 'RISARALDA'),
    ('68', 'SANTANDER'),
    ('70', 'SUCRE'),
    ('73', 'TOLIMA'),
    ('76', 'VALLE DEL CAUCA'),
    ('81', 'ARAUCA'),
    ('85', 'CASANARE'),
    ('86', 'PUTUMAYO'),
    ('88', 'SAN ANDRÉS Y PROVIDENCIA'),
    ('91', 'AMAZONAS'),
    ('94', 'GUAINÍA'),
    ('95', 'GUAVIARE'),
    ('97', 'VAUPÉS'),
    ('99', 'VICHADA');
END;
$$ LANGUAGE plpgsql;

-- Crear función para obtener municipios por departamento
CREATE OR REPLACE FUNCTION get_colombian_municipalities(p_department_code VARCHAR(5))
RETURNS TABLE (
  code VARCHAR(5),
  name VARCHAR(100),
  department_code VARCHAR(5)
) AS $$
BEGIN
  -- Esta función retornaría los municipios, pero por simplicidad
  -- retornamos algunos ejemplos. En producción se debería tener
  -- una tabla completa de municipios.
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p_department_code = '11' THEN '11001' ELSE '00001'
    END as code,
    CASE 
      WHEN p_department_code = '11' THEN 'BOGOTÁ D.C.'
      WHEN p_department_code = '05' THEN 'MEDELLÍN'
      WHEN p_department_code = '76' THEN 'CALI'
      WHEN p_department_code = '25' THEN 'ZIPAQUIRÁ'
      ELSE 'MUNICIPIO PRINCIPAL'
    END as name,
    p_department_code as department_code;
END;
$$ LANGUAGE plpgsql;

-- Crear función para buscar clientes
CREATE OR REPLACE FUNCTION search_customers(
  p_company_id UUID,
  p_search_term TEXT DEFAULT '',
  p_person_type VARCHAR(10) DEFAULT NULL,
  p_tax_responsibility VARCHAR(50) DEFAULT NULL,
  p_department VARCHAR(100) DEFAULT NULL,
  p_municipality VARCHAR(100) DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'business_name',
  p_sort_order TEXT DEFAULT 'asc',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  identification_type VARCHAR(20),
  identification_number VARCHAR(20),
  business_name VARCHAR(255),
  person_type VARCHAR(10),
  tax_responsibility VARCHAR(50),
  department VARCHAR(100),
  municipality VARCHAR(100),
  address TEXT,
  email VARCHAR(255),
  phone VARCHAR(20),
  mobile_phone VARCHAR(20),
  credit_limit DECIMAL(15,2),
  payment_terms INTEGER,
  discount_percentage DECIMAL(5,2),
  is_active BOOLEAN,
  is_vip BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_customers AS (
    SELECT 
      c.id,
      c.identification_type,
      c.identification_number,
      c.business_name,
      c.person_type,
      c.tax_responsibility,
      c.department,
      c.municipality,
      c.address,
      c.email,
      c.phone,
      c.mobile_phone,
      c.credit_limit,
      c.payment_terms,
      c.discount_percentage,
      c.is_active,
      c.is_vip,
      c.created_at,
      c.updated_at,
      COUNT(*) OVER() as total_count
    FROM customers c
    WHERE c.company_id = p_company_id
      AND (p_search_term = '' OR 
           c.business_name ILIKE '%' || p_search_term || '%' OR
           c.identification_number ILIKE '%' || p_search_term || '%' OR
           c.email ILIKE '%' || p_search_term || '%' OR
           c.phone ILIKE '%' || p_search_term || '%')
      AND (p_person_type IS NULL OR c.person_type = p_person_type)
      AND (p_tax_responsibility IS NULL OR c.tax_responsibility = p_tax_responsibility)
      AND (p_department IS NULL OR c.department ILIKE '%' || p_department || '%')
      AND (p_municipality IS NULL OR c.municipality ILIKE '%' || p_municipality || '%')
      AND (p_is_active IS NULL OR c.is_active = p_is_active)
  )
  SELECT 
    fc.id,
    fc.identification_type,
    fc.identification_number,
    fc.business_name,
    fc.person_type,
    fc.tax_responsibility,
    fc.department,
    fc.municipality,
    fc.address,
    fc.email,
    fc.phone,
    fc.mobile_phone,
    fc.credit_limit,
    fc.payment_terms,
    fc.discount_percentage,
    fc.is_active,
    fc.is_vip,
    fc.created_at,
    fc.updated_at,
    fc.total_count
  FROM filtered_customers fc
  ORDER BY 
    CASE WHEN p_sort_by = 'business_name' AND p_sort_order = 'asc' THEN fc.business_name END ASC,
    CASE WHEN p_sort_by = 'business_name' AND p_sort_order = 'desc' THEN fc.business_name END DESC,
    CASE WHEN p_sort_by = 'identification_number' AND p_sort_order = 'asc' THEN fc.identification_number END ASC,
    CASE WHEN p_sort_by = 'identification_number' AND p_sort_order = 'desc' THEN fc.identification_number END DESC,
    CASE WHEN p_sort_by = 'email' AND p_sort_order = 'asc' THEN fc.email END ASC,
    CASE WHEN p_sort_by = 'email' AND p_sort_order = 'desc' THEN fc.email END DESC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN fc.created_at END ASC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN fc.created_at END DESC,
    fc.business_name ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Crear RLS policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

ALTER TABLE customer_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

-- Políticas para customers
CREATE POLICY "Users can view customers from their company" ON customers FOR
SELECT USING (
        company_id IN (
            SELECT profiles.company_id
            FROM profiles
            WHERE
                profiles.id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert customers in their company" ON customers FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT profiles.company_id
            FROM profiles
            WHERE
                profiles.id = auth.uid ()
        )
    );

CREATE POLICY "Users can update customers in their company" ON customers FOR
UPDATE USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

CREATE POLICY "Users can delete customers in their company" ON customers FOR DELETE USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

-- Políticas para customer_history
CREATE POLICY "Users can view customer history from their company" ON customer_history FOR
SELECT USING (
        company_id IN (
            SELECT profiles.company_id
            FROM profiles
            WHERE
                profiles.id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert customer history in their company" ON customer_history FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT profiles.company_id
            FROM profiles
            WHERE
                profiles.id = auth.uid ()
        )
    );

-- Políticas para customer_contacts
CREATE POLICY "Users can view customer contacts from their company" ON customer_contacts FOR
SELECT USING (
        company_id IN (
            SELECT profiles.company_id
            FROM profiles
            WHERE
                profiles.id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert customer contacts in their company" ON customer_contacts FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT profiles.company_id
            FROM profiles
            WHERE
                profiles.id = auth.uid ()
        )
    );

CREATE POLICY "Users can update customer contacts in their company" ON customer_contacts FOR
UPDATE USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

CREATE POLICY "Users can delete customer contacts in their company" ON customer_contacts FOR DELETE USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

-- Comentarios para documentación
COMMENT ON
TABLE customers IS 'Tabla de clientes con campos específicos para Colombia';

COMMENT ON
TABLE customer_history IS 'Historial de cambios en clientes';

COMMENT ON
TABLE customer_contacts IS 'Contactos adicionales de clientes (para empresas)';

COMMENT ON FUNCTION search_customers IS 'Función para búsqueda avanzada de clientes';

COMMENT ON FUNCTION validate_colombian_identification IS 'Función para validar formatos de identificación colombiana';

COMMENT ON FUNCTION get_colombian_departments IS 'Función para obtener departamentos de Colombia';

COMMENT ON FUNCTION get_colombian_municipalities IS 'Función para obtener municipios por departamento';