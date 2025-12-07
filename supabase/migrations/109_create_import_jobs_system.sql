-- Crear sistema de jobs asíncronos para importación de productos
-- 108_create_import_jobs_system.sql

-- Eliminar tabla si existe
DROP TABLE IF EXISTS import_jobs CASCADE;

-- Crear tabla de import_jobs para procesamiento asíncrono
CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Información del archivo
  filename VARCHAR(255) NOT NULL,
  file_size BIGINT, -- En bytes
  file_path TEXT, -- Path del archivo subido (opcional)

  -- Configuración de importación
  config JSONB DEFAULT '{}'::jsonb, -- ImportConfig serializado

  -- Estado del job
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN (
      'PENDING',      -- En cola, esperando procesamiento
      'PROCESSING',   -- Actualmente procesando
      'COMPLETED',    -- Completado exitosamente
      'FAILED',       -- Falló completamente
      'PARTIALLY_COMPLETED' -- Completado con algunos errores
    )
  ),

  -- Progreso
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  updated_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  current_step VARCHAR(255), -- Descripción del paso actual

  -- Resultados
  result_data JSONB DEFAULT '{}'::jsonb, -- ImportResult serializado
  errors JSONB DEFAULT '[]'::jsonb, -- Array de errores
  warnings JSONB DEFAULT '[]'::jsonb, -- Array de advertencias

  -- Tiempos de ejecución
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER, -- Tiempo total en milisegundos

  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices
CREATE INDEX idx_import_jobs_company_id ON import_jobs(company_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at DESC);
CREATE INDEX idx_import_jobs_company_status ON import_jobs(company_id, status);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_import_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_import_jobs_updated_at
  BEFORE UPDATE ON import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_import_jobs_updated_at();

-- Crear función para actualizar progreso del job
CREATE OR REPLACE FUNCTION update_import_job_progress(
  p_job_id UUID,
  p_processed_rows INTEGER,
  p_imported_rows INTEGER,
  p_updated_rows INTEGER,
  p_skipped_rows INTEGER,
  p_error_rows INTEGER,
  p_current_step VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_total_rows INTEGER;
  v_progress INTEGER;
BEGIN
  -- Obtener total de filas
  SELECT total_rows INTO v_total_rows
  FROM import_jobs
  WHERE id = p_job_id;

  -- Calcular progreso
  IF v_total_rows > 0 THEN
    v_progress := LEAST(100, (p_processed_rows * 100) / v_total_rows);
  ELSE
    v_progress := 0;
  END IF;

  -- Actualizar job
  UPDATE import_jobs
  SET
    processed_rows = p_processed_rows,
    imported_rows = p_imported_rows,
    updated_rows = p_updated_rows,
    skipped_rows = p_skipped_rows,
    error_rows = p_error_rows,
    progress_percentage = v_progress,
    current_step = COALESCE(p_current_step, current_step),
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Crear función para iniciar un job
CREATE OR REPLACE FUNCTION start_import_job(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE import_jobs
  SET
    status = 'PROCESSING',
    started_at = NOW(),
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Crear función para completar un job
CREATE OR REPLACE FUNCTION complete_import_job(
  p_job_id UUID,
  p_status VARCHAR(20),
  p_result_data JSONB DEFAULT NULL,
  p_errors JSONB DEFAULT NULL,
  p_warnings JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
  v_execution_time INTEGER;
BEGIN
  -- Obtener tiempo de inicio
  SELECT started_at INTO v_started_at
  FROM import_jobs
  WHERE id = p_job_id;

  -- Calcular tiempo de ejecución
  IF v_started_at IS NOT NULL THEN
    v_execution_time := EXTRACT(EPOCH FROM (NOW() - v_started_at)) * 1000;
  END IF;

  -- Actualizar job
  UPDATE import_jobs
  SET
    status = p_status,
    completed_at = NOW(),
    execution_time_ms = v_execution_time,
    result_data = COALESCE(p_result_data, result_data),
    errors = COALESCE(p_errors, errors),
    warnings = COALESCE(p_warnings, warnings),
    progress_percentage = 100,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Crear función para limpiar jobs antiguos (más de 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_import_jobs()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM import_jobs
  WHERE completed_at < NOW() - INTERVAL '30 days'
    AND status IN ('COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Crear políticas RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
CREATE POLICY "Users can view import jobs from their company" ON import_jobs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política para INSERT
CREATE POLICY "Users can insert import jobs in their company" ON import_jobs FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política para UPDATE
CREATE POLICY "Users can update import jobs in their company" ON import_jobs FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política para DELETE
CREATE POLICY "Users can delete import jobs in their company" ON import_jobs FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Agregar permisos para importación de productos
INSERT INTO public.permissions (name, description, module, action, resource, created_at, updated_at)
VALUES
  ('products.import', 'Importar productos masivamente', 'products', 'import', 'product', now(), now()),
  ('products.export', 'Exportar productos', 'products', 'export', 'product', now(), now())
ON CONFLICT (name) DO NOTHING;

-- Asignar permisos al rol de Administrador
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by)
SELECT
  r.id,
  p.id,
  now(),
  auth.uid()
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Administrador'
  AND p.name IN ('products.import', 'products.export')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE import_jobs IS 'Jobs para procesamiento asíncrono de importación de productos';
COMMENT ON FUNCTION update_import_job_progress IS 'Actualiza el progreso de un job de importación';
COMMENT ON FUNCTION start_import_job IS 'Marca un job como iniciado';
COMMENT ON FUNCTION complete_import_job IS 'Marca un job como completado con resultados';
COMMENT ON FUNCTION cleanup_old_import_jobs IS 'Limpia jobs antiguos completados (más de 30 días)';
