-- Función final simplificada para setup de compañía
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
  p_regimen_tributario text DEFAULT 'Simplificado',
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

    -- Create or update profile (handle existing profiles gracefully)
    INSERT INTO public.profiles (
      id, email, full_name, role, is_active, company_id
    ) VALUES (
      p_user_id, p_user_email, p_user_name, 'admin', true, v_company_id
    ) 
    ON CONFLICT (id) 
    DO UPDATE SET 
      company_id = v_company_id,
      email = p_user_email,
      full_name = COALESCE(p_user_name, profiles.full_name),
      role = 'admin',
      is_active = true,
      updated_at = now()
    RETURNING id INTO v_profile_id;

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

-- Grant execute permission to authenticated users
GRANT
EXECUTE ON FUNCTION setup_company_and_profile_final TO authenticated;

-- Función para verificar el estado del usuario
CREATE OR REPLACE FUNCTION get_user_setup_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_profile json;
  v_company json;
  v_result json;
BEGIN
  -- Obtener el usuario actual
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No hay usuario autenticado');
  END IF;

  -- Obtener perfil del usuario
  SELECT to_jsonb(p.*) INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id;

  -- Si no hay perfil, retornar estado de no configurado
  IF v_profile IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'is_setup', false,
      'message', 'Usuario no configurado'
    );
  END IF;

  -- Obtener información de la compañía
  SELECT to_jsonb(c.*) INTO v_company
  FROM public.companies c
  WHERE c.id = (v_profile->>'company_id')::uuid;

  -- Retornar estado completo
  RETURN json_build_object(
    'success', true,
    'is_setup', true,
    'profile', v_profile,
    'company', v_company
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_setup_status TO authenticated;