-- Migración para sincronizar las tablas inventory y warehouse_inventory
-- El problema es que hay inventario en la tabla inventory pero no en warehouse_inventory

-- Función para sincronizar inventario desde la tabla inventory a warehouse_inventory
CREATE OR REPLACE FUNCTION public.sync_inventory_to_warehouse_inventory()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_processed_count integer := 0;
    v_inventory_record record;
    v_main_warehouse_id uuid;
    v_existing_warehouse_inventory record;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Obtener o crear bodega principal
    SELECT id INTO v_main_warehouse_id
    FROM public.warehouses
    WHERE company_id = v_company_id AND is_main = true
    LIMIT 1;

    IF v_main_warehouse_id IS NULL THEN
        -- Crear bodega principal si no existe
        INSERT INTO public.warehouses (name, code, is_main, company_id, created_by)
        VALUES ('Bodega Principal', 'MAIN', true, v_company_id, auth.uid())
        RETURNING id INTO v_main_warehouse_id;
    END IF;

    -- Procesar todos los registros de inventory que no tienen correspondencia en warehouse_inventory
    FOR v_inventory_record IN
        SELECT 
            i.product_id,
            i.quantity,
            p.warehouse_id as product_warehouse_id
        FROM public.inventory i
        JOIN public.products p ON i.product_id = p.id
        WHERE i.company_id = v_company_id
        AND i.quantity > 0
    LOOP
        -- Determinar bodega para el producto
        DECLARE
            v_target_warehouse_id uuid;
        BEGIN
            v_target_warehouse_id := COALESCE(v_inventory_record.product_warehouse_id, v_main_warehouse_id);
            
            -- Verificar si ya existe inventario para este producto en esta bodega
            SELECT * INTO v_existing_warehouse_inventory
            FROM public.warehouse_inventory
            WHERE product_id = v_inventory_record.product_id 
            AND warehouse_id = v_target_warehouse_id;
            
            IF v_existing_warehouse_inventory IS NULL THEN
                -- Crear registro en warehouse_inventory
                INSERT INTO public.warehouse_inventory (
                    product_id, 
                    warehouse_id, 
                    quantity, 
                    company_id, 
                    last_updated, 
                    updated_by
                ) VALUES (
                    v_inventory_record.product_id,
                    v_target_warehouse_id,
                    v_inventory_record.quantity,
                    v_company_id,
                    now(),
                    auth.uid()
                );
                
                v_processed_count := v_processed_count + 1;
            ELSE
                -- Actualizar cantidad si es diferente
                IF v_existing_warehouse_inventory.quantity != v_inventory_record.quantity THEN
                    UPDATE public.warehouse_inventory
                    SET quantity = v_inventory_record.quantity,
                        last_updated = now(),
                        updated_by = auth.uid()
                    WHERE product_id = v_inventory_record.product_id 
                    AND warehouse_id = v_target_warehouse_id;
                    
                    v_processed_count := v_processed_count + 1;
                END IF;
            END IF;
        END;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'message', 'Sincronización de inventario completada'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Función mejorada para transferencias que maneja mejor la sincronización
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
    v_existing_from_record record;
    v_existing_to_record record;
    v_product_name text;
    v_main_warehouse_id uuid;
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

    -- Obtener nombre del producto para logs
    SELECT name INTO v_product_name FROM public.products WHERE id = p_product_id;

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

    -- Obtener bodega principal
    SELECT id INTO v_main_warehouse_id
    FROM public.warehouses
    WHERE company_id = v_company_id AND is_main = true
    LIMIT 1;

    -- Obtener registros existentes en ambas bodegas
    SELECT * INTO v_existing_from_record
    FROM public.warehouse_inventory
    WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;

    SELECT * INTO v_existing_to_record
    FROM public.warehouse_inventory
    WHERE warehouse_id = p_to_warehouse_id AND product_id = p_product_id;

    -- Si no existe inventario en warehouse_inventory pero sí en inventory, sincronizar
    IF v_existing_from_record IS NULL THEN
        -- Verificar si existe en inventory
        DECLARE
            v_inventory_quantity integer;
        BEGIN
            SELECT quantity INTO v_inventory_quantity
            FROM public.inventory
            WHERE product_id = p_product_id AND company_id = v_company_id;
            
            IF v_inventory_quantity IS NOT NULL AND v_inventory_quantity > 0 THEN
                -- Crear registro en warehouse_inventory con la cantidad de inventory
                INSERT INTO public.warehouse_inventory (
                    product_id, 
                    warehouse_id, 
                    quantity, 
                    company_id, 
                    last_updated, 
                    updated_by
                ) VALUES (
                    p_product_id, 
                    p_from_warehouse_id, 
                    v_inventory_quantity, 
                    v_company_id, 
                    now(), 
                    auth.uid()
                );
                
                -- Actualizar el registro para la siguiente consulta
                SELECT * INTO v_existing_from_record
                FROM public.warehouse_inventory
                WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;
            END IF;
        END;
    END IF;

    -- Obtener cantidades actuales - ASEGURAR QUE NO SEAN NULL
    v_from_quantity := COALESCE(v_existing_from_record.quantity, 0);
    v_to_quantity := COALESCE(v_existing_to_record.quantity, 0);

    -- Verificar que hay suficiente stock en bodega origen
    IF v_from_quantity < p_quantity THEN
        RETURN json_build_object('success', false, 'error', 
            'Stock insuficiente en bodega origen. Disponible: ' || v_from_quantity || ', Solicitado: ' || p_quantity);
    END IF;

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

    -- Manejar inventario en bodega origen
    IF v_existing_from_record IS NOT NULL THEN
        -- Actualizar registro existente
        IF v_new_from_quantity = 0 THEN
            -- Eliminar registro si la cantidad queda en 0
            DELETE FROM public.warehouse_inventory
            WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;
        ELSE
            -- Actualizar cantidad existente
            UPDATE public.warehouse_inventory
            SET quantity = v_new_from_quantity, 
                last_updated = now(), 
                updated_by = auth.uid()
            WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;
        END IF;
    END IF;

    -- Manejar inventario en bodega destino
    IF v_existing_to_record IS NOT NULL THEN
        -- Actualizar registro existente
        UPDATE public.warehouse_inventory
        SET quantity = v_new_to_quantity,
            last_updated = now(),
            updated_by = auth.uid()
        WHERE warehouse_id = p_to_warehouse_id AND product_id = p_product_id;
    ELSE
        -- Crear nuevo registro - ASEGURAR QUE QUANTITY NO SEA NULL
        INSERT INTO public.warehouse_inventory (
            product_id, 
            warehouse_id, 
            quantity, 
            company_id, 
            last_updated, 
            updated_by
        ) VALUES (
            p_product_id, 
            p_to_warehouse_id, 
            v_new_to_quantity, 
            v_company_id, 
            now(), 
            auth.uid()
        );
    END IF;

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
        'to_quantity', v_new_to_quantity,
        'product_name', v_product_name,
        'from_warehouse', v_from_warehouse_name,
        'to_warehouse', v_to_warehouse_name
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Ejecutar la sincronización inmediatamente
SELECT public.sync_inventory_to_warehouse_inventory ();