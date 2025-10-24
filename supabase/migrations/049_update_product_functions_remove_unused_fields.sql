-- Actualizar funciones de productos para remover campos no utilizados
-- 049_update_product_functions_remove_unused_fields.sql

-- Actualizar función create_product_with_inventory para remover campos no utilizados
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
    p_fiscal_classification text DEFAULT 'Bien',
    p_tax_id uuid DEFAULT NULL,
    p_cost_center_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_product_id uuid;
    v_inventory_id uuid;
BEGIN
    -- Get the company_id from the user's profile
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Insert the new product
    INSERT INTO public.products (
        name, sku, description, category_id, supplier_id, warehouse_id,
        cost_price, selling_price, min_stock, max_stock,
        unit, image_url, company_id,
        fiscal_classification, tax_id, cost_center_id
    ) VALUES (
        p_name, p_sku, p_description, p_category_id, p_supplier_id, p_warehouse_id,
        p_cost_price, p_selling_price, p_min_stock, p_max_stock,
        p_unit, p_image_url, v_company_id,
        p_fiscal_classification, p_tax_id, p_cost_center_id
    )
    RETURNING id INTO v_product_id;

    -- Insert initial inventory record
    INSERT INTO public.inventory (
        product_id, quantity, company_id, last_updated, updated_by
    ) VALUES (
        v_product_id, p_initial_quantity, v_company_id, now(), auth.uid()
    )
    RETURNING id INTO v_inventory_id;

    -- Record initial inventory movement if quantity > 0
    IF p_initial_quantity > 0 THEN
        INSERT INTO public.inventory_movements (
            product_id, movement_type, quantity, previous_quantity, new_quantity, reason, created_by, company_id
        ) VALUES (
            v_product_id, 'in', p_initial_quantity, 0, p_initial_quantity, 'Stock inicial', auth.uid(), v_company_id
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'product_id', v_product_id,
        'inventory_id', v_inventory_id
    );
END;
$$;

-- Actualizar función update_product para remover campos no utilizados
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
    p_fiscal_classification text DEFAULT NULL,
    p_tax_id uuid DEFAULT NULL,
    p_cost_center_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_product_company_id uuid;
BEGIN
    -- Get the company_id from the user's profile
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Verificar que el producto pertenece a la compañía del usuario
    SELECT company_id INTO v_product_company_id
    FROM public.products
    WHERE id = p_product_id;

    IF v_product_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Producto no encontrado');
    END IF;

    IF v_product_company_id != v_company_id THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permisos para actualizar este producto');
    END IF;

    -- Update the product
    UPDATE public.products
    SET
        name = p_name,
        sku = p_sku,
        description = p_description,
        category_id = p_category_id,
        supplier_id = p_supplier_id,
        warehouse_id = p_warehouse_id,
        cost_price = p_cost_price,
        selling_price = p_selling_price,
        min_stock = p_min_stock,
        max_stock = p_max_stock,
        unit = p_unit,
        image_url = p_image_url,
        is_active = p_is_active,
        fiscal_classification = COALESCE(p_fiscal_classification, fiscal_classification),
        tax_id = p_tax_id,
        cost_center_id = p_cost_center_id,
        updated_at = now()
    WHERE id = p_product_id;

    RETURN json_build_object('success', true, 'product_id', p_product_id);
END;
$$;