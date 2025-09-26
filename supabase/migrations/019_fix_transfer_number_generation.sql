-- Corregir generación de transfer_number en warehouse_transfers
-- Actualizar función create_warehouse_transfer para generar transfer_number
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
BEGIN
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

    -- Verificar que las bodegas pertenecen a la compañía
    IF NOT EXISTS (
        SELECT 1 FROM public.warehouses 
        WHERE id = p_from_warehouse_id AND company_id = v_company_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Bodega origen no válida');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.warehouses 
        WHERE id = p_to_warehouse_id AND company_id = v_company_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Bodega destino no válida');
    END IF;

    -- Verificar que el producto pertenece a la compañía
    IF NOT EXISTS (
        SELECT 1 FROM public.products 
        WHERE id = p_product_id AND company_id = v_company_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Producto no válido');
    END IF;

    -- Obtener cantidad actual en bodega origen
    SELECT COALESCE(quantity, 0) INTO v_from_quantity
    FROM public.warehouse_inventory
    WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;

    -- Verificar que hay suficiente stock
    IF v_from_quantity < p_quantity THEN
        RETURN json_build_object('success', false, 'error', 'Stock insuficiente en bodega origen');
    END IF;

    -- Obtener cantidad actual en bodega destino
    SELECT COALESCE(quantity, 0) INTO v_to_quantity
    FROM public.warehouse_inventory
    WHERE warehouse_id = p_to_warehouse_id AND product_id = p_product_id;

    -- Calcular nuevas cantidades
    v_new_from_quantity := v_from_quantity - p_quantity;
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
        -- Actualizar cantidad
        UPDATE public.warehouse_inventory
        SET quantity = v_new_from_quantity, 
            last_updated = now(), 
            updated_by = auth.uid()
        WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;
    END IF;

    -- Actualizar o crear inventario en bodega destino
    INSERT INTO public.warehouse_inventory (
        product_id, warehouse_id, quantity, company_id, last_updated, updated_by
    ) VALUES (
        p_product_id, p_to_warehouse_id, COALESCE(v_new_to_quantity, 0), v_company_id, now(), auth.uid()
    )
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
        quantity = COALESCE(v_new_to_quantity, 0),
        last_updated = now(),
        updated_by = auth.uid();

    -- Registrar movimientos
    -- Movimiento de salida en bodega origen
    INSERT INTO public.warehouse_movements (
        product_id, warehouse_id, movement_type, quantity, 
        previous_quantity, new_quantity, reason, created_by, company_id
    ) VALUES (
        p_product_id, p_from_warehouse_id, 'out', p_quantity,
        v_from_quantity, v_new_from_quantity, 
        COALESCE(p_reason, 'Transferencia a ' || (SELECT name FROM public.warehouses WHERE id = p_to_warehouse_id)),
        auth.uid(), v_company_id
    );

    -- Movimiento de entrada en bodega destino
    INSERT INTO public.warehouse_movements (
        product_id, warehouse_id, movement_type, quantity, 
        previous_quantity, new_quantity, reason, created_by, company_id
    ) VALUES (
        p_product_id, p_to_warehouse_id, 'in', p_quantity,
        v_to_quantity, v_new_to_quantity,
        COALESCE(p_reason, 'Transferencia desde ' || (SELECT name FROM public.warehouses WHERE id = p_from_warehouse_id)),
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

-- Crear función para sincronizar ajustes de inventario con warehouse_inventory
CREATE OR REPLACE FUNCTION public.sync_inventory_adjustment_with_warehouses(
    p_product_id uuid,
    p_new_quantity integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_warehouse_id uuid;
    v_current_warehouse_quantity integer;
    v_difference integer;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Obtener la bodega principal o la bodega del producto
    SELECT COALESCE(p.warehouse_id, w.id) INTO v_warehouse_id
    FROM public.products p
    LEFT JOIN public.warehouses w ON w.company_id = v_company_id AND w.is_main = true
    WHERE p.id = p_product_id AND p.company_id = v_company_id;

    IF v_warehouse_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No se encontró bodega para el producto');
    END IF;

    -- Obtener cantidad actual en warehouse_inventory
    SELECT COALESCE(quantity, 0) INTO v_current_warehouse_quantity
    FROM public.warehouse_inventory
    WHERE product_id = p_product_id AND warehouse_id = v_warehouse_id;

    -- Calcular diferencia
    v_difference := p_new_quantity - v_current_warehouse_quantity;

    -- Actualizar warehouse_inventory
    IF p_new_quantity = 0 THEN
        -- Eliminar si la cantidad es 0
        DELETE FROM public.warehouse_inventory
        WHERE product_id = p_product_id AND warehouse_id = v_warehouse_id;
    ELSE
        -- Actualizar o crear registro
        INSERT INTO public.warehouse_inventory (
            product_id, warehouse_id, quantity, company_id, last_updated, updated_by
        ) VALUES (
            p_product_id, v_warehouse_id, COALESCE(p_new_quantity, 0), v_company_id, now(), auth.uid()
        )
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET
            quantity = COALESCE(p_new_quantity, 0),
            last_updated = now(),
            updated_by = auth.uid();
    END IF;

    -- Registrar movimiento en warehouse_movements si hay diferencia
    IF v_difference != 0 THEN
        INSERT INTO public.warehouse_movements (
            product_id, warehouse_id, movement_type, quantity, 
            previous_quantity, new_quantity, reason, created_by, company_id
        ) VALUES (
            p_product_id, v_warehouse_id, 
            CASE WHEN v_difference > 0 THEN 'in' ELSE 'out' END,
            ABS(v_difference),
            v_current_warehouse_quantity, p_new_quantity,
            'Ajuste de inventario',
            auth.uid(), v_company_id
        );
    END IF;

    RETURN json_build_object('success', true, 'warehouse_id', v_warehouse_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;