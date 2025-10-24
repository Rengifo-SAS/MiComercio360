-- Migración final para corregir todos los problemas identificados
-- 1. Corregir transferencias definitivamente
-- 2. Limpiar políticas RLS duplicadas
-- 3. Implementar funciones de búsqueda robustas

-- Limpiar políticas RLS duplicadas y crear políticas consistentes
DROP POLICY IF EXISTS "Users can access inventory" ON public.inventory;

DROP POLICY IF EXISTS "Users can access categories" ON public.categories;

DROP POLICY IF EXISTS "Users can access suppliers" ON public.suppliers;

DROP POLICY IF EXISTS "Users can access products" ON public.products;

DROP POLICY IF EXISTS "Users can access sales" ON public.sales;

DROP POLICY IF EXISTS "Users can access customers" ON public.customers;

DROP POLICY IF EXISTS "Users can access shifts" ON public.shifts;

DROP POLICY IF EXISTS "Users can access purchases" ON public.purchases;

DROP POLICY IF EXISTS "Users can access settings" ON public.settings;

-- Crear políticas RLS consistentes basadas en company_id
CREATE POLICY "Users can access inventory in their company" ON public.inventory FOR ALL USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

CREATE POLICY "Users can access categories in their company" ON public.categories FOR ALL USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

CREATE POLICY "Users can access suppliers in their company" ON public.suppliers FOR ALL USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

CREATE POLICY "Users can access products in their company" ON public.products FOR ALL USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

CREATE POLICY "Users can access sales in their company" ON public.sales FOR ALL USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

CREATE POLICY "Users can access customers in their company" ON public.customers FOR ALL USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

CREATE POLICY "Users can access shifts in their company" ON public.shifts FOR ALL USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

CREATE POLICY "Users can access purchases in their company" ON public.purchases FOR ALL USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

CREATE POLICY "Users can access settings in their company" ON public.settings FOR ALL USING (
    company_id IN (
        SELECT profiles.company_id
        FROM profiles
        WHERE
            profiles.id = auth.uid ()
    )
);

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
    v_from_quantity integer := 0;
    v_to_quantity integer := 0;
    v_new_from_quantity integer := 0;
    v_new_to_quantity integer := 0;
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

-- Función para búsqueda de productos con filtros
CREATE OR REPLACE FUNCTION public.search_products(
    p_search_term text DEFAULT NULL,
    p_category_id uuid DEFAULT NULL,
    p_supplier_id uuid DEFAULT NULL,
    p_warehouse_id uuid DEFAULT NULL,
    p_stock_status text DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_products json;
    v_total_count integer;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Buscar productos con filtros
    SELECT json_agg(
        json_build_object(
            'id', p.id,
            'name', p.name,
            'sku', p.sku,
            'description', p.description,
            'cost_price', p.cost_price,
            'selling_price', p.selling_price,
            'min_stock', p.min_stock,
            'max_stock', p.max_stock,
            'unit', p.unit,
            'is_active', p.is_active,
            'category', CASE 
                WHEN c.id IS NOT NULL THEN json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'color', c.color
                )
                ELSE NULL
            END,
            'supplier', CASE 
                WHEN s.id IS NOT NULL THEN json_build_object(
                    'id', s.id,
                    'name', s.name
                )
                ELSE NULL
            END,
            'warehouse', CASE 
                WHEN w.id IS NOT NULL THEN json_build_object(
                    'id', w.id,
                    'name', w.name,
                    'code', w.code
                )
                ELSE NULL
            END,
            'quantity', COALESCE(wi.quantity, 0),
            'stock_status', CASE 
                WHEN COALESCE(wi.quantity, 0) = 0 THEN 'out_of_stock'
                WHEN COALESCE(wi.quantity, 0) <= p.min_stock THEN 'low_stock'
                ELSE 'in_stock'
            END
        )
    ) INTO v_products
    FROM public.products p
    LEFT JOIN public.categories c ON p.category_id = c.id
    LEFT JOIN public.suppliers s ON p.supplier_id = s.id
    LEFT JOIN public.warehouses w ON p.warehouse_id = w.id
    LEFT JOIN public.warehouse_inventory wi ON p.id = wi.product_id 
        AND wi.warehouse_id = COALESCE(p.warehouse_id, (SELECT id FROM public.warehouses WHERE company_id = v_company_id AND is_main = true LIMIT 1))
    WHERE p.company_id = v_company_id
    AND p.is_active = true
    AND (p_search_term IS NULL OR p.name ILIKE '%' || p_search_term || '%' OR p.sku ILIKE '%' || p_search_term || '%')
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    AND (p_warehouse_id IS NULL OR p.warehouse_id = p_warehouse_id OR wi.warehouse_id = p_warehouse_id)
    AND (p_stock_status IS NULL OR 
        CASE 
            WHEN p_stock_status = 'out_of_stock' THEN COALESCE(wi.quantity, 0) = 0
            WHEN p_stock_status = 'low_stock' THEN COALESCE(wi.quantity, 0) <= p.min_stock
            WHEN p_stock_status = 'in_stock' THEN COALESCE(wi.quantity, 0) > p.min_stock
            ELSE true
        END
    )
    ORDER BY p.name
    LIMIT p_limit OFFSET p_offset;

    -- Obtener total de registros
    SELECT COUNT(*) INTO v_total_count
    FROM public.products p
    LEFT JOIN public.warehouse_inventory wi ON p.id = wi.product_id 
        AND wi.warehouse_id = COALESCE(p.warehouse_id, (SELECT id FROM public.warehouses WHERE company_id = v_company_id AND is_main = true LIMIT 1))
    WHERE p.company_id = v_company_id
    AND p.is_active = true
    AND (p_search_term IS NULL OR p.name ILIKE '%' || p_search_term || '%' OR p.sku ILIKE '%' || p_search_term || '%')
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    AND (p_warehouse_id IS NULL OR p.warehouse_id = p_warehouse_id OR wi.warehouse_id = p_warehouse_id)
    AND (p_stock_status IS NULL OR 
        CASE 
            WHEN p_stock_status = 'out_of_stock' THEN COALESCE(wi.quantity, 0) = 0
            WHEN p_stock_status = 'low_stock' THEN COALESCE(wi.quantity, 0) <= p.min_stock
            WHEN p_stock_status = 'in_stock' THEN COALESCE(wi.quantity, 0) > p.min_stock
            ELSE true
        END
    );

    RETURN json_build_object(
        'success', true,
        'products', COALESCE(v_products, '[]'::json),
        'total_count', v_total_count,
        'limit', p_limit,
        'offset', p_offset
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;