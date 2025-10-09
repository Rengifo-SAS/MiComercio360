-- Migración para corregir el flujo de aprobación de transferencias
-- Las transferencias deben crearse como 'pending', luego 'approved', y finalmente 'completed'

-- Eliminar todas las versiones existentes de la función
DROP FUNCTION IF EXISTS public.create_warehouse_transfer(uuid, uuid, uuid, integer, text, text);

-- Función corregida que solo crea la transferencia como PENDING
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
    v_transfer_number text;
    v_company_code text;
    v_from_warehouse_name text;
    v_to_warehouse_name text;
    v_product_name text;
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

    -- Verificar stock disponible en bodega origen (solo para validación, no para transferir aún)
    SELECT COALESCE(quantity, 0) INTO v_from_quantity
    FROM public.warehouse_inventory
    WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;

    -- Crear registro de transferencia como PENDING
    INSERT INTO public.warehouse_transfers (
        transfer_number, from_warehouse_id, to_warehouse_id, product_id, quantity, 
        reason, notes, company_id, created_by, status
    ) VALUES (
        v_transfer_number, p_from_warehouse_id, p_to_warehouse_id, p_product_id, p_quantity,
        p_reason, p_notes, v_company_id, auth.uid(), 'pending'
    )
    RETURNING id INTO v_transfer_id;

    RETURN json_build_object(
        'success', true,
        'transfer_id', v_transfer_id,
        'transfer_number', v_transfer_number,
        'status', 'pending',
        'product_name', v_product_name,
        'from_warehouse', v_from_warehouse_name,
        'to_warehouse', v_to_warehouse_name,
        'quantity', p_quantity,
        'message', 'Transferencia creada exitosamente. Pendiente de aprobación.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Función para aprobar transferencias
CREATE OR REPLACE FUNCTION public.approve_warehouse_transfer(
    p_transfer_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_transfer record;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Obtener datos de la transferencia
    SELECT * INTO v_transfer
    FROM public.warehouse_transfers
    WHERE id = p_transfer_id AND company_id = v_company_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Transferencia no encontrada');
    END IF;

    IF v_transfer.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Solo se pueden aprobar transferencias pendientes');
    END IF;

    -- Marcar transferencia como aprobada
    UPDATE public.warehouse_transfers
    SET status = 'approved',
        approved_by = auth.uid(),
        approved_at = now()
    WHERE id = p_transfer_id;

    RETURN json_build_object(
        'success', true,
        'transfer_id', p_transfer_id,
        'transfer_number', v_transfer.transfer_number,
        'status', 'approved',
        'message', 'Transferencia aprobada exitosamente'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Función para completar transferencias (ejecutar la transferencia física)
CREATE OR REPLACE FUNCTION public.complete_warehouse_transfer(
    p_transfer_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_transfer record;
    v_from_quantity integer := 0;
    v_to_quantity integer := 0;
    v_new_from_quantity integer := 0;
    v_new_to_quantity integer := 0;
    v_existing_from_record record;
    v_existing_to_record record;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Obtener datos de la transferencia
    SELECT * INTO v_transfer
    FROM public.warehouse_transfers
    WHERE id = p_transfer_id AND company_id = v_company_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Transferencia no encontrada');
    END IF;

    IF v_transfer.status != 'approved' THEN
        RETURN json_build_object('success', false, 'error', 'Solo se pueden completar transferencias aprobadas');
    END IF;

    -- Obtener registros existentes en ambas bodegas
    SELECT * INTO v_existing_from_record
    FROM public.warehouse_inventory
    WHERE warehouse_id = v_transfer.from_warehouse_id AND product_id = v_transfer.product_id;

    SELECT * INTO v_existing_to_record
    FROM public.warehouse_inventory
    WHERE warehouse_id = v_transfer.to_warehouse_id AND product_id = v_transfer.product_id;

    -- Obtener cantidades actuales - GARANTIZAR QUE NO SEAN NULL
    v_from_quantity := COALESCE(v_existing_from_record.quantity, 0);
    v_to_quantity := COALESCE(v_existing_to_record.quantity, 0);

    -- NUEVA LÓGICA: Si no existe inventario en bodega origen, crearlo con cantidad 0
    IF v_existing_from_record IS NULL THEN
        -- Crear inventario en bodega origen con cantidad 0
        INSERT INTO public.warehouse_inventory (
            product_id, 
            warehouse_id, 
            quantity, 
            company_id, 
            last_updated, 
            updated_by
        ) VALUES (
            v_transfer.product_id, 
            v_transfer.from_warehouse_id, 
            0,  -- Cantidad inicial 0
            v_company_id, 
            now(), 
            auth.uid()
        );
        
        -- Actualizar la cantidad de origen
        v_from_quantity := 0;
    END IF;

    -- Calcular nuevas cantidades - GARANTIZAR QUE NO SEAN NULL
    v_new_from_quantity := GREATEST(0, v_from_quantity - v_transfer.quantity);
    v_new_to_quantity := v_to_quantity + v_transfer.quantity;

    -- Manejar inventario en bodega origen
    IF v_new_from_quantity = 0 THEN
        -- Eliminar registro si la cantidad queda en 0
        DELETE FROM public.warehouse_inventory
        WHERE warehouse_id = v_transfer.from_warehouse_id AND product_id = v_transfer.product_id;
    ELSE
        -- Actualizar cantidad existente - GARANTIZAR QUE NO SEA NULL
        UPDATE public.warehouse_inventory
        SET quantity = v_new_from_quantity, 
            last_updated = now(), 
            updated_by = auth.uid()
        WHERE warehouse_id = v_transfer.from_warehouse_id AND product_id = v_transfer.product_id;
    END IF;

    -- Manejar inventario en bodega destino - CORREGIDO DEFINITIVAMENTE
    IF v_existing_to_record IS NOT NULL THEN
        -- Actualizar registro existente - GARANTIZAR QUE QUANTITY NO SEA NULL
        UPDATE public.warehouse_inventory
        SET quantity = v_new_to_quantity,
            last_updated = now(),
            updated_by = auth.uid()
        WHERE warehouse_id = v_transfer.to_warehouse_id AND product_id = v_transfer.product_id;
    ELSE
        -- Crear nuevo registro - GARANTIZAR QUE QUANTITY NO SEA NULL
        INSERT INTO public.warehouse_inventory (
            product_id, 
            warehouse_id, 
            quantity, 
            company_id, 
            last_updated, 
            updated_by
        ) VALUES (
            v_transfer.product_id, 
            v_transfer.to_warehouse_id, 
            v_new_to_quantity,  -- Esta variable está garantizada que no es NULL
            v_company_id, 
            now(), 
            auth.uid()
        );
    END IF;

    -- Registrar movimientos de inventario
    -- Movimiento de salida en bodega origen (solo si había stock previo)
    IF v_from_quantity > 0 THEN
        INSERT INTO public.inventory_movements (
            product_id, movement_type, quantity, 
            previous_quantity, new_quantity, reason, created_by, company_id
        ) VALUES (
            v_transfer.product_id, 'out', v_transfer.quantity,
            v_from_quantity, v_new_from_quantity, 
            COALESCE(v_transfer.reason, 'Transferencia completada'),
            auth.uid(), v_company_id
        );
    END IF;

    -- Movimiento de entrada en bodega destino
    INSERT INTO public.inventory_movements (
        product_id, movement_type, quantity, 
        previous_quantity, new_quantity, reason, created_by, company_id
    ) VALUES (
        v_transfer.product_id, 'in', v_transfer.quantity,
        v_to_quantity, v_new_to_quantity,
        COALESCE(v_transfer.reason, 'Transferencia completada'),
        auth.uid(), v_company_id
    );

    -- Actualizar inventario tradicional (suma total de todas las bodegas)
    UPDATE public.inventory
    SET quantity = (
        SELECT COALESCE(SUM(quantity), 0)
        FROM public.warehouse_inventory
        WHERE product_id = v_transfer.product_id
    ),
    last_updated = now(),
    updated_by = auth.uid()
    WHERE product_id = v_transfer.product_id;

    -- Si no existe registro en inventory, crearlo
    IF NOT FOUND THEN
        INSERT INTO public.inventory (
            product_id, 
            quantity, 
            company_id, 
            last_updated, 
            updated_by
        ) VALUES (
            v_transfer.product_id,
            v_new_to_quantity,
            v_company_id,
            now(),
            auth.uid()
        );
    END IF;

    -- Marcar transferencia como completada
    UPDATE public.warehouse_transfers
    SET status = 'completed',
        completed_by = auth.uid(),
        completed_at = now()
    WHERE id = p_transfer_id;

    RETURN json_build_object(
        'success', true,
        'transfer_id', p_transfer_id,
        'transfer_number', v_transfer.transfer_number,
        'status', 'completed',
        'from_quantity', v_new_from_quantity,
        'to_quantity', v_new_to_quantity,
        'message', 'Transferencia completada exitosamente'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Función para cancelar transferencias
CREATE OR REPLACE FUNCTION public.cancel_warehouse_transfer(
    p_transfer_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_transfer record;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Obtener datos de la transferencia
    SELECT * INTO v_transfer
    FROM public.warehouse_transfers
    WHERE id = p_transfer_id AND company_id = v_company_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Transferencia no encontrada');
    END IF;

    IF v_transfer.status = 'completed' THEN
        RETURN json_build_object('success', false, 'error', 'No se puede cancelar una transferencia completada');
    END IF;

    -- Marcar transferencia como cancelada
    UPDATE public.warehouse_transfers
    SET status = 'cancelled',
        notes = COALESCE(notes, '') || ' [CANCELADA: ' || COALESCE(p_reason, 'Sin motivo especificado') || ']'
    WHERE id = p_transfer_id;

    RETURN json_build_object(
        'success', true,
        'transfer_id', p_transfer_id,
        'transfer_number', v_transfer.transfer_number,
        'status', 'cancelled',
        'message', 'Transferencia cancelada exitosamente'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
