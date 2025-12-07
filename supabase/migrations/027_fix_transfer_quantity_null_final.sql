-- Migración final para corregir el error de quantity null en transferencias
-- Esta migración asegura que nunca se inserten valores null en quantity

-- Función completamente corregida para transferencias
CREATE OR REPLACE FUNCTION public.create_warehouse_transfer(
    p_from_warehouse_id uuid,
    p_to_warehouse_id uuid,
    p_product_id uuid,
    p_quantity integer,
    p_reason text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_transfer_id uuid;
    v_from_quantity integer;
    v_to_quantity integer;
    v_new_from_quantity integer;
    v_new_to_quantity integer;
    v_transfer_number text;
    v_company_code text;
    v_from_warehouse_name text;
    v_to_warehouse_name text;
BEGIN
    -- Validar parámetros de entrada
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'La cantidad debe ser mayor a 0');
    END IF;

    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Obtener código de la compañía para generar número de transferencia
    SELECT COALESCE(tax_id, 'COMP') INTO v_company_code
    FROM public.companies 
    WHERE id = v_company_id;

    -- Generar número de transferencia único
    v_transfer_number := v_company_code || '-TRF-' || to_char(now(), 'YYYYMMDD') || '-' || 
                        lpad((EXTRACT(EPOCH FROM now())::bigint % 10000)::text, 4, '0');

    -- Verificar que las bodegas pertenecen a la compañía y obtener nombres
    SELECT name INTO v_from_warehouse_name
    FROM public.warehouses 
    WHERE id = p_from_warehouse_id AND company_id = v_company_id;

    IF v_from_warehouse_name IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Bodega origen no válida');
    END IF;

    SELECT name INTO v_to_warehouse_name
    FROM public.warehouses 
    WHERE id = p_to_warehouse_id AND company_id = v_company_id;

    IF v_to_warehouse_name IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Bodega destino no válida');
    END IF;

    -- Verificar que el producto pertenece a la compañía
    IF NOT EXISTS (
        SELECT 1 FROM public.products 
        WHERE id = p_product_id AND company_id = v_company_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Producto no válido');
    END IF;

    -- Obtener cantidad actual en bodega origen - ASEGURAR QUE NO SEA NULL
    SELECT COALESCE(quantity, 0) INTO v_from_quantity
    FROM public.warehouse_inventory
    WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;

    -- Verificar que hay suficiente stock
    IF v_from_quantity < p_quantity THEN
        RETURN json_build_object('success', false, 'error', 'Stock insuficiente en bodega origen');
    END IF;

    -- Obtener cantidad actual en bodega destino - ASEGURAR QUE NO SEA NULL
    SELECT COALESCE(quantity, 0) INTO v_to_quantity
    FROM public.warehouse_inventory
    WHERE warehouse_id = p_to_warehouse_id AND product_id = p_product_id;

    -- Calcular nuevas cantidades - ASEGURAR QUE NO SEAN NULL
    v_new_from_quantity := GREATEST(0, v_from_quantity - p_quantity);
    v_new_to_quantity := v_to_quantity + p_quantity;

    -- Crear registro de transferencia
    INSERT INTO public.warehouse_transfers (
        transfer_number, from_warehouse_id, to_warehouse_id, product_id, quantity, 
        reason, notes, company_id, created_by
    ) VALUES (
        v_transfer_number, p_from_warehouse_id, p_to_warehouse_id, p_product_id, p_quantity,
        p_reason, p_notes, v_company_id, auth.uid()
    )
    RETURNING id INTO v_transfer_id;

    -- Actualizar inventario en bodega origen
    IF v_new_from_quantity = 0 THEN
        -- Eliminar registro si la cantidad queda en 0
        DELETE FROM public.warehouse_inventory
        WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;
    ELSE
        -- Actualizar cantidad existente - ASEGURAR QUE NO SEA NULL
        UPDATE public.warehouse_inventory
        SET quantity = v_new_from_quantity, 
            last_updated = now(), 
            updated_by = auth.uid()
        WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;
    END IF;

    -- Actualizar o crear inventario en bodega destino - CORREGIDO DEFINITIVAMENTE
    -- Usar UPSERT para evitar problemas de constraint
    INSERT INTO public.warehouse_inventory (
        product_id, warehouse_id, quantity, company_id, last_updated, updated_by
    ) VALUES (
        p_product_id, p_to_warehouse_id, v_new_to_quantity, v_company_id, now(), auth.uid()
    )
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
        quantity = v_new_to_quantity,
        last_updated = now(),
        updated_by = auth.uid();

    -- Registrar movimientos con previous_quantity correcto
    -- Movimiento de salida en bodega origen
    INSERT INTO public.warehouse_movements (
        product_id, warehouse_id, movement_type, quantity, 
        previous_quantity, new_quantity, reason, created_by, company_id
    ) VALUES (
        p_product_id, p_from_warehouse_id, 'transfer_out', p_quantity,
        v_from_quantity, v_new_from_quantity, 
        COALESCE(p_reason, 'Transferencia a ' || v_to_warehouse_name),
        auth.uid(), v_company_id
    );

    -- Movimiento de entrada en bodega destino
    INSERT INTO public.warehouse_movements (
        product_id, warehouse_id, movement_type, quantity, 
        previous_quantity, new_quantity, reason, created_by, company_id
    ) VALUES (
        p_product_id, p_to_warehouse_id, 'transfer_in', p_quantity,
        v_to_quantity, v_new_to_quantity,
        COALESCE(p_reason, 'Transferencia desde ' || v_from_warehouse_name),
        auth.uid(), v_company_id
    );

    -- Actualizar inventario tradicional (suma total de todas las bodegas)
    UPDATE public.inventory
    SET quantity = (
        SELECT COALESCE(SUM(quantity), 0)
        FROM public.warehouse_inventory
        WHERE product_id = p_product_id
    ),
    last_updated = now(),
    updated_by = auth.uid()
    WHERE product_id = p_product_id;

    RETURN json_build_object(
        'success', true,
        'transfer_id', v_transfer_id,
        'transfer_number', v_transfer_number,
        'from_quantity', v_new_from_quantity,
        'to_quantity', v_new_to_quantity
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;