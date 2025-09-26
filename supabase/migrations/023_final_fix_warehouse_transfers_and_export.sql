-- Migración final para corregir transferencias y agregar funcionalidades de exportación
-- 1. Corregir definitivamente el problema de quantity null
-- 2. Agregar funciones de búsqueda y filtros
-- 3. Preparar para generación de PDFs

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

    -- Actualizar o crear inventario en bodega destino - CORREGIDO
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

-- Función para obtener transferencias con filtros
CREATE OR REPLACE FUNCTION public.get_warehouse_transfers(
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0,
    p_warehouse_id uuid DEFAULT NULL,
    p_product_id uuid DEFAULT NULL,
    p_date_from date DEFAULT NULL,
    p_date_to date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_transfers json;
    v_total_count integer;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Obtener transferencias con filtros
    SELECT json_agg(
        json_build_object(
            'id', wt.id,
            'transfer_number', wt.transfer_number,
            'from_warehouse', json_build_object(
                'id', fw.id,
                'name', fw.name,
                'code', fw.code
            ),
            'to_warehouse', json_build_object(
                'id', tw.id,
                'name', tw.name,
                'code', tw.code
            ),
            'product', json_build_object(
                'id', p.id,
                'name', p.name,
                'sku', p.sku
            ),
            'quantity', wt.quantity,
            'reason', wt.reason,
            'notes', wt.notes,
            'status', wt.status,
            'created_at', wt.created_at,
            'created_by', json_build_object(
                'id', pr.id,
                'full_name', pr.full_name,
                'email', pr.email
            )
        )
    ) INTO v_transfers
    FROM (
        SELECT *
        FROM public.warehouse_transfers
        WHERE company_id = v_company_id
        AND (p_warehouse_id IS NULL OR from_warehouse_id = p_warehouse_id OR to_warehouse_id = p_warehouse_id)
        AND (p_product_id IS NULL OR product_id = p_product_id)
        AND (p_date_from IS NULL OR created_at::date >= p_date_from)
        AND (p_date_to IS NULL OR created_at::date <= p_date_to)
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
    ) wt
    LEFT JOIN public.warehouses fw ON wt.from_warehouse_id = fw.id
    LEFT JOIN public.warehouses tw ON wt.to_warehouse_id = tw.id
    LEFT JOIN public.products p ON wt.product_id = p.id
    LEFT JOIN public.profiles pr ON wt.created_by = pr.id;

    -- Obtener total de registros
    SELECT COUNT(*) INTO v_total_count
    FROM public.warehouse_transfers wt
    WHERE wt.company_id = v_company_id
    AND (p_warehouse_id IS NULL OR wt.from_warehouse_id = p_warehouse_id OR wt.to_warehouse_id = p_warehouse_id)
    AND (p_product_id IS NULL OR wt.product_id = p_product_id)
    AND (p_date_from IS NULL OR wt.created_at::date >= p_date_from)
    AND (p_date_to IS NULL OR wt.created_at::date <= p_date_to);

    RETURN json_build_object(
        'success', true,
        'transfers', COALESCE(v_transfers, '[]'::json),
        'total_count', v_total_count,
        'limit', p_limit,
        'offset', p_offset
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Función para obtener inventario con filtros avanzados
CREATE OR REPLACE FUNCTION public.get_inventory_with_filters(
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0,
    p_search text DEFAULT NULL,
    p_warehouse_id uuid DEFAULT NULL,
    p_category_id uuid DEFAULT NULL,
    p_supplier_id uuid DEFAULT NULL,
    p_stock_status text DEFAULT NULL,
    p_sort_by text DEFAULT 'name',
    p_sort_order text DEFAULT 'asc'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_inventory json;
    v_total_count integer;
    v_sort_field text;
    v_sort_direction text;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Validar y mapear campo de ordenamiento
    v_sort_field := CASE p_sort_by
        WHEN 'name' THEN 'p.name'
        WHEN 'sku' THEN 'p.sku'
        WHEN 'quantity' THEN 'COALESCE(wi.quantity, 0)'
        WHEN 'cost_price' THEN 'p.cost_price'
        WHEN 'selling_price' THEN 'p.selling_price'
        WHEN 'last_updated' THEN 'wi.last_updated'
        ELSE 'p.name'
    END;

    v_sort_direction := CASE WHEN p_sort_order = 'desc' THEN 'DESC' ELSE 'ASC' END;

    -- Obtener inventario con filtros
    EXECUTE format('
        SELECT json_agg(
            json_build_object(
                ''id'', p.id,
                ''name'', p.name,
                ''sku'', p.sku,
                ''description'', p.description,
                ''category'', CASE 
                    WHEN c.id IS NOT NULL THEN json_build_object(
                        ''id'', c.id,
                        ''name'', c.name,
                        ''color'', c.color
                    )
                    ELSE NULL
                END,
                ''supplier'', CASE 
                    WHEN s.id IS NOT NULL THEN json_build_object(
                        ''id'', s.id,
                        ''name'', s.name
                    )
                    ELSE NULL
                END,
                ''warehouse'', CASE 
                    WHEN w.id IS NOT NULL THEN json_build_object(
                        ''id'', w.id,
                        ''name'', w.name,
                        ''code'', w.code
                    )
                    ELSE NULL
                END,
                ''cost_price'', p.cost_price,
                ''selling_price'', p.selling_price,
                ''min_stock'', p.min_stock,
                ''max_stock'', p.max_stock,
                ''unit'', p.unit,
                ''image_url'', p.image_url,
                ''is_active'', p.is_active,
                ''quantity'', COALESCE(wi.quantity, 0),
                ''last_updated'', wi.last_updated,
                ''stock_status'', CASE 
                    WHEN COALESCE(wi.quantity, 0) = 0 THEN ''out_of_stock''
                    WHEN COALESCE(wi.quantity, 0) <= p.min_stock THEN ''low_stock''
                    ELSE ''in_stock''
                END
            )
        )
        FROM public.products p
        LEFT JOIN public.warehouse_inventory wi ON p.id = wi.product_id AND wi.warehouse_id = COALESCE(p.warehouse_id, (SELECT id FROM public.warehouses WHERE company_id = %L AND is_main = true LIMIT 1))
        LEFT JOIN public.categories c ON p.category_id = c.id
        LEFT JOIN public.suppliers s ON p.supplier_id = s.id
        LEFT JOIN public.warehouses w ON p.warehouse_id = w.id
        WHERE p.company_id = %L
        AND p.is_active = true
        AND (%L IS NULL OR p.name ILIKE ''%%'' || %L || ''%%'' OR p.sku ILIKE ''%%'' || %L || ''%%'')
        AND (%L IS NULL OR p.warehouse_id = %L OR wi.warehouse_id = %L)
        AND (%L IS NULL OR p.category_id = %L)
        AND (%L IS NULL OR p.supplier_id = %L)
        AND (%L IS NULL OR 
            CASE 
                WHEN %L = ''out_of_stock'' THEN COALESCE(wi.quantity, 0) = 0
                WHEN %L = ''low_stock'' THEN COALESCE(wi.quantity, 0) <= p.min_stock
                WHEN %L = ''in_stock'' THEN COALESCE(wi.quantity, 0) > p.min_stock
                ELSE true
            END
        )
        ORDER BY %s %s
        LIMIT %s OFFSET %s',
        v_company_id, v_company_id, p_search, p_search, p_search, p_warehouse_id, p_warehouse_id, p_warehouse_id,
        p_category_id, p_category_id, p_supplier_id, p_supplier_id, p_stock_status, p_stock_status, p_stock_status, p_stock_status,
        v_sort_field, v_sort_direction, p_limit, p_offset
    ) INTO v_inventory;

    -- Obtener total de registros
    EXECUTE format('
        SELECT COUNT(*)
        FROM public.products p
        LEFT JOIN public.warehouse_inventory wi ON p.id = wi.product_id AND wi.warehouse_id = COALESCE(p.warehouse_id, (SELECT id FROM public.warehouses WHERE company_id = %L AND is_main = true LIMIT 1))
        WHERE p.company_id = %L
        AND p.is_active = true
        AND (%L IS NULL OR p.name ILIKE ''%%'' || %L || ''%%'' OR p.sku ILIKE ''%%'' || %L || ''%%'')
        AND (%L IS NULL OR p.warehouse_id = %L OR wi.warehouse_id = %L)
        AND (%L IS NULL OR p.category_id = %L)
        AND (%L IS NULL OR p.supplier_id = %L)
        AND (%L IS NULL OR 
            CASE 
                WHEN %L = ''out_of_stock'' THEN COALESCE(wi.quantity, 0) = 0
                WHEN %L = ''low_stock'' THEN COALESCE(wi.quantity, 0) <= p.min_stock
                WHEN %L = ''in_stock'' THEN COALESCE(wi.quantity, 0) > p.min_stock
                ELSE true
            END
        )',
        v_company_id, v_company_id, p_search, p_search, p_search, p_warehouse_id, p_warehouse_id, p_warehouse_id,
        p_category_id, p_category_id, p_supplier_id, p_supplier_id, p_stock_status, p_stock_status, p_stock_status, p_stock_status
    ) INTO v_total_count;

    RETURN json_build_object(
        'success', true,
        'inventory', COALESCE(v_inventory, '[]'::json),
        'total_count', v_total_count,
        'limit', p_limit,
        'offset', p_offset
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;