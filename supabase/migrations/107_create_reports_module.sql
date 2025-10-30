-- Crear módulo completo de reportes
-- 107_create_reports_module.sql

-- Eliminar tablas relacionadas si existen
DROP TABLE IF EXISTS report_schedules CASCADE;
DROP TABLE IF EXISTS report_history CASCADE;
DROP TABLE IF EXISTS reports CASCADE;

-- Crear tabla de reportes (definiciones de reportes)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Información básica del reporte
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL CHECK (
    report_type IN (
      'SALES', -- Reporte de ventas
      'SALES_BY_PRODUCT', -- Ventas por producto
      'SALES_BY_CUSTOMER', -- Ventas por cliente
      'SALES_BY_CASHIER', -- Ventas por cajero
      'SALES_BY_PAYMENT_METHOD', -- Ventas por método de pago
      'INVENTORY', -- Reporte de inventario
      'INVENTORY_MOVEMENTS', -- Movimientos de inventario
      'INVENTORY_LOW_STOCK', -- Productos con stock bajo
      'CUSTOMERS', -- Reporte de clientes
      'CUSTOMERS_TOP', -- Top clientes
      'PRODUCTS', -- Reporte de productos
      'PRODUCTS_BEST_SELLING', -- Productos más vendidos
      'PRODUCTS_PROFITABILITY', -- Rentabilidad de productos
      'FINANCIAL', -- Reporte financiero
      'ACCOUNTS', -- Reporte de cuentas
      'ACCOUNT_TRANSACTIONS', -- Transacciones de cuentas
      'SHIFTS', -- Reporte de turnos
      'CASH_MOVEMENTS', -- Movimientos de efectivo
      'PURCHASES', -- Reporte de compras
      'TAXES', -- Reporte de impuestos
      'GENERAL' -- Reporte general personalizado
    )
  ),

  -- Parámetros del reporte (JSON)
  parameters JSONB DEFAULT '{}'::jsonb,

  -- Filtros del reporte
  date_from DATE,
  date_to DATE,
  customer_id UUID REFERENCES customers(id),
  product_id UUID REFERENCES products(id),
  category_id UUID REFERENCES categories(id),
  cashier_id UUID REFERENCES profiles(id),
  warehouse_id UUID REFERENCES warehouses(id),
  account_id UUID REFERENCES accounts(id),

  -- Configuración de exportación
  export_format VARCHAR(20) DEFAULT 'PDF' CHECK (
    export_format IN ('PDF', 'EXCEL', 'CSV')
  ),
  include_charts BOOLEAN DEFAULT true,
  include_summary BOOLEAN DEFAULT true,
  include_details BOOLEAN DEFAULT true,

  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT false, -- Si es una plantilla reutilizable

  -- Descripción y notas
  description TEXT,
  notes TEXT,

  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Crear tabla de historial de reportes generados
CREATE TABLE report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Información de generación
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL,

  -- Parámetros utilizados
  parameters JSONB DEFAULT '{}'::jsonb,

  -- Período del reporte
  date_from DATE,
  date_to DATE,

  -- Resultado del reporte
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN (
      'PENDING',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'CANCELLED'
    )
  ),

  -- Datos del reporte (JSON con resultados)
  report_data JSONB DEFAULT '{}'::jsonb,

  -- Archivo generado
  file_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT, -- En bytes
  export_format VARCHAR(20),

  -- Estadísticas del reporte
  execution_time_ms INTEGER, -- Tiempo de ejecución en milisegundos
  total_records INTEGER,

  -- Error (si falló)
  error_message TEXT,

  -- Metadatos
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ, -- Fecha de expiración del archivo

  -- Índices
  CONSTRAINT report_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Crear tabla de programación de reportes
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Configuración de programación
  schedule_name VARCHAR(255) NOT NULL,
  schedule_type VARCHAR(20) NOT NULL CHECK (
    schedule_type IN (
      'DAILY',
      'WEEKLY',
      'MONTHLY',
      'QUARTERLY',
      'YEARLY',
      'CUSTOM'
    )
  ),

  -- Configuración de frecuencia
  frequency_value INTEGER, -- Por ejemplo: cada 2 días, cada 3 semanas
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Domingo
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time_of_day TIME NOT NULL DEFAULT '09:00:00',

  -- Destinatarios
  recipients JSONB DEFAULT '[]'::jsonb, -- Array de emails

  -- Estado
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,

  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_reports_company_id ON reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(company_id, report_type);
