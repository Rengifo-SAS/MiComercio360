-- Corregir permisos faltantes y inconsistencias
-- 103_fix_missing_permissions.sql

-- Agregar permisos faltantes para el rol de Administrador
INSERT INTO public.permissions (name, description, module, action, resource, is_active, created_at, updated_at)
VALUES 
  -- Categorías
  ('categories.read', 'Ver categorías', 'categories', 'read', 'category', true, now(), now()),
  ('categories.create', 'Crear categorías', 'categories', 'create', 'category', true, now(), now()),
  ('categories.update', 'Editar categorías', 'categories', 'update', 'category', true, now(), now()),
  ('categories.delete', 'Eliminar categorías', 'categories', 'delete', 'category', true, now(), now()),
  
  -- Almacenes
  ('warehouses.read', 'Ver almacenes', 'warehouses', 'read', 'warehouse', true, now(), now()),
  ('warehouses.create', 'Crear almacenes', 'warehouses', 'create', 'warehouse', true, now(), now()),
  ('warehouses.update', 'Editar almacenes', 'warehouses', 'update', 'warehouse', true, now(), now()),
  ('warehouses.delete', 'Eliminar almacenes', 'warehouses', 'delete', 'warehouse', true, now(), now()),
  ('warehouses.transfer', 'Transferir entre almacenes', 'warehouses', 'transfer', 'warehouse', true, now(), now()),
  
  -- Cuentas
  ('accounts.read', 'Ver cuentas', 'accounts', 'read', 'account', true, now(), now()),
  ('accounts.create', 'Crear cuentas', 'accounts', 'create', 'account', true, now(), now()),
  ('accounts.update', 'Editar cuentas', 'accounts', 'update', 'account', true, now(), now()),
  ('accounts.delete', 'Eliminar cuentas', 'accounts', 'delete', 'account', true, now(), now()),
  
  -- Billing (si es necesario)
  ('billing.read', 'Ver facturación', 'billing', 'read', 'billing', true, now(), now()),
  
  -- Pagos
  ('payments.read', 'Ver pagos', 'payments', 'read', 'payment', true, now(), now()),
  
  -- Turnos
  ('shifts.read', 'Ver turnos', 'shifts', 'read', 'shift', true, now(), now())
ON CONFLICT (name) DO NOTHING;

-- Asignar todos estos permisos al rol de Administrador para todas las empresas
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
    'categories.read', 'categories.create', 'categories.update', 'categories.delete',
    'warehouses.read', 'warehouses.create', 'warehouses.update', 'warehouses.delete', 'warehouses.transfer',
    'accounts.read', 'accounts.create', 'accounts.update', 'accounts.delete',
    'billing.read',
    'payments.read',
    'shifts.read'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Función para actualizar permisos de administradores existentes
CREATE OR REPLACE FUNCTION public.update_admin_permissions()
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
        -- Agregar todos los permisos faltantes
        FOR permission_record IN
            SELECT id FROM public.permissions 
            WHERE name IN (
                'categories.read', 'categories.create', 'categories.update', 'categories.delete',
                'warehouses.read', 'warehouses.create', 'warehouses.update', 'warehouses.delete', 'warehouses.transfer',
                'accounts.read', 'accounts.create', 'accounts.update', 'accounts.delete',
                'billing.read',
                'payments.read',
                'shifts.read'
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
SELECT public.update_admin_permissions();

-- Limpiar la función temporal
DROP FUNCTION public.update_admin_permissions();
