-- Corregir problemas de actualización de productos y transferencias
-- 1. Asegurar que update_product tenga todos los parámetros necesarios
-- 2. Corregir el cálculo de previous_quantity en warehouse_movements
-- 3. Refactorizar las funciones de transferencia

-- Actualizar función update_product para manejar correctamente warehouse_id
CREATE OR REPLACE FUNCTION public.update_product(
    p_product_id uuid,
    p_name text,
    p_sku text,
    p_description text DEFAULT NULL,
    p_category_id uuid DEFAULT NULL,
    p_supplier_id uuid DEFAULT NULL,
    p_warehouse_id uuid DEFAULT NULL,
    p_cost_price numeric DEFAULT 0,
    p_selling_price numeric DEFAULT 0,
    p_min_stock integer DEFAULT 0,
    p_max_stock integer DEFAULT NULL,
    p_unit text DEFAULT 'pcs',
    p_image_url text DEFAULT NULL,
    p_is_active boolean DEFAULT TRUE,
    p_iva_rate numeric DEFAULT NULL,
    p_ica_rate numeric DEFAULT NULL,
    p_retencion_rate numeric DEFAULT NULL,
    p_fiscal_classification text DEFAULT NULL,
    p_excise_tax boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_product_company_id uuid;
    v_old_warehouse_id uuid;
    v_new_warehouse_id uuid;
    v_current_quantity integer;
    v_warehouse_quantity integer;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Verificar que el producto pertenece a la compañía del usuario
    SELECT company_id, warehouse_id INTO v_product_company_id, v_old_warehouse_id
    FROM public.products
    WHERE id = p_product_id;

    IF v_product_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Producto no encontrado');
    END IF;

    IF v_product_company_id != v_company_id THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permisos para actualizar este producto');
    END IF;

    -- Obtener nueva bodega
    v_new_warehouse_id := COALESCE(p_warehouse_id, v_old_warehouse_id);

    -- Actualizar el producto
    UPDATE public.products
    SET
        name = p_name,
        sku = p_sku,
        description = p_description,
        category_id = p_category_id,
        supplier_id = p_supplier_id,
        warehouse_id = v_new_warehouse_id,
        cost_price = p_cost_price,
        selling_price = p_selling_price,
        min_stock = p_min_stock,
        max_stock = p_max_stock,
        unit = p_unit,
        image_url = p_image_url,
        is_active = p_is_active,
        iva_rate = COALESCE(p_iva_rate, iva_rate),
        ica_rate = COALESCE(p_ica_rate, ica_rate),
        retencion_rate = COALESCE(p_retencion_rate, retencion_rate),
        fiscal_classification = COALESCE(p_fiscal_classification, fiscal_classification),
        excise_tax = COALESCE(p_excise_tax, excise_tax),
        updated_at = now()
    WHERE id = p_product_id;

    -- Si cambió la bodega, mover el inventario
    IF v_old_warehouse_id IS DISTINCT FROM v_new_warehouse_id THEN
        -- Obtener cantidad actual en inventario tradicional
        SELECT COALESCE(quantity, 0) INTO v_current_quantity
        FROM public.inventory
        WHERE product_id = p_product_id;

        -- Si hay cantidad en inventario, moverla entre bodegas
        IF v_current_quantity > 0 THEN
            -- Obtener cantidad actual en bodega origen
            SELECT COALESCE(quantity, 0) INTO v_warehouse_quantity
            FROM public.warehouse_inventory
            WHERE product_id = p_product_id AND warehouse_id = v_old_warehouse_id;

            -- Si hay cantidad en la bodega origen, moverla
            IF v_warehouse_quantity > 0 THEN
                -- Eliminar de bodega origen
                DELETE FROM public.warehouse_inventory
                WHERE product_id = p_product_id AND warehouse_id = v_old_warehouse_id;

                -- Agregar a bodega destino
                INSERT INTO public.warehouse_inventory (
                    product_id, warehouse_id, quantity, company_id, last_updated, updated_by
                ) VALUES (
                    p_product_id, v_new_warehouse_id, v_warehouse_quantity, v_company_id, now(), auth.uid()
                )
                ON CONFLICT (product_id, warehouse_id)
                DO UPDATE SET
                    quantity = v_warehouse_quantity,
                    last_updated = now(),
                    updated_by = auth.uid();

                -- Registrar movimientos
                -- Salida de bodega origen
                INSERT INTO public.warehouse_movements (
                    product_id, warehouse_id, movement_type, quantity, 
                    previous_quantity, new_quantity, reason, created_by, company_id
                ) VALUES (
                    p_product_id, v_old_warehouse_id, 'transfer_out', v_warehouse_quantity,
                    v_warehouse_quantity, 0, 
                    'Cambio de bodega a ' || (SELECT name FROM public.warehouses WHERE id = v_new_warehouse_id),
                    auth.uid(), v_company_id
                );

                -- Entrada a bodega destino
                INSERT INTO public.warehouse_movements (
                    product_id, warehouse_id, movement_type, quantity, 
                    previous_quantity, new_quantity, reason, created_by, company_id
                ) VALUES (
                    p_product_id, v_new_warehouse_id, 'transfer_in', v_warehouse_quantity,
                    0, v_warehouse_quantity,
                    'Cambio de bodega desde ' || (SELECT name FROM public.warehouses WHERE id = v_old_warehouse_id),
                    auth.uid(), v_company_id
                );
            END IF;
        END IF;
    END IF;

    RETURN json_build_object('success', true, 'product_id', p_product_id);
END;
$$;

-- Función completamente refactorizada para transferencias entre bodegas
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

-- Actualizar función adjust_inventory para manejar correctamente previous_quantity
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
    v_warehouse_quantity integer;
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

    -- Obtener cantidad actual en inventario tradicional
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
        -- Obtener cantidad actual en warehouse_inventory
        SELECT COALESCE(quantity, 0) INTO v_warehouse_quantity
        FROM public.warehouse_inventory
        WHERE product_id = p_product_id AND warehouse_id = v_warehouse_id;

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
                p_product_id, v_warehouse_id, p_new_quantity, v_company_id, now(), auth.uid()
            )
            ON CONFLICT (product_id, warehouse_id)
            DO UPDATE SET
                quantity = p_new_quantity,
                last_updated = now(),
                updated_by = auth.uid();
        END IF;

        -- Registrar movimiento en warehouse_movements con previous_quantity correcto
        INSERT INTO public.warehouse_movements (
            product_id, warehouse_id, movement_type, quantity, 
            previous_quantity, new_quantity, reason, created_by, company_id
        ) VALUES (
            p_product_id, v_warehouse_id, 
            CASE WHEN v_difference > 0 THEN 'in' ELSE 'out' END,
            ABS(v_difference),
            v_warehouse_quantity, p_new_quantity,
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