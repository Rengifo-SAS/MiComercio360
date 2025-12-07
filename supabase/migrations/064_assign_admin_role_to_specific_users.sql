-- Asignar rol de administrador a usuarios específicos
-- 064_assign_admin_role_to_specific_users.sql

-- Función para asignar rol de administrador a un usuario específico
CREATE OR REPLACE FUNCTION public.assign_admin_role_to_user(p_user_id UUID, p_company_id UUID)
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
        VALUES (p_user_id, v_admin_role_id, auth.uid())
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para asignar rol de administrador por email
CREATE OR REPLACE FUNCTION public.assign_admin_role_by_email(p_email VARCHAR, p_company_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Buscar el usuario por email
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE email = p_email
    AND company_id = p_company_id
    LIMIT 1;

    -- Si se encuentra el usuario, asignar rol de administrador
    IF v_user_id IS NOT NULL THEN
        PERFORM public.assign_admin_role_to_user(v_user_id, p_company_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Asignar rol de administrador a usuarios específicos por email
-- (Esto se ejecutará para cada empresa existente)
DO $$
DECLARE
    company_record RECORD;
    v_user_id UUID;
BEGIN
    -- Para cada empresa, asignar rol de administrador a usuarios específicos
    FOR company_record IN 
        SELECT id FROM public.companies 
        WHERE id IS NOT NULL
    LOOP
        -- Asignar rol de administrador a usuarios con emails específicos
        PERFORM public.assign_admin_role_by_email('johanrengifo78@gmail.com', company_record.id);
        PERFORM public.assign_admin_role_by_email('johanrengifo@proton.me', company_record.id);
        
        -- También asignar a usuarios que contengan 'admin' en el email
        FOR v_user_id IN 
            SELECT p.id 
            FROM public.profiles p
            WHERE p.company_id = company_record.id
            AND (p.email ILIKE '%admin%' OR p.email ILIKE '%administrator%')
        LOOP
            PERFORM public.assign_admin_role_to_user(v_user_id, company_record.id);
        END LOOP;
    END LOOP;
END $$;

-- Agregar comentarios a las funciones
COMMENT ON FUNCTION public.assign_admin_role_to_user (UUID, UUID) IS 'Asigna rol de administrador a un usuario específico';
COMMENT ON FUNCTION public.assign_admin_role_by_email (VARCHAR, UUID) IS 'Asigna rol de administrador a un usuario por email';
