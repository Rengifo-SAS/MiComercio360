-- Eliminar la función antigua de create_product_with_inventory que incluye campos no utilizados
-- 050_drop_old_product_function.sql

-- Eliminar la función antigua que incluye campos iva_rate, ica_rate, retencion_rate, excise_tax
DROP FUNCTION IF EXISTS public.create_product_with_inventory (
    text,
    text,
    text,
    uuid,
    uuid,
    uuid,
    numeric,
    numeric,
    integer,
    integer,
    text,
    text,
    integer,
    numeric,
    numeric,
    numeric,
    text,
    boolean,
    uuid,
    uuid
);

-- Eliminar también la función antigua de update_product que incluye campos no utilizados
DROP FUNCTION IF EXISTS public.update_product (
    uuid,
    text,
    text,
    text,
    uuid,
    uuid,
    uuid,
    numeric,
    numeric,
    integer,
    integer,
    text,
    text,
    boolean,
    numeric,
    numeric,
    numeric,
    text,
    boolean,
    uuid,
    uuid
);