-- Add missing columns to companies table
-- These columns are referenced in the code but missing from the initial schema

-- Add regimen_tributario column
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS regimen_tributario text DEFAULT 'Simplificado';

-- Add codigo_ciiu column
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS codigo_ciiu text;

-- Add tipo_documento column
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS tipo_documento text DEFAULT 'NIT';

-- Add comments to document the columns
COMMENT ON COLUMN public.companies.regimen_tributario IS 'Régimen tributario de la empresa (Simplificado, Común, etc.)';

COMMENT ON COLUMN public.companies.codigo_ciiu IS 'Código CIIU (Clasificación Industrial Internacional Uniforme)';

COMMENT ON COLUMN public.companies.tipo_documento IS 'Tipo de documento de identificación (NIT, CC, etc.)';