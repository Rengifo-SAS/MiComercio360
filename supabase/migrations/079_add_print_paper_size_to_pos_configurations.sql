-- =====================================================
-- MIGRACIÓN 079: Agregar columna print_paper_size a pos_configurations
-- =====================================================

-- Agregar columna print_paper_size a la tabla pos_configurations
ALTER TABLE public.pos_configurations 
ADD COLUMN print_paper_size TEXT DEFAULT 'thermal-80mm' CHECK (print_paper_size IN ('letter', 'thermal-80mm'));

-- Comentario para la columna
COMMENT ON COLUMN public.pos_configurations.print_paper_size IS 'Tamaño de papel para impresión de facturas: letter (8.5x11) o thermal-80mm';

-- =====================================================
-- MIGRACIÓN COMPLETADA
-- =====================================================
