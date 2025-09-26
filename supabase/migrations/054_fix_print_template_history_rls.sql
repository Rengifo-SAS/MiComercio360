-- Fix RLS policies for print_template_history table
-- This migration ensures the print_template_history table has proper RLS policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view print template history in their company" ON public.print_template_history;

DROP POLICY IF EXISTS "Users can insert print template history in their company" ON public.print_template_history;

-- Create proper RLS policies for print_template_history
CREATE POLICY "Users can view print template history in their company" ON public.print_template_history FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

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

-- Add comment
COMMENT ON
TABLE public.print_template_history IS 'Historial de cambios en plantillas de impresión';

COMMENT ON COLUMN public.print_template_history.change_type IS 'Tipo de cambio: CREATED, UPDATED, ACTIVATED, DEACTIVATED, DELETED';

COMMENT ON COLUMN public.print_template_history.old_values IS 'Valores anteriores en formato JSON';

COMMENT ON COLUMN public.print_template_history.new_values IS 'Valores nuevos en formato JSON';

COMMENT ON COLUMN public.print_template_history.change_reason IS 'Razón del cambio';

COMMENT ON COLUMN public.print_template_history.changed_by IS 'ID del usuario que realizó el cambio';

COMMENT ON COLUMN public.print_template_history.changed_at IS 'Fecha y hora del cambio';