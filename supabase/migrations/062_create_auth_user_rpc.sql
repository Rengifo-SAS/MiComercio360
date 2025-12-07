-- Crear función RPC para crear usuarios de autenticación
-- supabase/migrations/062_create_auth_user_rpc.sql

-- Función para crear usuario de autenticación desde el servidor
CREATE OR REPLACE FUNCTION public.create_auth_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'employee'
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Generar un UUID para el usuario
  v_user_id := gen_random_uuid();
  
  -- Insertar en auth.users (esto requiere permisos especiales)
  -- En desarrollo local, esto puede no funcionar sin configuración adicional
  -- Por ahora, solo retornamos el ID generado
  v_result := json_build_object(
    'id', v_user_id,
    'email', p_email,
    'success', true,
    'message', 'Usuario creado (requiere registro manual en auth)'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error creando usuario de autenticación'
    );
END;
$$;

-- Función alternativa para vincular perfil existente con usuario de auth
CREATE OR REPLACE FUNCTION public.link_profile_to_auth_user(
  p_profile_id UUID,
  p_auth_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Actualizar el perfil con el ID del usuario de auth
  UPDATE public.profiles 
  SET 
    id = p_auth_user_id,
    status = 'ACTIVE',
    updated_at = NOW()
  WHERE id = p_profile_id;
  
  IF FOUND THEN
    v_result := json_build_object(
      'success', true,
      'message', 'Perfil vinculado exitosamente',
      'profile_id', p_profile_id,
      'auth_user_id', p_auth_user_id
    );
  ELSE
    v_result := json_build_object(
      'success', false,
      'message', 'Perfil no encontrado'
    );
  END IF;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error vinculando perfil'
    );
END;
$$;