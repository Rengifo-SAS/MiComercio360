-- Crear función para conciliar un pago de manera segura
CREATE OR REPLACE FUNCTION public.reconcile_payment(
    p_payment_id uuid,
    p_reconciliation_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment_record record;
    v_company_id uuid;
    v_user_id uuid;
    v_new_status text := 'reconciled';
    v_new_is_reconciled boolean := true;
    v_new_reconciliation_date timestamp with time zone;
    v_new_updated_at timestamp with time zone;
BEGIN
    -- Obtener el ID del usuario actual
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;
    
    -- Obtener información del pago
    SELECT 
        id,
        company_id,
        status,
        is_reconciled
    INTO v_payment_record
    FROM public.payments
    WHERE id = p_payment_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pago no encontrado';
    END IF;
    
    -- Verificar que el usuario pertenece a la misma empresa
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE id = v_user_id;
    
    IF v_company_id IS NULL OR v_company_id != v_payment_record.company_id THEN
        RAISE EXCEPTION 'No tienes permisos para conciliar este pago';
    END IF;
    
    -- Verificar que el pago no esté cancelado
    IF v_payment_record.status = 'cancelled' THEN
        RAISE EXCEPTION 'No se puede conciliar un pago cancelado';
    END IF;
    
    -- Verificar que el pago no esté ya conciliado
    IF v_payment_record.is_reconciled = true OR v_payment_record.status = 'reconciled' THEN
        RAISE EXCEPTION 'El pago ya está conciliado';
    END IF;
    
    -- Validar reconciliation_id si se proporciona
    IF p_reconciliation_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.account_reconciliations
            WHERE id = p_reconciliation_id
            AND company_id = v_company_id
        ) THEN
            RAISE EXCEPTION 'ID de conciliación no válido';
        END IF;
    END IF;
    
    -- Establecer valores con tipos explícitos
    v_new_reconciliation_date := now();
    v_new_updated_at := now();
    
    -- Actualizar el pago usando variables con tipos explícitos
    UPDATE public.payments
    SET 
        status = v_new_status,
        is_reconciled = v_new_is_reconciled,
        reconciliation_date = v_new_reconciliation_date,
        reconciliation_id = p_reconciliation_id,
        updated_at = v_new_updated_at,
        updated_by = v_user_id
    WHERE id = p_payment_id;
    
    -- Retornar el pago actualizado
    RETURN json_build_object(
        'success', true,
        'message', 'Pago conciliado exitosamente'
    );
END;
$$;

