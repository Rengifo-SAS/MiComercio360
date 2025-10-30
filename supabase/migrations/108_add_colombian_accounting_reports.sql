-- Agregar reportes contables específicos para Colombia
-- Basado en sistemas contables como Alegra, Siigo, y normativas DIAN
-- 108_add_colombian_accounting_reports.sql

-- Agregar nuevos tipos de reportes contables colombianos
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_report_type_check;
ALTER TABLE reports ADD CONSTRAINT reports_report_type_check CHECK (
  report_type IN (
    -- Reportes de ventas e inventario
    'SALES', 'SALES_BY_PRODUCT', 'SALES_BY_CUSTOMER', 'SALES_BY_CASHIER',
    'SALES_BY_PAYMENT_METHOD', 'INVENTORY', 'INVENTORY_MOVEMENTS',
    'INVENTORY_LOW_STOCK', 'CUSTOMERS', 'CUSTOMERS_TOP', 'PRODUCTS',
    'PRODUCTS_BEST_SELLING', 'PRODUCTS_PROFITABILITY', 'FINANCIAL',
    'ACCOUNTS', 'ACCOUNT_TRANSACTIONS', 'SHIFTS', 'CASH_MOVEMENTS',
    'PURCHASES', 'TAXES', 'GENERAL',

    -- Reportes contables colombianos
    'BALANCE_SHEET', -- Estado de Situación Financiera (Balance General)
    'INCOME_STATEMENT', -- Estado de Resultados (P&G)
    'CASH_FLOW', -- Flujo de Caja
    'TRIAL_BALANCE', -- Balance de Comprobación
    'LEDGER', -- Libro Mayor
    'JOURNAL', -- Libro Diario

    -- Reportes fiscales DIAN
    'RETENCION_FUENTE', -- Retención en la Fuente
    'RETENCION_IVA', -- Retención de IVA
    'RETENCION_ICA', -- Retención de ICA
    'IVA_DECLARACION', -- Declaración de IVA
    'RETEICA_DECLARACION', -- Declaración de ReteICA
    'MEDIOS_MAGNETICOS', -- Información Exógena (Medios Magnéticos)
    'CERTIFICADO_RETENCION', -- Certificados de Retención
    'FORMATO_1001', -- Formato 1001 (Pagos o abonos en cuenta y retenciones practicadas)
    'FORMATO_1003', -- Formato 1003 (Ingresos recibidos)
    'FORMATO_1004', -- Formato 1004 (Pagos por salarios y otras retenciones)
    'FORMATO_1005', -- Formato 1005 (Retenciones en la fuente practicadas)
    'FORMATO_1006', -- Formato 1006 (Ingresos recibidos para terceros)
    'FORMATO_1007', -- Formato 1007 (Ingresos para terceros)
    'FORMATO_1008', -- Formato 1008 (Retenciones en IVA)
    'FORMATO_1009', -- Formato 1009 (Retenciones en ICA)

    -- Reportes de nómina
    'NOMINA', -- Reporte de Nómina
    'SEGURIDAD_SOCIAL', -- Planilla de Seguridad Social (PILA)
    'PARAFISCALES', -- Aportes Parafiscales

    -- Reportes de cartera
    'CARTERA_CLIENTES', -- Cartera de Clientes (Cuentas por Cobrar)
    'CARTERA_VENCIDA', -- Cartera Vencida
    'ANTIGUEDAD_CARTERA', -- Antigüedad de Cartera
    'CARTERA_PROVEEDORES', -- Cuentas por Pagar

    -- Reportes de costos
    'COSTO_VENTAS', -- Costo de Ventas
    'UTILIDAD_BRUTA', -- Utilidad Bruta
    'MARGEN_CONTRIBUCION', -- Margen de Contribución
    'PUNTO_EQUILIBRIO', -- Punto de Equilibrio

    -- Reportes de activos
    'ACTIVOS_FIJOS', -- Activos Fijos
    'DEPRECIACION', -- Depreciación de Activos
    'INVENTARIO_FISICO', -- Inventario Físico vs Contable

    -- Reportes bancarios
    'CONCILIACION_BANCARIA', -- Conciliación Bancaria
    'EXTRACTOS_BANCARIOS', -- Extractos Bancarios
    'MOVIMIENTOS_BANCOS' -- Movimientos Bancarios
  )
);

