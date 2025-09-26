-- Función para realizar ajustes de inventario
CREATE OR REPLACE FUNCTION adjust_inventory(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_reason text DEFAULT NULL,
  p_location text DEFAULT 'main'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inventory_record inventory%ROWTYPE;
  v_new_quantity integer;
  v_company_id uuid;
  v_user_id uuid;
BEGIN
  -- Obtener el usuario actual
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  -- Obtener el producto y su compañía
  SELECT company_id INTO v_company_id
  FROM products
  WHERE id = p_product_id;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Producto no encontrado');
  END IF;

  -- Verificar que el usuario pertenece a la compañía
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_user_id AND company_id = v_company_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos para este producto');
  END IF;

  -- Buscar el registro de inventario existente
  SELECT * INTO v_inventory_record
  FROM inventory
  WHERE product_id = p_product_id AND company_id = v_company_id;

  -- Si no existe, crear uno nuevo
  IF v_inventory_record IS NULL THEN
    INSERT INTO inventory (product_id, quantity, location, company_id, updated_by)
    VALUES (p_product_id, 0, p_location, v_company_id, v_user_id)
    RETURNING * INTO v_inventory_record;
  END IF;

  -- Calcular la nueva cantidad según el tipo de movimiento
  CASE p_movement_type
    WHEN 'in' THEN
      v_new_quantity := v_inventory_record.quantity + p_quantity;
    WHEN 'out' THEN
      v_new_quantity := v_inventory_record.quantity - p_quantity;
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
  UPDATE inventory
  SET 
    quantity = v_new_quantity,
    last_updated = now(),
    updated_by = v_user_id
  WHERE id = v_inventory_record.id;

  -- Registrar el movimiento
  INSERT INTO inventory_movements (
    product_id,
    movement_type,
    quantity,
    previous_quantity,
    new_quantity,
    reason,
    created_by,
    company_id
  ) VALUES (
    p_product_id,
    p_movement_type,
    p_quantity,
    v_inventory_record.quantity,
    v_new_quantity,
    p_reason,
    v_user_id,
    v_company_id
  );

  RETURN json_build_object(
    'success', true,
    'inventory_id', v_inventory_record.id,
    'previous_quantity', v_inventory_record.quantity,
    'new_quantity', v_new_quantity,
    'movement_type', p_movement_type
  );
END;
$$;

-- Función para crear un producto completo con inventario inicial
CREATE OR REPLACE FUNCTION create_product_with_inventory(
  p_name text,
  p_sku text,
  p_description text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_cost_price numeric DEFAULT 0,
  p_selling_price numeric DEFAULT 0,
  p_min_stock integer DEFAULT 0,
  p_max_stock integer DEFAULT NULL,
  p_unit text DEFAULT 'pcs',
  p_barcode text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_initial_quantity integer DEFAULT 0,
  p_location text DEFAULT 'main'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_product_id uuid;
  v_inventory_id uuid;
BEGIN
  -- Obtener el usuario actual
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  -- Obtener la compañía del usuario
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = v_user_id;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no tiene compañía asignada');
  END IF;

  -- Crear el producto
  INSERT INTO products (
    name, sku, description, category_id, supplier_id,
    cost_price, selling_price, min_stock, max_stock,
    unit, barcode, image_url, company_id
  ) VALUES (
    p_name, p_sku, p_description, p_category_id, p_supplier_id,
    p_cost_price, p_selling_price, p_min_stock, p_max_stock,
    p_unit, p_barcode, p_image_url, v_company_id
  ) RETURNING id INTO v_product_id;

  -- Crear el registro de inventario inicial
  INSERT INTO inventory (
    product_id, quantity, location, company_id, updated_by
  ) VALUES (
    v_product_id, p_initial_quantity, p_location, v_company_id, v_user_id
  ) RETURNING id INTO v_inventory_id;

  -- Si hay cantidad inicial, registrar el movimiento
  IF p_initial_quantity > 0 THEN
    INSERT INTO inventory_movements (
      product_id, movement_type, quantity, previous_quantity,
      new_quantity, reason, created_by, company_id
    ) VALUES (
      v_product_id, 'in', p_initial_quantity, 0,
      p_initial_quantity, 'Stock inicial', v_user_id, v_company_id
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'product_id', v_product_id,
    'inventory_id', v_inventory_id
  );
END;
$$;

-- Función para actualizar un producto
CREATE OR REPLACE FUNCTION update_product(
  p_product_id uuid,
  p_name text DEFAULT NULL,
  p_sku text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_cost_price numeric DEFAULT NULL,
  p_selling_price numeric DEFAULT NULL,
  p_min_stock integer DEFAULT NULL,
  p_max_stock integer DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_barcode text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_product_company_id uuid;
BEGIN
  -- Obtener el usuario actual
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  -- Obtener la compañía del usuario
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = v_user_id;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no tiene compañía asignada');
  END IF;

  -- Verificar que el producto pertenece a la compañía del usuario
  SELECT company_id INTO v_product_company_id
  FROM products
  WHERE id = p_product_id;

  IF v_product_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Producto no encontrado');
  END IF;

  IF v_product_company_id != v_company_id THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos para este producto');
  END IF;

  -- Actualizar el producto
  UPDATE products
  SET 
    name = COALESCE(p_name, name),
    sku = COALESCE(p_sku, sku),
    description = COALESCE(p_description, description),
    category_id = COALESCE(p_category_id, category_id),
    supplier_id = COALESCE(p_supplier_id, supplier_id),
    cost_price = COALESCE(p_cost_price, cost_price),
    selling_price = COALESCE(p_selling_price, selling_price),
    min_stock = COALESCE(p_min_stock, min_stock),
    max_stock = COALESCE(p_max_stock, max_stock),
    unit = COALESCE(p_unit, unit),
    barcode = COALESCE(p_barcode, barcode),
    image_url = COALESCE(p_image_url, image_url),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_product_id;

  RETURN json_build_object('success', true, 'product_id', p_product_id);
END;
$$;