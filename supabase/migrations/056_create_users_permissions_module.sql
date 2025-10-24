-- Crear módulo de usuarios y permisos
-- 056_create_users_permissions_module.sql

-- Crear enum para roles de usuario
CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',    -- Super administrador del sistema
    'ADMIN',          -- Administrador de la empresa
    'MANAGER',        -- Gerente/Encargado
    'EMPLOYEE',       -- Empleado
    'CASHIER',        -- Cajero
    'VIEWER'          -- Solo lectura
);

-- Crear enum para estados de usuario
CREATE TYPE user_status AS ENUM (
    'ACTIVE',         -- Activo
    'INACTIVE',       -- Inactivo
    'SUSPENDED',      -- Suspendido
    'PENDING'         -- Pendiente de activación
);

-- Crear tabla de permisos del sistema
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    module VARCHAR(50) NOT NULL, -- Módulo al que pertenece el permiso
    action VARCHAR(50) NOT NULL, -- Acción específica (create, read, update, delete, etc.)
    resource VARCHAR(50) NOT NULL, -- Recurso específico (products, customers, etc.)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

-- Restricciones
UNIQUE(module, action, resource) );

-- Crear tabla de roles
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE, -- Roles del sistema vs roles personalizados
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

-- Restricciones
UNIQUE(company_id, name) );

-- Crear tabla de asignación de permisos a roles
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    granted_by UUID REFERENCES auth.users(id),

-- Restricciones
UNIQUE(role_id, permission_id) );

-- Crear tabla de asignación de roles a usuarios
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    assigned_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE, -- Fecha de expiración del rol (opcional)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

-- Restricciones
UNIQUE(user_id, role_id) );

-- Crear tabla de sesiones de usuario
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_activity TIMESTAMP
    WITH
        TIME ZONE DEFAULT now() NOT NULL,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now() NOT NULL,
        expires_at TIMESTAMP
    WITH
        TIME ZONE NOT NULL
);

-- Crear tabla de auditoría de usuarios
CREATE TABLE public.user_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, CREATE, UPDATE, DELETE, etc.
    resource VARCHAR(100), -- Recurso afectado
    resource_id UUID, -- ID del recurso afectado
    old_values JSONB, -- Valores anteriores
    new_values JSONB, -- Valores nuevos
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now() NOT NULL
);

-- Actualizar tabla profiles para incluir campos adicionales
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS position VARCHAR(100), -- Cargo/Puesto
ADD COLUMN IF NOT EXISTS department VARCHAR(100), -- Departamento
ADD COLUMN IF NOT EXISTS hire_date DATE, -- Fecha de contratación
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP
WITH
    TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT, -- Notas adicionales sobre el usuario
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Bogota',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'es',
ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'COP',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users (id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users (id);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_permissions_module ON public.permissions (module);

CREATE INDEX idx_permissions_action ON public.permissions (action);

CREATE INDEX idx_permissions_resource ON public.permissions (resource);

CREATE INDEX idx_roles_company_id ON public.roles (company_id);

CREATE INDEX idx_roles_is_system_role ON public.roles (is_system_role);

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions (role_id);

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions (permission_id);

CREATE INDEX idx_user_roles_user_id ON public.user_roles (user_id);

CREATE INDEX idx_user_roles_role_id ON public.user_roles (role_id);

CREATE INDEX idx_user_roles_is_active ON public.user_roles (is_active);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions (user_id);

CREATE INDEX idx_user_sessions_token ON public.user_sessions (session_token);

CREATE INDEX idx_user_sessions_is_active ON public.user_sessions (is_active);

CREATE INDEX idx_user_audit_log_user_id ON public.user_audit_log (user_id);

CREATE INDEX idx_user_audit_log_action ON public.user_audit_log (action);

CREATE INDEX idx_user_audit_log_created_at ON public.user_audit_log (created_at);

CREATE INDEX idx_profiles_status ON public.profiles (status);

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles (company_id);

CREATE INDEX idx_profiles_last_login ON public.profiles (last_login);

-- RLS Policies
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas para permissions (todos pueden leer, solo admins pueden modificar)
CREATE POLICY "Anyone can view permissions" ON public.permissions FOR
SELECT USING (true);

CREATE POLICY "Only admins can modify permissions" ON public.permissions FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE
            p.id = auth.uid ()
            AND p.role IN ('admin', 'super_admin')
    )
);

