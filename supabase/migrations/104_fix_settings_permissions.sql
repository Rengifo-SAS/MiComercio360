-- Agregar permisos faltantes de settings
-- 104_fix_settings_permissions.sql

-- Agregar permisos faltantes para settings
INSERT INTO public.permissions (name, description, module, action, resource, is_active, created_at, updated_at)
VALUES 
  -- Cost Centers
  ('settings.cost_centers', 'Gestionar centros de costo', 'settings', 'manage', 'cost_centers', true, now(), now()),
  
  -- Print Templates
  ('settings.print_templates', 'Gestionar plantillas de impresión', 'settings', 'manage', 'print_templates', true, now(), now())
ON CONFLICT (name) DO NOTHING;

-- Asignar estos permisos al rol de Administrador para todas las empresas
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  now() as granted_at,
  auth.uid() as granted_by
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Administrador' 
  AND r.is_system_role = true
  AND p.name IN (
    'settings.cost_centers',
    'settings.print_templates'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Función para actualizar permisos de administradores existentes
CREATE OR REPLACE FUNCTION public.update_admin_settings_permissions()
RETURNS VOID AS $$
DECLARE
    r RECORD;
    permission_record RECORD;
BEGIN
    -- Para cada rol de Administrador
    FOR r IN 
        SELECT id FROM public.roles 
        WHERE name = 'Administrador' AND is_system_role = true
    LOOP
        -- Agregar todos los permisos faltantes de settings
        FOR permission_record IN
            SELECT id FROM public.permissions 
            WHERE name IN (
                'settings.cost_centers',
                'settings.print_templates'
            )
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by)
            VALUES (r.id, permission_record.id, now(), auth.uid())
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la actualización
SELECT public.update_admin_settings_permissions();

-- Limpiar la función temporal
DROP FUNCTION public.update_admin_settings_permissions();
