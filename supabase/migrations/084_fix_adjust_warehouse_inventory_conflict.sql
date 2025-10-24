-- Migración para corregir el manejo de conflictos en adjust_warehouse_inventory
-- Esta migración corrige el error "there is no unique or exclusion constraint matching the ON CONFLICT specification"

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

  -- Si no existe, crear uno nuevo con manejo de conflictos
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
END;
$$;

-- Comentario
COMMENT ON FUNCTION public.adjust_warehouse_inventory(uuid, text, integer, uuid, text) IS 'Realiza ajustes de inventario en bodegas específicas con manejo correcto de conflictos';