-- Políticas para roles
CREATE POLICY "Users can view roles in their company" ON public.roles FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
        OR is_system_role = true
    );

CREATE POLICY "Admins can manage roles in their company" ON public.roles FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE
            p.id = auth.uid ()
            AND p.role IN ('admin', 'super_admin')
    )
);

-- Políticas para role_permissions
CREATE POLICY "Users can view role permissions" ON public.role_permissions FOR
SELECT USING (
        role_id IN (
            SELECT r.id
            FROM public.roles r
            WHERE
                r.company_id IN (
                    SELECT company_id
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                )
        )
    );

CREATE POLICY "Admins can manage role permissions" ON public.role_permissions FOR ALL USING (
    role_id IN (
        SELECT r.id
        FROM public.roles r
        WHERE
            r.company_id IN (
                SELECT company_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            )
    )
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE
            p.id = auth.uid ()
            AND p.role IN ('admin', 'super_admin')
    )
);

-- Políticas para user_roles
CREATE POLICY "Users can view user roles in their company" ON public.user_roles FOR
SELECT USING (
        user_id IN (
            SELECT id
            FROM public.profiles
            WHERE
                company_id IN (
                    SELECT company_id
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                )
        )
    );

CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (
    user_id IN (
        SELECT id
        FROM public.profiles
        WHERE
            company_id IN (
                SELECT company_id
                FROM public.profiles
                WHERE
                    id = auth.uid ()
            )
    )
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE
            p.id = auth.uid ()
            AND p.role IN ('admin', 'super_admin')
    )
);

-- Políticas para user_sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions FOR
SELECT USING (user_id = auth.uid ());

CREATE POLICY "Users can manage their own sessions" ON public.user_sessions FOR ALL USING (user_id = auth.uid ());

-- Políticas para user_audit_log
CREATE POLICY "Users can view audit logs in their company" ON public.user_audit_log FOR
SELECT USING (
        user_id IN (
            SELECT id
            FROM public.profiles
            WHERE
                company_id IN (
                    SELECT company_id
                    FROM public.profiles
                    WHERE
                        id = auth.uid ()
                )
        )
    );

-- Crear función para actualizar timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para updated_at
CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER trigger_permissions_updated_at
    BEFORE UPDATE ON public.permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_set_timestamp();

-- Agregar comentarios
COMMENT ON
TABLE public.permissions IS 'Permisos del sistema para control de acceso granular';

COMMENT ON
TABLE public.roles IS 'Roles de usuario con permisos específicos';

COMMENT ON
TABLE public.role_permissions IS 'Asignación de permisos a roles';

COMMENT ON
TABLE public.user_roles IS 'Asignación de roles a usuarios';

COMMENT ON
TABLE public.user_sessions IS 'Sesiones activas de usuarios';

COMMENT ON
TABLE public.user_audit_log IS 'Registro de auditoría de acciones de usuarios';

COMMENT ON COLUMN public.permissions.module IS 'Módulo del sistema (products, customers, sales, etc.)';

COMMENT ON COLUMN public.permissions.action IS 'Acción específica (create, read, update, delete, export, etc.)';

COMMENT ON COLUMN public.permissions.resource IS 'Recurso específico dentro del módulo';

COMMENT ON COLUMN public.roles.is_system_role IS 'Indica si es un rol predefinido del sistema';

COMMENT ON COLUMN public.user_roles.expires_at IS 'Fecha de expiración del rol (NULL = sin expiración)';

COMMENT ON COLUMN public.user_sessions.device_info IS 'Información del dispositivo en formato JSON';

COMMENT ON COLUMN public.user_audit_log.resource IS 'Tipo de recurso afectado por la acción';

COMMENT ON COLUMN public.user_audit_log.resource_id IS 'ID específico del recurso afectado';