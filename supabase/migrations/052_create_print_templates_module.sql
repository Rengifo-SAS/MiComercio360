-- Crear módulo de plantillas de impresión
-- 052_create_print_templates_module.sql

-- Crear enum para tipos de documentos
CREATE TYPE document_type AS ENUM (
    'INVOICE',           -- Factura de venta
    'QUOTATION',         -- Cotización
    'RECEIPT',           -- Recibo de caja
    'PURCHASE_ORDER',    -- Orden de compra
    'DELIVERY_NOTE',     -- Remisión
    'CREDIT_NOTE',       -- Nota crédito
    'DEBIT_NOTE',        -- Nota débito
    'PAYMENT_VOUCHER',   -- Comprobante de pago
    'EXPENSE_VOUCHER',   -- Comprobante de egreso
    'INVENTORY_REPORT',  -- Reporte de inventario
    'SALES_REPORT',      -- Reporte de ventas
    'OTHER'              -- Otros documentos
);

-- Crear enum para tamaños de papel
CREATE TYPE paper_size AS ENUM (
    'A4',           -- A4 (210 x 297 mm)
    'A5',           -- A5 (148 x 210 mm)
    'LETTER',       -- Carta (8.5 x 11 pulgadas)
    'LEGAL',        -- Legal (8.5 x 14 pulgadas)
    'HALF_LETTER',  -- Media carta (5.5 x 8.5 pulgadas)
    'CUSTOM'        -- Tamaño personalizado
);

-- Crear enum para orientación
CREATE TYPE page_orientation AS ENUM (
    'PORTRAIT',     -- Vertical
    'LANDSCAPE'     -- Horizontal
);

-- Crear tabla de plantillas de impresión
CREATE TABLE public.print_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type document_type NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

-- Configuración de página
paper_size paper_size NOT NULL DEFAULT 'A4',
page_orientation page_orientation NOT NULL DEFAULT 'PORTRAIT',
custom_width NUMERIC(8, 2), -- Para tamaño personalizado (mm)
custom_height NUMERIC(8, 2), -- Para tamaño personalizado (mm)

-- Configuración de márgenes (mm)
margin_top NUMERIC(5, 2) NOT NULL DEFAULT 10.0,
margin_bottom NUMERIC(5, 2) NOT NULL DEFAULT 10.0,
margin_left NUMERIC(5, 2) NOT NULL DEFAULT 10.0,
margin_right NUMERIC(5, 2) NOT NULL DEFAULT 10.0,

-- Configuración de fuente
font_family VARCHAR(100) NOT NULL DEFAULT 'Arial',
font_size NUMERIC(4, 1) NOT NULL DEFAULT 12.0,
line_height NUMERIC(3, 1) NOT NULL DEFAULT 1.2,

-- Plantilla HTML/CSS
header_template TEXT,
body_template TEXT NOT NULL,
footer_template TEXT,
css_styles TEXT,

-- Configuración de elementos
show_company_logo BOOLEAN NOT NULL DEFAULT TRUE,
show_company_info BOOLEAN NOT NULL DEFAULT TRUE,
show_document_number BOOLEAN NOT NULL DEFAULT TRUE,
show_document_date BOOLEAN NOT NULL DEFAULT TRUE,
show_customer_info BOOLEAN NOT NULL DEFAULT TRUE,
show_items_table BOOLEAN NOT NULL DEFAULT TRUE,
show_totals BOOLEAN NOT NULL DEFAULT TRUE,
show_payment_info BOOLEAN NOT NULL DEFAULT FALSE,
show_notes BOOLEAN NOT NULL DEFAULT FALSE,

-- Metadatos
created_at TIMESTAMP
WITH
    TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP
WITH
    TIME ZONE DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users (id),
    updated_by UUID REFERENCES auth.users (id),

-- Restricciones
UNIQUE (company_id, name),
    UNIQUE (company_id, document_type, is_default) -- Solo una plantilla por defecto por tipo
);

-- Crear tabla de historial de plantillas
CREATE TABLE public.print_template_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    template_id UUID NOT NULL REFERENCES public.print_templates (id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL, -- 'CREATED', 'UPDATED', 'ACTIVATED', 'DEACTIVATED', 'DELETED'
    old_values JSONB,
    new_values JSONB,
    change_reason TEXT,
    changed_by UUID REFERENCES auth.users (id),
    changed_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now() NOT NULL
);

-- Crear función para actualizar timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at
CREATE TRIGGER trigger_print_templates_updated_at
    BEFORE UPDATE ON public.print_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_set_timestamp();

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_print_templates_company_id ON public.print_templates (company_id);

CREATE INDEX idx_print_templates_document_type ON public.print_templates (document_type);

CREATE INDEX idx_print_templates_is_default ON public.print_templates (is_default);

CREATE INDEX idx_print_templates_is_active ON public.print_templates (is_active);

CREATE INDEX idx_print_template_history_template_id ON public.print_template_history (template_id);

CREATE INDEX idx_print_template_history_company_id ON public.print_template_history (company_id);

-- RLS Policies
ALTER TABLE public.print_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.print_template_history ENABLE ROW LEVEL SECURITY;

-- Política para plantillas: usuarios pueden ver plantillas de su empresa
CREATE POLICY "Users can view print templates in their company" ON public.print_templates FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

-- Política para plantillas: usuarios pueden insertar plantillas en su empresa
CREATE POLICY "Users can insert print templates in their company" ON public.print_templates FOR
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

-- Política para plantillas: usuarios pueden actualizar plantillas de su empresa
CREATE POLICY "Users can update print templates in their company" ON public.print_templates FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Política para plantillas: usuarios pueden eliminar plantillas de su empresa
CREATE POLICY "Users can delete print templates in their company" ON public.print_templates FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Política para historial: usuarios pueden ver historial de plantillas de su empresa
CREATE POLICY "Users can view print template history in their company" ON public.print_template_history FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

-- Política para historial: usuarios pueden insertar historial de plantillas de su empresa
CREATE POLICY "Users can insert print template history in their company" ON public.print_template_history FOR
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

-- Agregar comentarios
COMMENT ON
TABLE public.print_templates IS 'Plantillas de impresión para diferentes tipos de documentos';

COMMENT ON COLUMN public.print_templates.document_type IS 'Tipo de documento para el cual se aplica la plantilla';

COMMENT ON COLUMN public.print_templates.paper_size IS 'Tamaño de papel para la impresión';

COMMENT ON COLUMN public.print_templates.page_orientation IS 'Orientación de la página (vertical u horizontal)';

COMMENT ON COLUMN public.print_templates.header_template IS 'Plantilla HTML para el encabezado del documento';

COMMENT ON COLUMN public.print_templates.body_template IS 'Plantilla HTML para el cuerpo del documento';

COMMENT ON COLUMN public.print_templates.footer_template IS 'Plantilla HTML para el pie de página del documento';

COMMENT ON COLUMN public.print_templates.css_styles IS 'Estilos CSS personalizados para la plantilla';