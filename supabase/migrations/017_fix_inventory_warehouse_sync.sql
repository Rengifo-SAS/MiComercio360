-- Corregir sincronización entre inventario tradicional y sistema de bodegas
-- Actualizar función create_product_with_inventory para crear warehouse_inventory
CREATE OR REPLACE FUNCTION public.create_product_with_inventory(
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
    p_initial_quantity integer DEFAULT 0,
    p_iva_rate numeric DEFAULT 19,
    p_ica_rate numeric DEFAULT 0,
    p_retencion_rate numeric DEFAULT 0,
    p_fiscal_classification text DEFAULT 'Bien',
    p_excise_tax boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_product_id uuid;
    v_inventory_id uuid;
    v_warehouse_inventory_id uuid;
    v_default_warehouse_id uuid;
BEGIN
    -- Get the company_id from the user's profile
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Si no se especifica bodega, usar la bodega principal
    IF p_warehouse_id IS NULL THEN
        SELECT id INTO v_default_warehouse_id 
        FROM public.warehouses 
        WHERE company_id = v_company_id AND is_main = true 
        LIMIT 1;
        
        IF v_default_warehouse_id IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'No se encontró bodega principal');
        END IF;
    ELSE
        v_default_warehouse_id := p_warehouse_id;
    END IF;

    -- Insert the new product
    INSERT INTO public.products (
        name, sku, description, category_id, supplier_id, warehouse_id,
        cost_price, selling_price, min_stock, max_stock,
        unit, image_url, company_id,
        iva_rate, ica_rate, retencion_rate, fiscal_classification, excise_tax
    ) VALUES (
        p_name, p_sku, p_description, p_category_id, p_supplier_id, v_default_warehouse_id,
        p_cost_price, p_selling_price, p_min_stock, p_max_stock,
        p_unit, p_image_url, v_company_id,
        p_iva_rate, p_ica_rate, p_retencion_rate, p_fiscal_classification, p_excise_tax
    )
    RETURNING id INTO v_product_id;

    -- Insert initial inventory record (sistema tradicional)
    INSERT INTO public.inventory (
        product_id, quantity, company_id, last_updated, updated_by
    ) VALUES (
        v_product_id, p_initial_quantity, v_company_id, now(), auth.uid()
    )
    RETURNING id INTO v_inventory_id;

    -- Insert warehouse inventory record (sistema de bodegas)
    INSERT INTO public.warehouse_inventory (
        product_id, warehouse_id, quantity, company_id, last_updated, updated_by
    ) VALUES (
        v_product_id, v_default_warehouse_id, p_initial_quantity, v_company_id, now(), auth.uid()
    )
    RETURNING id INTO v_warehouse_inventory_id;

    -- Record initial inventory movement if quantity > 0
    IF p_initial_quantity > 0 THEN
        -- Movimiento en sistema tradicional
        INSERT INTO public.inventory_movements (
            product_id, movement_type, quantity, previous_quantity, new_quantity, reason, created_by, company_id
        ) VALUES (
            v_product_id, 'in', p_initial_quantity, 0, p_initial_quantity, 'Stock inicial', auth.uid(), v_company_id
        );

        -- Movimiento en sistema de bodegas
        INSERT INTO public.warehouse_movements (
            product_id, warehouse_id, movement_type, quantity, previous_quantity, new_quantity, reason, created_by, company_id
        ) VALUES (
            v_product_id, v_default_warehouse_id, 'in', p_initial_quantity, 0, p_initial_quantity, 'Stock inicial', auth.uid(), v_company_id
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'product_id', v_product_id,
        'inventory_id', v_inventory_id,
        'warehouse_inventory_id', v_warehouse_inventory_id
    );
END;
$$;

-- Crear función para sincronizar inventario existente con bodegas
CREATE OR REPLACE FUNCTION public.sync_inventory_with_warehouses()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_warehouse_id uuid;
    v_synced_count integer := 0;
    rec RECORD;
BEGIN
    -- Get the company_id from the user's profile
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Get the main warehouse for this company
    SELECT id INTO v_warehouse_id 
    FROM public.warehouses 
    WHERE company_id = v_company_id AND is_main = true 
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No se encontró bodega principal');
    END IF;

    -- Sync existing inventory with warehouse_inventory
    FOR rec IN 
        SELECT i.product_id, i.quantity, p.warehouse_id
        FROM public.inventory i
        JOIN public.products p ON i.product_id = p.id
        WHERE i.company_id = v_company_id
        AND NOT EXISTS (
            SELECT 1 FROM public.warehouse_inventory wi 
            WHERE wi.product_id = i.product_id 
            AND wi.warehouse_id = COALESCE(p.warehouse_id, v_warehouse_id)
        )
    LOOP
        -- Insert warehouse inventory record
        INSERT INTO public.warehouse_inventory (
            product_id, warehouse_id, quantity, company_id, last_updated, updated_by
        ) VALUES (
            rec.product_id, 
            COALESCE(rec.warehouse_id, v_warehouse_id), 
            rec.quantity, 
            v_company_id, 
            now(), 
            auth.uid()
        );
        
        v_synced_count := v_synced_count + 1;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'synced_count', v_synced_count,
        'message', 'Inventario sincronizado con bodegas'
    );
END;
$$;