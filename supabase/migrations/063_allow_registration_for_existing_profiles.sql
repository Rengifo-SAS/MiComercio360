-- Permitir registro para perfiles existentes
-- supabase/migrations/063_allow_registration_for_existing_profiles.sql

-- Función para verificar si un email existe en profiles y permitir registro
CREATE OR REPLACE FUNCTION public.check_email_exists_for_registration(
  p_email TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_result JSON;
BEGIN
  -- Buscar el perfil por email
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE email = p_email
  LIMIT 1;
  
  IF FOUND THEN
    -- Si el perfil existe y está pendiente, permitir registro
    IF v_profile.status = 'PENDING' THEN
      v_result := json_build_object(
        'exists', true,
        'can_register', true,
        'profile_id', v_profile.id,
        'full_name', v_profile.full_name,
        'role', v_profile.role,
        'message', 'Email encontrado. Puede proceder con el registro.'
      );
    ELSE
      v_result := json_build_object(
        'exists', true,
        'can_register', false,
        'message', 'Este email ya está registrado y activo.'
      );
    END IF;
  ELSE
    v_result := json_build_object(
      'exists', false,
      'can_register', false,
      'message', 'Email no encontrado en el sistema.'
    );
  END IF;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'exists', false,
      'can_register', false,
      'error', SQLERRM,
      'message', 'Error verificando email'
    );
END;
$$;

-- Función para activar perfil después del registro exitoso
CREATE OR REPLACE FUNCTION public.activate_profile_after_registration(
  p_profile_id UUID,
  p_auth_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_profile RECORD;
BEGIN
  -- Obtener información del perfil existente
  SELECT * INTO v_profile
  FROM public.profiles 
  WHERE id = p_profile_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Perfil no encontrado'
    );
  END IF;
  
  -- Crear un nuevo perfil con el ID del usuario de auth
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    is_active,
    phone,
    position,
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
    two_factor_enabled,
    email_verified,
    phone_verified,
    created_at,
    updated_at
  ) VALUES (
    p_auth_user_id,
    v_profile.email,
    v_profile.full_name,
    v_profile.avatar_url,
    v_profile.role,
    true, -- is_active
    v_profile.phone,
    v_profile.position,
    v_profile.department,
    v_profile.hire_date,
    v_profile.notes,
    v_profile.timezone,
    v_profile.language,
    v_profile.date_format,
    v_profile.currency,
    v_profile.company_id, -- Mantener la empresa original
    v_profile.created_by,
    p_auth_user_id, -- updated_by
    'ACTIVE', -- status
    false, -- two_factor_enabled
    true, -- email_verified
    false, -- phone_verified
    v_profile.created_at,
    NOW() -- updated_at
  );
  
  -- Eliminar el perfil temporal
  DELETE FROM public.profiles WHERE id = p_profile_id;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Perfil activado exitosamente',
    'profile_id', p_auth_user_id,
    'auth_user_id', p_auth_user_id,
    'company_id', v_profile.company_id
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error activando perfil'
    );
END;
$$;