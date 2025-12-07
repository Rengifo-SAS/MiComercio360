-- Crear permisos y roles por defecto
-- 057_create_default_permissions_and_roles.sql

-- Insertar permisos básicos del sistema
INSERT INTO
    public.permissions (
        name,
        description,
        module,
        action,
        resource
    )
VALUES
    -- Módulo de productos
    (
        'products.create',
        'Crear productos',
        'products',
        'create',
        'product'
    ),
    (
        'products.read',
        'Ver productos',
        'products',
        'read',
        'product'
    ),
    (
        'products.update',
        'Editar productos',
        'products',
        'update',
        'product'
    ),
    (
        'products.delete',
        'Eliminar productos',
        'products',
        'delete',
        'product'
    ),
    (
        'products.export',
        'Exportar productos',
        'products',
        'export',
        'product'
    ),

-- Módulo de clientes
(
    'customers.create',
    'Crear clientes',
    'customers',
    'create',
    'customer'
),
(
    'customers.read',
    'Ver clientes',
    'customers',
    'read',
    'customer'
),
(
    'customers.update',
    'Editar clientes',
    'customers',
    'update',
    'customer'
),
(
    'customers.delete',
    'Eliminar clientes',
    'customers',
    'delete',
    'customer'
),
(
    'customers.export',
    'Exportar clientes',
    'customers',
    'export',
    'customer'
),

-- Módulo de ventas
(
    'sales.create',
    'Crear ventas',
    'sales',
    'create',
    'sale'
),
(
    'sales.read',
    'Ver ventas',
    'sales',
    'read',
    'sale'
),
(
    'sales.update',
    'Editar ventas',
    'sales',
    'update',
    'sale'
),
(
    'sales.delete',
    'Eliminar ventas',
    'sales',
    'delete',
    'sale'
),
(
    'sales.export',
    'Exportar ventas',
    'sales',
    'export',
    'sale'
),
(
    'sales.print',
    'Imprimir ventas',
    'sales',
    'print',
    'sale'
),

-- Módulo de inventario
(
    'inventory.read',
    'Ver inventario',
    'inventory',
    'read',
    'inventory'
),
(
    'inventory.update',
    'Actualizar inventario',
    'inventory',
    'update',
    'inventory'
),
(
    'inventory.adjust',
    'Ajustar inventario',
    'inventory',
    'adjust',
    'inventory'
),
(
    'inventory.transfer',
    'Transferir inventario',
    'inventory',
    'transfer',
    'inventory'
),
(
    'inventory.export',
    'Exportar inventario',
    'inventory',
    'export',
    'inventory'
),

-- Módulo de proveedores
(
    'suppliers.create',
    'Crear proveedores',
    'suppliers',
    'create',
    'supplier'
),
(
    'suppliers.read',
    'Ver proveedores',
    'suppliers',
    'read',
    'supplier'
),
(
    'suppliers.update',
    'Editar proveedores',
    'suppliers',
    'update',
    'supplier'
),
(
    'suppliers.delete',
    'Eliminar proveedores',
    'suppliers',
    'delete',
    'supplier'
),
(
    'suppliers.export',
    'Exportar proveedores',
    'suppliers',
    'export',
    'supplier'
),

-- Módulo de compras
(
    'purchases.create',
    'Crear compras',
    'purchases',
    'create',
    'purchase'
),
(
    'purchases.read',
    'Ver compras',
    'purchases',
    'read',
    'purchase'
),
(
    'purchases.update',
    'Editar compras',
    'purchases',
    'update',
    'purchase'
),
(
    'purchases.delete',
    'Eliminar compras',
    'purchases',
    'delete',
    'purchase'
),
(
    'purchases.export',
    'Exportar compras',
    'purchases',
    'export',
    'purchase'
),

-- Módulo de reportes
(
    'reports.sales',
    'Ver reportes de ventas',
    'reports',
    'read',
    'sales_report'
),
(
    'reports.inventory',
    'Ver reportes de inventario',
    'reports',
    'read',
    'inventory_report'
),
(
    'reports.financial',
    'Ver reportes financieros',
    'reports',
    'read',
    'financial_report'
),
(
    'reports.export',
    'Exportar reportes',
    'reports',
    'export',
    'report'
),

