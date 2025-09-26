-- Actualizar función adjust_inventory para sincronizar con warehouse_inventory
CREATE OR REPLACE FUNCTION public.adjust_inventory(
    p_product_id uuid,
    p_new_quantity integer,
    p_reason text DEFAULT 'Ajuste de inventario'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_current_quantity integer;
    v_difference integer;
    v_movement_id uuid;
    v_warehouse_id uuid;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Verificar que el producto pertenece a la compañía
    IF NOT EXISTS (
        SELECT 1 FROM public.products 
        WHERE id = p_product_id AND company_id = v_company_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Producto no encontrado');
    END IF;

    -- Obtener cantidad actual
    SELECT COALESCE(quantity, 0) INTO v_current_quantity
    FROM public.inventory
    WHERE product_id = p_product_id;

    -- Calcular diferencia
    v_difference := p_new_quantity - v_current_quantity;

    -- Actualizar inventario tradicional
    UPDATE public.inventory
    SET quantity = p_new_quantity,
        last_updated = now(),
        updated_by = auth.uid()
    WHERE product_id = p_product_id;

    -- Si no existe registro, crearlo
    IF NOT FOUND THEN
        INSERT INTO public.inventory (
            product_id, quantity, company_id, last_updated, updated_by
        ) VALUES (
            p_product_id, p_new_quantity, v_company_id, now(), auth.uid()
        );
    END IF;

    -- Registrar movimiento en inventory_movements
    INSERT INTO public.inventory_movements (
        product_id, movement_type, quantity, previous_quantity, new_quantity, reason, created_by, company_id
    ) VALUES (
        p_product_id, 
        CASE WHEN v_difference > 0 THEN 'in' ELSE 'out' END,
        ABS(v_difference), 
        v_current_quantity, 
        p_new_quantity, 
        p_reason, 
        auth.uid(), 
        v_company_id
    )
    RETURNING id INTO v_movement_id;

    -- Sincronizar con warehouse_inventory
    -- Obtener la bodega del producto o la bodega principal
    SELECT COALESCE(p.warehouse_id, w.id) INTO v_warehouse_id
    FROM public.products p
    LEFT JOIN public.warehouses w ON w.company_id = v_company_id AND w.is_main = true
    WHERE p.id = p_product_id;

    IF v_warehouse_id IS NOT NULL THEN
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

        -- Registrar movimiento en warehouse_movements
        INSERT INTO public.warehouse_movements (
            product_id, warehouse_id, movement_type, quantity, 
            previous_quantity, new_quantity, reason, created_by, company_id
        ) VALUES (
            p_product_id, v_warehouse_id, 
            CASE WHEN v_difference > 0 THEN 'in' ELSE 'out' END,
            ABS(v_difference),
            v_current_quantity, p_new_quantity,
            p_reason,
            auth.uid(), v_company_id
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'warehouse_id', v_warehouse_id,
        'previous_quantity', v_current_quantity,
        'new_quantity', p_new_quantity,
        'difference', v_difference
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;