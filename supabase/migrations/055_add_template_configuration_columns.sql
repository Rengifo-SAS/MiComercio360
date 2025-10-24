-- Agregar columnas de configuración de plantillas
-- 055_add_template_configuration_columns.sql

-- Agregar enums para configuración de plantillas
CREATE TYPE template_style AS ENUM (
    'CLASSIC',      -- Clásico
    'MODERN',       -- Moderno
    'MINIMALIST',   -- Minimalista
    'CORPORATE'     -- Corporativo
);

CREATE TYPE font_type AS ENUM (
    'HELVETICA',    -- Helvetica
    'ARIAL',        -- Arial
    'TIMES',        -- Times New Roman
    'COURIER',      -- Courier
    'VERDANA',      -- Verdana
    'GEORGIA'       -- Georgia
);

CREATE TYPE font_size AS ENUM (
    'SMALL',        -- Pequeño (10px)
    'NORMAL',       -- Normal (12px)
    'LARGE',        -- Grande (14px)
    'EXTRA_LARGE'   -- Extra grande (16px)
);

-- Agregar columnas de configuración a la tabla print_templates
ALTER TABLE public.print_templates 
ADD COLUMN template_style template_style NOT NULL DEFAULT 'CLASSIC',
ADD COLUMN font_type font_type NOT NULL DEFAULT 'HELVETICA',
ADD COLUMN font_size_preset font_size NOT NULL DEFAULT 'NORMAL',
ADD COLUMN item_spacing NUMERIC(3, 1) NOT NULL DEFAULT 1.0,
ADD COLUMN show_total_items BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN third_party_income BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN taxes_included BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN show_discount_column BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN show_tax_value_column BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN show_tax_percentage_column BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN show_unit_measure_column BOOLEAN NOT NULL DEFAULT TRUE;

-- Agregar comentarios para las nuevas columnas
COMMENT ON COLUMN public.print_templates.template_style IS 'Estilo de la plantilla (Clásico, Moderno, etc.)';
COMMENT ON COLUMN public.print_templates.font_type IS 'Tipo de fuente para la plantilla';
COMMENT ON COLUMN public.print_templates.font_size_preset IS 'Tamaño de fuente predefinido';
COMMENT ON COLUMN public.print_templates.item_spacing IS 'Espaciado entre items en la tabla';
COMMENT ON COLUMN public.print_templates.show_total_items IS 'Mostrar total de items en el documento';
COMMENT ON COLUMN public.print_templates.third_party_income IS 'Incluir ingresos de terceros';
COMMENT ON COLUMN public.print_templates.taxes_included IS 'Impuestos incluidos en el precio';
COMMENT ON COLUMN public.print_templates.show_discount_column IS 'Mostrar columna de descuento';
COMMENT ON COLUMN public.print_templates.show_tax_value_column IS 'Mostrar columna de valor de impuesto';
COMMENT ON COLUMN public.print_templates.show_tax_percentage_column IS 'Mostrar columna de porcentaje de impuesto';
COMMENT ON COLUMN public.print_templates.show_unit_measure_column IS 'Mostrar columna de unidad de medida';