-- Crear función para generar Balance General (Estado de Situación Financiera)
CREATE OR REPLACE FUNCTION generate_balance_sheet_report(
  p_company_id UUID,
  p_date DATE
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'date', p_date,
    'assets', jsonb_build_object(
      'current_assets', jsonb_build_object(
        'cash', (
          SELECT COALESCE(SUM(current_balance), 0)
          FROM accounts
          WHERE company_id = p_company_id
            AND account_type = 'CASH_BOX'
            AND is_active = true
        ),
        'bank_accounts', (
          SELECT COALESCE(SUM(current_balance), 0)
          FROM accounts
          WHERE company_id = p_company_id
            AND account_type = 'BANK_ACCOUNT'
            AND is_active = true
        ),
        'accounts_receivable', (
          SELECT COALESCE(SUM(total_amount), 0)
          FROM sales
          WHERE company_id = p_company_id
            AND payment_status = 'PENDING'
            AND created_at::date <= p_date
        ),
        'inventory', (
          SELECT COALESCE(SUM(p.cost_price * wi.quantity), 0)
          FROM products p
          LEFT JOIN warehouse_inventory wi ON p.id = wi.product_id
          WHERE p.company_id = p_company_id
            AND p.is_active = true
        )
      ),
      'fixed_assets', jsonb_build_object(
        'property_plant_equipment', 0,
        'accumulated_depreciation', 0
      )
    ),
    'liabilities', jsonb_build_object(
      'current_liabilities', jsonb_build_object(
        'accounts_payable', (
          SELECT COALESCE(SUM(total_amount), 0)
          FROM purchases
          WHERE company_id = p_company_id
            AND status != 'received'
            AND created_at::date <= p_date
        ),
        'taxes_payable', 0
      ),
      'long_term_liabilities', jsonb_build_object(
        'long_term_debt', 0
      )
    ),
    'equity', jsonb_build_object(
      'capital', 0,
      'retained_earnings', (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM sales
        WHERE company_id = p_company_id
          AND status = 'completed'
          AND created_at::date <= p_date
      ) - (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM purchases
        WHERE company_id = p_company_id
          AND status = 'received'
          AND created_at::date <= p_date
      )
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar Estado de Resultados (P&G)
CREATE OR REPLACE FUNCTION generate_income_statement_report(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  gross_revenue DECIMAL(15,2);
  cost_of_sales DECIMAL(15,2);
  operating_expenses DECIMAL(15,2);
BEGIN
  -- Ingresos brutos
  SELECT COALESCE(SUM(total_amount), 0) INTO gross_revenue
  FROM sales
  WHERE company_id = p_company_id
    AND created_at::date BETWEEN p_date_from AND p_date_to
    AND status = 'completed';

  -- Costo de ventas
  SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) INTO cost_of_sales
  FROM sale_items si
  JOIN sales s ON si.sale_id = s.id
  JOIN products p ON si.product_id = p.id
  WHERE s.company_id = p_company_id
    AND s.created_at::date BETWEEN p_date_from AND p_date_to
    AND s.status = 'completed';

  -- Gastos operacionales (simplificado, se deben agregar más categorías)
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO operating_expenses
  FROM account_transactions
  WHERE company_id = p_company_id
    AND transaction_date::date BETWEEN p_date_from AND p_date_to
    AND transaction_type IN ('WITHDRAWAL', 'PAYMENT', 'FEE');

  SELECT jsonb_build_object(
    'period', jsonb_build_object(
      'date_from', p_date_from,
      'date_to', p_date_to
    ),
    'revenue', jsonb_build_object(
      'gross_revenue', gross_revenue,
      'returns', 0,
      'net_revenue', gross_revenue
    ),
    'cost_of_sales', cost_of_sales,
    'gross_profit', gross_revenue - cost_of_sales,
    'operating_expenses', jsonb_build_object(
      'administrative', operating_expenses,
      'sales_expenses', 0,
      'total', operating_expenses
    ),
    'operating_profit', (gross_revenue - cost_of_sales) - operating_expenses,
    'other_income', 0,
    'other_expenses', 0,
    'profit_before_tax', (gross_revenue - cost_of_sales) - operating_expenses,
    'income_tax', 0,
    'net_profit', (gross_revenue - cost_of_sales) - operating_expenses
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar Reporte de Retención en la Fuente
CREATE OR REPLACE FUNCTION generate_retencion_fuente_report(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', s.created_at,
        'document_number', s.sale_number,
        'customer_name', c.business_name,
        'customer_nit', c.identification_number,
        'base_amount', s.total_amount,
        'retention_rate', 0, -- Se debe configurar según tipo de bien/servicio
        'retention_amount', 0, -- Calcular según normativa DIAN
        'retention_type', 'COMPRAS' -- COMPRAS, SERVICIOS, HONORARIOS, etc.
      )
    )
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.company_id = p_company_id
      AND s.created_at::date BETWEEN p_date_from AND p_date_to
      AND s.status = 'completed'
      AND s.total_amount >= 0 -- Umbral de retención según DIAN
  );
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar Reporte de IVA
CREATE OR REPLACE FUNCTION generate_iva_declaracion_report(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  iva_ventas DECIMAL(15,2);
  iva_compras DECIMAL(15,2);
BEGIN
  -- IVA generado (ventas)
  SELECT COALESCE(SUM(tax_amount), 0) INTO iva_ventas
  FROM sales
  WHERE company_id = p_company_id
    AND created_at::date BETWEEN p_date_from AND p_date_to
    AND status = 'completed';

  -- IVA descontable (compras)
  SELECT COALESCE(SUM(tax_amount), 0) INTO iva_compras
  FROM purchases
  WHERE company_id = p_company_id
    AND created_at::date BETWEEN p_date_from AND p_date_to
    AND status = 'received';

  SELECT jsonb_build_object(
    'period', jsonb_build_object(
      'date_from', p_date_from,
      'date_to', p_date_to
    ),
    'iva_generated', jsonb_build_object(
      'sales', iva_ventas,
      'total', iva_ventas
    ),
    'iva_deductible', jsonb_build_object(
      'purchases', iva_compras,
      'total', iva_compras
    ),
    'iva_payable', iva_ventas - iva_compras,
    'details', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', s.created_at,
          'document', s.sale_number,
          'customer', c.business_name,
          'base_amount', s.subtotal,
          'iva_amount', s.tax_amount,
          'total', s.total_amount
        )
      )
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.company_id = p_company_id
        AND s.created_at::date BETWEEN p_date_from AND p_date_to
        AND s.status = 'completed'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar Reporte de Cartera de Clientes
CREATE OR REPLACE FUNCTION generate_cartera_clientes_report(
  p_company_id UUID,
  p_date DATE
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'customer_id', c.id,
        'customer_name', c.business_name,
        'customer_nit', c.identification_number,
        'total_debt', COALESCE(customer_debt.total, 0),
        'overdue_debt', COALESCE(customer_debt.overdue, 0),
        'credit_limit', c.credit_limit,
        'available_credit', c.credit_limit - COALESCE(customer_debt.total, 0),
        'payment_terms', c.payment_terms,
        'invoices', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'invoice_number', s.sale_number,
              'date', s.created_at,
              'due_date', s.created_at + (c.payment_terms || ' days')::interval,
              'amount', s.total_amount,
              'status', s.payment_status,
              'days_overdue', CASE
                WHEN s.payment_status = 'PENDING'
                  AND (s.created_at + (c.payment_terms || ' days')::interval)::date < p_date
                THEN p_date - (s.created_at + (c.payment_terms || ' days')::interval)::date
                ELSE 0
              END
            )
          )
          FROM sales s
          WHERE s.customer_id = c.id
            AND s.payment_status = 'PENDING'
            AND s.created_at::date <= p_date
        )
      )
    )
    FROM customers c
    LEFT JOIN LATERAL (
      SELECT
        SUM(total_amount) as total,
        SUM(
          CASE
            WHEN (s.created_at + (c.payment_terms || ' days')::interval)::date < p_date
            THEN s.total_amount
            ELSE 0
          END
        ) as overdue
      FROM sales s
      WHERE s.customer_id = c.id
        AND s.payment_status = 'PENDING'
        AND s.created_at::date <= p_date
    ) customer_debt ON true
    WHERE c.company_id = p_company_id
      AND c.is_active = true
      AND EXISTS (
        SELECT 1 FROM sales s
        WHERE s.customer_id = c.id
          AND s.payment_status = 'PENDING'
          AND s.created_at::date <= p_date
      )
  );
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar Flujo de Caja
CREATE OR REPLACE FUNCTION generate_cash_flow_report(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'period', jsonb_build_object(
      'date_from', p_date_from,
      'date_to', p_date_to
    ),
    'operating_activities', jsonb_build_object(
      'cash_from_sales', (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM sales
        WHERE company_id = p_company_id
          AND created_at::date BETWEEN p_date_from AND p_date_to
          AND payment_status = 'COMPLETED'
      ),
      'cash_to_suppliers', (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM purchases
        WHERE company_id = p_company_id
          AND created_at::date BETWEEN p_date_from AND p_date_to
          AND status = 'received'
      ),
      'operating_expenses', (
        SELECT COALESCE(SUM(ABS(amount)), 0)
        FROM account_transactions
        WHERE company_id = p_company_id
          AND transaction_date::date BETWEEN p_date_from AND p_date_to
          AND transaction_type IN ('WITHDRAWAL', 'PAYMENT', 'FEE')
      )
    ),
    'investing_activities', jsonb_build_object(
      'investments', 0,
      'asset_purchases', 0
    ),
    'financing_activities', jsonb_build_object(
      'loans_received', 0,
      'loans_paid', 0,
      'capital_contributions', 0
    ),
    'beginning_balance', (
      SELECT COALESCE(SUM(current_balance), 0)
      FROM accounts
      WHERE company_id = p_company_id
        AND is_active = true
    ),
    'ending_balance', (
      SELECT COALESCE(SUM(current_balance), 0)
      FROM accounts
      WHERE company_id = p_company_id
        AND is_active = true
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON FUNCTION generate_balance_sheet_report IS 'Genera Balance General según normas contables colombianas';
COMMENT ON FUNCTION generate_income_statement_report IS 'Genera Estado de Resultados (P&G)';
COMMENT ON FUNCTION generate_retencion_fuente_report IS 'Genera reporte de retenciones en la fuente para DIAN';
COMMENT ON FUNCTION generate_iva_declaracion_report IS 'Genera declaración de IVA según normativa DIAN';
COMMENT ON FUNCTION generate_cartera_clientes_report IS 'Genera reporte de cartera de clientes con análisis de vencimiento';
COMMENT ON FUNCTION generate_cash_flow_report IS 'Genera flujo de caja según método indirecto';
