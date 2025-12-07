-- Permitir actualizar cotizaciones para convertirlas a ventas
-- La política actual bloquea cualquier actualización cuando status = 'converted',
-- pero necesitamos permitir actualizar el status a 'converted' cuando se convierte

-- Eliminar la política restrictiva actual
DROP POLICY IF EXISTS "Users can update quotes from their company" ON public.quotes;

-- Crear nueva política que permite actualizar cotizaciones no convertidas
-- Y también permite convertir cotizaciones (cambiar status a 'converted')
CREATE POLICY "Users can update quotes from their company" ON public.quotes
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        -- Permitir actualizar si no está convertida (permite convertir)
        -- O si está convertida pero sin sale_id asignado (caso edge de recuperación)
        AND (
            status != 'converted' 
            OR (status = 'converted' AND converted_to_sale_id IS NULL)
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        -- Permitir cualquier actualización válida
        -- Una vez convertida (status = 'converted' y converted_to_sale_id IS NOT NULL),
        -- no se podrá actualizar de nuevo debido a la condición USING
    );
