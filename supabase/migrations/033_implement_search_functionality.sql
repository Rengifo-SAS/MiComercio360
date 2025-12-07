-- Implementar funcionalidad de búsqueda y filtros para inventario
-- 033_implement_search_functionality.sql

-- Función para búsqueda avanzada de productos con filtros
CREATE OR REPLACE FUNCTION search_products_advanced(
  p_company_id UUID,
  p_search_term TEXT DEFAULT '',
  p_category_id UUID DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL,
  p_stock_status TEXT DEFAULT '',
  p_sort_by TEXT DEFAULT 'name',
  p_sort_order TEXT DEFAULT 'asc',
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  description TEXT,
  cost_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  min_stock INTEGER,
  max_stock INTEGER,
  unit TEXT,
  image_url TEXT,
  is_active BOOLEAN,
  warehouse_id UUID,
  quantity INTEGER,
  last_updated TIMESTAMPTZ,
  stock_status TEXT,
  category_name TEXT,
  category_color TEXT,
  supplier_name TEXT,
  warehouse_name TEXT,
  warehouse_code TEXT,
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_where_conditions TEXT := '';
  v_order_clause TEXT := '';
  v_search_condition TEXT := '';
  v_stock_condition TEXT := '';
  v_category_condition TEXT := '';
  v_supplier_condition TEXT := '';
  v_warehouse_condition TEXT := '';
  v_query TEXT := '';
BEGIN
  -- Validar parámetros de entrada
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id es requerido';
  END IF;

  -- Construir condición de búsqueda por texto
  IF p_search_term IS NOT NULL AND p_search_term != '' THEN
    v_search_condition := format(
      'AND (p.name ILIKE %L OR p.sku ILIKE %L OR p.description ILIKE %L)',
      '%' || p_search_term || '%',
      '%' || p_search_term || '%',
      '%' || p_search_term || '%'
    );
  END IF;

  -- Construir condición de categoría
  IF p_category_id IS NOT NULL THEN
    v_category_condition := format('AND p.category_id = %L', p_category_id);
  END IF;

  -- Construir condición de proveedor
  IF p_supplier_id IS NOT NULL THEN
    v_supplier_condition := format('AND p.supplier_id = %L', p_supplier_id);
  END IF;

  -- Construir condición de bodega
  IF p_warehouse_id IS NOT NULL THEN
    v_warehouse_condition := format('AND wi.warehouse_id = %L', p_warehouse_id);
  END IF;

  -- Construir condición de estado de stock
  IF p_stock_status IS NOT NULL AND p_stock_status != '' THEN
    CASE p_stock_status
      WHEN 'in_stock' THEN
        v_stock_condition := 'AND COALESCE(wi.quantity, 0) > p.min_stock';
      WHEN 'low_stock' THEN
        v_stock_condition := 'AND COALESCE(wi.quantity, 0) > 0 AND COALESCE(wi.quantity, 0) <= p.min_stock';
      WHEN 'out_of_stock' THEN
        v_stock_condition := 'AND COALESCE(wi.quantity, 0) = 0';
    END CASE;
  END IF;

  -- Construir cláusula ORDER BY
  CASE p_sort_by
    WHEN 'name' THEN
      v_order_clause := 'ORDER BY p.name ' || p_sort_order;
    WHEN 'sku' THEN
      v_order_clause := 'ORDER BY p.sku ' || p_sort_order;
    WHEN 'quantity' THEN
      v_order_clause := 'ORDER BY COALESCE(wi.quantity, 0) ' || p_sort_order;
    WHEN 'cost_price' THEN
      v_order_clause := 'ORDER BY p.cost_price ' || p_sort_order;
    WHEN 'selling_price' THEN
      v_order_clause := 'ORDER BY p.selling_price ' || p_sort_order;
    WHEN 'last_updated' THEN
      v_order_clause := 'ORDER BY wi.last_updated ' || p_sort_order;
    ELSE
      v_order_clause := 'ORDER BY p.name ' || p_sort_order;
  END CASE;

  -- Construir consulta principal
  v_query := format('
    WITH filtered_products AS (
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.description,
        p.cost_price,
        p.selling_price,
        p.min_stock,
        p.max_stock,
        p.unit,
        p.image_url,
        p.is_active,
        p.warehouse_id,
        COALESCE(wi.quantity, 0) as quantity,
        wi.last_updated,
        CASE 
          WHEN COALESCE(wi.quantity, 0) = 0 THEN ''out_of_stock''
          WHEN COALESCE(wi.quantity, 0) <= p.min_stock THEN ''low_stock''
          ELSE ''in_stock''
        END as stock_status,
        c.name as category_name,
        c.color as category_color,
        s.name as supplier_name,
        w.name as warehouse_name,
        w.code as warehouse_code,
        COUNT(*) OVER() as total_count
      FROM products p
      LEFT JOIN warehouse_inventory wi ON p.id = wi.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN warehouses w ON wi.warehouse_id = w.id
      WHERE p.company_id = %L
        AND p.is_active = true
        %s %s %s %s %s
    )
    SELECT 
      id,
      name,
      sku,
      description,
      cost_price,
      selling_price,
      min_stock,
      max_stock,
      unit,
      image_url,
      is_active,
      warehouse_id,
      quantity,
      last_updated,
      stock_status,
      category_name,
      category_color,
      supplier_name,
      warehouse_name,
      warehouse_code,
      total_count
    FROM filtered_products
    %s
    LIMIT %s OFFSET %s
  ',
    p_company_id,
    v_search_condition,
    v_category_condition,
    v_supplier_condition,
    v_warehouse_condition,
    v_stock_condition,
    v_order_clause,
    p_limit,
    p_offset
  );

  -- Ejecutar consulta
  RETURN QUERY EXECUTE v_query;
END;
$$;

-- Función para obtener estadísticas de búsqueda
CREATE OR REPLACE FUNCTION get_search_stats(
  p_company_id UUID,
  p_search_term TEXT DEFAULT '',
  p_category_id UUID DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL,
  p_stock_status TEXT DEFAULT ''
)
RETURNS TABLE (
  total_products BIGINT,
  in_stock_count BIGINT,
  low_stock_count BIGINT,
  out_of_stock_count BIGINT,
  total_value DECIMAL(15,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_condition TEXT := '';
  v_category_condition TEXT := '';
  v_supplier_condition TEXT := '';
  v_warehouse_condition TEXT := '';
  v_stock_condition TEXT := '';
  v_query TEXT := '';
BEGIN
  -- Construir condiciones (mismo logic que search_products)
  IF p_search_term IS NOT NULL AND p_search_term != '' THEN
    v_search_condition := format(
      'AND (p.name ILIKE %L OR p.sku ILIKE %L OR p.description ILIKE %L)',
      '%' || p_search_term || '%',
      '%' || p_search_term || '%',
      '%' || p_search_term || '%'
    );
  END IF;

  IF p_category_id IS NOT NULL THEN
    v_category_condition := format('AND p.category_id = %L', p_category_id);
  END IF;

  IF p_supplier_id IS NOT NULL THEN
    v_supplier_condition := format('AND p.supplier_id = %L', p_supplier_id);
  END IF;

  IF p_warehouse_id IS NOT NULL THEN
    v_warehouse_condition := format('AND wi.warehouse_id = %L', p_warehouse_id);
  END IF;

  IF p_stock_status IS NOT NULL AND p_stock_status != '' THEN
    CASE p_stock_status
      WHEN 'in_stock' THEN
        v_stock_condition := 'AND COALESCE(wi.quantity, 0) > p.min_stock';
      WHEN 'low_stock' THEN
        v_stock_condition := 'AND COALESCE(wi.quantity, 0) > 0 AND COALESCE(wi.quantity, 0) <= p.min_stock';
      WHEN 'out_of_stock' THEN
        v_stock_condition := 'AND COALESCE(wi.quantity, 0) = 0';
    END CASE;
  END IF;

  v_query := format('
    SELECT 
      COUNT(*) as total_products,
      COUNT(CASE WHEN COALESCE(wi.quantity, 0) > p.min_stock THEN 1 END) as in_stock_count,
      COUNT(CASE WHEN COALESCE(wi.quantity, 0) > 0 AND COALESCE(wi.quantity, 0) <= p.min_stock THEN 1 END) as low_stock_count,
      COUNT(CASE WHEN COALESCE(wi.quantity, 0) = 0 THEN 1 END) as out_of_stock_count,
      COALESCE(SUM(COALESCE(wi.quantity, 0) * p.cost_price), 0) as total_value
    FROM products p
    LEFT JOIN warehouse_inventory wi ON p.id = wi.product_id
    WHERE p.company_id = %L
      AND p.is_active = true
      %s %s %s %s %s
  ',
    p_company_id,
    v_search_condition,
    v_category_condition,
    v_supplier_condition,
    v_warehouse_condition,
    v_stock_condition
  );

  RETURN QUERY EXECUTE v_query;
END;
$$;

-- Función para obtener sugerencias de búsqueda
CREATE OR REPLACE FUNCTION get_search_suggestions(
  p_company_id UUID,
  p_search_term TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  suggestion TEXT,
  type TEXT,
  count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_search_term IS NULL OR p_search_term = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH suggestions AS (
    -- Sugerencias de nombres de productos
    SELECT 
      p.name as suggestion,
      'product' as type,
      COUNT(*) as count
    FROM products p
    WHERE p.company_id = p_company_id
      AND p.is_active = true
      AND p.name ILIKE '%' || p_search_term || '%'
    GROUP BY p.name
    
    UNION ALL
    
    -- Sugerencias de SKUs
    SELECT 
      p.sku as suggestion,
      'sku' as type,
      COUNT(*) as count
    FROM products p
    WHERE p.company_id = p_company_id
      AND p.is_active = true
      AND p.sku ILIKE '%' || p_search_term || '%'
    GROUP BY p.sku
    
    UNION ALL
    
    -- Sugerencias de categorías
    SELECT 
      c.name as suggestion,
      'category' as type,
      COUNT(*) as count
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.company_id = p_company_id
      AND p.is_active = true
      AND c.name ILIKE '%' || p_search_term || '%'
    GROUP BY c.name
  )
  SELECT 
    suggestion,
    type,
    count
  FROM suggestions
  ORDER BY count DESC, suggestion
  LIMIT p_limit;
END;
$$;

-- Crear índices para mejorar rendimiento de búsqueda
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin (
    to_tsvector (
        'spanish',
        name || ' ' || sku || ' ' || COALESCE(description, '')
    )
);

CREATE INDEX IF NOT EXISTS idx_products_company_active ON products (company_id, is_active)
WHERE
    is_active = true;

CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_search ON warehouse_inventory (
    product_id,
    warehouse_id,
    quantity
);

-- Comentarios para documentación
COMMENT ON FUNCTION search_products IS 'Función para búsqueda avanzada de productos con filtros múltiples';

COMMENT ON FUNCTION get_search_stats IS 'Función para obtener estadísticas de búsqueda filtrada';

COMMENT ON FUNCTION get_search_suggestions IS 'Función para obtener sugerencias de búsqueda en tiempo real';