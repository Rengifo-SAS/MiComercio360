-- Corregir el procesamiento de facturas recurrentes
-- 131_fix_recurring_invoices_processing.sql

-- Actualizar función para procesar facturas con next_generation_date <= fecha de procesamiento
-- Esto permite procesar facturas que se perdieron o se ejecutaron tarde
CREATE OR REPLACE FUNCTION public.process_due_recurring_invoices(
    p_process_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_process_date date;
    v_recurring_invoice record;
    v_sale_id uuid;
    v_processed_count integer := 0;
    v_failed_count integer := 0;
    v_errors jsonb := '[]'::jsonb;
    v_result jsonb;
    v_actual_generation_date date;
BEGIN
    v_process_date := COALESCE(p_process_date, CURRENT_DATE);
    
    -- Buscar todas las facturas recurrentes que deben procesarse
    -- Procesar facturas donde next_generation_date <= fecha de procesamiento
    -- Esto permite procesar facturas que se perdieron o se ejecutaron tarde
    FOR v_recurring_invoice IN
        SELECT *
        FROM public.recurring_invoices
        WHERE is_active = true
          AND next_generation_date IS NOT NULL
          AND next_generation_date <= v_process_date
          AND (end_date IS NULL OR end_date >= v_process_date)
          AND start_date <= v_process_date
    LOOP
        BEGIN
            -- Usar la fecha de próxima generación como fecha de generación real
            -- Esto asegura que la factura se genere con la fecha correcta
            v_actual_generation_date := LEAST(v_recurring_invoice.next_generation_date, v_process_date);
            
            -- Intentar generar la factura
            SELECT public.generate_sale_from_recurring_invoice(
                v_recurring_invoice.id,
                v_actual_generation_date
            ) INTO v_sale_id;
            
            v_processed_count := v_processed_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                v_failed_count := v_failed_count + 1;
                v_errors := v_errors || jsonb_build_object(
                    'recurring_invoice_id', v_recurring_invoice.id,
                    'recurring_invoice_number', v_recurring_invoice.id::text,
                    'next_generation_date', v_recurring_invoice.next_generation_date,
                    'error', SQLERRM
                );
        END;
    END LOOP;
    
    -- Construir resultado
    v_result := jsonb_build_object(
        'date', v_process_date,
        'processed_count', v_processed_count,
        'failed_count', v_failed_count,
        'errors', v_errors
    );
    
    RETURN v_result;
END;
$$;

-- Actualizar función para procesar pagos recurrentes con la misma lógica
CREATE OR REPLACE FUNCTION public.process_due_recurring_payments(
    p_process_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_process_date date;
    v_recurring_payment record;
    v_payment_id uuid;
    v_processed_count integer := 0;
    v_failed_count integer := 0;
    v_errors jsonb := '[]'::jsonb;
    v_result jsonb;
    v_actual_generation_date date;
BEGIN
    v_process_date := COALESCE(p_process_date, CURRENT_DATE);
    
    -- Buscar todos los pagos recurrentes que deben procesarse
    -- Procesar pagos donde next_generation_date <= fecha de procesamiento
    FOR v_recurring_payment IN
        SELECT *
        FROM public.recurring_payments
        WHERE is_active = true
          AND next_generation_date IS NOT NULL
          AND next_generation_date <= v_process_date
          AND (end_date IS NULL OR end_date >= v_process_date)
          AND start_date <= v_process_date
    LOOP
        BEGIN
            -- Usar la fecha de próxima generación como fecha de generación real
            v_actual_generation_date := LEAST(v_recurring_payment.next_generation_date, v_process_date);
            
            -- Intentar generar el pago
            SELECT public.generate_payment_from_recurring_cron(
                v_recurring_payment.id,
                v_actual_generation_date
            ) INTO v_payment_id;
            
            v_processed_count := v_processed_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                v_failed_count := v_failed_count + 1;
                v_errors := v_errors || jsonb_build_object(
                    'recurring_payment_id', v_recurring_payment.id,
                    'recurring_payment_number', v_recurring_payment.id::text,
                    'next_generation_date', v_recurring_payment.next_generation_date,
                    'error', SQLERRM
                );
        END;
    END LOOP;
    
    -- Construir resultado
    v_result := jsonb_build_object(
        'date', v_process_date,
        'processed_count', v_processed_count,
        'failed_count', v_failed_count,
        'errors', v_errors
    );
    
    RETURN v_result;
END;
$$;

-- Actualizar función generate_sale_from_recurring_invoice para incluir numeration_id
CREATE OR REPLACE FUNCTION public.generate_sale_from_recurring_invoice(
    p_recurring_invoice_id uuid,
    p_generation_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_recurring_invoice record;
    v_sale_id uuid;
    v_sale_number text;
    v_generation_date date;
    v_item record;
    v_user_id uuid;
    v_company_id uuid;
    v_numeration record;
    v_customer record;
    v_warehouse_id uuid;
    v_subtotal numeric(15,2) := 0;
    v_tax_amount numeric(15,2) := 0;
    v_discount_amount numeric(15,2) := 0;
    v_total_amount numeric(15,2) := 0;
BEGIN
    -- Usar un usuario del sistema o NULL (el sistema manejará esto)
    v_user_id := NULL; -- Para cron jobs, no hay usuario autenticado
    
    -- Obtener información de la factura recurrente
    SELECT * INTO v_recurring_invoice
    FROM public.recurring_invoices
    WHERE id = p_recurring_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Factura recurrente no encontrada';
    END IF;
    
    IF v_recurring_invoice.is_active = false THEN
        RAISE EXCEPTION 'La factura recurrente no está activa';
    END IF;
    
    v_company_id := v_recurring_invoice.company_id;
    v_generation_date := COALESCE(p_generation_date, CURRENT_DATE);
    
    -- Verificar que el cliente existe
    SELECT * INTO v_customer
    FROM public.customers
    WHERE id = v_recurring_invoice.customer_id
      AND company_id = v_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente no encontrado';
    END IF;
    
    -- Obtener numeración si existe
    IF v_recurring_invoice.numeration_id IS NOT NULL THEN
        SELECT * INTO v_numeration
        FROM public.numerations
        WHERE id = v_recurring_invoice.numeration_id;
        
        IF FOUND THEN
            -- Generar número usando la función RPC
            SELECT public.get_next_number(
                v_company_id,
                'invoice',
                v_numeration.name
            ) INTO v_sale_number;
        END IF;
    END IF;
    
    -- Si no hay número generado, crear uno básico
    IF v_sale_number IS NULL OR v_sale_number = '' THEN
        v_sale_number := 'FAC-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substr(v_recurring_invoice.id::text, 1, 8);
    END IF;
    
    -- Calcular totales desde los items
    SELECT 
        COALESCE(SUM(total_price), 0),
        COALESCE(SUM(discount_amount), 0),
        0 -- tax_amount se calculará después si es necesario
    INTO v_subtotal, v_discount_amount, v_tax_amount
    FROM public.recurring_invoice_items
    WHERE recurring_invoice_id = p_recurring_invoice_id;
    
    v_total_amount := v_subtotal - v_discount_amount + v_tax_amount;
    
    -- Crear la venta
    INSERT INTO public.sales (
        company_id,
        customer_id,
        numeration_id,
        sale_number,
        subtotal,
        tax_amount,
        discount_amount,
        total_amount,
        payment_method,
        payment_status,
        status,
        notes,
        created_at,
        updated_at,
        cashier_id
    )
    VALUES (
        v_company_id,
        v_recurring_invoice.customer_id,
        v_recurring_invoice.numeration_id,
        v_sale_number,
        v_subtotal,
        v_tax_amount,
        v_discount_amount,
        v_total_amount,
        'transfer', -- Método de pago por defecto para facturas recurrentes
        'pending', -- Pendiente de pago (a crédito)
        'completed',
        v_recurring_invoice.notes,
        v_generation_date,
        now(),
        v_user_id
    )
    RETURNING id INTO v_sale_id;
    
    -- Crear los items de la venta
    FOR v_item IN 
        SELECT * FROM public.recurring_invoice_items
        WHERE recurring_invoice_id = p_recurring_invoice_id
        ORDER BY sort_order
    LOOP
        -- Verificar que el producto existe
        IF v_item.product_id IS NOT NULL THEN
            INSERT INTO public.sale_items (
                sale_id,
                product_id,
                quantity,
                unit_price,
                discount_amount,
                total_price
            )
            VALUES (
                v_sale_id,
                v_item.product_id,
                v_item.quantity,
                v_item.unit_price,
                v_item.discount_amount,
                v_item.total_price
            );
        END IF;
    END LOOP;
    
    -- Actualizar última fecha de generación y próxima fecha
    UPDATE public.recurring_invoices
    SET 
        last_generated_date = v_generation_date,
        next_generation_date = public.calculate_next_generation_date(
            start_date,
            end_date,
            day_of_month,
            frequency_months,
            v_generation_date
        ),
        updated_at = now()
    WHERE id = p_recurring_invoice_id;
    
    -- Registrar la generación
    INSERT INTO public.recurring_invoice_generations (
        recurring_invoice_id,
        sale_id,
        company_id,
        scheduled_date,
        generated_date,
        status,
        generated_by
    )
    VALUES (
        p_recurring_invoice_id,
        v_sale_id,
        v_company_id,
        v_generation_date,
        now(),
        'generated',
        v_user_id
    );
    
    RETURN v_sale_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Registrar error en la generación
        BEGIN
            INSERT INTO public.recurring_invoice_generations (
                recurring_invoice_id,
                sale_id,
                company_id,
                scheduled_date,
                generated_date,
                status,
                error_message,
                generated_by
            )
            VALUES (
                p_recurring_invoice_id,
                NULL,
                COALESCE(v_company_id, (SELECT company_id FROM public.recurring_invoices WHERE id = p_recurring_invoice_id)),
                COALESCE(v_generation_date, CURRENT_DATE),
                now(),
                'failed',
                SQLERRM,
                v_user_id
            );
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Ignorar errores al registrar el error
        END;
        RAISE;
END;
$$;

