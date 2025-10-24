-- Corregir la función adjust_inventory para que no intente insertar warehouse_id en inventory_movements
-- La tabla inventory_movements no tiene la columna warehouse_id

-- Eliminar todas las versiones existentes de la función adjust_inventory
DROP FUNCTION IF EXISTS public.adjust_inventory(uuid, text, integer, text, text);
DROP FUNCTION IF EXISTS public.adjust_inventory(uuid, integer, text);
DROP FUNCTION IF EXISTS public.adjust_inventory(uuid, integer);

-- Crear la función adjust_inventory completamente corregida
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
    v_current_quantity integer := 0;
    v_difference integer;
    v_movement_id uuid;
    v_warehouse_id uuid;
    v_warehouse_quantity integer := 0;
    v_product_name text;
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
        RETURN json_build_object('success', false, 'error', 'Producto no encontrado o no pertenece a la compañía');
    END IF;

    -- Obtener el nombre del producto
    SELECT name INTO v_product_name FROM public.products WHERE id = p_product_id;

    -- Obtener la bodega principal de la compañía
    SELECT id INTO v_warehouse_id 
    FROM public.warehouses 
    WHERE company_id = v_company_id AND is_main = true
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No se encontró bodega principal para la compañía');
    END IF;

    -- Obtener cantidad actual en warehouse_inventory
    SELECT quantity INTO v_warehouse_quantity 
    FROM public.warehouse_inventory 
    WHERE product_id = p_product_id AND warehouse_id = v_warehouse_id;

    -- Si no existe registro, crear uno con cantidad 0
    IF v_warehouse_quantity IS NULL THEN
        INSERT INTO public.warehouse_inventory (
            warehouse_id, product_id, quantity, company_id, last_updated, updated_by
        ) VALUES (
            v_warehouse_id, p_product_id, 0, v_company_id, now(), auth.uid()
        );
        v_warehouse_quantity := 0;
    END IF;

    -- Calcular la diferencia
    v_difference := p_new_quantity - v_warehouse_quantity;

    -- Actualizar warehouse_inventory con la nueva cantidad
    UPDATE public.warehouse_inventory 
    SET 
        quantity = p_new_quantity,
        last_updated = now(),
        updated_by = auth.uid()
    WHERE product_id = p_product_id AND warehouse_id = v_warehouse_id;

    -- Crear movimiento de inventario (SIN warehouse_id porque la tabla no tiene esa columna)
    INSERT INTO public.inventory_movements (
        product_id, movement_type, quantity, 
        previous_quantity, new_quantity, reason, company_id, created_by
    ) VALUES (
        p_product_id, 'ADJUSTMENT', v_difference,
        v_warehouse_quantity, p_new_quantity, p_reason, v_company_id, auth.uid()
    ) RETURNING id INTO v_movement_id;

    -- Actualizar o crear registro en inventory (SIN ON CONFLICT porque no hay constraint único)
    -- Primero verificar si existe
    IF EXISTS (SELECT 1 FROM public.inventory WHERE product_id = p_product_id AND company_id = v_company_id) THEN
        -- Actualizar existente
        UPDATE public.inventory 
        SET 
            quantity = p_new_quantity,
            warehouse_id = v_warehouse_id,
            last_updated = now(),
            updated_by = auth.uid()
        WHERE product_id = p_product_id AND company_id = v_company_id;
    ELSE
        -- Crear nuevo
        INSERT INTO public.inventory (
            product_id, quantity, warehouse_id, company_id, last_updated, updated_by
        ) VALUES (
            p_product_id, p_new_quantity, v_warehouse_id, v_company_id, now(), auth.uid()
        );
    END IF;

    -- Retornar resultado exitoso
    RETURN json_build_object(
        'success', true,
        'message', 'Inventario ajustado exitosamente',
        'data', json_build_object(
            'product_id', p_product_id,
            'product_name', v_product_name,
            'warehouse_id', v_warehouse_id,
            'previous_quantity', v_warehouse_quantity,
            'new_quantity', p_new_quantity,
            'difference', v_difference,
            'movement_id', v_movement_id,
            'reason', p_reason
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        -- En caso de error, retornar información detallada
        RETURN json_build_object(
            'success', false,
            'error', 'Error interno: ' || SQLERRM,
            'details', json_build_object(
                'product_id', p_product_id,
                'new_quantity', p_new_quantity,
                'reason', p_reason,
                'error_code', SQLSTATE
            )
        );
END;
$$;
