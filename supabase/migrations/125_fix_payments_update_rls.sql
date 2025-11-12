-- Corregir política RLS de UPDATE para payments
-- Agregar WITH CHECK para permitir cambios de estado

DROP POLICY IF EXISTS "Users can update payments from their company" ON public.payments;

CREATE POLICY "Users can update payments from their company" ON public.payments
    FOR UPDATE 
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