CREATE INDEX IF NOT EXISTS idx_reports_is_active ON reports(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_reports_is_template ON reports(company_id, is_template);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

CREATE INDEX IF NOT EXISTS idx_report_history_company_id ON report_history(company_id);
CREATE INDEX IF NOT EXISTS idx_report_history_report_id ON report_history(report_id);
CREATE INDEX IF NOT EXISTS idx_report_history_report_type ON report_history(company_id, report_type);
CREATE INDEX IF NOT EXISTS idx_report_history_status ON report_history(status);
CREATE INDEX IF NOT EXISTS idx_report_history_generated_at ON report_history(generated_at);
CREATE INDEX IF NOT EXISTS idx_report_history_date_range ON report_history(date_from, date_to);

CREATE INDEX IF NOT EXISTS idx_report_schedules_company_id ON report_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_report_id ON report_schedules(report_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_is_active ON report_schedules(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_at);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para updated_at
CREATE TRIGGER trigger_update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

CREATE TRIGGER trigger_update_report_schedules_updated_at
  BEFORE UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- Crear función para generar reporte de ventas
CREATE OR REPLACE FUNCTION generate_sales_report(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_customer_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_cashier_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total_sales', COUNT(DISTINCT s.id),
      'total_amount', COALESCE(SUM(s.total_amount), 0),
      'total_discount', COALESCE(SUM(s.discount_amount), 0),
      'total_tax', COALESCE(SUM(s.tax_amount), 0),
      'average_sale', COALESCE(AVG(s.total_amount), 0)
    ),
    'by_payment_method', (
      SELECT jsonb_object_agg(
        s.payment_method,
        jsonb_build_object(
          'count', COUNT(*),
          'total', SUM(s.total_amount)
        )
      )
      FROM sales s
      WHERE s.company_id = p_company_id
        AND s.created_at::date BETWEEN p_date_from AND p_date_to
        AND (p_customer_id IS NULL OR s.customer_id = p_customer_id)
        AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id)
        AND s.status = 'completed'
      GROUP BY s.payment_method
    ),
    'by_status', (
      SELECT jsonb_object_agg(
        s.payment_status,
        jsonb_build_object(
          'count', COUNT(*),
          'total', SUM(s.total_amount)
        )
      )
      FROM sales s
      WHERE s.company_id = p_company_id
        AND s.created_at::date BETWEEN p_date_from AND p_date_to
        AND (p_customer_id IS NULL OR s.customer_id = p_customer_id)
        AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id)
        AND s.status = 'completed'
      GROUP BY s.payment_status
    ),
    'sales_by_date', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', date_trunc('day', s.created_at),
          'count', COUNT(*),
          'total', SUM(s.total_amount)
        )
      )
      FROM sales s
      WHERE s.company_id = p_company_id
        AND s.created_at::date BETWEEN p_date_from AND p_date_to
        AND (p_customer_id IS NULL OR s.customer_id = p_customer_id)
        AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id)
        AND s.status = 'completed'
      GROUP BY date_trunc('day', s.created_at)
      ORDER BY date_trunc('day', s.created_at)
    )
  ) INTO result
  FROM sales s
  WHERE s.company_id = p_company_id
    AND s.created_at::date BETWEEN p_date_from AND p_date_to
    AND (p_customer_id IS NULL OR s.customer_id = p_customer_id)
    AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id)
    AND s.status = 'completed';

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar reporte de productos más vendidos
CREATE OR REPLACE FUNCTION generate_best_selling_products_report(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'product_id', p.id,
        'product_name', p.name,
        'sku', p.sku,
        'category', c.name,
        'quantity_sold', COALESCE(SUM(si.quantity), 0),
        'total_sales', COALESCE(SUM(si.total_price), 0),
        'average_price', COALESCE(AVG(si.unit_price), 0)
      )
    )
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN sale_items si ON p.id = si.product_id
    LEFT JOIN sales s ON si.sale_id = s.id
    WHERE p.company_id = p_company_id
      AND s.created_at::date BETWEEN p_date_from AND p_date_to
      AND s.status = 'completed'
    GROUP BY p.id, p.name, p.sku, c.name
    ORDER BY SUM(si.quantity) DESC
    LIMIT p_limit
  );
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar reporte de inventario
CREATE OR REPLACE FUNCTION generate_inventory_report(
  p_company_id UUID,
  p_warehouse_id UUID DEFAULT NULL,
  p_low_stock_only BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'product_id', p.id,
        'product_name', p.name,
        'sku', p.sku,
        'category', c.name,
        'warehouse', w.name,
        'quantity', COALESCE(wi.quantity, 0),
        'reserved_quantity', COALESCE(wi.reserved_quantity, 0),
        'available_quantity', COALESCE(wi.quantity, 0) - COALESCE(wi.reserved_quantity, 0),
        'min_stock', p.min_stock,
        'max_stock', p.max_stock,
        'cost_price', p.cost_price,
        'selling_price', p.selling_price,
        'total_value', COALESCE(wi.quantity, 0) * p.cost_price,
        'is_low_stock', COALESCE(wi.quantity, 0) <= p.min_stock
      )
    )
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN warehouse_inventory wi ON p.id = wi.product_id
    LEFT JOIN warehouses w ON wi.warehouse_id = w.id
    WHERE p.company_id = p_company_id
      AND p.is_active = true
      AND (p_warehouse_id IS NULL OR wi.warehouse_id = p_warehouse_id)
      AND (p_low_stock_only = false OR COALESCE(wi.quantity, 0) <= p.min_stock)
    ORDER BY p.name
  );
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar reporte de clientes
CREATE OR REPLACE FUNCTION generate_customers_report(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_top_limit INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'customer_id', c.id,
        'customer_name', c.business_name,
        'identification', c.identification_number,
        'email', c.email,
        'phone', c.phone,
        'total_purchases', COALESCE(COUNT(DISTINCT s.id), 0),
        'total_amount', COALESCE(SUM(s.total_amount), 0),
        'average_purchase', COALESCE(AVG(s.total_amount), 0),
        'last_purchase_date', MAX(s.created_at),
        'credit_limit', c.credit_limit,
        'is_vip', c.is_vip
      )
    )
    FROM customers c
    LEFT JOIN sales s ON c.id = s.customer_id
      AND s.created_at::date BETWEEN p_date_from AND p_date_to
      AND s.status = 'completed'
    WHERE c.company_id = p_company_id
      AND c.is_active = true
    GROUP BY c.id, c.business_name, c.identification_number, c.email, c.phone, c.credit_limit, c.is_vip
    ORDER BY COALESCE(SUM(s.total_amount), 0) DESC
    LIMIT p_top_limit
  );
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar reporte financiero
CREATE OR REPLACE FUNCTION generate_financial_report(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'income', jsonb_build_object(
      'sales', (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM sales
        WHERE company_id = p_company_id
          AND created_at::date BETWEEN p_date_from AND p_date_to
          AND status = 'completed'
      ),
      'account_deposits', (
        SELECT COALESCE(SUM(amount), 0)
        FROM account_transactions
        WHERE company_id = p_company_id
          AND transaction_date::date BETWEEN p_date_from AND p_date_to
          AND transaction_type IN ('DEPOSIT', 'TRANSFER_IN', 'RECEIPT')
      )
    ),
    'expenses', jsonb_build_object(
      'purchases', (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM purchases
        WHERE company_id = p_company_id
          AND created_at::date BETWEEN p_date_from AND p_date_to
          AND status = 'received'
      ),
      'account_withdrawals', (
        SELECT COALESCE(SUM(ABS(amount)), 0)
        FROM account_transactions
        WHERE company_id = p_company_id
          AND transaction_date::date BETWEEN p_date_from AND p_date_to
          AND transaction_type IN ('WITHDRAWAL', 'TRANSFER_OUT', 'PAYMENT', 'FEE')
      )
    ),
    'accounts_summary', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'account_name', account_name,
          'account_type', account_type,
          'current_balance', current_balance,
          'currency', currency
        )
      )
      FROM accounts
      WHERE company_id = p_company_id
        AND is_active = true
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar reporte de turnos
CREATE OR REPLACE FUNCTION generate_shifts_report(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_cashier_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'shift_id', sh.id,
        'cashier_name', pr.full_name,
        'start_time', sh.start_time,
        'end_time', sh.end_time,
        'initial_cash', sh.initial_cash,
        'final_cash', sh.final_cash,
        'total_sales', sh.total_sales,
        'total_transactions', sh.total_transactions,
        'status', sh.status,
        'cash_movements', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'movement_type', cm.movement_type,
              'amount', cm.amount,
              'description', cm.description,
              'created_at', cm.created_at
            )
          )
          FROM cash_movements cm
          WHERE cm.shift_id = sh.id
        )
      )
    )
    FROM shifts sh
    LEFT JOIN profiles pr ON sh.cashier_id = pr.id
    WHERE sh.company_id = p_company_id
      AND sh.start_time::date BETWEEN p_date_from AND p_date_to
      AND (p_cashier_id IS NULL OR sh.cashier_id = p_cashier_id)
    ORDER BY sh.start_time DESC
  );
