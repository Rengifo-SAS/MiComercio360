-- Migración para sincronizar warehouse_inventory y habilitar transferencias
-- Esto asegura que todos los productos tengan inventario en warehouse_inventory

-- Función para sincronizar warehouse_inventory con productos existentes
CREATE OR REPLACE FUNCTION public.sync_warehouse_inventory_for_transfers()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_processed_count integer := 0;
    v_product_record record;
    v_main_warehouse_id uuid;
    v_existing_inventory record;
BEGIN
    -- Obtener company_id del perfil del usuario autenticado
    -- Si no hay usuario autenticado, usar el primer company_id disponible
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();
    
    -- Si no hay usuario autenticado, usar el primer company_id disponible
    IF v_company_id IS NULL THEN
        SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    END IF;

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No hay compañías disponibles');
    END IF;

    -- Obtener o crear bodega principal
    SELECT id INTO v_main_warehouse_id
    FROM public.warehouses
    WHERE company_id = v_company_id AND is_main = true
    LIMIT 1;

    IF v_main_warehouse_id IS NULL THEN
        -- Crear bodega principal si no existe
        INSERT INTO public.warehouses (name, code, is_main, company_id, created_by)
        VALUES ('Bodega Principal', 'MAIN', true, v_company_id, COALESCE(auth.uid(), gen_random_uuid()))
        RETURNING id INTO v_main_warehouse_id;
    END IF;

    -- Procesar todos los productos activos
    FOR v_product_record IN
        SELECT 
            p.id, 
            p.name, 
            p.sku, 
            p.warehouse_id,
            COALESCE(i.quantity, 0) as current_quantity
        FROM public.products p
        LEFT JOIN public.inventory i ON p.id = i.product_id
        WHERE p.company_id = v_company_id
        AND p.is_active = true
    LOOP
        -- Determinar bodega para el producto
        DECLARE
            v_target_warehouse_id uuid;
        BEGIN
            v_target_warehouse_id := COALESCE(v_product_record.warehouse_id, v_main_warehouse_id);
            
            -- Verificar si ya existe inventario para este producto en esta bodega
            SELECT * INTO v_existing_inventory
            FROM public.warehouse_inventory
            WHERE product_id = v_product_record.id 
            AND warehouse_id = v_target_warehouse_id;
            
            IF v_existing_inventory IS NULL THEN
                -- Crear registro en warehouse_inventory - ASEGURAR QUE QUANTITY NO SEA NULL
                INSERT INTO public.warehouse_inventory (
                    product_id, 
                    warehouse_id, 
                    quantity, 
                    company_id, 
                    last_updated, 
                    updated_by
                ) VALUES (
                    v_product_record.id,
                    v_target_warehouse_id,
                    GREATEST(0, v_product_record.current_quantity), -- Asegurar que no sea negativo
                    v_company_id,
                    now(),
                    COALESCE(auth.uid(), gen_random_uuid())
                );
                
                v_processed_count := v_processed_count + 1;
            END IF;
        END;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'message', 'Sincronización de inventario completada para transferencias'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Ejecutar la sincronización inmediatamente
SELECT public.sync_warehouse_inventory_for_transfers();
