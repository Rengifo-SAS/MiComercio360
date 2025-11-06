-- Fix para el trigger de total_amount en received_payments
-- Previene que total_amount se establezca en NULL cuando se insertan items
-- Solo recalcula si hay items con monto > 0, mantiene el total si ya está establecido correctamente

CREATE OR REPLACE FUNCTION public.calculate_received_payment_total(p_received_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_amount numeric(15,2) := 0;
    v_current_total numeric(15,2);
    v_items_count integer := 0;
BEGIN
    -- Contar items para verificar si hay items asociados
    SELECT COUNT(*) INTO v_items_count
    FROM public.received_payment_items
    WHERE received_payment_id = p_received_payment_id;
    
    -- Si no hay items, no hacer nada (mantener el total que ya está establecido)
    IF v_items_count = 0 THEN
        RETURN;
    END IF;
    
    -- Calcular total desde items
    SELECT COALESCE(SUM(amount_paid), 0)
    INTO v_total_amount
    FROM public.received_payment_items
    WHERE received_payment_id = p_received_payment_id;
    
    -- Asegurar que el total nunca sea NULL
    IF v_total_amount IS NULL THEN
        v_total_amount := 0;
    END IF;
    
    -- Obtener el total actual del pago para comparar
    SELECT total_amount INTO v_current_total
    FROM public.received_payments
    WHERE id = p_received_payment_id;
    
    -- Solo actualizar si:
    -- 1. Hay items con monto > 0, O
    -- 2. El total actual es NULL o 0 (necesita ser establecido)
    -- Si ya hay un total válido > 0 y los items suman lo mismo, no hacer nada
    IF v_total_amount > 0 OR v_current_total IS NULL OR v_current_total = 0 THEN
        UPDATE public.received_payments
        SET total_amount = GREATEST(v_total_amount, 0),
            updated_at = now()
        WHERE id = p_received_payment_id;
    END IF;
END;
$$;
