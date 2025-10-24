-- Arreglar permisos de administrador al crear empresas
-- 075_fix_admin_permissions_setup.sql

-- Función para asignar rol de administrador al usuario que crea la empresa
CREATE OR REPLACE FUNCTION public.assign_admin_role_to_company_creator(p_user_id UUID, p_company_id UUID)
RETURNS VOID AS $$
DECLARE
    v_admin_role_id UUID;
BEGIN
    -- Obtener el ID del rol de Administrador para la empresa
    SELECT id INTO v_admin_role_id
    FROM public.roles
    WHERE company_id = p_company_id 
    AND name = 'Administrador' 
    AND is_system_role = true
    LIMIT 1;

    -- Asignar el rol de Administrador al usuario
    IF v_admin_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id, assigned_by)
        VALUES (p_user_id, v_admin_role_id, p_user_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Actualizar la función setup_company_and_profile_final para asignar rol de administrador
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

    -- Create or update profile (handle existing profiles gracefully)
    INSERT INTO public.profiles (
      id, email, full_name, role, is_active, company_id
    ) VALUES (
      p_user_id, p_user_email, p_user_name, 'ADMIN', true, v_company_id
    ) 
    ON CONFLICT (id) 
    DO UPDATE SET 
      company_id = v_company_id,
      email = p_user_email,
      full_name = COALESCE(p_user_name, profiles.full_name),
      role = 'ADMIN',
      is_active = true,
      updated_at = now()
    RETURNING id INTO v_profile_id;

    -- Esperar un momento para que se ejecuten los triggers de creación de roles
    -- y luego asignar el rol de administrador al usuario
    PERFORM pg_sleep(0.1);
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

-- Función para migrar administradores existentes al nuevo sistema de roles
CREATE OR REPLACE FUNCTION public.migrate_existing_admins_to_roles()
RETURNS VOID AS $$
DECLARE
    admin_record RECORD;
    v_admin_role_id UUID;
BEGIN
    -- Para cada perfil que tenga role = 'admin' o 'ADMIN'
    FOR admin_record IN 
        SELECT p.id as user_id, p.company_id
        FROM public.profiles p
        WHERE p.role IN ('admin', 'ADMIN', 'SUPER_ADMIN')
        AND p.company_id IS NOT NULL
        AND p.is_active = true
    LOOP
        -- Obtener el ID del rol de Administrador para la empresa
        SELECT id INTO v_admin_role_id
        FROM public.roles
        WHERE company_id = admin_record.company_id 
        AND name = 'Administrador' 
        AND is_system_role = true
        LIMIT 1;

        -- Asignar el rol de Administrador al usuario si no lo tiene ya
        IF v_admin_role_id IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role_id, assigned_by)
            VALUES (admin_record.user_id, v_admin_role_id, admin_record.user_id)
            ON CONFLICT (user_id, role_id) DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la migración de administradores existentes
SELECT public.migrate_existing_admins_to_roles();

-- La función get_user_permissions ya existe, no la modificamos

-- Comentarios
COMMENT ON FUNCTION public.assign_admin_role_to_company_creator(UUID, UUID) IS 'Asigna rol de administrador al usuario que crea la empresa';
COMMENT ON FUNCTION public.migrate_existing_admins_to_roles() IS 'Migra administradores existentes al nuevo sistema de roles';
