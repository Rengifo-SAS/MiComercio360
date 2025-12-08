-- Función para crear un proveedor
CREATE OR REPLACE FUNCTION create_supplier(
  p_name text,
  p_contact_person text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_country text DEFAULT 'Colombia',
  p_tax_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_supplier_id uuid;
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

  -- Crear el proveedor
  INSERT INTO suppliers (
    name, contact_person, email, phone, address, city, state,
    postal_code, country, tax_id, company_id
  ) VALUES (
    p_name, p_contact_person, p_email, p_phone, p_address, p_city, p_state,
    p_postal_code, p_country, p_tax_id, v_company_id
  ) RETURNING id INTO v_supplier_id;

  RETURN json_build_object(
    'success', true,
    'supplier_id', v_supplier_id
  );
END;
$$;

-- Función para actualizar un proveedor
CREATE OR REPLACE FUNCTION update_supplier(
  p_supplier_id uuid,
  p_name text DEFAULT NULL,
  p_contact_person text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_tax_id text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_supplier_company_id uuid;
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

  -- Verificar que el proveedor pertenece a la compañía del usuario
  SELECT company_id INTO v_supplier_company_id
  FROM suppliers
  WHERE id = p_supplier_id;

  IF v_supplier_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Proveedor no encontrado');
  END IF;

  IF v_supplier_company_id != v_company_id THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos para este proveedor');
  END IF;

  -- Actualizar el proveedor
  UPDATE suppliers
  SET 
    name = COALESCE(p_name, name),
    contact_person = COALESCE(p_contact_person, contact_person),
    email = COALESCE(p_email, email),
    phone = COALESCE(p_phone, phone),
    address = COALESCE(p_address, address),
    city = COALESCE(p_city, city),
    state = COALESCE(p_state, state),
    postal_code = COALESCE(p_postal_code, postal_code),
    country = COALESCE(p_country, country),
    tax_id = COALESCE(p_tax_id, tax_id),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_supplier_id;

  RETURN json_build_object('success', true, 'supplier_id', p_supplier_id);
END;
$$;

-- Función para crear una categoría
CREATE OR REPLACE FUNCTION create_category(
  p_name text,
  p_description text DEFAULT NULL,
  p_color text DEFAULT '#3B82F6'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_category_id uuid;
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

  -- Crear la categoría
  INSERT INTO categories (
    name, description, color, company_id
  ) VALUES (
    p_name, p_description, p_color, v_company_id
  ) RETURNING id INTO v_category_id;

  RETURN json_build_object(
    'success', true,
    'category_id', v_category_id
  );
END;
$$;

-- Función para actualizar una categoría
CREATE OR REPLACE FUNCTION update_category(
  p_category_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_category_company_id uuid;
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

  -- Verificar que la categoría pertenece a la compañía del usuario
  SELECT company_id INTO v_category_company_id
  FROM categories
  WHERE id = p_category_id;

  IF v_category_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Categoría no encontrada');
  END IF;

  IF v_category_company_id != v_company_id THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos para esta categoría');
  END IF;

  -- Actualizar la categoría
  UPDATE categories
  SET 
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    color = COALESCE(p_color, color),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_category_id;

  RETURN json_build_object('success', true, 'category_id', p_category_id);
END;
$$;

-- Añadir campos fiscales colombianos a la tabla products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS iva_rate numeric DEFAULT 19,
ADD COLUMN IF NOT EXISTS ica_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS retencion_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS fiscal_classification text DEFAULT 'Bien',
ADD COLUMN IF NOT EXISTS excise_tax boolean DEFAULT false;

-- Comentarios para los nuevos campos
COMMENT ON COLUMN public.products.iva_rate IS 'Porcentaje de IVA (0, 5, 19)';

COMMENT ON COLUMN public.products.ica_rate IS 'Porcentaje de ICA';

COMMENT ON COLUMN public.products.retencion_rate IS 'Porcentaje de retención';

COMMENT ON COLUMN public.products.fiscal_classification IS 'Clasificación fiscal (Bien, Servicio, etc.)';

COMMENT ON COLUMN public.products.excise_tax IS 'Aplica impuesto al consumo';

-- Función para eliminar una categoría
CREATE OR REPLACE FUNCTION delete_category(
  p_category_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_category_company_id uuid;
  v_product_count integer;
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

  -- Verificar que la categoría pertenece a la compañía del usuario
  SELECT company_id INTO v_category_company_id
  FROM categories
  WHERE id = p_category_id;

  IF v_category_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Categoría no encontrada');
  END IF;

  IF v_category_company_id != v_company_id THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos para esta categoría');
  END IF;

  -- Verificar si hay productos asociados
  SELECT COUNT(*) INTO v_product_count
  FROM products
  WHERE category_id = p_category_id;

  IF v_product_count > 0 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'No se puede eliminar la categoría porque tiene ' || v_product_count || ' productos asociados'
    );
  END IF;

  -- Eliminar la categoría
  DELETE FROM categories WHERE id = p_category_id;

  RETURN json_build_object('success', true, 'category_id', p_category_id);
END;
$$;