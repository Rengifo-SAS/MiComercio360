-- Crear módulo de centros de costos
-- 046_create_cost_centers_module.sql

-- Crear tabla de centros de costos
CREATE TABLE IF NOT EXISTS public.cost_centers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code text NOT NULL, -- Código único del centro de costos (ej: "ADM001", "VEN002")
    name text NOT NULL, -- Nombre del centro de costos
    description text, -- Descripción del centro de costos
    cost_center_type text NOT NULL CHECK (cost_center_type IN (
        'ADMINISTRATIVE',  -- Administrativo
        'SALES',          -- Ventas
        'PRODUCTION',     -- Producción
        'MARKETING',      -- Marketing
        'HUMAN_RESOURCES', -- Recursos Humanos
        'IT',             -- Tecnología
        'FINANCE',        -- Finanzas
        'LOGISTICS',      -- Logística
        'PROJECT',        -- Proyecto específico
        'OTHER'           -- Otros
    )),
    parent_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL, -- Para jerarquías
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false, -- Si es un centro de costos por defecto del sistema
    budget_limit decimal(15,2), -- Límite presupuestario (opcional)
    responsible_person text, -- Persona responsable del centro de costos
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id),

-- Restricciones
UNIQUE(company_id, code),
    CHECK (name != ''),
    CHECK (code != ''),
    CHECK (budget_limit IS NULL OR budget_limit >= 0)
);

-- Crear tabla de historial de centros de costos (para auditoría)
CREATE TABLE IF NOT EXISTS public.cost_center_history (
    id uuid DEFAULT gen_random_uuid () PRIMARY KEY,
    cost_center_id uuid NOT NULL REFERENCES public.cost_centers (id) ON DELETE CASCADE,
    change_type text NOT NULL CHECK (
        change_type IN (
            'CREATED',
            'UPDATED',
            'ACTIVATED',
            'DEACTIVATED',
            'BUDGET_CHANGED'
        )
    ),
    old_values jsonb, -- Valores anteriores
    new_values jsonb, -- Valores nuevos
    change_reason text,
    changed_by uuid REFERENCES auth.users (id),
    changed_at timestamp
    with
        time zone DEFAULT now(),
        company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE
);

-- Crear tabla de asignación de gastos a centros de costos
CREATE TABLE IF NOT EXISTS public.cost_center_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    cost_center_id uuid NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
    transaction_type text NOT NULL CHECK (transaction_type IN (
        'SALE', 'PURCHASE', 'EXPENSE', 'INCOME', 'ADJUSTMENT'
    )),
    transaction_id uuid NOT NULL, -- ID de la transacción (venta, compra, etc.)
    amount decimal(15,2) NOT NULL,
    percentage decimal(5,2) DEFAULT 100.00, -- Porcentaje del monto asignado
    description text,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid REFERENCES auth.users(id),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

-- Restricciones
CHECK (amount > 0),
    CHECK (percentage > 0 AND percentage <= 100)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_cost_centers_company_id ON public.cost_centers (company_id);

CREATE INDEX IF NOT EXISTS idx_cost_centers_type ON public.cost_centers (cost_center_type);

CREATE INDEX IF NOT EXISTS idx_cost_centers_is_active ON public.cost_centers (is_active);

CREATE INDEX IF NOT EXISTS idx_cost_centers_parent_id ON public.cost_centers (parent_id);

CREATE INDEX IF NOT EXISTS idx_cost_center_history_cost_center_id ON public.cost_center_history (cost_center_id);

CREATE INDEX IF NOT EXISTS idx_cost_center_history_company_id ON public.cost_center_history (company_id);

CREATE INDEX IF NOT EXISTS idx_cost_center_assignments_cost_center_id ON public.cost_center_assignments (cost_center_id);

CREATE INDEX IF NOT EXISTS idx_cost_center_assignments_company_id ON public.cost_center_assignments (company_id);

CREATE INDEX IF NOT EXISTS idx_cost_center_assignments_transaction ON public.cost_center_assignments (
    transaction_type,
    transaction_id
);

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_cost_centers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_cost_centers_updated_at
    BEFORE UPDATE ON public.cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cost_centers_updated_at();

-- Crear RLS (Row Level Security)
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cost_center_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cost_center_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas para cost_centers
CREATE POLICY "Users can view cost centers from their company" ON public.cost_centers FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert cost centers for their company" ON public.cost_centers FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can update cost centers from their company" ON public.cost_centers FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can delete cost centers from their company" ON public.cost_centers FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Políticas para cost_center_history
CREATE POLICY "Users can view cost center history from their company" ON public.cost_center_history FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert cost center history for their company" ON public.cost_center_history FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

-- Políticas para cost_center_assignments
CREATE POLICY "Users can view cost center assignments from their company" ON public.cost_center_assignments FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert cost center assignments for their company" ON public.cost_center_assignments FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can update cost center assignments from their company" ON public.cost_center_assignments FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can delete cost center assignments from their company" ON public.cost_center_assignments FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Comentarios para documentación
COMMENT ON
TABLE public.cost_centers IS 'Centros de costos para distribución de ingresos y gastos';

COMMENT ON COLUMN public.cost_centers.cost_center_type IS 'Tipo de centro de costos (ADMINISTRATIVE, SALES, PRODUCTION, etc.)';

COMMENT ON COLUMN public.cost_centers.parent_id IS 'ID del centro de costos padre para jerarquías';

COMMENT ON COLUMN public.cost_centers.budget_limit IS 'Límite presupuestario del centro de costos';

COMMENT ON COLUMN public.cost_centers.responsible_person IS 'Persona responsable del centro de costos';

COMMENT ON
TABLE public.cost_center_history IS 'Historial de cambios en centros de costos';

COMMENT ON
TABLE public.cost_center_assignments IS 'Asignaciones de gastos e ingresos a centros de costos';