-- Corrección completa de la estructura de la base de datos
-- 101_fix_database_structure_complete.sql

-- 1. Corregir el constraint de roles en la tabla profiles
-- Eliminar el constraint existente
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Crear un nuevo constraint que permita tanto minúsculas como mayúsculas
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY[
    'admin'::text, 'ADMIN'::text,
    'manager'::text, 'MANAGER'::text,
    'employee'::text, 'EMPLOYEE'::text,
    'cashier'::text, 'CASHIER'::text,
    'viewer'::text, 'VIEWER'::text,
    'SUPER_ADMIN'::text
]));

-- 2. Asegurar que todos los campos necesarios existan en la tabla profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS "position" VARCHAR(100),
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Bogota',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'es',
ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'COP',
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 3. Asegurar que el campo status exista y use el enum correcto
-- Primero verificar si el enum user_status existe, si no, crearlo
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM (
            'ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'
        );
    END IF;
END $$;

-- Agregar la columna status si no existe
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'ACTIVE';

-- 4. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles (company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles (created_by);

-- 5. Función mejorada para crear compañía y perfil
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

    -- Create or update profile with all necessary fields
    INSERT INTO public.profiles (
      id, email, full_name, role, is_active, company_id,
      phone, status, timezone, language, date_format, currency,
      created_by, updated_by
    ) VALUES (
      p_user_id, p_user_email, p_user_name, 'admin', true, v_company_id,
      NULL, 'ACTIVE', 'America/Bogota', 'es', 'DD/MM/YYYY', 'COP',
      p_user_id, p_user_id
    ) 
    ON CONFLICT (id) 
    DO UPDATE SET 
      company_id = v_company_id,
      email = p_user_email,
      full_name = COALESCE(p_user_name, profiles.full_name),
      role = 'admin',
      is_active = true,
      status = 'ACTIVE',
      updated_by = p_user_id,
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

-- 6. Función para verificar el estado de configuración mejorada
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

-- 7. Función para asignar rol de administrador mejorada
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
EXCEPTION WHEN OTHERS THEN
    -- Si hay error, no hacer nada (el rol se puede asignar manualmente después)
    NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Migrar administradores existentes
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
EXCEPTION WHEN OTHERS THEN
    -- Si hay error, no hacer nada
    NULL;
END;
$$ LANGUAGE plpgsql;

-- 9. Ejecutar la migración de administradores existentes
SELECT public.migrate_existing_admins_to_roles();

-- 10. Otorgar permisos
GRANT EXECUTE ON FUNCTION setup_company_and_profile_final TO authenticated;
GRANT EXECUTE ON FUNCTION check_company_setup TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_admin_role_to_company_creator TO authenticated;
GRANT EXECUTE ON FUNCTION public.migrate_existing_admins_to_roles TO authenticated;

-- 11. Comentarios
COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS 'Permite roles en minúsculas y mayúsculas para compatibilidad';
COMMENT ON FUNCTION setup_company_and_profile_final IS 'Función mejorada para crear compañía y perfil con todos los campos necesarios';
COMMENT ON FUNCTION check_company_setup IS 'Función mejorada para verificar el estado de configuración del usuario';
COMMENT ON FUNCTION public.assign_admin_role_to_company_creator IS 'Asigna rol de administrador al usuario que crea la empresa';
COMMENT ON FUNCTION public.migrate_existing_admins_to_roles IS 'Migra administradores existentes al nuevo sistema de roles';
