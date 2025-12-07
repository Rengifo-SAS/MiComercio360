-- Crear módulo de numeraciones para documentos
-- 042_create_numerations_module.sql

-- Crear tabla de numeraciones
CREATE TABLE IF NOT EXISTS public.numerations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    document_type text NOT NULL, -- Tipo de documento (invoice, receipt, expense_voucher, etc.)
    name text NOT NULL, -- Nombre descriptivo de la numeración
    prefix text NOT NULL DEFAULT '', -- Prefijo (ej: "FAC", "REC", "EGR")
    current_number integer NOT NULL DEFAULT 0, -- Número actual
    number_length integer NOT NULL DEFAULT 6, -- Longitud del número (ej: 6 = 000001)
    suffix text DEFAULT '', -- Sufijo (ej: "-2024")
    is_active boolean DEFAULT true,
    description text, -- Descripción opcional
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id),
    
    -- Restricciones
    UNIQUE(company_id, document_type, name),
    CHECK (current_number >= 0),
    CHECK (number_length > 0 AND number_length <= 10),
    CHECK (document_type IN (
        'invoice',           -- Factura de venta
        'receipt',           -- Recibo de caja
        'expense_voucher',   -- Comprobante de egreso
        'credit_note',       -- Nota crédito
        'debit_note',        -- Nota débito
        'purchase_order',    -- Orden de compra
        'quotation',         -- Cotización
        'delivery_note',     -- Remisión
        'payment_voucher',   -- Comprobante de pago
        'adjustment_note'    -- Nota de ajuste
    ))
);

-- Crear tabla de historial de numeraciones (para auditoría)
CREATE TABLE IF NOT EXISTS public.numeration_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    numeration_id uuid NOT NULL REFERENCES public.numerations(id) ON DELETE CASCADE,
    old_number integer NOT NULL,
    new_number integer NOT NULL,
    change_reason text, -- Razón del cambio
    changed_by uuid REFERENCES auth.users(id),
    changed_at timestamp with time zone DEFAULT now(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_numerations_company_id ON public.numerations(company_id);
CREATE INDEX IF NOT EXISTS idx_numerations_document_type ON public.numerations(document_type);
CREATE INDEX IF NOT EXISTS idx_numerations_is_active ON public.numerations(is_active);
CREATE INDEX IF NOT EXISTS idx_numeration_history_numeration_id ON public.numeration_history(numeration_id);
CREATE INDEX IF NOT EXISTS idx_numeration_history_company_id ON public.numeration_history(company_id);

-- Crear función para generar el siguiente número
CREATE OR REPLACE FUNCTION public.get_next_number(
    p_company_id uuid,
    p_document_type text,
    p_name text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_numeration public.numerations%ROWTYPE;
    v_next_number integer;
    v_formatted_number text;
BEGIN
    -- Buscar la numeración activa
    SELECT * INTO v_numeration
    FROM public.numerations
    WHERE company_id = p_company_id
      AND document_type = p_document_type
      AND is_active = true
      AND (p_name IS NULL OR name = p_name)
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Si no existe numeración, crear una por defecto
    IF NOT FOUND THEN
        INSERT INTO public.numerations (
            company_id,
            document_type,
            name,
            prefix,
            current_number,
            number_length,
            suffix
        ) VALUES (
            p_company_id,
            p_document_type,
            COALESCE(p_name, 'Principal'),
            CASE p_document_type
                WHEN 'invoice' THEN 'FAC'
                WHEN 'receipt' THEN 'REC'
                WHEN 'expense_voucher' THEN 'EGR'
                WHEN 'credit_note' THEN 'NC'
                WHEN 'debit_note' THEN 'ND'
                WHEN 'purchase_order' THEN 'OC'
                WHEN 'quotation' THEN 'COT'
                WHEN 'delivery_note' THEN 'REM'
                WHEN 'payment_voucher' THEN 'CP'
                WHEN 'adjustment_note' THEN 'NA'
                ELSE 'DOC'
            END,
            0,
            6,
            ''
        ) RETURNING * INTO v_numeration;
    END IF;
    
    -- Incrementar el número actual
    v_next_number := v_numeration.current_number + 1;
    
    -- Actualizar el número actual en la numeración
    UPDATE public.numerations
    SET current_number = v_next_number,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = v_numeration.id;
    
    -- Formatear el número con ceros a la izquierda
    v_formatted_number := lpad(v_next_number::text, v_numeration.number_length, '0');
    
    -- Registrar en el historial
    INSERT INTO public.numeration_history (
        numeration_id,
        old_number,
        new_number,
        change_reason,
        changed_by,
        company_id
    ) VALUES (
        v_numeration.id,
        v_numeration.current_number,
        v_next_number,
        'Generación automática',
        auth.uid(),
        p_company_id
    );
    
    -- Retornar el número formateado completo
    RETURN v_numeration.prefix || v_formatted_number || v_numeration.suffix;
END;
$$;

-- Crear función para resetear numeración
CREATE OR REPLACE FUNCTION public.reset_numeration(
    p_numeration_id uuid,
    p_new_number integer DEFAULT 0,
    p_reason text DEFAULT 'Reseteo manual'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_number integer;
    v_company_id uuid;
BEGIN
    -- Obtener datos actuales
    SELECT current_number, company_id INTO v_old_number, v_company_id
    FROM public.numerations
    WHERE id = p_numeration_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Actualizar numeración
    UPDATE public.numerations
    SET current_number = p_new_number,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_numeration_id;
    
    -- Registrar en historial
    INSERT INTO public.numeration_history (
        numeration_id,
        old_number,
        new_number,
        change_reason,
        changed_by,
        company_id
    ) VALUES (
        p_numeration_id,
        v_old_number,
        p_new_number,
        p_reason,
        auth.uid(),
        v_company_id
    );
    
    RETURN true;
END;
$$;

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_numerations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_numerations_updated_at
    BEFORE UPDATE ON public.numerations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_numerations_updated_at();

-- Crear RLS (Row Level Security)
ALTER TABLE public.numerations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.numeration_history ENABLE ROW LEVEL SECURITY;

-- Políticas para numerations
CREATE POLICY "Users can view numerations from their company" ON public.numerations
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert numerations for their company" ON public.numerations
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update numerations from their company" ON public.numerations
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete numerations from their company" ON public.numerations
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Políticas para numeration_history
CREATE POLICY "Users can view numeration history from their company" ON public.numeration_history
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert numeration history for their company" ON public.numeration_history
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE public.numerations IS 'Numeraciones de documentos por empresa';
COMMENT ON COLUMN public.numerations.document_type IS 'Tipo de documento que se numerará';
COMMENT ON COLUMN public.numerations.name IS 'Nombre descriptivo de la numeración';
COMMENT ON COLUMN public.numerations.prefix IS 'Prefijo del número (ej: FAC, REC, EGR)';
COMMENT ON COLUMN public.numerations.current_number IS 'Número actual de la secuencia';
COMMENT ON COLUMN public.numerations.number_length IS 'Longitud del número con ceros a la izquierda';
COMMENT ON COLUMN public.numerations.suffix IS 'Sufijo del número (ej: -2024)';

COMMENT ON TABLE public.numeration_history IS 'Historial de cambios en numeraciones';
COMMENT ON FUNCTION public.get_next_number IS 'Genera el siguiente número de una numeración';
COMMENT ON FUNCTION public.reset_numeration IS 'Resetea una numeración a un número específico';
