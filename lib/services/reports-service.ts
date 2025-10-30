import { createClient } from '@/lib/supabase/client';
import type {
  Report,
  CreateReportData,
  UpdateReportData,
  ReportHistory,
  CreateReportHistoryData,
  ReportSchedule,
  CreateReportScheduleData,
  UpdateReportScheduleData,
  ReportSearchParams,
  ReportHistorySearchParams,
  ReportType,
  ExportFormat,
  SalesReportResult,
  BestSellingProductsReportResult,
  InventoryReportResult,
  CustomersReportResult,
  FinancialReportResult,
  ShiftsReportResult,
} from '@/lib/types/reports';

export class ReportsService {
  private static supabase = createClient();

  // ==================== CRUD de Reportes ====================

  /**
   * Obtener todos los reportes de una empresa
   */
  static async getReports(
    companyId: string,
    params: ReportSearchParams = {}
  ): Promise<{ reports: Report[]; total: number }> {
    try {
      let query = this.supabase
        .from('reports')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      // Aplicar filtros
      if (params.query) {
        query = query.or(
          `report_name.ilike.%${params.query}%,description.ilike.%${params.query}%`
        );
      }

      if (params.report_type) {
        query = query.eq('report_type', params.report_type);
      }

      if (params.is_active !== undefined) {
        query = query.eq('is_active', params.is_active);
      }

      if (params.is_template !== undefined) {
        query = query.eq('is_template', params.is_template);
      }

      // Ordenar
      const sortBy = params.sort_by || 'created_at';
      const sortOrder = params.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Paginación
      if (params.page && params.limit) {
        const from = (params.page - 1) * params.limit;
        const to = from + params.limit - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        reports: data || [],
        total: count || 0,
      };
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw new Error('Error al obtener reportes');
    }
  }

  /**
   * Obtener un reporte por ID
   */
  static async getReportById(reportId: string): Promise<Report | null> {
    try {
      const { data, error } = await this.supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching report:', error);
      throw new Error('Error al obtener reporte');
    }
  }

