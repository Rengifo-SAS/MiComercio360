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
  BalanceSheetReportResult,
  IncomeStatementReportResult,
  CashFlowReportResult,
  RetencionFuenteReportResult,
  IVAReportResult,
  CarteraClientesReportResult,
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
      // Construir query base - usando nombres de columnas directos
      let query = this.supabase
        .from('sales')
        .select(`
          id,
          sale_number,
          created_at,
          total_amount,
          subtotal,
          tax_amount,
          discount_amount,
          status,
          customer_id,
          cashier_id,
          payment_method,
          customers(id, business_name, email, phone),
          cashier:profiles!sales_cashier_id_fkey(id, full_name),
          sale_items(
            id,
            quantity,
            unit_price,
            total_price,
            discount_amount,
            products(id, name, sku, cost_price)
          )
        `)
        .eq('company_id', companyId)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .eq('status', 'COMPLETED');

      // Aplicar filtros
      if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters.cashierId) {
        query = query.eq('cashier_id', filters.cashierId);
      }

      const { data: sales, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!sales || sales.length === 0) {
        // Retornar estructura vacía
        return {
          summary: {
            total_sales: 0,
            total_cost: 0,
            gross_profit: 0,
            profit_margin: 0,
            total_transactions: 0,
            avg_ticket: 0,
          },
          sales_trend: [],
          top_products: [],
          payment_methods: [],
          by_cashier: [],
        };
      }

      // Calcular resumen
      const totalSales = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      
      // Calcular costo total desde los items
      let totalCost = 0;
      sales.forEach((sale) => {
        if (sale.sale_items && Array.isArray(sale.sale_items)) {
          sale.sale_items.forEach((item: any) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const costPrice = product?.cost_price || 0;
            totalCost += costPrice * (item.quantity || 0);
          });
        }
      });
      
      const grossProfit = totalSales - totalCost;
      const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
      const totalTransactions = sales.length;
      const avgTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;

      // Agrupar por productos
      const productMap = new Map<string, { product_name: string; quantity: number; total: number; avg_price: number }>();
      
      sales.forEach((sale) => {
        if (sale.sale_items && Array.isArray(sale.sale_items)) {
          sale.sale_items.forEach((item: any) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            
            if (filters.productId && product?.id !== filters.productId) {
              return;
            }

            const productId = product?.id || 'unknown';
            const productName = product?.name || 'Producto desconocido';
            
            if (!productMap.has(productId)) {
              productMap.set(productId, {
                product_name: productName,
                quantity: 0,
                total: 0,
                avg_price: 0,
              });
            }

            const prod = productMap.get(productId)!;
            prod.quantity += item.quantity || 0;
            prod.total += item.total_price || 0;
          });
        }
      });

      const topProducts = Array.from(productMap.values())
        .map((p) => ({
          ...p,
          avg_price: p.quantity > 0 ? p.total / p.quantity : 0,
        }))
        .sort((a, b) => b.total - a.total);

      // Agrupar por métodos de pago (desde payment_method en sales)
      const paymentMap = new Map<string, { method: string; total: number }>();
      
      sales.forEach((sale) => {
        const methodName = sale.payment_method || 'cash';
        const displayName = methodName === 'cash' ? 'Efectivo' : 
                           methodName === 'card' ? 'Tarjeta' : 
                           methodName === 'transfer' ? 'Transferencia' : 
                           methodName === 'mixed' ? 'Mixto' : 'Otro';
        
        if (!paymentMap.has(displayName)) {
          paymentMap.set(displayName, { method: displayName, total: 0 });
        }

        const method = paymentMap.get(displayName)!;
        method.total += sale.total_amount || 0;
      });

      const paymentMethods = Array.from(paymentMap.values());

      // Agrupar por cajero
      const cashierMap = new Map<string, { cashier_name: string; transactions: number; total_sales: number; avg_ticket: number }>();
      
      sales.forEach((sale) => {
        const cashierProfile = Array.isArray(sale.cashier) ? sale.cashier[0] : sale.cashier;
        const cashierId = cashierProfile?.id || 'unknown';
        const cashierName = cashierProfile?.full_name || 'Usuario desconocido';
        
        if (!cashierMap.has(cashierId)) {
          cashierMap.set(cashierId, {
            cashier_name: cashierName,
            transactions: 0,
            total_sales: 0,
            avg_ticket: 0,
          });
        }

        const cashierStats = cashierMap.get(cashierId)!;
        cashierStats.transactions += 1;
        cashierStats.total_sales += sale.total_amount || 0;
      });

      const byCashier = Array.from(cashierMap.values())
        .map((c) => ({
          ...c,
          avg_ticket: c.transactions > 0 ? c.total_sales / c.transactions : 0,
        }));

      // Tendencia de ventas (agrupar por día)
      const trendMap = new Map<string, { period: string; total_sales: number; total_cost: number; profit: number; transactions: number }>();
      
      sales.forEach((sale) => {
        const date = new Date(sale.created_at);
        const period = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!trendMap.has(period)) {
          trendMap.set(period, {
            period,
            total_sales: 0,
            total_cost: 0,
            profit: 0,
            transactions: 0,
          });
        }

        // Calcular costo de esta venta desde sus items
        let saleCost = 0;
        if (sale.sale_items && Array.isArray(sale.sale_items)) {
          sale.sale_items.forEach((item: any) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const costPrice = product?.cost_price || 0;
            saleCost += costPrice * (item.quantity || 0);
          });
        }

        const trend = trendMap.get(period)!;
        trend.total_sales += sale.total_amount || 0;
        trend.total_cost += saleCost;
        trend.profit += (sale.total_amount || 0) - saleCost;
        trend.transactions += 1;
      });

      const salesTrend = Array.from(trendMap.values()).sort((a, b) => a.period.localeCompare(b.period));

      return {
        summary: {
          total_sales: totalSales,
          total_cost: totalCost,
          gross_profit: grossProfit,
          profit_margin: profitMargin,
          total_transactions: totalTransactions,
          avg_ticket: avgTicket,
        },
        sales_trend: salesTrend,
        top_products: topProducts,
        payment_methods: paymentMethods,
        by_cashier: byCashier,
      };
    } catch (error) {
      console.error('Error generating sales report:', error);
      throw new Error(`Error al generar reporte de ventas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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
      // Obtener items de ventas en el período
      const { data: saleItems, error } = await this.supabase
        .from('sale_items')
        .select(`
          quantity,
          subtotal,
          product:products(id, name, sku),
          sale:sales!inner(id, created_at, company_id, status)
        `)
        .eq('sale.company_id', companyId)
        .eq('sale.status', 'COMPLETED')
        .gte('sale.created_at', dateFrom)
        .lte('sale.created_at', dateTo);

      if (error) throw error;

      if (!saleItems || saleItems.length === 0) {
        return { products: [] };
      }

      // Agrupar por producto
      const productMap = new Map();
      saleItems.forEach((item: any) => {
        const product = Array.isArray(item.product) ? item.product[0] : item.product;
        if (!product) return;

        const productId = product.id;
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product_id: productId,
            product_name: product.name,
            sku: product.sku,
            quantity_sold: 0,
            total_sales: 0,
          });
        }

        const p = productMap.get(productId);
        p.quantity_sold += item.quantity || 0;
        p.total_sales += item.subtotal || 0;
      });

      const products = Array.from(productMap.values())
        .map((p) => ({
          ...p,
          average_price: p.quantity_sold > 0 ? p.total_sales / p.quantity_sold : 0,
        }))
        .sort((a, b) => b.total_sales - a.total_sales)
        .slice(0, limit);

      return { products };
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
      // Obtener productos con inventario
      let query = this.supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          min_stock,
          max_stock,
          cost_price,
          category:categories(id, name),
          inventory:inventory(
            quantity,
            warehouse:warehouses(id, name)
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      const { data: products, error } = await query;

      if (error) throw error;

      if (!products || products.length === 0) {
        return {
          summary: {
            total_products: 0,
            total_stock_value: 0,
            low_stock_count: 0,
            out_of_stock_count: 0,
            overstock_count: 0,
          },
          inventory: [],
        };
      }

      // Procesar inventario
      const inventory: any[] = [];
      let totalStockValue = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let overstockCount = 0;

      products.forEach((product: any) => {
        const inventoryItems = Array.isArray(product.inventory) ? product.inventory : [];
        
        inventoryItems.forEach((inv: any) => {
          if (filters.warehouseId && inv.warehouse?.id !== filters.warehouseId) {
            return;
          }

          const currentStock = inv.quantity || 0;
          const minStock = product.min_stock || 0;
          const maxStock = product.max_stock || 0;
          const stockValue = currentStock * (product.cost_price || 0);

          let status: 'critical' | 'warning' | 'ok' | 'overstock' = 'ok';
          
          if (currentStock === 0) {
            status = 'critical';
            outOfStockCount++;
          } else if (currentStock < minStock) {
            status = 'warning';
            lowStockCount++;
          } else if (maxStock > 0 && currentStock > maxStock) {
            status = 'overstock';
            overstockCount++;
          }

          if (!filters.lowStockOnly || status === 'critical' || status === 'warning') {
            inventory.push({
              product_name: product.name,
              sku: product.sku,
              current_stock: currentStock,
              min_stock: minStock,
              max_stock: maxStock,
              stock_value: stockValue,
              status,
            });

            totalStockValue += stockValue;
          }
        });
      });

      return {
        summary: {
          total_products: products.length,
          total_stock_value: totalStockValue,
          low_stock_count: lowStockCount,
          out_of_stock_count: outOfStockCount,
          overstock_count: overstockCount,
        },
        inventory,
      };
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
      // Obtener todas las ventas del período con información del cliente
      const { data: sales, error } = await this.supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          created_at,
          customer:customers(id, business_name, email, phone)
        `)
        .eq('company_id', companyId)
        .eq('status', 'COMPLETED')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (error) throw error;

      if (!sales || sales.length === 0) {
        return {
          summary: {
            total_customers: 0,
            new_customers: 0,
            total_sales: 0,
            average_per_customer: 0,
          },
          top_customers: [],
          customers: [],
        };
      }

      // Agrupar por cliente
      const customerMap = new Map();
      sales.forEach((sale: any) => {
        const customer = Array.isArray(sale.customer) ? sale.customer[0] : sale.customer;
        const customerId = customer?.id || 'no-customer';
        const customerName = customer?.business_name || 'Cliente General';

        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer_id: customerId,
            customer_name: customerName,
            email: customer?.email || null,
            phone: customer?.phone || null,
            document_number: null,
            total_purchases: 0,
            total_spent: 0,
            last_purchase: sale.created_at,
          });
        }

        const c = customerMap.get(customerId);
        c.total_purchases += 1;
        c.total_spent += sale.total_amount || 0;
        if (sale.created_at > c.last_purchase) {
          c.last_purchase = sale.created_at;
        }
      });

      const customers = Array.from(customerMap.values()).map((c) => ({
        ...c,
        average_ticket: c.total_purchases > 0 ? c.total_spent / c.total_purchases : 0,
      }));

      const topCustomers = [...customers]
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, topLimit);

      const totalSales = customers.reduce((sum, c) => sum + c.total_spent, 0);

      return {
        summary: {
          total_customers: customers.length,
          new_customers: customers.length, // Simplificado, se puede mejorar con fecha de registro
          total_sales: totalSales,
          average_per_customer: customers.length > 0 ? totalSales / customers.length : 0,
        },
        top_customers: topCustomers,
        customers,
      };
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
      // Obtener ventas
      const { data: sales, error: salesError } = await this.supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          created_at,
          sale_items(quantity, unit_price, total_price, products(cost_price))
        `)
        .eq('company_id', companyId)
        .eq('status', 'COMPLETED')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (salesError) throw salesError;

      // Obtener gastos (desde cash_movements con tipo EXPENSE)
      const { data: expenses, error: expensesError } = await this.supabase
        .from('cash_movements')
        .select('id, amount, created_at, description, movement_type')
        .eq('company_id', companyId)
        .eq('movement_type', 'expense')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (expensesError) throw expensesError;

      // Calcular métricas
      let totalRevenue = 0;
      let totalCost = 0;

      (sales || []).forEach((sale: any) => {
        totalRevenue += sale.total_amount || 0;
        const items = Array.isArray(sale.sale_items) ? sale.sale_items : [];
        items.forEach((item: any) => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const costPrice = product?.cost_price || 0;
          totalCost += costPrice * (item.quantity || 0);
        });
      });

      const totalExpenses = (expenses || []).reduce((sum, exp: any) => sum + (exp.amount || 0), 0);
      const grossProfit = totalRevenue - totalCost;
      const netProfit = grossProfit - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return {
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_expenses: totalExpenses,
        gross_profit: grossProfit,
        net_profit: netProfit,
        profit_margin: profitMargin,
        revenue_by_category: [], // Se puede implementar más adelante
        expenses_by_category: [], // Se puede implementar más adelante
      };
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
      // Obtener ventas agrupadas por cajero
      let query = this.supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          created_at,
          cashier:users!sales_cashier_id_fkey(id, full_name, email)
        `)
        .eq('company_id', companyId)
        .eq('status', 'COMPLETED')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (cashierId) {
        query = query.eq('cashier_id', cashierId);
      }

      const { data: sales, error } = await query;

      if (error) throw error;

      if (!sales || sales.length === 0) {
        return {
          summary: {
            total_shifts: 0,
            total_sales: 0,
            total_amount: 0,
          },
          shifts: [],
        };
      }

      // Agrupar por cajero y fecha
      const shiftsMap = new Map();
      sales.forEach((sale: any) => {
        const cashier = Array.isArray(sale.cashier) ? sale.cashier[0] : sale.cashier;
        const cashierId = cashier?.id || 'unknown';
        const cashierName = cashier?.full_name || 'Sin Asignar';
        const date = sale.created_at.split('T')[0]; // YYYY-MM-DD
        const key = `${cashierId}-${date}`;

        if (!shiftsMap.has(key)) {
          shiftsMap.set(key, {
            cashier_id: cashierId,
            cashier_name: cashierName,
            shift_date: date,
            total_sales: 0,
            total_amount: 0,
          });
        }

        const shift = shiftsMap.get(key);
        shift.total_sales += 1;
        shift.total_amount += sale.total_amount || 0;
      });

      const shifts = Array.from(shiftsMap.values());
      const totalAmount = shifts.reduce((sum, s) => sum + s.total_amount, 0);

      return {
        summary: {
          total_shifts: shifts.length,
          total_sales: sales.length,
          total_amount: totalAmount,
        },
        shifts,
      };
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

        case 'BALANCE_SHEET':
          reportData = await this.generateBalanceSheetReport(
            companyId,
            parameters.date_to || parameters.date_from
          );
          break;

        case 'INCOME_STATEMENT':
          reportData = await this.generateIncomeStatementReport(
            companyId,
            parameters.date_from,
            parameters.date_to
          );
          break;

        case 'CASH_FLOW':
          reportData = await this.generateCashFlowReport(
            companyId,
            parameters.date_from,
            parameters.date_to
          );
          break;

        case 'RETENCION_FUENTE':
          reportData = await this.generateRetencionFuenteReport(
            companyId,
            parameters.date_from,
            parameters.date_to
          );
          break;

        case 'IVA_DECLARACION':
          reportData = await this.generateIVADeclaracionReport(
            companyId,
            parameters.date_from,
            parameters.date_to
          );
          break;

        case 'CARTERA_CLIENTES':
          reportData = await this.generateCarteraClientesReport(
            companyId,
            parameters.date_to || new Date().toISOString()
          );
          break;

        case 'CARTERA_VENCIDA':
          reportData = await this.generateCarteraVencidaReport(
            companyId,
            parameters.date_to || new Date().toISOString()
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

  // ==================== Reportes Contables Colombianos ====================

  /**
   * Generar Balance General (Balance Sheet)
   */
  static async generateBalanceSheetReport(
    companyId: string,
    asOfDate: string
  ): Promise<BalanceSheetReportResult> {
    try {
      // Obtener todas las cuentas contables
      const { data: accounts, error: accountsError } = await this.supabase
        .from('accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (accountsError) throw accountsError;

      // Simplificación: Agrupar cuentas por tipo
      const assets = (accounts || []).filter(a => a.account_type === 'ASSET');
      const liabilities = (accounts || []).filter(a => a.account_type === 'LIABILITY');
      const equity = (accounts || []).filter(a => a.account_type === 'EQUITY');

      const totalAssets = assets.reduce((sum, a) => sum + (a.balance || 0), 0);
      const totalLiabilities = liabilities.reduce((sum, a) => sum + (a.balance || 0), 0);
      const totalEquity = equity.reduce((sum, a) => sum + (a.balance || 0), 0);

      return {
        as_of_date: asOfDate,
        assets: {
          current_assets: totalAssets,
          fixed_assets: 0,
          total_assets: totalAssets,
        },
        liabilities: {
          current_liabilities: totalLiabilities,
          long_term_liabilities: 0,
          total_liabilities: totalLiabilities,
        },
        equity: {
          capital: totalEquity,
          retained_earnings: 0,
          total_equity: totalEquity,
        },
      };
    } catch (error) {
      console.error('Error generating balance sheet report:', error);
      throw new Error('Error al generar Balance General');
    }
  }

  /**
   * Generar Estado de Resultados (Income Statement / P&L)
   */
  static async generateIncomeStatementReport(
    companyId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<IncomeStatementReportResult> {
    try {
      // Reutilizar el reporte financiero
      const financialReport = await this.generateFinancialReport(companyId, dateFrom, dateTo);

      return {
        date_from: dateFrom,
        date_to: dateTo,
        revenue: {
          sales: financialReport.total_revenue,
          other_income: 0,
          total_revenue: financialReport.total_revenue,
        },
        cost_of_sales: {
          direct_costs: financialReport.total_cost,
          total_cost_of_sales: financialReport.total_cost,
        },
        gross_profit: financialReport.gross_profit,
        operating_expenses: {
          administrative: financialReport.total_expenses,
          sales_expenses: 0,
          total_operating_expenses: financialReport.total_expenses,
        },
        operating_income: financialReport.net_profit,
        other_income_expenses: {
          financial_income: 0,
          financial_expenses: 0,
          total_other: 0,
        },
        net_income: financialReport.net_profit,
      };
    } catch (error) {
      console.error('Error generating income statement report:', error);
      throw new Error('Error al generar Estado de Resultados');
    }
  }

  /**
   * Generar Flujo de Caja (Cash Flow Statement)
   */
  static async generateCashFlowReport(
    companyId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<CashFlowReportResult> {
    try {
      // Obtener movimientos de efectivo
      const { data: movements, error } = await this.supabase
        .from('cash_movements')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const income = (movements || [])
        .filter(m => m.movement_type === 'income')
        .reduce((sum, m) => sum + (m.amount || 0), 0);

      const expenses = (movements || [])
        .filter(m => m.movement_type === 'expense')
        .reduce((sum, m) => sum + (m.amount || 0), 0);

      const netCashFlow = income - expenses;

      return {
        date_from: dateFrom,
        date_to: dateTo,
        operating_activities: {
          cash_from_sales: income,
          cash_paid_suppliers: expenses,
          net_operating_cash: income - expenses,
        },
        investing_activities: {
          purchase_assets: 0,
          sale_assets: 0,
          net_investing_cash: 0,
        },
        financing_activities: {
          loans_received: 0,
          loans_paid: 0,
          net_financing_cash: 0,
        },
        net_cash_flow: netCashFlow,
        beginning_cash: 0,
        ending_cash: netCashFlow,
      };
    } catch (error) {
      console.error('Error generating cash flow report:', error);
      throw new Error('Error al generar Flujo de Caja');
    }
  }

  // ==================== Reportes Fiscales DIAN ====================

  /**
   * Generar Reporte de Retención en la Fuente
   */
  static async generateRetencionFuenteReport(
    companyId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<RetencionFuenteReportResult> {
    try {
      // Obtener ventas con retención
      const { data: sales, error } = await this.supabase
        .from('sales')
        .select('id, total_amount, created_at, invoice_number')
        .eq('company_id', companyId)
        .eq('status', 'COMPLETED')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (error) throw error;

      // Calcular retenciones (simplificado - 2.5% sobre base)
      const retenciones = (sales || []).map((sale: any) => ({
        fecha: sale.created_at,
        factura: sale.invoice_number || 'N/A',
        base: sale.total_amount || 0,
        tarifa: 2.5,
        valor_retenido: ((sale.total_amount || 0) * 0.025),
      }));

      const totalBase = retenciones.reduce((sum, r) => sum + r.base, 0);
      const totalRetenido = retenciones.reduce((sum, r) => sum + r.valor_retenido, 0);

      return {
        date_from: dateFrom,
        date_to: dateTo,
        total_base: totalBase,
        total_retenido: totalRetenido,
        retenciones,
      };
    } catch (error) {
      console.error('Error generating retencion fuente report:', error);
      throw new Error('Error al generar Reporte de Retención en la Fuente');
    }
  }

  /**
   * Generar Declaración de IVA
   */
  static async generateIVADeclaracionReport(
    companyId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<IVAReportResult> {
    try {
      // Obtener ventas del período
      const { data: sales, error } = await this.supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          created_at,
          sale_items(quantity, unit_price, total_price)
        `)
        .eq('company_id', companyId)
        .eq('status', 'COMPLETED')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (error) throw error;

      // Calcular IVA por tarifa (usando tasa fija del 19% para Colombia)
      const IVA_RATE = 19; // Tasa estándar en Colombia
      const ivaMap = new Map();
      let totalBase = 0;
      let totalIVA = 0;

      (sales || []).forEach((sale: any) => {
        const items = Array.isArray(sale.sale_items) ? sale.sale_items : [];
        items.forEach((item: any) => {
          // Usar el total_price del item (que ya incluye IVA)
          const totalPrice = item.total_price || ((item.quantity || 0) * (item.unit_price || 0));
          const base = totalPrice / (1 + IVA_RATE / 100);
          const iva = totalPrice - base;

          if (!ivaMap.has(IVA_RATE)) {
            ivaMap.set(IVA_RATE, { tarifa: IVA_RATE, base: 0, iva: 0 });
          }

          const entry = ivaMap.get(IVA_RATE);
          entry.base += base;
          entry.iva += iva;
          totalBase += base;
          totalIVA += iva;
        });
      });

      return {
        date_from: dateFrom,
        date_to: dateTo,
        ventas: {
          base_gravada: totalBase,
          iva_generado: totalIVA,
          ventas_excluidas: 0,
        },
        compras: {
          base_gravada: 0,
          iva_descontable: 0,
          compras_excluidas: 0,
        },
        saldo_a_pagar: totalIVA,
        detalle_por_tarifa: Array.from(ivaMap.values()),
      };
    } catch (error) {
      console.error('Error generating IVA report:', error);
      throw new Error('Error al generar Declaración de IVA');
    }
  }

  /**
   * Generar Reporte de Cartera de Clientes
   */
  static async generateCarteraClientesReport(
    companyId: string,
    asOfDate: string
  ): Promise<CarteraClientesReportResult> {
    try {
      // Obtener ventas a crédito pendientes
      const { data: sales, error } = await this.supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          created_at,
          customer:customers(id, business_name)
        `)
        .eq('company_id', companyId)
        .eq('payment_status', 'PENDING')
        .lte('created_at', asOfDate);

      if (error) throw error;

      const cartera = (sales || []).map((sale: any) => {
        const customer = Array.isArray(sale.customer) ? sale.customer[0] : sale.customer;
        // Como no hay sale_payments, asumimos que el saldo pendiente = total (payment_status = 'PENDING')
        const saldoPendiente = sale.total_amount || 0;

        const saleDate = new Date(sale.created_at);
        const asOf = new Date(asOfDate);
        const diasVencimiento = Math.floor((asOf.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          cliente: customer?.business_name || 'Sin Cliente',
          documento: 'N/A',
          factura: sale.id,
          fecha_venta: sale.created_at,
          valor_total: sale.total_amount || 0,
          valor_pagado: 0, // No hay tabla de pagos
          saldo_pendiente: saldoPendiente,
          dias_vencimiento: diasVencimiento > 30 ? diasVencimiento - 30 : 0,
        };
      }).filter(c => c.saldo_pendiente > 0);

      const totalCartera = cartera.reduce((sum, c) => sum + c.saldo_pendiente, 0);
      const carteraVencida = cartera.filter(c => c.dias_vencimiento > 0);
      const totalVencido = carteraVencida.reduce((sum, c) => sum + c.saldo_pendiente, 0);

      return {
        as_of_date: asOfDate,
        total_cartera: totalCartera,
        total_vencido: totalVencido,
        cartera,
      };
    } catch (error) {
      console.error('Error generating cartera clientes report:', error);
      throw new Error('Error al generar Reporte de Cartera de Clientes');
    }
  }

  /**
   * Generar Reporte de Cartera Vencida
   */
  static async generateCarteraVencidaReport(
    companyId: string,
    asOfDate: string
  ): Promise<CarteraClientesReportResult> {
    try {
      const result = await this.generateCarteraClientesReport(companyId, asOfDate);

      // Filtrar solo cartera vencida
      result.cartera = result.cartera.filter(c => c.dias_vencimiento > 0);
      result.total_cartera = result.cartera.reduce((sum, c) => sum + c.saldo_pendiente, 0);

      return result;
    } catch (error) {
      console.error('Error generating cartera vencida report:', error);
      throw new Error('Error al generar Reporte de Cartera Vencida');
    }
  }
}