END;
$$ LANGUAGE plpgsql;

-- Crear RLS policies
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas para reports
CREATE POLICY "Users can view reports from their company" ON reports FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reports in their company" ON reports FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update reports in their company" ON reports FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete reports in their company" ON reports FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Políticas para report_history
CREATE POLICY "Users can view report history from their company" ON report_history FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert report history in their company" ON report_history FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Políticas para report_schedules
CREATE POLICY "Users can view report schedules from their company" ON report_schedules FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert report schedules in their company" ON report_schedules FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update report schedules in their company" ON report_schedules FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete report schedules in their company" ON report_schedules FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Agregar permisos para reportes
INSERT INTO public.permissions (name, description, module, action, resource, created_at, updated_at)
VALUES
  ('reports.read', 'Ver reportes', 'reports', 'read', 'report', now(), now()),
  ('reports.create', 'Crear reportes', 'reports', 'create', 'report', now(), now()),
  ('reports.update', 'Actualizar reportes', 'reports', 'update', 'report', now(), now()),
  ('reports.delete', 'Eliminar reportes', 'reports', 'delete', 'report', now(), now()),
  ('reports.generate', 'Generar reportes', 'reports', 'generate', 'report', now(), now()),
  ('reports.export', 'Exportar reportes', 'reports', 'export', 'report', now(), now()),
  ('reports.schedule', 'Programar reportes', 'reports', 'schedule', 'report', now(), now())
ON CONFLICT (name) DO NOTHING;

-- Asignar permisos al rol de Administrador
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by)
SELECT
  r.id,
  p.id,
  now(),
  auth.uid()
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Administrador'
  AND p.name IN (
    'reports.read',
    'reports.create',
    'reports.update',
    'reports.delete',
    'reports.generate',
    'reports.export',
    'reports.schedule'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE reports IS 'Definiciones de reportes configurables';
COMMENT ON TABLE report_history IS 'Historial de reportes generados';
COMMENT ON TABLE report_schedules IS 'Programación automática de reportes';
COMMENT ON FUNCTION generate_sales_report IS 'Genera reporte de ventas con estadísticas';
COMMENT ON FUNCTION generate_best_selling_products_report IS 'Genera reporte de productos más vendidos';
COMMENT ON FUNCTION generate_inventory_report IS 'Genera reporte de inventario actual';
COMMENT ON FUNCTION generate_customers_report IS 'Genera reporte de clientes y sus compras';
COMMENT ON FUNCTION generate_financial_report IS 'Genera reporte financiero con ingresos y egresos';
COMMENT ON FUNCTION generate_shifts_report IS 'Genera reporte de turnos y movimientos de efectivo';