  /**
   * Crear un nuevo reporte
   */
  static async createReport(
    companyId: string,
    userId: string,
    data: CreateReportData
  ): Promise<Report> {
    try {
      const { data: report, error } = await this.supabase
        .from('reports')
        .insert({
          company_id: companyId,
          created_by: userId,
          updated_by: userId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      return report;
    } catch (error) {
      console.error('Error creating report:', error);
      throw new Error('Error al crear reporte');
    }
  }

  /**
   * Actualizar un reporte
   */
  static async updateReport(data: UpdateReportData, userId: string): Promise<Report> {
    try {
      const { id, ...updateData } = data;

      const { data: report, error } = await this.supabase
        .from('reports')
        .update({
          ...updateData,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return report;
    } catch (error) {
      console.error('Error updating report:', error);
      throw new Error('Error al actualizar reporte');
    }
  }

  /**
   * Eliminar un reporte
   */
  static async deleteReport(reportId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error('Error al eliminar reporte');
    }
  }

  // ==================== Historial de Reportes ====================

  /**
   * Obtener historial de reportes generados
   */
  static async getReportHistory(
    companyId: string,
    params: ReportHistorySearchParams = {}
  ): Promise<{ history: ReportHistory[]; total: number }> {
    try {
      let query = this.supabase
        .from('report_history')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      // Aplicar filtros
      if (params.query) {
        query = query.ilike('report_name', `%${params.query}%`);
      }

      if (params.report_type) {
        query = query.eq('report_type', params.report_type);
      }

      if (params.status) {
        query = query.eq('status', params.status);
      }

      if (params.date_from) {
        query = query.gte('generated_at', params.date_from);
      }

      if (params.date_to) {
        query = query.lte('generated_at', params.date_to);
      }

      // Ordenar
      const sortBy = params.sort_by || 'generated_at';
      const sortOrder = params.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Paginación
      if (params.page && params.limit) {
        const from = (params.page - 1) * params.limit;
        const to = from + params.limit - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        history: data || [],
        total: count || 0,
      };
    } catch (error) {
      console.error('Error fetching report history:', error);
      throw new Error('Error al obtener historial de reportes');
    }
  }

  /**
   * Crear entrada en historial
   */
  static async createReportHistory(
    companyId: string,
    userId: string,
    data: CreateReportHistoryData
  ): Promise<ReportHistory> {
    try {
      const { data: history, error } = await this.supabase
        .from('report_history')
        .insert({
          company_id: companyId,
          generated_by: userId,
          status: 'PENDING',
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      return history;
    } catch (error) {
      console.error('Error creating report history:', error);
      throw new Error('Error al crear entrada de historial');
    }
  }

  /**
   * Actualizar entrada en historial
   */
  static async updateReportHistory(
    historyId: string,
    updates: Partial<ReportHistory>
  ): Promise<ReportHistory> {
    try {
      const { data: history, error } = await this.supabase
        .from('report_history')
        .update(updates)
        .eq('id', historyId)
        .select()
        .single();

      if (error) throw error;

      return history;
    } catch (error) {
      console.error('Error updating report history:', error);
      throw new Error('Error al actualizar historial');
    }
  }

  // ==================== Generación de Reportes ====================

  /**
   * Generar reporte de ventas
   */
  static async generateSalesReport(
    companyId: string,
    dateFrom: string,
    dateTo: string,
    filters: {
      customerId?: string;
      productId?: string;
      cashierId?: string;
    } = {}
  ): Promise<SalesReportResult> {
    try {
      const { data, error } = await this.supabase.rpc('generate_sales_report', {
        p_company_id: companyId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_customer_id: filters.customerId || null,
        p_product_id: filters.productId || null,
        p_cashier_id: filters.cashierId || null,
      });

      if (error) throw error;

      return data as SalesReportResult;
    } catch (error) {
      console.error('Error generating sales report:', error);
      throw new Error('Error al generar reporte de ventas');
    }
  }

  /**
   * Generar reporte de productos más vendidos
   */
  static async generateBestSellingProductsReport(
    companyId: string,
    dateFrom: string,
    dateTo: string,
    limit: number = 10
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc('generate_best_selling_products_report', {
        p_company_id: companyId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_limit: limit,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error generating best selling products report:', error);
      throw new Error('Error al generar reporte de productos más vendidos');
    }
  }

  /**
   * Generar reporte de inventario
   */
  static async generateInventoryReport(
    companyId: string,
    filters: {
      warehouseId?: string;
      lowStockOnly?: boolean;
    } = {}
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc('generate_inventory_report', {
        p_company_id: companyId,
        p_warehouse_id: filters.warehouseId || null,
        p_low_stock_only: filters.lowStockOnly || false,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error generating inventory report:', error);
      throw new Error('Error al generar reporte de inventario');
    }
  }

  /**
   * Generar reporte de clientes
   */
  static async generateCustomersReport(
    companyId: string,
    dateFrom: string,
    dateTo: string,
    topLimit: number = 10
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc('generate_customers_report', {
        p_company_id: companyId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_top_limit: topLimit,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error generating customers report:', error);
      throw new Error('Error al generar reporte de clientes');
    }
  }

  /**
   * Generar reporte financiero
   */
  static async generateFinancialReport(
    companyId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<FinancialReportResult> {
    try {
      const { data, error } = await this.supabase.rpc('generate_financial_report', {
        p_company_id: companyId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });

      if (error) throw error;

      return data as FinancialReportResult;
    } catch (error) {
      console.error('Error generating financial report:', error);
      throw new Error('Error al generar reporte financiero');
    }
  }

  /**
   * Generar reporte de turnos
   */
  static async generateShiftsReport(
    companyId: string,
    dateFrom: string,
    dateTo: string,
    cashierId?: string
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc('generate_shifts_report', {
        p_company_id: companyId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_cashier_id: cashierId || null,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error generating shifts report:', error);
      throw new Error('Error al generar reporte de turnos');
    }
  }

  /**
   * Generar reporte genérico
   */
  static async generateReport(
    companyId: string,
    userId: string,
    reportType: ReportType,
    parameters: Record<string, any>
  ): Promise<any> {
    const startTime = Date.now();

    try {
      let reportData: any = null;

      // Generar según tipo
      switch (reportType) {
        case 'SALES':
        case 'SALES_BY_PAYMENT_METHOD':
          reportData = await this.generateSalesReport(
            companyId,
            parameters.date_from,
            parameters.date_to,
            {
              customerId: parameters.customer_id,
              productId: parameters.product_id,
              cashierId: parameters.cashier_id,
            }
          );
          break;

        case 'PRODUCTS_BEST_SELLING':
          reportData = await this.generateBestSellingProductsReport(
            companyId,
            parameters.date_from,
            parameters.date_to,
            parameters.limit || 10
          );
          break;

        case 'INVENTORY':
        case 'INVENTORY_LOW_STOCK':
          reportData = await this.generateInventoryReport(companyId, {
            warehouseId: parameters.warehouse_id,
            lowStockOnly: reportType === 'INVENTORY_LOW_STOCK',
          });
          break;

        case 'CUSTOMERS':
        case 'CUSTOMERS_TOP':
          reportData = await this.generateCustomersReport(
            companyId,
            parameters.date_from,
            parameters.date_to,
            parameters.limit || 10
          );
          break;

        case 'FINANCIAL':
          reportData = await this.generateFinancialReport(
            companyId,
            parameters.date_from,
            parameters.date_to
          );
          break;

        case 'SHIFTS':
        case 'CASH_MOVEMENTS':
          reportData = await this.generateShiftsReport(
            companyId,
            parameters.date_from,
            parameters.date_to,
            parameters.cashier_id
          );
          break;

        default:
          throw new Error(`Tipo de reporte no soportado: ${reportType}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        data: reportData,
        execution_time_ms: executionTime,
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  // ==================== Programación de Reportes ====================

  /**
   * Obtener programaciones de reportes
   */
  static async getReportSchedules(
    companyId: string,
    reportId?: string
  ): Promise<ReportSchedule[]> {
    try {
      let query = this.supabase
        .from('report_schedules')
        .select('*')
        .eq('company_id', companyId);

      if (reportId) {
        query = query.eq('report_id', reportId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching report schedules:', error);
      throw new Error('Error al obtener programaciones');
    }
  }

  /**
   * Crear programación de reporte
   */
  static async createReportSchedule(
    companyId: string,
    userId: string,
    data: CreateReportScheduleData
  ): Promise<ReportSchedule> {
    try {
      const { data: schedule, error } = await this.supabase
        .from('report_schedules')
        .insert({
          company_id: companyId,
          created_by: userId,
          updated_by: userId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      return schedule;
    } catch (error) {
      console.error('Error creating report schedule:', error);
      throw new Error('Error al crear programación');
    }
  }

  /**
   * Actualizar programación de reporte
   */
  static async updateReportSchedule(
    data: UpdateReportScheduleData,
    userId: string
  ): Promise<ReportSchedule> {
    try {
      const { id, ...updateData } = data;

      const { data: schedule, error } = await this.supabase
        .from('report_schedules')
        .update({
          ...updateData,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return schedule;
    } catch (error) {
      console.error('Error updating report schedule:', error);
      throw new Error('Error al actualizar programación');
    }
  }

  /**
   * Eliminar programación de reporte
   */
  static async deleteReportSchedule(scheduleId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('report_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting report schedule:', error);
      throw new Error('Error al eliminar programación');
    }
  }

  // ==================== Funciones Auxiliares ====================

  /**
   * Obtener tipos de reporte disponibles
   */
  static getAvailableReportTypes(): { value: ReportType; label: string }[] {
    return [
      { value: 'SALES', label: 'Reporte de Ventas' },
      { value: 'SALES_BY_PRODUCT', label: 'Ventas por Producto' },
      { value: 'SALES_BY_CUSTOMER', label: 'Ventas por Cliente' },
      { value: 'SALES_BY_CASHIER', label: 'Ventas por Cajero' },
      { value: 'SALES_BY_PAYMENT_METHOD', label: 'Ventas por Método de Pago' },
      { value: 'INVENTORY', label: 'Reporte de Inventario' },
      { value: 'INVENTORY_MOVEMENTS', label: 'Movimientos de Inventario' },
      { value: 'INVENTORY_LOW_STOCK', label: 'Productos con Stock Bajo' },
      { value: 'CUSTOMERS', label: 'Reporte de Clientes' },
      { value: 'CUSTOMERS_TOP', label: 'Top Clientes' },
      { value: 'PRODUCTS', label: 'Reporte de Productos' },
      { value: 'PRODUCTS_BEST_SELLING', label: 'Productos Más Vendidos' },
      { value: 'PRODUCTS_PROFITABILITY', label: 'Rentabilidad de Productos' },
      { value: 'FINANCIAL', label: 'Reporte Financiero' },
      { value: 'ACCOUNTS', label: 'Reporte de Cuentas' },
      { value: 'ACCOUNT_TRANSACTIONS', label: 'Transacciones de Cuentas' },
      { value: 'SHIFTS', label: 'Reporte de Turnos' },
      { value: 'CASH_MOVEMENTS', label: 'Movimientos de Efectivo' },
      { value: 'PURCHASES', label: 'Reporte de Compras' },
      { value: 'TAXES', label: 'Reporte de Impuestos' },
      { value: 'GENERAL', label: 'Reporte General' },
    ];
  }
}