-- Módulo de configuración
(
    'settings.company',
    'Configurar empresa',
    'settings',
    'update',
    'company'
),
(
    'settings.users',
    'Gestionar usuarios',
    'settings',
    'manage',
    'users'
),
(
    'settings.roles',
    'Gestionar roles',
    'settings',
    'manage',
    'roles'
),
(
    'settings.permissions',
    'Gestionar permisos',
    'settings',
    'manage',
    'permissions'
),
(
    'settings.templates',
    'Gestionar plantillas',
    'settings',
    'manage',
    'templates'
),
(
    'settings.taxes',
    'Gestionar impuestos',
    'settings',
    'manage',
    'taxes'
),
(
    'settings.numerations',
    'Gestionar numeraciones',
    'settings',
    'manage',
    'numerations'
),
(
    'settings.payment_methods',
    'Gestionar métodos de pago',
    'settings',
    'payment_methods',
    '*'
),

-- Módulo de dashboard
(
    'dashboard.view',
    'Ver dashboard',
    'dashboard',
    'read',
    'dashboard'
),
(
    'dashboard.analytics',
    'Ver analíticas',
    'dashboard',
    'read',
    'analytics'
),

-- Módulo de auditoría
(
    'audit.view',
    'Ver auditoría',
    'audit',
    'read',
    'audit_log'
),
(
    'audit.export',
    'Exportar auditoría',
    'audit',
    'export',
    'audit_log'
);

-- Función para crear roles por defecto para una empresa
CREATE OR REPLACE FUNCTION public.create_default_roles_for_company(p_company_id UUID)
RETURNS VOID AS $$
DECLARE
    v_admin_role_id UUID;
    v_manager_role_id UUID;
    v_employee_role_id UUID;
    v_cashier_role_id UUID;
    v_viewer_role_id UUID;
    v_permission_id UUID;
