// Types for Reports Module

// Tipo de reporte
export type ReportType =
  | 'SALES'
  | 'SALES_BY_PRODUCT'
  | 'SALES_BY_CUSTOMER'
  | 'SALES_BY_CASHIER'
  | 'SALES_BY_PAYMENT_METHOD'
  | 'INVENTORY'
  | 'INVENTORY_MOVEMENTS'
  | 'INVENTORY_LOW_STOCK'
  | 'CUSTOMERS'
  | 'CUSTOMERS_TOP'
  | 'PRODUCTS'
  | 'PRODUCTS_BEST_SELLING'
  | 'PRODUCTS_PROFITABILITY'
  | 'FINANCIAL'
  | 'ACCOUNTS'
  | 'ACCOUNT_TRANSACTIONS'
  | 'SHIFTS'
  | 'CASH_MOVEMENTS'
  | 'PURCHASES'
  | 'TAXES'
  | 'GENERAL'
  // Reportes contables colombianos
  | 'BALANCE_SHEET'
  | 'INCOME_STATEMENT'
  | 'CASH_FLOW'
  | 'TRIAL_BALANCE'
  | 'LEDGER'
  | 'JOURNAL'
  // Reportes fiscales DIAN
  | 'RETENCION_FUENTE'
  | 'RETENCION_IVA'
  | 'RETENCION_ICA'
  | 'IVA_DECLARACION'
  | 'RETEICA_DECLARACION'
  | 'MEDIOS_MAGNETICOS'
  | 'CERTIFICADO_RETENCION'
  | 'FORMATO_1001'
  | 'FORMATO_1003'
  | 'FORMATO_1004'
  | 'FORMATO_1005'
  | 'FORMATO_1006'
  | 'FORMATO_1007'
  | 'FORMATO_1008'
  | 'FORMATO_1009'
  // Reportes de nómina
  | 'NOMINA'
  | 'SEGURIDAD_SOCIAL'
  | 'PARAFISCALES'
  // Reportes de cartera
  | 'CARTERA_CLIENTES'
  | 'CARTERA_VENCIDA'
  | 'ANTIGUEDAD_CARTERA'
  | 'CARTERA_PROVEEDORES'
  // Reportes de costos
  | 'COSTO_VENTAS'
  | 'UTILIDAD_BRUTA'
  | 'MARGEN_CONTRIBUCION'
  | 'PUNTO_EQUILIBRIO'
  // Reportes de activos
  | 'ACTIVOS_FIJOS'
  | 'DEPRECIACION'
  | 'INVENTARIO_FISICO'
  // Reportes bancarios
  | 'CONCILIACION_BANCARIA'
  | 'EXTRACTOS_BANCARIOS'
  | 'MOVIMIENTOS_BANCOS';

// Formato de exportación
export type ExportFormat = 'PDF' | 'EXCEL' | 'CSV';

// Estado del reporte generado
export type ReportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

// Tipo de programación
export type ScheduleType =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY'
  | 'CUSTOM';

