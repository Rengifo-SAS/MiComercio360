-- Función para crear perfiles de usuario evitando problemas de RLS
-- supabase/migrations/059_create_user_profile_rpc.sql

CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_email VARCHAR,
  p_full_name VARCHAR,
  p_role VARCHAR,
  p_phone VARCHAR DEFAULT NULL,
  p_position VARCHAR DEFAULT NULL,
  p_department VARCHAR DEFAULT NULL,
  p_hire_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_timezone VARCHAR DEFAULT 'America/Bogota',
  p_language VARCHAR DEFAULT 'es',
  p_date_format VARCHAR DEFAULT 'DD/MM/YYYY',
  p_currency VARCHAR DEFAULT 'COP',
  p_company_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  email VARCHAR,
  full_name VARCHAR,
  role VARCHAR,
  phone VARCHAR,
  "position" VARCHAR,
  department VARCHAR,
  hire_date DATE,
  notes TEXT,
  timezone VARCHAR,
  language VARCHAR,
  date_format VARCHAR,
  currency VARCHAR,
  company_id UUID,
  created_by UUID,
  updated_by UUID,
  status VARCHAR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
BEGIN
  -- Usar el ID del usuario de auth si se proporciona, o generar uno nuevo
  v_user_id := COALESCE(p_user_id, gen_random_uuid());
  
  -- Insertar el perfil del usuario
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    phone,
    "position",
    department,
    hire_date,
    notes,
    timezone,
    language,
    date_format,
    currency,
    company_id,
    created_by,
    updated_by,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_email,
    p_full_name,
    p_role,
    p_phone,
    p_position,
    p_department,
    p_hire_date,
    p_notes,
    p_timezone,
    p_language,
    p_date_format,
    p_currency,
    p_company_id,
    p_created_by,
    p_created_by,
    'PENDING',
    NOW(),
    NOW()
  ) RETURNING * INTO v_profile;
  
  -- Retornar el perfil creado
  RETURN QUERY SELECT 
    v_profile.id,
    v_profile.email,
    v_profile.full_name,
    v_profile.role,
    v_profile.phone,
    v_profile."position",
    v_profile.department,
    v_profile.hire_date,
    v_profile.notes,
    v_profile.timezone,
    v_profile.language,
    v_profile.date_format,
    v_profile.currency,
    v_profile.company_id,
    v_profile.created_by,
    v_profile.updated_by,
    v_profile.status,
    v_profile.created_at,
    v_profile.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de la función
COMMENT ON FUNCTION public.create_user_profile IS 'Crea un perfil de usuario evitando restricciones de RLS';

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT
EXECUTE ON FUNCTION public.create_user_profile TO authenticated;