-- Migración para sincronizar productos con warehouse_inventory
-- Esto asegura que todos los productos activos tengan inventario

-- Función para sincronizar inventario de productos
CREATE OR REPLACE FUNCTION public.sync_products_with_warehouse_inventory()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_processed_count integer := 0;
    v_product_record record;
    v_main_warehouse_id uuid;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Obtener bodega principal
    SELECT id INTO v_main_warehouse_id
    FROM public.warehouses
    WHERE company_id = v_company_id AND is_main = true
    LIMIT 1;

    IF v_main_warehouse_id IS NULL THEN
        -- Si no hay bodega principal, crear una
        INSERT INTO public.warehouses (name, code, is_main, company_id, created_by)
        VALUES ('Bodega Principal', 'MAIN', true, v_company_id, auth.uid())
        RETURNING id INTO v_main_warehouse_id;
    END IF;

    -- Procesar todos los productos activos que no tienen inventario en warehouse_inventory
    FOR v_product_record IN
        SELECT p.id, p.name, p.sku, COALESCE(i.quantity, 0) as current_quantity
        FROM public.products p
        LEFT JOIN public.inventory i ON p.id = i.product_id
        LEFT JOIN public.warehouse_inventory wi ON p.id = wi.product_id AND wi.warehouse_id = COALESCE(p.warehouse_id, v_main_warehouse_id)
        WHERE p.company_id = v_company_id
        AND p.is_active = true
        AND wi.id IS NULL
    LOOP
        -- Crear registro en warehouse_inventory
        INSERT INTO public.warehouse_inventory (
            product_id, 
            warehouse_id, 
            quantity, 
            company_id, 
            last_updated, 
            updated_by
        ) VALUES (
            v_product_record.id,
            COALESCE((SELECT warehouse_id FROM public.products WHERE id = v_product_record.id), v_main_warehouse_id),
            v_product_record.current_quantity,
            v_company_id,
            now(),
            auth.uid()
        )
        ON CONFLICT (product_id, warehouse_id) DO NOTHING;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'message', 'Sincronización completada'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Función mejorada para obtener inventario que incluye todos los productos
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
    v_query text;
    v_main_warehouse_id uuid;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Obtener bodega principal
    SELECT id INTO v_main_warehouse_id
    FROM public.warehouses
    WHERE company_id = v_company_id AND is_main = true
    LIMIT 1;

    -- Validar y mapear campo de ordenamiento
    v_sort_field := CASE p_sort_by
        WHEN 'name' THEN 'p.name'
        WHEN 'sku' THEN 'p.sku'
        WHEN 'quantity' THEN 'COALESCE(wi.quantity, 0)'
        WHEN 'cost_price' THEN 'p.cost_price'
        WHEN 'selling_price' THEN 'p.selling_price'
        WHEN 'last_updated' THEN 'COALESCE(wi.last_updated, p.created_at)'
        ELSE 'p.name'
    END;

    v_sort_direction := CASE WHEN p_sort_order = 'desc' THEN 'DESC' ELSE 'ASC' END;

    -- Construir consulta dinámica que incluye TODOS los productos activos
    v_query := format('
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
                    ELSE json_build_object(
                        ''id'', %L,
                        ''name'', ''Bodega Principal'',
                        ''code'', ''MAIN''
                    )
                END,
                ''cost_price'', p.cost_price,
                ''selling_price'', p.selling_price,
                ''min_stock'', p.min_stock,
                ''max_stock'', p.max_stock,
                ''unit'', p.unit,
                ''image_url'', p.image_url,
                ''is_active'', p.is_active,
                ''quantity'', COALESCE(wi.quantity, 0),
                ''last_updated'', COALESCE(wi.last_updated, p.created_at),
                ''stock_status'', CASE 
                    WHEN COALESCE(wi.quantity, 0) = 0 THEN ''out_of_stock''
                    WHEN COALESCE(wi.quantity, 0) <= p.min_stock THEN ''low_stock''
                    ELSE ''in_stock''
                END
            )
        )
        FROM public.products p
        LEFT JOIN public.warehouse_inventory wi ON p.id = wi.product_id 
            AND wi.warehouse_id = COALESCE(p.warehouse_id, %L)
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
        v_main_warehouse_id, v_main_warehouse_id, v_company_id, p_search, p_search, p_search, p_warehouse_id, p_warehouse_id, p_warehouse_id,
        p_category_id, p_category_id, p_supplier_id, p_supplier_id, p_stock_status, p_stock_status, p_stock_status, p_stock_status,
        v_sort_field, v_sort_direction, p_limit, p_offset
    );

    -- Ejecutar consulta
    EXECUTE v_query INTO v_inventory;

    -- Obtener total de registros
    v_query := format('
        SELECT COUNT(*)
        FROM public.products p
        LEFT JOIN public.warehouse_inventory wi ON p.id = wi.product_id 
            AND wi.warehouse_id = COALESCE(p.warehouse_id, %L)
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
        v_main_warehouse_id, v_company_id, p_search, p_search, p_search, p_warehouse_id, p_warehouse_id, p_warehouse_id,
        p_category_id, p_category_id, p_supplier_id, p_supplier_id, p_stock_status, p_stock_status, p_stock_status, p_stock_status
    );

    EXECUTE v_query INTO v_total_count;

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