// Interfaz principal de reporte
export interface Report {
  id: string;
  company_id: string;
  report_name: string;
  report_type: ReportType;
  parameters?: Record<string, any>;
  date_from?: string;
  date_to?: string;
  customer_id?: string;
  product_id?: string;
  category_id?: string;
  cashier_id?: string;
  warehouse_id?: string;
  account_id?: string;
  export_format: ExportFormat;
  include_charts: boolean;
  include_summary: boolean;
  include_details: boolean;
  is_active: boolean;
  is_template: boolean;
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// Datos para crear un reporte
export interface CreateReportData {
  report_name: string;
  report_type: ReportType;
  parameters?: Record<string, any>;
  date_from?: string;
  date_to?: string;
  customer_id?: string;
  product_id?: string;
  category_id?: string;
  cashier_id?: string;
  warehouse_id?: string;
  account_id?: string;
  export_format?: ExportFormat;
  include_charts?: boolean;
  include_summary?: boolean;
  include_details?: boolean;
  is_template?: boolean;
  description?: string;
  notes?: string;
}

// Datos para actualizar un reporte
export interface UpdateReportData extends Partial<CreateReportData> {
  id: string;
}

// Historial de reportes generados
export interface ReportHistory {
  id: string;
  report_id?: string;
  company_id: string;
  report_name: string;
  report_type: ReportType;
  parameters?: Record<string, any>;
  date_from?: string;
  date_to?: string;
  status: ReportStatus;
  report_data?: Record<string, any>;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  export_format?: ExportFormat;
  execution_time_ms?: number;
  total_records?: number;
  error_message?: string;
  generated_at: string;
  generated_by?: string;
  expires_at?: string;
}

// Datos para crear entrada en historial
export interface CreateReportHistoryData {
  report_id?: string;
  report_name: string;
  report_type: ReportType;
  parameters?: Record<string, any>;
  date_from?: string;
  date_to?: string;
  export_format?: ExportFormat;
}

// Programación de reportes
export interface ReportSchedule {
  id: string;
  report_id: string;
  company_id: string;
  schedule_name: string;
  schedule_type: ScheduleType;
  frequency_value?: number;
  day_of_week?: number;
  day_of_month?: number;
  time_of_day: string;
  recipients: string[];
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// Datos para crear programación
export interface CreateReportScheduleData {
  report_id: string;
  schedule_name: string;
  schedule_type: ScheduleType;
  frequency_value?: number;
  day_of_week?: number;
  day_of_month?: number;
  time_of_day?: string;
  recipients?: string[];
}

// Datos para actualizar programación
export interface UpdateReportScheduleData extends Partial<CreateReportScheduleData> {
  id: string;
}

// Parámetros de búsqueda de reportes
export interface ReportSearchParams {
  query?: string;
  report_type?: ReportType;
  is_active?: boolean;
  is_template?: boolean;
  sort_by?: 'report_name' | 'report_type' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Parámetros de búsqueda de historial
export interface ReportHistorySearchParams {
  query?: string;
  report_type?: ReportType;
  status?: ReportStatus;
  date_from?: string;
  date_to?: string;
  sort_by?: 'generated_at' | 'report_name' | 'status';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Resultado de reporte de ventas
export interface SalesReportResult {
  summary: {
    total_sales: number;
    total_cost: number;
    gross_profit: number;
    profit_margin: number;
    total_transactions: number;
    avg_ticket: number;
    total_amount?: number;
    total_discount?: number;
    total_tax?: number;
    average_sale?: number;
  };
  sales_trend: Array<{
    period: string;
    total_sales: number;
    total_cost: number;
    profit: number;
    transactions: number;
  }>;
  top_products: Array<{
    product_name: string;
    quantity: number;
    total: number;
    avg_price: number;
  }>;
  payment_methods: Array<{
    method: string;
    total: number;
  }>;
  by_cashier: Array<{
    cashier_name: string;
    transactions: number;
    total_sales: number;
    avg_ticket: number;
  }>;
  by_payment_method?: Record<string, {
    count: number;
    total: number;
  }>;
  by_status?: Record<string, {
    count: number;
    total: number;
  }>;
  sales_by_date?: Array<{
    date: string;
    count: number;
    total: number;
  }>;
}

// Resultado de reporte de productos más vendidos
export interface BestSellingProductsReportResult {
  products: Array<{
    product_id: string;
    product_name: string;
    sku: string;
    category: string;
    quantity_sold: number;
    total_sales: number;
    average_price: number;
  }>;
}

// Resultado de reporte de inventario
export interface InventoryReportResult {
  products: Array<{
    product_id: string;
    product_name: string;
    sku: string;
    category: string;
    warehouse: string;
    quantity: number;
    reserved_quantity: number;
    available_quantity: number;
    min_stock: number;
    max_stock: number;
    cost_price: number;
    selling_price: number;
    total_value: number;
    is_low_stock: boolean;
  }>;
}

// Resultado de reporte de clientes
export interface CustomersReportResult {
  customers: Array<{
    customer_id: string;
    customer_name: string;
    identification: string;
    email: string;
    phone: string;
    total_purchases: number;
    total_amount: number;
    average_purchase: number;
    last_purchase_date: string;
    credit_limit: number;
    is_vip: boolean;
  }>;
}

// Resultado de reporte financiero
export interface FinancialReportResult {
  total_revenue: number;
  total_cost: number;
  total_expenses: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  revenue_by_category: Array<{
    category: string;
    total: number;
  }>;
  expenses_by_category: Array<{
    category: string;
    total: number;
  }>;
  income?: {
    sales: number;
    account_deposits: number;
  };
  expenses?: {
    purchases: number;
    account_withdrawals: number;
  };
  accounts_summary?: Array<{
    account_name: string;
    account_type: string;
    current_balance: number;
    currency: string;
  }>;
}

// Resultado de reporte de turnos
export interface ShiftsReportResult {
  shifts: Array<{
    shift_id: string;
    cashier_name: string;
    start_time: string;
    end_time?: string;
    initial_cash: number;
    final_cash?: number;
    total_sales: number;
    total_transactions: number;
    status: string;
    cash_movements: Array<{
      movement_type: string;
      amount: number;
      description: string;
      created_at: string;
    }>;
  }>;
}

// Mapeo de nombres amigables de tipos de reporte
export const reportTypeNames: Record<ReportType, string> = {
  SALES: 'Reporte de Ventas',
  SALES_BY_PRODUCT: 'Ventas por Producto',
  SALES_BY_CUSTOMER: 'Ventas por Cliente',
  SALES_BY_CASHIER: 'Ventas por Cajero',
  SALES_BY_PAYMENT_METHOD: 'Ventas por Método de Pago',
  INVENTORY: 'Reporte de Inventario',
  INVENTORY_MOVEMENTS: 'Movimientos de Inventario',
  INVENTORY_LOW_STOCK: 'Productos con Stock Bajo',
  CUSTOMERS: 'Reporte de Clientes',
  CUSTOMERS_TOP: 'Top Clientes',
  PRODUCTS: 'Reporte de Productos',
  PRODUCTS_BEST_SELLING: 'Productos Más Vendidos',
  PRODUCTS_PROFITABILITY: 'Rentabilidad de Productos',
  FINANCIAL: 'Reporte Financiero',
  ACCOUNTS: 'Reporte de Cuentas',
  ACCOUNT_TRANSACTIONS: 'Transacciones de Cuentas',
  SHIFTS: 'Reporte de Turnos',
  CASH_MOVEMENTS: 'Movimientos de Efectivo',
  PURCHASES: 'Reporte de Compras',
  TAXES: 'Reporte de Impuestos',
  GENERAL: 'Reporte General',
  // Reportes contables
  BALANCE_SHEET: 'Balance General',
  INCOME_STATEMENT: 'Estado de Resultados (P&G)',
  CASH_FLOW: 'Flujo de Caja',
  TRIAL_BALANCE: 'Balance de Comprobación',
  LEDGER: 'Libro Mayor',
  JOURNAL: 'Libro Diario',
  // Reportes DIAN
  RETENCION_FUENTE: 'Retención en la Fuente',
  RETENCION_IVA: 'Retención de IVA',
  RETENCION_ICA: 'Retención de ICA',
  IVA_DECLARACION: 'Declaración de IVA',
  RETEICA_DECLARACION: 'Declaración de ReteICA',
  MEDIOS_MAGNETICOS: 'Medios Magnéticos (Info Exógena)',
  CERTIFICADO_RETENCION: 'Certificados de Retención',
  FORMATO_1001: 'Formato 1001 - Pagos y Retenciones',
  FORMATO_1003: 'Formato 1003 - Ingresos Recibidos',
  FORMATO_1004: 'Formato 1004 - Pagos por Salarios',
  FORMATO_1005: 'Formato 1005 - Retenciones Practicadas',
  FORMATO_1006: 'Formato 1006 - Ingresos para Terceros',
  FORMATO_1007: 'Formato 1007 - Ingresos Terceros',
  FORMATO_1008: 'Formato 1008 - Retenciones IVA',
  FORMATO_1009: 'Formato 1009 - Retenciones ICA',
  // Nómina
  NOMINA: 'Reporte de Nómina',
  SEGURIDAD_SOCIAL: 'Planilla Seguridad Social (PILA)',
  PARAFISCALES: 'Aportes Parafiscales',
  // Cartera
  CARTERA_CLIENTES: 'Cartera de Clientes',
  CARTERA_VENCIDA: 'Cartera Vencida',
  ANTIGUEDAD_CARTERA: 'Antigüedad de Cartera',
  CARTERA_PROVEEDORES: 'Cuentas por Pagar',
  // Costos
  COSTO_VENTAS: 'Costo de Ventas',
  UTILIDAD_BRUTA: 'Utilidad Bruta',
  MARGEN_CONTRIBUCION: 'Margen de Contribución',
  PUNTO_EQUILIBRIO: 'Punto de Equilibrio',
  // Activos
  ACTIVOS_FIJOS: 'Activos Fijos',
  DEPRECIACION: 'Depreciación de Activos',
  INVENTARIO_FISICO: 'Inventario Físico vs Contable',
  // Bancarios
  CONCILIACION_BANCARIA: 'Conciliación Bancaria',
  EXTRACTOS_BANCARIOS: 'Extractos Bancarios',
  MOVIMIENTOS_BANCOS: 'Movimientos Bancarios',
};

// Mapeo de iconos por tipo de reporte
export const reportTypeIcons: Record<ReportType, string> = {
  SALES: 'ShoppingCart',
  SALES_BY_PRODUCT: 'Package',
  SALES_BY_CUSTOMER: 'Users',
  SALES_BY_CASHIER: 'User',
  SALES_BY_PAYMENT_METHOD: 'CreditCard',
  INVENTORY: 'Warehouse',
  INVENTORY_MOVEMENTS: 'TrendingUp',
  INVENTORY_LOW_STOCK: 'AlertTriangle',
  CUSTOMERS: 'Users',
  CUSTOMERS_TOP: 'Award',
  PRODUCTS: 'Package',
  PRODUCTS_BEST_SELLING: 'TrendingUp',
  PRODUCTS_PROFITABILITY: 'DollarSign',
  FINANCIAL: 'DollarSign',
  ACCOUNTS: 'Wallet',
  ACCOUNT_TRANSACTIONS: 'ArrowLeftRight',
  SHIFTS: 'Clock',
  CASH_MOVEMENTS: 'Banknote',
  PURCHASES: 'ShoppingBag',
  TAXES: 'Receipt',
  GENERAL: 'FileText',
  // Reportes contables
  BALANCE_SHEET: 'FileSpreadsheet',
  INCOME_STATEMENT: 'TrendingUp',
  CASH_FLOW: 'Banknote',
  TRIAL_BALANCE: 'Calculator',
  LEDGER: 'BookOpen',
  JOURNAL: 'BookOpen',
  // Reportes DIAN
  RETENCION_FUENTE: 'Receipt',
  RETENCION_IVA: 'Receipt',
  RETENCION_ICA: 'Receipt',
  IVA_DECLARACION: 'FileText',
  RETEICA_DECLARACION: 'FileText',
  MEDIOS_MAGNETICOS: 'Database',
  CERTIFICADO_RETENCION: 'FileCheck',
  FORMATO_1001: 'FileText',
  FORMATO_1003: 'FileText',
  FORMATO_1004: 'FileText',
  FORMATO_1005: 'FileText',
  FORMATO_1006: 'FileText',
  FORMATO_1007: 'FileText',
  FORMATO_1008: 'FileText',
  FORMATO_1009: 'FileText',
  // Nómina
  NOMINA: 'Users',
  SEGURIDAD_SOCIAL: 'Shield',
  PARAFISCALES: 'FileText',
  // Cartera
  CARTERA_CLIENTES: 'Users',
  CARTERA_VENCIDA: 'AlertTriangle',
  ANTIGUEDAD_CARTERA: 'Calendar',
  CARTERA_PROVEEDORES: 'ShoppingBag',
  // Costos
  COSTO_VENTAS: 'TrendingDown',
  UTILIDAD_BRUTA: 'TrendingUp',
  MARGEN_CONTRIBUCION: 'Percent',
  PUNTO_EQUILIBRIO: 'Target',
  // Activos
  ACTIVOS_FIJOS: 'Building',
  DEPRECIACION: 'TrendingDown',
  INVENTARIO_FISICO: 'ClipboardCheck',
  // Bancarios
  CONCILIACION_BANCARIA: 'CheckCircle',
  EXTRACTOS_BANCARIOS: 'FileText',
  MOVIMIENTOS_BANCOS: 'ArrowLeftRight',
};

// Categorías de reportes
export const reportCategories = {
  sales: ['SALES', 'SALES_BY_PRODUCT', 'SALES_BY_CUSTOMER', 'SALES_BY_CASHIER', 'SALES_BY_PAYMENT_METHOD'],
  inventory: ['INVENTORY', 'INVENTORY_MOVEMENTS', 'INVENTORY_LOW_STOCK', 'INVENTARIO_FISICO'],
  customers: ['CUSTOMERS', 'CUSTOMERS_TOP'],
  products: ['PRODUCTS', 'PRODUCTS_BEST_SELLING', 'PRODUCTS_PROFITABILITY'],
  financial: ['FINANCIAL', 'ACCOUNTS', 'ACCOUNT_TRANSACTIONS'],
  operations: ['SHIFTS', 'CASH_MOVEMENTS', 'PURCHASES'],
  taxes: ['TAXES'],
  general: ['GENERAL'],
  accounting: ['BALANCE_SHEET', 'INCOME_STATEMENT', 'CASH_FLOW', 'TRIAL_BALANCE', 'LEDGER', 'JOURNAL'],
  dian: ['RETENCION_FUENTE', 'RETENCION_IVA', 'RETENCION_ICA', 'IVA_DECLARACION', 'RETEICA_DECLARACION', 'MEDIOS_MAGNETICOS', 'CERTIFICADO_RETENCION', 'FORMATO_1001', 'FORMATO_1003', 'FORMATO_1004', 'FORMATO_1005', 'FORMATO_1006', 'FORMATO_1007', 'FORMATO_1008', 'FORMATO_1009'],
  payroll: ['NOMINA', 'SEGURIDAD_SOCIAL', 'PARAFISCALES'],
  receivables: ['CARTERA_CLIENTES', 'CARTERA_VENCIDA', 'ANTIGUEDAD_CARTERA', 'CARTERA_PROVEEDORES'],
  costs: ['COSTO_VENTAS', 'UTILIDAD_BRUTA', 'MARGEN_CONTRIBUCION', 'PUNTO_EQUILIBRIO'],
  assets: ['ACTIVOS_FIJOS', 'DEPRECIACION'],
  banking: ['CONCILIACION_BANCARIA', 'EXTRACTOS_BANCARIOS', 'MOVIMIENTOS_BANCOS'],
} as const;

// Nombres de categorías
export const categoryNames: Record<keyof typeof reportCategories, string> = {
  sales: 'Ventas',
  inventory: 'Inventario',
  customers: 'Clientes',
  products: 'Productos',
  financial: 'Financiero',
  operations: 'Operaciones',
  taxes: 'Impuestos',
  general: 'General',
  accounting: 'Contabilidad',
  dian: 'Reportes DIAN',
  payroll: 'Nómina',
  receivables: 'Cartera',
  costs: 'Costos',
  assets: 'Activos',
  banking: 'Bancarios',
};

// Funciones utilitarias
export function formatReportType(type: ReportType): string {
  return reportTypeNames[type] || type;
}

export function formatExportFormat(format: ExportFormat): string {
  return format;
}

export function formatReportStatus(status: ReportStatus): string {
  const statusNames: Record<ReportStatus, string> = {
    PENDING: 'Pendiente',
    PROCESSING: 'Procesando',
    COMPLETED: 'Completado',
    FAILED: 'Fallido',
    CANCELLED: 'Cancelado',
  };
  return statusNames[status] || status;
}

export function getReportCategory(reportType: ReportType): keyof typeof reportCategories | null {
  for (const [category, types] of Object.entries(reportCategories)) {
    if ((types as readonly string[]).includes(reportType)) {
      return category as keyof typeof reportCategories;
    }
  }
  return null;
}

export function getStatusColor(status: ReportStatus): string {
  const colors: Record<ReportStatus, string> = {
    PENDING: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    PROCESSING: 'text-blue-600 bg-blue-50 border-blue-200',
    COMPLETED: 'text-green-600 bg-green-50 border-green-200',
    FAILED: 'text-red-600 bg-red-50 border-red-200',
    CANCELLED: 'text-gray-600 bg-gray-50 border-gray-200',
  };
  return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
}

// Resultado de reporte de Balance General (Balance Sheet)
export interface BalanceSheetReportResult {
  as_of_date: string;
  assets: {
    current_assets: number;
    fixed_assets: number;
    total_assets: number;
  };
  liabilities: {
    current_liabilities: number;
    long_term_liabilities: number;
    total_liabilities: number;
  };
  equity: {
    capital: number;
    retained_earnings: number;
    total_equity: number;
  };
  activos?: {
    corrientes: Array<{
      cuenta: string;
      codigo_cuenta: string;
      saldo: number;
    }>;
    no_corrientes: Array<{
      cuenta: string;
      codigo_cuenta: string;
      saldo: number;
    }>;
    total_corrientes: number;
    total_no_corrientes: number;
    total_activos: number;
  };
  pasivos?: {
    corrientes: Array<{
      cuenta: string;
      codigo_cuenta: string;
      saldo: number;
    }>;
    no_corrientes: Array<{
      cuenta: string;
      codigo_cuenta: string;
      saldo: number;
    }>;
    total_corrientes: number;
    total_no_corrientes: number;
    total_pasivos: number;
  };
  patrimonio?: {
    capital: number;
    reservas: number;
    utilidades_retenidas: number;
    utilidad_ejercicio: number;
    total_patrimonio: number;
  };
}

// Resultado de reporte de Estado de Resultados (Income Statement)
export interface IncomeStatementReportResult {
  date_from: string;
  date_to: string;
  revenue: {
    sales: number;
    other_income: number;
    total_revenue: number;
  };
  cost_of_sales: {
    direct_costs: number;
    total_cost_of_sales: number;
  };
  gross_profit: number;
  operating_expenses: {
    administrative: number;
    sales_expenses: number;
    total_operating_expenses: number;
  };
  operating_income: number;
  other_income_expenses: {
    financial_income: number;
    financial_expenses: number;
    total_other: number;
  };
  net_income: number;
  ingresos?: {
    ventas_brutas: number;
    devoluciones: number;
    descuentos: number;
    ventas_netas: number;
  };
  costo_ventas?: {
    inventario_inicial: number;
    compras: number;
    inventario_final: number;
    total_costo_ventas: number;
  };
  utilidad_bruta?: number;
  gastos_operacionales?: {
    administracion: number;
    ventas: number;
    total: number;
  };
  utilidad_operacional?: number;
  otros_ingresos?: number;
  otros_gastos?: number;
  utilidad_antes_impuestos?: number;
  impuesto_renta?: number;
  utilidad_neta?: number;
}

// Resultado de reporte de Flujo de Caja (Cash Flow)
export interface CashFlowReportResult {
  date_from: string;
  date_to: string;
  operating_activities: {
    cash_from_sales: number;
    cash_paid_suppliers: number;
    net_operating_cash: number;
  };
  investing_activities: {
    purchase_assets: number;
    sale_assets: number;
    net_investing_cash: number;
  };
  financing_activities: {
    loans_received: number;
    loans_paid: number;
    net_financing_cash: number;
  };
  net_cash_flow: number;
  beginning_cash: number;
  ending_cash: number;
  actividades_operacion?: {
    utilidad_neta: number;
    ajustes: Array<{
      concepto: string;
      monto: number;
    }>;
    cambios_capital_trabajo: Array<{
      concepto: string;
      monto: number;
    }>;
    total: number;
  };
  actividades_inversion?: {
    compra_activos: number;
    venta_activos: number;
    total: number;
  };
  actividades_financiacion?: {
    prestamos_recibidos: number;
    pago_prestamos: number;
    aportes_capital: number;
    dividendos_pagados: number;
    total: number;
  };
  efectivo_inicial?: number;
  efectivo_final?: number;
  variacion_efectivo?: number;
}

// Resultado de reporte de Retención en la Fuente
export interface RetencionFuenteReportResult {
  date_from: string;
  date_to: string;
  total_base: number;
  total_retenido: number;
  retenciones: Array<{
    fecha: string;
    factura: string;
    base: number;
    tarifa: number;
    valor_retenido: number;
    tercero_identificacion?: string;
    tercero_nombre?: string;
    concepto?: string;
    porcentaje_retencion?: number;
    numero_factura?: string;
  }>;
  resumen_por_concepto?: Array<{
    concepto: string;
    cantidad: number;
    base_total: number;
    retencion_total: number;
  }>;
}

// Resultado de reporte de IVA
export interface IVAReportResult {
  date_from: string;
  date_to: string;
  ventas: {
    base_gravada: number;
    iva_generado: number;
    ventas_excluidas: number;
  };
  compras: {
    base_gravada: number;
    iva_descontable: number;
    compras_excluidas: number;
  };
  saldo_a_pagar: number;
  detalle_por_tarifa: Array<{
    tarifa: number;
    base: number;
    iva: number;
  }>;
  iva_generado?: {
    ventas_19: number;
    iva_19: number;
    ventas_5: number;
    iva_5: number;
    ventas_exentas: number;
    ventas_excluidas: number;
    total_iva_generado: number;
  };
  iva_descontable?: {
    compras_19: number;
    iva_19: number;
    compras_5: number;
    iva_5: number;
    total_iva_descontable: number;
  };
  saldo_favor?: number;
  saldo_pagar?: number;
}

// Resultado de reporte de Cartera de Clientes
export interface CarteraClientesReportResult {
  as_of_date: string;
  total_cartera: number;
  total_vencido: number;
  cartera: Array<{
    cliente: string;
    documento: string;
    factura: string;
    fecha_venta: string;
    valor_total: number;
    valor_pagado: number;
    saldo_pendiente: number;
    dias_vencimiento: number;
    customer_id?: string;
    customer_name?: string;
    identification?: string;
    total_deuda?: number;
    facturas_pendientes?: Array<{
      factura_numero: string;
      fecha_emision: string;
      fecha_vencimiento: string;
      monto_original: number;
      monto_pendiente: number;
      dias_vencido: number;
    }>;
  }>;
  resumen?: {
    total_cartera: number;
    cartera_vencida: number;
    cartera_por_vencer: number;
    cartera_0_30: number;
    cartera_31_60: number;
    cartera_61_90: number;
    cartera_mas_90: number;
  };
}
