-- Corregir las claves foráneas de la tabla profiles
-- 102_fix_profiles_foreign_keys.sql

-- Eliminar las claves foráneas problemáticas para desarrollo
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_created_by_fkey;

ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_updated_by_fkey;

-- Crear función corregida para setup de empresa y perfil
CREATE OR REPLACE FUNCTION setup_company_and_profile_final(
  p_user_id uuid,
  p_user_email text,
  p_user_name text,
  p_company_name text,
  p_business_name text,
  p_tax_id text,
  p_email text,
  p_phone text,
  p_address text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_country text DEFAULT 'Colombia',
  p_regimen_tributario text DEFAULT 'SIMPLIFICADO',
  p_codigo_ciiu text DEFAULT NULL,
  p_tipo_documento text DEFAULT 'NIT'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_profile_id uuid;
  v_result json;
BEGIN
  -- Verificar que el usuario esté autenticado
  IF p_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  BEGIN
    -- Create company first
    INSERT INTO public.companies (
      name, business_name, tax_id, email, phone, address, 
      city, state, postal_code, country, regimen_tributario, 
      codigo_ciiu, tipo_documento, is_active
    ) VALUES (
      p_company_name, p_business_name, p_tax_id, p_email, p_phone, p_address,
      p_city, p_state, p_postal_code, p_country, p_regimen_tributario,
      p_codigo_ciiu, p_tipo_documento, true
    ) RETURNING id INTO v_company_id;

    -- Create or update profile with all necessary fields (sin created_by/updated_by)
    INSERT INTO public.profiles (
      id, email, full_name, role, is_active, company_id,
      phone, status, timezone, language, date_format, currency
    ) VALUES (
      p_user_id, p_user_email, p_user_name, 'admin', true, v_company_id,
      NULL, 'ACTIVE', 'America/Bogota', 'es', 'DD/MM/YYYY', 'COP'
    ) 
    ON CONFLICT (id) 
    DO UPDATE SET 
      company_id = v_company_id,
      email = p_user_email,
      full_name = COALESCE(p_user_name, profiles.full_name),
      role = 'admin',
      is_active = true,
      status = 'ACTIVE',
      updated_at = now()
    RETURNING id INTO v_profile_id;

    -- Esperar un momento para que se ejecuten los triggers
    PERFORM pg_sleep(0.1);
    
    -- Asignar rol de administrador en el nuevo sistema
    PERFORM public.assign_admin_role_to_company_creator(p_user_id, v_company_id);

    -- Return success with company data
    SELECT json_build_object(
      'success', true,
      'company_id', v_company_id,
      'profile_id', v_profile_id,
      'message', 'Compañía y perfil creados exitosamente'
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    -- En caso de error, hacer rollback y retornar error
    RETURN json_build_object(
      'success', false, 
      'error', 'Error creando compañía: ' || SQLERRM
    );
  END;
END;
$$;

-- Función para verificar el estado de configuración mejorada
CREATE OR REPLACE FUNCTION check_company_setup(p_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_company RECORD;
  v_result json;
BEGIN
  -- Verificar que el usuario esté autenticado
  IF p_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  -- Obtener perfil del usuario
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  -- Si no hay perfil, el usuario no está configurado
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', true,
      'isSetupComplete', false,
      'hasProfile', false,
      'hasCompany', false,
      'message', 'Usuario no configurado'
    );
  END IF;

  -- Obtener información de la compañía
  SELECT * INTO v_company
  FROM public.companies
  WHERE id = v_profile.company_id;

  -- Determinar si la configuración está completa
  RETURN json_build_object(
    'success', true,
    'isSetupComplete', FOUND AND v_company.is_active,
    'hasProfile', true,
    'hasCompany', FOUND AND v_company.is_active,
    'profile', row_to_json(v_profile),
    'company', row_to_json(v_company)
  );
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION setup_company_and_profile_final TO authenticated;
GRANT EXECUTE ON FUNCTION check_company_setup TO authenticated;

-- Comentarios
COMMENT ON FUNCTION setup_company_and_profile_final IS 'Función corregida para crear compañía y perfil sin problemas de claves foráneas';
COMMENT ON FUNCTION check_company_setup IS 'Función corregida para verificar el estado de configuración del usuario';
