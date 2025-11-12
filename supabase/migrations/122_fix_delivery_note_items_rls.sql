-- Corregir política RLS para actualización de delivery_note_items
-- Agregar WITH CHECK a la política de UPDATE

DROP POLICY IF EXISTS "Users can update delivery note items from their company" ON public.delivery_note_items;

-- Crear política con USING y WITH CHECK para permitir actualizaciones
CREATE POLICY "Users can update delivery note items from their company" ON public.delivery_note_items
    FOR UPDATE 
    USING (
        delivery_note_id IN (
            SELECT id FROM public.delivery_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    )
    WITH CHECK (
        delivery_note_id IN (
            SELECT id FROM public.delivery_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );