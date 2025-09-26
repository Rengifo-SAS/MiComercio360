-- Agregar campo created_by a la tabla companies
-- 040_add_created_by_to_companies.sql

-- Agregar el campo created_by a la tabla companies
ALTER TABLE companies
ADD COLUMN created_by UUID REFERENCES profiles (id);

-- Agregar el campo updated_by a la tabla companies
ALTER TABLE companies
ADD COLUMN updated_by UUID REFERENCES profiles (id);

-- Agregar el campo created_at a la tabla companies si no existe
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Agregar el campo updated_at a la tabla companies si no existe
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at
CREATE TRIGGER trigger_update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_companies_updated_at();

-- Comentario para documentación
COMMENT ON COLUMN companies.created_by IS 'Usuario que creó la empresa';

COMMENT ON COLUMN companies.updated_by IS 'Usuario que actualizó la empresa por última vez';

COMMENT ON COLUMN companies.created_at IS 'Fecha de creación de la empresa';

COMMENT ON COLUMN companies.updated_at IS 'Fecha de última actualización de la empresa';