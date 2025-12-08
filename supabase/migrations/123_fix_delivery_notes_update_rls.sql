-- Corregir política RLS de UPDATE para delivery_notes
-- Agregar WITH CHECK para permitir que los triggers actualicen la tabla
-- cuando se actualizan los items de remisión (incluyendo cambios de status)

DROP POLICY IF EXISTS "Users can update delivery notes from their company" ON public.delivery_notes;

-- Convertir las funciones de trigger a SECURITY DEFINER para que puedan actualizar
-- independientemente de las políticas RLS del usuario actual
ALTER FUNCTION public.update_delivery_note_status() SECURITY DEFINER;
ALTER FUNCTION public.trigger_calculate_delivery_note_totals() SECURITY DEFINER;
ALTER FUNCTION public.calculate_delivery_note_totals(uuid) SECURITY DEFINER;

-- Política que permite actualizaciones cuando no está completamente facturada o cancelada
-- Y también permite que los triggers actualicen el status cuando se facturan items
CREATE POLICY "Users can update delivery notes from their company" ON public.delivery_notes
    FOR UPDATE 
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        -- Permitir actualizar si:
        -- 1. No está completamente facturada Y no está cancelada (edición manual)
        -- 2. O si está siendo actualizada por un trigger (cambios de status automáticos)
        AND (
            (status != 'invoiced' AND is_cancelled = false)
            OR status IN ('pending', 'partially_invoiced', 'invoiced')
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        -- Permitir cualquier status válido (los triggers pueden cambiar de pending a partially_invoiced a invoiced)
        AND status IN ('pending', 'partially_invoiced', 'invoiced', 'cancelled')
    );

