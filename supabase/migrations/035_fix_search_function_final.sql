-- Corregir función de búsqueda con SQL simplificado
-- 035_fix_search_function_final.sql

-- Eliminar funciones existentes
DROP FUNCTION IF EXISTS search_products_advanced(UUID, TEXT, UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_search_stats(UUID, TEXT, UUID, UUID, UUID, TEXT);

-- Crear función de búsqueda simplificada y funcional
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
BEGIN
  RETURN QUERY
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
        WHEN COALESCE(wi.quantity, 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(wi.quantity, 0) <= p.min_stock THEN 'low_stock'
        ELSE 'in_stock'
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
    WHERE p.company_id = p_company_id
      AND p.is_active = true
      AND (p_search_term = '' OR p.name ILIKE '%' || p_search_term || '%' OR p.sku ILIKE '%' || p_search_term || '%' OR p.description ILIKE '%' || p_search_term || '%')
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
      AND (p_warehouse_id IS NULL OR wi.warehouse_id = p_warehouse_id)
      AND (
        p_stock_status = '' OR
        (p_stock_status = 'in_stock' AND COALESCE(wi.quantity, 0) > p.min_stock) OR
        (p_stock_status = 'low_stock' AND COALESCE(wi.quantity, 0) > 0 AND COALESCE(wi.quantity, 0) <= p.min_stock) OR
        (p_stock_status = 'out_of_stock' AND COALESCE(wi.quantity, 0) = 0)
      )
  )
  SELECT 
    fp.id,
    fp.name,
    fp.sku,
    fp.description,
    fp.cost_price,
    fp.selling_price,
    fp.min_stock,
    fp.max_stock,
    fp.unit,
    fp.image_url,
    fp.is_active,
    fp.warehouse_id,
    fp.quantity,
    fp.last_updated,
    fp.stock_status,
    fp.category_name,
    fp.category_color,
    fp.supplier_name,
    fp.warehouse_name,
    fp.warehouse_code,
    fp.total_count
  FROM filtered_products fp
  ORDER BY 
    CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN fp.name END ASC,
    CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN fp.name END DESC,
    CASE WHEN p_sort_by = 'sku' AND p_sort_order = 'asc' THEN fp.sku END ASC,
    CASE WHEN p_sort_by = 'sku' AND p_sort_order = 'desc' THEN fp.sku END DESC,
    CASE WHEN p_sort_by = 'quantity' AND p_sort_order = 'asc' THEN fp.quantity END ASC,
    CASE WHEN p_sort_by = 'quantity' AND p_sort_order = 'desc' THEN fp.quantity END DESC,
    CASE WHEN p_sort_by = 'cost_price' AND p_sort_order = 'asc' THEN fp.cost_price END ASC,
    CASE WHEN p_sort_by = 'cost_price' AND p_sort_order = 'desc' THEN fp.cost_price END DESC,
    CASE WHEN p_sort_by = 'selling_price' AND p_sort_order = 'asc' THEN fp.selling_price END ASC,
    CASE WHEN p_sort_by = 'selling_price' AND p_sort_order = 'desc' THEN fp.selling_price END DESC,
    CASE WHEN p_sort_by = 'last_updated' AND p_sort_order = 'asc' THEN fp.last_updated END ASC,
    CASE WHEN p_sort_by = 'last_updated' AND p_sort_order = 'desc' THEN fp.last_updated END DESC,
    fp.name ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Crear función de estadísticas simplificada
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
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN COALESCE(wi.quantity, 0) > p.min_stock THEN 1 END) as in_stock_count,
    COUNT(CASE WHEN COALESCE(wi.quantity, 0) > 0 AND COALESCE(wi.quantity, 0) <= p.min_stock THEN 1 END) as low_stock_count,
    COUNT(CASE WHEN COALESCE(wi.quantity, 0) = 0 THEN 1 END) as out_of_stock_count,
    COALESCE(SUM(COALESCE(wi.quantity, 0) * p.cost_price), 0) as total_value
  FROM products p
  LEFT JOIN warehouse_inventory wi ON p.id = wi.product_id
  WHERE p.company_id = p_company_id
    AND p.is_active = true
    AND (p_search_term = '' OR p.name ILIKE '%' || p_search_term || '%' OR p.sku ILIKE '%' || p_search_term || '%' OR p.description ILIKE '%' || p_search_term || '%')
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    AND (p_warehouse_id IS NULL OR wi.warehouse_id = p_warehouse_id)
    AND (
      p_stock_status = '' OR
      (p_stock_status = 'in_stock' AND COALESCE(wi.quantity, 0) > p.min_stock) OR
      (p_stock_status = 'low_stock' AND COALESCE(wi.quantity, 0) > 0 AND COALESCE(wi.quantity, 0) <= p.min_stock) OR
      (p_stock_status = 'out_of_stock' AND COALESCE(wi.quantity, 0) = 0)
    );
END;
$$;

-- Crear función de sugerencias simplificada
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

-- Comentarios para documentación
COMMENT ON FUNCTION search_products_advanced IS 'Función simplificada para búsqueda avanzada de productos con filtros múltiples';
COMMENT ON FUNCTION get_search_stats IS 'Función simplificada para obtener estadísticas de búsqueda filtrada';
COMMENT ON FUNCTION get_search_suggestions IS 'Función simplificada para obtener sugerencias de búsqueda en tiempo real';