BEGIN
    -- Crear rol de Administrador
    INSERT INTO public.roles (name, description, company_id, is_system_role, created_by)
    VALUES ('Administrador', 'Acceso completo al sistema', p_company_id, true, auth.uid())
    RETURNING id INTO v_admin_role_id;

    -- Crear rol de Gerente
    INSERT INTO public.roles (name, description, company_id, is_system_role, created_by)
    VALUES ('Gerente', 'Gestión operativa y reportes', p_company_id, true, auth.uid())
    RETURNING id INTO v_manager_role_id;

    -- Crear rol de Empleado
    INSERT INTO public.roles (name, description, company_id, is_system_role, created_by)
    VALUES ('Empleado', 'Operaciones básicas del sistema', p_company_id, true, auth.uid())
    RETURNING id INTO v_employee_role_id;

    -- Crear rol de Cajero
    INSERT INTO public.roles (name, description, company_id, is_system_role, created_by)
    VALUES ('Cajero', 'Operaciones de punto de venta', p_company_id, true, auth.uid())
    RETURNING id INTO v_cashier_role_id;

    -- Crear rol de Visualizador
    INSERT INTO public.roles (name, description, company_id, is_system_role, created_by)
    VALUES ('Visualizador', 'Solo lectura de datos', p_company_id, true, auth.uid())
    RETURNING id INTO v_viewer_role_id;

    -- Asignar TODOS los permisos al rol de Administrador
    FOR v_permission_id IN SELECT id FROM public.permissions WHERE is_active = true
    LOOP
        INSERT INTO public.role_permissions (role_id, permission_id, granted_by)
        VALUES (v_admin_role_id, v_permission_id, auth.uid());
    END LOOP;

    -- Asignar permisos al rol de Gerente (todos excepto configuración de usuarios y permisos)
    FOR v_permission_id IN 
        SELECT id FROM public.permissions 
        WHERE is_active = true 
        AND NOT (module = 'settings' AND resource IN ('users', 'roles', 'permissions'))
    LOOP
        INSERT INTO public.role_permissions (role_id, permission_id, granted_by)
        VALUES (v_manager_role_id, v_permission_id, auth.uid());
    END LOOP;

    -- Asignar permisos al rol de Empleado (operaciones básicas)
    FOR v_permission_id IN 
        SELECT id FROM public.permissions 
        WHERE is_active = true 
        AND (
            (module = 'products' AND action IN ('read', 'update')) OR
            (module = 'customers' AND action IN ('read', 'update')) OR
            (module = 'sales' AND action IN ('create', 'read', 'update', 'print')) OR
            (module = 'inventory' AND action IN ('read', 'update')) OR
            (module = 'dashboard' AND action = 'view') OR
            (module = 'reports' AND action = 'read')
        )
    LOOP
        INSERT INTO public.role_permissions (role_id, permission_id, granted_by)
        VALUES (v_employee_role_id, v_permission_id, auth.uid());
    END LOOP;

    -- Asignar permisos al rol de Cajero (solo ventas e inventario básico)
    FOR v_permission_id IN 
        SELECT id FROM public.permissions 
        WHERE is_active = true 
        AND (
            (module = 'products' AND action = 'read') OR
            (module = 'customers' AND action IN ('read', 'create', 'update')) OR
            (module = 'sales' AND action IN ('create', 'read', 'print')) OR
            (module = 'inventory' AND action = 'read') OR
            (module = 'dashboard' AND action = 'view')
        )
    LOOP
        INSERT INTO public.role_permissions (role_id, permission_id, granted_by)
        VALUES (v_cashier_role_id, v_permission_id, auth.uid());
    END LOOP;

    -- Asignar permisos al rol de Visualizador (solo lectura)
    FOR v_permission_id IN 
        SELECT id FROM public.permissions 
        WHERE is_active = true 
        AND action = 'read'
    LOOP
        INSERT INTO public.role_permissions (role_id, permission_id, granted_by)
        VALUES (v_viewer_role_id, v_permission_id, auth.uid());
    END LOOP;

END;
$$ LANGUAGE plpgsql;

-- Función para asignar rol por defecto a un usuario
CREATE OR REPLACE FUNCTION public.assign_default_role_to_user(p_user_id UUID, p_company_id UUID)
RETURNS VOID AS $$
DECLARE
    v_employee_role_id UUID;
BEGIN
    -- Obtener el ID del rol de Empleado para la empresa
    SELECT id INTO v_employee_role_id
    FROM public.roles
    WHERE company_id = p_company_id 
    AND name = 'Empleado' 
    AND is_system_role = true
    LIMIT 1;

    -- Asignar el rol de Empleado al usuario
    IF v_employee_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id, assigned_by)
        VALUES (p_user_id, v_employee_role_id, auth.uid())
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un usuario tiene un permiso específico
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id UUID, p_permission_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > now())
        AND p.name = p_permission_name
        AND p.is_active = true
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener todos los permisos de un usuario
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    name VARCHAR,
    description TEXT,
    module VARCHAR,
    action VARCHAR,
    resource VARCHAR,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        p.id,
        p.name,
        p.description,
        p.module,
        p.action,
        p.resource,
        p.is_active,
        p.created_at,
        p.updated_at
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
    AND p.is_active = true
    ORDER BY p.module, p.action, p.resource;
END;
$$ LANGUAGE plpgsql;

-- Agregar comentarios a las funciones
COMMENT ON FUNCTION public.create_default_roles_for_company (UUID) IS 'Crea roles por defecto para una empresa nueva';

COMMENT ON FUNCTION public.assign_default_role_to_user (UUID, UUID) IS 'Asigna rol de empleado por defecto a un usuario';

COMMENT ON FUNCTION public.user_has_permission (UUID, VARCHAR) IS 'Verifica si un usuario tiene un permiso específico';

COMMENT ON FUNCTION public.get_user_permissions (UUID) IS 'Obtiene todos los permisos de un usuario';