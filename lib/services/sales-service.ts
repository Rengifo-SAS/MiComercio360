import { createClient } from '@/lib/supabase/client';
import { 
  Sale, 
  SaleItem, 
  CreateSaleData, 
  UpdateSaleData, 
  SaleFilters, 
  SaleSearchParams,
  SaleStats,
  SaleChartData,
  SalesReport,
  calculateSaleTotals
} from '@/lib/types/sales';
import { NumerationsService } from '@/lib/services/numerations-service';
import { ShiftsService } from '@/lib/services/shifts-service';

export class SalesService {
  private static supabase = createClient();

  // Obtener todas las ventas con filtros
  static async getSales(
    companyId: string, 
    params: SaleSearchParams = {}
  ): Promise<{ sales: Sale[]; total: number }> {
    const {
      query,
      filters = {},
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 50
    } = params;

    let queryBuilder = this.supabase
      .from('sales')
      .select(`
        *,
        customer:customers(*),
        cashier:profiles(*),
        shift:shifts(*),
        items:sale_items(
          *,
          product:products(*)
        )
      `, { count: 'exact' })
      .eq('company_id', companyId);

    // Aplicar filtros
    if (filters.status && filters.status.length > 0) {
      queryBuilder = queryBuilder.in('status', filters.status);
    }

    if (filters.payment_method && filters.payment_method.length > 0) {
      queryBuilder = queryBuilder.in('payment_method', filters.payment_method);
    }

    if (filters.payment_status && filters.payment_status.length > 0) {
      queryBuilder = queryBuilder.in('payment_status', filters.payment_status);
    }

    if (filters.customer_id) {
      queryBuilder = queryBuilder.eq('customer_id', filters.customer_id);
    }

    if (filters.cashier_id) {
      queryBuilder = queryBuilder.eq('cashier_id', filters.cashier_id);
    }

    if (filters.date_from) {
      queryBuilder = queryBuilder.gte('created_at', filters.date_from);
    }

    if (filters.date_to) {
      queryBuilder = queryBuilder.lte('created_at', filters.date_to);
    }

    if (filters.min_amount) {
      queryBuilder = queryBuilder.gte('total_amount', filters.min_amount);
    }

    if (filters.max_amount) {
      queryBuilder = queryBuilder.lte('total_amount', filters.max_amount);
    }

    // Aplicar búsqueda por texto
    if (query) {
      queryBuilder = queryBuilder.or(`sale_number.ilike.%${query}%,notes.ilike.%${query}%`);
    }

    // Aplicar ordenamiento
    queryBuilder = queryBuilder.order(sort_by, { ascending: sort_order === 'asc' });

    // Aplicar paginación
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    queryBuilder = queryBuilder.range(from, to);

    const { data: sales, error, count } = await queryBuilder;

    if (error) {
      console.error('Error obteniendo ventas:', error);
      console.error('Detalles del error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Error al obtener las ventas: ${error.message}`);
    }

    return {
      sales: sales || [],
      total: count || 0
    };
  }

  // Obtener una venta por ID
  static async getSaleById(saleId: string): Promise<Sale | null> {
    const { data, error } = await this.supabase
      .from('sales')
      .select(`
        *,
        customer:customers(*),
        cashier:profiles(*),
        shift:shifts(*),
        items:sale_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', saleId)
      .single();

    if (error) {
      console.error('Error obteniendo venta:', error);
      return null;
    }

    return data;
  }

  // Crear una nueva venta
  static async createSale(companyId: string, saleData: CreateSaleData): Promise<Sale> {
    const { items, ...saleInfo } = saleData;
    
    // Obtener el turno activo para asociar la venta
    const { data: activeShift } = await this.supabase
      .from('shifts')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'open')
      .single();
    
    // Obtener productos para cálculo de impuestos
    const { data: products } = await this.supabase
      .from('products')
      .select('id, iva_rate, ica_rate, retencion_rate')
      .in('id', items.map(item => item.product_id));
    
    // Calcular totales con impuestos - crear objetos Product mínimos para el cálculo
    const productsForCalculation = (products || []).map(p => ({
      id: p.id,
      sku: '',
      name: '',
      cost_price: 0,
      selling_price: 0,
      iva_rate: p.iva_rate || 0,
      ica_rate: p.ica_rate || 0,
      retencion_rate: p.retencion_rate || 0,
      available_quantity: 0,
      min_quantity: 0,
      max_quantity: 0,
      min_stock: 0,
      unit: '',
      fiscal_classification: '',
      excise_tax: false,
      category_id: '',
      warehouse_id: '',
      cost_center_id: '',
      is_active: true,
      created_at: '',
      updated_at: '',
      company_id: ''
    }));
    
    const totals = calculateSaleTotals(items, saleInfo.discount_amount || 0, productsForCalculation);
    
    // Generar número de venta usando la numeración específica si se proporciona
    const saleNumber = await this.generateSaleNumber(companyId, saleInfo.numeration_id);

    // Mapear payment_type a valores válidos para la tabla sales
    const mapPaymentMethod = (paymentType: string): string => {
      const mapping: { [key: string]: string } = {
        'CASH': 'cash',
        'CARD': 'card',
        'TRANSFER': 'transfer',
        'CHECK': 'cash', // Mapear CHECK a cash como fallback
        'DIGITAL_WALLET': 'transfer', // Mapear DIGITAL_WALLET a transfer como fallback
      };
      return mapping[paymentType] || 'cash'; // Default a cash si no se encuentra
    };

    // Preparar datos de venta con payment_method mapeado
    const saleInsertData = {
      company_id: companyId,
      shift_id: activeShift?.id, // Asociar con el turno activo
      sale_number: saleNumber,
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      discount_amount: totals.discount_amount,
      total_amount: totals.total_amount,
      ...saleInfo,
      payment_method: mapPaymentMethod(saleInfo.payment_method),
      // Incluir información de pago si está disponible
      payment_reference: saleInfo.payment_reference,
      payment_amount_received: saleInfo.payment_amount_received,
      payment_change: saleInfo.payment_change
    };

    // Crear la venta
    const { data: sale, error: saleError } = await this.supabase
      .from('sales')
      .insert(saleInsertData)
      .select()
      .single();

    if (saleError) {
      console.error('Error creando venta:', saleError);
      throw new Error('Error al crear la venta');
    }

    // Crear los items de la venta
    const saleItems = items.map(item => ({
      sale_id: sale.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percentage: item.discount_percentage || 0,
      discount_amount: item.discount_percentage 
        ? (item.quantity * item.unit_price * item.discount_percentage) / 100 
        : 0,
      total_price: (item.quantity * item.unit_price) - (item.discount_percentage 
        ? (item.quantity * item.unit_price * item.discount_percentage) / 100 
        : 0)
    }));

    const { error: itemsError } = await this.supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) {
      console.error('Error creando items de venta:', itemsError);
      // Rollback: eliminar la venta creada
      await this.supabase.from('sales').delete().eq('id', sale.id);
      throw new Error('Error al crear los items de la venta');
    }

    // Registrar movimiento financiero en cuentas
    try {
      // Obtener cuenta por defecto Efectivo POS si no viene account_id
      let accountId = saleData.account_id as string | undefined;
      if (!accountId) {
        const { data: cashAccounts } = await this.supabase
          .from('accounts')
          .select('id, account_name')
          .eq('company_id', companyId)
          .eq('is_active', true);
        accountId = cashAccounts?.find(a => a.account_name === 'Efectivo POS')?.id;
      }

      if (accountId) {
        // Obtener el saldo actual de la cuenta
        const { data: account } = await this.supabase
          .from('accounts')
          .select('current_balance')
          .eq('id', accountId)
          .single();

        const currentBalance = account?.current_balance || 0;
        const newBalance = currentBalance + totals.total_amount;

        // Insertar la transacción con el balance_after calculado
        const { error: txError } = await this.supabase
          .from('account_transactions')
          .insert({
            account_id: accountId,
            company_id: companyId,
            transaction_type: 'RECEIPT',
            amount: totals.total_amount,
            balance_after: newBalance,
            description: `Venta ${saleNumber}`,
            related_entity_type: 'sale',
            related_entity_id: sale.id,
          });

        if (txError) {
          console.error('Error insertando transacción de cuenta:', txError);
          throw txError;
        }
      } else {
        console.warn('No se encontró cuenta Efectivo POS para registrar el ingreso.');
      }
    } catch (txError) {
      console.error('Error registrando transacción de cuenta para la venta:', txError);
      // No hacer rollback de la venta; se puede registrar manualmente luego
    }

    // Actualizar inventario
    await this.updateInventoryForSale(items, 'decrease');

    // Actualizar estadísticas del turno si hay un turno activo
    if (activeShift?.id) {
      await ShiftsService.updateShiftStats(activeShift.id);
    }

    // Obtener la venta completa
    const completeSale = await this.getSaleById(sale.id);
    return completeSale!;
  }

  // Actualizar una venta
  static async updateSale(saleId: string, saleData: UpdateSaleData): Promise<Sale> {
    const existingSale = await this.getSaleById(saleId);
    if (!existingSale) {
      throw new Error('Venta no encontrada');
    }

    // Verificar si la venta está completada o cancelada
    if (existingSale.status === 'completed') {
      throw new Error('No se puede editar una venta que ya está completada');
    }

    // Verificar si la venta está cancelada (reembolsada)
    if (existingSale.status === 'cancelled') {
      throw new Error('No se puede editar una venta cancelada o reembolsada');
    }

    // Si se actualizan los items, recalcular totales
    let updateData: any = { ...saleData };
    if (saleData.items) {
      // Obtener productos para cálculo de impuestos
      const { data: products } = await this.supabase
        .from('products')
        .select('id, iva_rate, ica_rate, retencion_rate')
        .in('id', saleData.items.map(item => item.product_id));
      
      // Crear objetos Product mínimos para el cálculo
      const productsForCalculation = (products || []).map(p => ({
        id: p.id,
        sku: '',
        name: '',
        cost_price: 0,
        selling_price: 0,
        iva_rate: p.iva_rate || 0,
        ica_rate: p.ica_rate || 0,
        retencion_rate: p.retencion_rate || 0,
        available_quantity: 0,
        min_quantity: 0,
        max_quantity: 0,
        min_stock: 0,
        unit: '',
        fiscal_classification: '',
        excise_tax: false,
        category_id: '',
        warehouse_id: '',
        cost_center_id: '',
        is_active: true,
        created_at: '',
        updated_at: '',
        company_id: ''
      }));
      
      const totals = calculateSaleTotals(saleData.items, saleData.discount_amount || 0, productsForCalculation);
      updateData = {
        ...updateData,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        discount_amount: totals.discount_amount,
        total_amount: totals.total_amount,
      };

      // Actualizar inventario (revertir cambios anteriores y aplicar nuevos)
      if (existingSale.items) {
        await this.updateInventoryForSale(
          existingSale.items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage
          })), 
          'increase'
        );
      }
      
      await this.updateInventoryForSale(saleData.items, 'decrease');

      // Actualizar items de venta
      await this.supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId);

      const saleItems = saleData.items.map(item => ({
        sale_id: saleId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage || 0,
        discount_amount: item.discount_percentage 
          ? (item.quantity * item.unit_price * item.discount_percentage) / 100 
          : 0,
        total_price: (item.quantity * item.unit_price) - (item.discount_percentage 
          ? (item.quantity * item.unit_price * item.discount_percentage) / 100 
          : 0)
      }));

      await this.supabase
        .from('sale_items')
        .insert(saleItems);
    }

    const { data, error } = await this.supabase
      .from('sales')
      .update(updateData)
      .eq('id', saleId)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando venta:', error);
      throw new Error('Error al actualizar la venta');
    }

    return data;
  }

  // Eliminar una venta
  static async deleteSale(saleId: string): Promise<void> {
    const sale = await this.getSaleById(saleId);
    if (!sale) {
      throw new Error('Venta no encontrada');
    }

    // Revertir cambios en inventario
    if (sale.items) {
      await this.updateInventoryForSale(
        sale.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage
        })), 
        'increase'
      );
    }

    // Eliminar items de venta
    await this.supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', saleId);

    // Eliminar venta
    const { error } = await this.supabase
      .from('sales')
      .delete()
      .eq('id', saleId);

    if (error) {
      console.error('Error eliminando venta:', error);
      throw new Error('Error al eliminar la venta');
    }
  }

  // Obtener estadísticas de ventas
  static async getSalesStats(companyId: string, period?: { from: string; to: string }): Promise<SaleStats> {
    let query = this.supabase
      .from('sales')
      .select('id, total_amount, created_at')
      .eq('company_id', companyId)
      .eq('status', 'completed');

    if (period) {
      query = query.gte('created_at', period.from).lte('created_at', period.to);
    }

    const { data: sales, error } = await query;

    if (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw new Error('Error al obtener estadísticas');
    }

    const totalAmount = sales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
    const totalSales = sales?.length || 0;
    const averageSale = totalSales > 0 ? totalAmount / totalSales : 0;

    // Calcular total de items
    const { data: itemsData } = await this.supabase
      .from('sale_items')
      .select('quantity')
      .in('sale_id', sales?.map(s => s.id) || []);

    const totalItems = itemsData?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    // Estadísticas por período
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().substring(0, 7);
    const thisYear = new Date().getFullYear().toString();

    const salesToday = sales?.filter(s => s.created_at.startsWith(today)).length || 0;
    const salesThisMonth = sales?.filter(s => s.created_at.startsWith(thisMonth)).length || 0;
    const salesThisYear = sales?.filter(s => s.created_at.startsWith(thisYear)).length || 0;

    const amountToday = sales?.filter(s => s.created_at.startsWith(today))
      .reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    const amountThisMonth = sales?.filter(s => s.created_at.startsWith(thisMonth))
      .reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    const amountThisYear = sales?.filter(s => s.created_at.startsWith(thisYear))
      .reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

    return {
      total_sales: totalSales,
      total_amount: totalAmount,
      average_sale: averageSale,
      total_items: totalItems,
      sales_today: salesToday,
      sales_this_month: salesThisMonth,
      sales_this_year: salesThisYear,
      amount_today: amountToday,
      amount_this_month: amountThisMonth,
      amount_this_year: amountThisYear,
    };
  }

  // Obtener datos para gráficos
  static async getSalesChartData(
    companyId: string, 
    period: { from: string; to: string },
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<SaleChartData[]> {
    const { data: sales, error } = await this.supabase
      .from('sales')
      .select('total_amount, created_at')
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .gte('created_at', period.from)
      .lte('created_at', period.to)
      .order('created_at');

    if (error) {
      console.error('Error obteniendo datos de gráfico:', error);
      throw new Error('Error al obtener datos de gráfico');
    }

    // Agrupar datos por período
    const groupedData: { [key: string]: { sales: number; amount: number; transactions: number } } = {};

    sales?.forEach(sale => {
      const date = new Date(sale.created_at);
      let key: string;

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = date.toISOString().substring(0, 7);
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groupedData[key]) {
        groupedData[key] = { sales: 0, amount: 0, transactions: 0 };
      }

      groupedData[key].sales += Number(sale.total_amount);
      groupedData[key].amount += Number(sale.total_amount);
      groupedData[key].transactions += 1;
    });

    return Object.entries(groupedData).map(([date, data]) => ({
      date,
      sales: data.sales,
      amount: data.amount,
      transactions: data.transactions,
    }));
  }

  // Generar número de venta usando el servicio de numeraciones
  private static async generateSaleNumber(companyId: string, numerationId?: string): Promise<string> {
    try {
      if (numerationId) {
        // Usar la numeración específica proporcionada
        const numeration = await NumerationsService.getNumeration(numerationId);
        const saleNumber = await NumerationsService.getNextNumber(
          companyId, 
          'invoice', // Tipo de documento para ventas
          numeration.name
        );
        return saleNumber;
      } else {
        // Usar la numeración por defecto
        const saleNumber = await NumerationsService.getNextNumber(
          companyId, 
          'invoice', // Tipo de documento para ventas
          'Facturas de Venta Principal' // Nombre de la numeración por defecto
        );
        return saleNumber;
      }
    } catch (error) {
      console.error('Error generando número de venta:', error);
      // Fallback: usar timestamp si hay error
      return `SALE-${Date.now()}`;
    }
  }

  // Actualizar inventario para venta
  private static async updateInventoryForSale(
    items: Array<{ product_id: string; quantity: number }>, 
    operation: 'increase' | 'decrease'
  ): Promise<void> {
    for (const item of items) {
      // Obtener el inventario actual del producto
      const { data: inventory } = await this.supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', item.product_id)
        .single();

      if (inventory) {
        const newQuantity = operation === 'decrease' 
          ? inventory.quantity - item.quantity
          : inventory.quantity + item.quantity;

        await this.supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('product_id', item.product_id);
      }
    }
  }
}
