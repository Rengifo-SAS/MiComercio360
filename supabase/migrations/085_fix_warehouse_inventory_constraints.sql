-- Migración para corregir definitivamente las restricciones de warehouse_inventory
-- Esta migración asegura que todas las funciones usen el orden correcto de restricciones

-- 1. Verificar y corregir la restricción única si es necesario
-- Primero eliminamos cualquier restricción existente que pueda estar mal configurada
DO $$
BEGIN
    -- Intentar eliminar restricciones únicas existentes (si existen)
    BEGIN
        ALTER TABLE public.warehouse_inventory DROP CONSTRAINT IF EXISTS warehouse_inventory_warehouse_id_product_id_key;
        ALTER TABLE public.warehouse_inventory DROP CONSTRAINT IF EXISTS warehouse_inventory_product_id_warehouse_id_key;
    EXCEPTION
        WHEN undefined_object THEN
            -- No hacer nada si la restricción no existe
            NULL;
    END;
    
    -- Crear la restricción única correcta
    BEGIN
        ALTER TABLE public.warehouse_inventory ADD CONSTRAINT warehouse_inventory_warehouse_id_product_id_key UNIQUE (warehouse_id, product_id);
    EXCEPTION
        WHEN duplicate_table THEN
            -- La restricción ya existe, no hacer nada
            NULL;
    END;
END $$;

-- 2. Función corregida para ajustar inventario de bodega
CREATE OR REPLACE FUNCTION public.adjust_warehouse_inventory(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_warehouse_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_warehouse_id uuid;
  v_inventory_record record;
  v_new_quantity integer;
  v_previous_quantity integer;
BEGIN
  -- Obtener el usuario actual
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  -- Obtener la compañía del usuario
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no tiene compañía asignada');
  END IF;

  -- Si no se especifica bodega, usar la principal
  IF p_warehouse_id IS NULL THEN
    SELECT id INTO v_warehouse_id
    FROM public.warehouses
    WHERE company_id = v_company_id AND is_main = true AND is_active = true;
    
    IF v_warehouse_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'No se encontró bodega principal');
    END IF;
  ELSE
    v_warehouse_id := p_warehouse_id;
  END IF;

  -- Verificar que el producto pertenece a la compañía
  IF NOT EXISTS (
    SELECT 1 FROM public.products 
    WHERE id = p_product_id AND company_id = v_company_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Producto no encontrado');
  END IF;

  -- Verificar que la bodega pertenece a la compañía
  IF NOT EXISTS (
    SELECT 1 FROM public.warehouses 
    WHERE id = v_warehouse_id AND company_id = v_company_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Bodega no encontrada');
  END IF;

  -- Buscar el registro de inventario existente
  SELECT * INTO v_inventory_record
  FROM public.warehouse_inventory
  WHERE product_id = p_product_id AND warehouse_id = v_warehouse_id;

  -- Si no existe, crear uno nuevo usando UPSERT con el orden correcto
  IF v_inventory_record IS NULL THEN
    INSERT INTO public.warehouse_inventory (
      product_id, warehouse_id, quantity, company_id, updated_by
    )
    VALUES (p_product_id, v_warehouse_id, 0, v_company_id, v_user_id)
    ON CONFLICT (warehouse_id, product_id) 
    DO UPDATE SET 
      quantity = 0,
      last_updated = now(),
      updated_by = v_user_id
    RETURNING * INTO v_inventory_record;
    
    -- Si aún no se asignó el record, obtenerlo nuevamente
    IF v_inventory_record IS NULL THEN
      SELECT * INTO v_inventory_record
      FROM public.warehouse_inventory
      WHERE product_id = p_product_id AND warehouse_id = v_warehouse_id;
    END IF;
  END IF;

  v_previous_quantity := v_inventory_record.quantity;

  -- Calcular la nueva cantidad según el tipo de movimiento
  CASE p_movement_type
    WHEN 'in' THEN
      v_new_quantity := v_previous_quantity + p_quantity;
    WHEN 'out' THEN
      v_new_quantity := v_previous_quantity - p_quantity;
    WHEN 'adjustment' THEN
      v_new_quantity := p_quantity;
    ELSE
      RETURN json_build_object('success', false, 'error', 'Tipo de movimiento inválido');
  END CASE;

  -- Verificar que la cantidad no sea negativa
  IF v_new_quantity < 0 THEN
    RETURN json_build_object('success', false, 'error', 'La cantidad no puede ser negativa');
  END IF;

  -- Actualizar el inventario
  UPDATE public.warehouse_inventory
  SET 
    quantity = v_new_quantity,
    last_updated = now(),
    updated_by = v_user_id
  WHERE id = v_inventory_record.id;

  -- Registrar el movimiento
  INSERT INTO public.warehouse_movements (
    warehouse_id, product_id, movement_type, quantity,
    previous_quantity, new_quantity, reason, company_id, created_by
  ) VALUES (
    v_warehouse_id, p_product_id, p_movement_type, p_quantity,
    v_previous_quantity, v_new_quantity, p_reason, v_company_id, v_user_id
  );

  RETURN json_build_object(
    'success', true,
    'inventory_id', v_inventory_record.id,
    'previous_quantity', v_previous_quantity,
    'new_quantity', v_new_quantity,
    'movement_type', p_movement_type,
    'warehouse_id', v_warehouse_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3. Función corregida para transferencias (corrige el ON CONFLICT)
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
        -- Actualizar cantidad existente
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
    ON CONFLICT (warehouse_id, product_id)  -- ORDEN CORRECTO
    DO UPDATE SET
        quantity = v_new_to_quantity,
        last_updated = now(),
        updated_by = auth.uid();

    -- Registrar movimientos
    INSERT INTO public.warehouse_movements (
        product_id, warehouse_id, movement_type, quantity, 
        previous_quantity, new_quantity, reason, created_by, company_id
    ) VALUES (
        p_product_id, p_from_warehouse_id, 'transfer_out', p_quantity,
        v_from_quantity, v_new_from_quantity, 
        COALESCE(p_reason, 'Transferencia a ' || v_to_warehouse_name),
        auth.uid(), v_company_id
    );

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

-- Comentarios
COMMENT ON FUNCTION public.adjust_warehouse_inventory(uuid, text, integer, uuid, text) IS 'Realiza ajustes de inventario en bodegas específicas con restricciones corregidas';
COMMENT ON FUNCTION public.create_warehouse_transfer(uuid, uuid, uuid, integer, text, text) IS 'Crea transferencias entre bodegas con restricciones corregidas';
