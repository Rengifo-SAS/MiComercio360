-- Crear módulo de impuestos
-- 044_create_taxes_module.sql

-- Crear tabla de impuestos
CREATE TABLE IF NOT EXISTS public.taxes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL, -- Nombre del impuesto (ej: "IVA", "Retención en la Fuente", "ICA")
    description text, -- Descripción del impuesto
    tax_type text NOT NULL CHECK (tax_type IN (
        'VAT',           -- IVA (Impuesto al Valor Agregado)
        'WITHHOLDING',   -- Retención en la Fuente
        'CONSUMPTION',   -- Impuesto al Consumo
        'INDUSTRY',      -- ICA (Impuesto de Industria y Comercio)
        'OTHER'          -- Otros impuestos
    )),
    percentage decimal(5,2) NOT NULL DEFAULT 0.00, -- Porcentaje del impuesto (ej: 19.00 para 19%)
    is_inclusive boolean DEFAULT false, -- Si el impuesto está incluido en el precio base
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false, -- Si es un impuesto por defecto del sistema
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id),

-- Restricciones
UNIQUE(company_id, name),
    CHECK (percentage >= 0 AND percentage <= 100),
    CHECK (name != '')
);

-- Crear tabla de historial de impuestos (para auditoría)
CREATE TABLE IF NOT EXISTS public.tax_history (
    id uuid DEFAULT gen_random_uuid () PRIMARY KEY,
    tax_id uuid NOT NULL REFERENCES public.taxes (id) ON DELETE CASCADE,
    old_percentage decimal(5, 2),
    new_percentage decimal(5, 2),
    change_reason text,
    changed_by uuid REFERENCES auth.users (id),
    changed_at timestamp
    with
        time zone DEFAULT now(),
        company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_taxes_company_id ON public.taxes (company_id);

CREATE INDEX IF NOT EXISTS idx_taxes_tax_type ON public.taxes (tax_type);

CREATE INDEX IF NOT EXISTS idx_taxes_is_active ON public.taxes (is_active);

CREATE INDEX IF NOT EXISTS idx_taxes_is_default ON public.taxes (is_default);

CREATE INDEX IF NOT EXISTS idx_tax_history_tax_id ON public.tax_history (tax_id);

CREATE INDEX IF NOT EXISTS idx_tax_history_company_id ON public.tax_history (company_id);

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_taxes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_taxes_updated_at
    BEFORE UPDATE ON public.taxes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_taxes_updated_at();

-- Crear RLS (Row Level Security)
ALTER TABLE public.taxes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tax_history ENABLE ROW LEVEL SECURITY;

-- Políticas para taxes
CREATE POLICY "Users can view taxes from their company" ON public.taxes FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert taxes for their company" ON public.taxes FOR
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

CREATE POLICY "Users can update taxes from their company" ON public.taxes FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can delete taxes from their company" ON public.taxes FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Políticas para tax_history
CREATE POLICY "Users can view tax history from their company" ON public.tax_history FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert tax history for their company" ON public.tax_history FOR
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

-- Comentarios para documentación
COMMENT ON
TABLE public.taxes IS 'Impuestos configurados por empresa';

COMMENT ON COLUMN public.taxes.tax_type IS 'Tipo de impuesto (VAT, WITHHOLDING, CONSUMPTION, INDUSTRY, OTHER)';

COMMENT ON COLUMN public.taxes.percentage IS 'Porcentaje del impuesto (0.00 a 100.00)';

COMMENT ON COLUMN public.taxes.is_inclusive IS 'Si el impuesto está incluido en el precio base';

COMMENT ON COLUMN public.taxes.is_default IS 'Si es un impuesto por defecto del sistema';

COMMENT ON
TABLE public.tax_history IS 'Historial de cambios en impuestos';