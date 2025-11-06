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
  // Accepts an optional Supabase client for server-side usage
  static async getSaleById(
    saleId: string,
    supabaseClient?: any
  ): Promise<Sale | null> {
    const client = supabaseClient || this.supabase;

    const { data, error } = await client
      .from('sales')
      .select(`
        *,
        customer:customers!sales_customer_id_fkey(*),
        cashier:profiles!sales_cashier_id_fkey(*),
        shift:shifts!sales_shift_id_fkey(*),
        items:sale_items(
          *,
          product:products!sale_items_product_id_fkey(*)
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
      .maybeSingle();

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

    // Si no se proporciona customer_id, obtener cliente "Consumidor Final/Contado" por defecto
    let customerIdToUse = saleInfo.customer_id;
    if (!customerIdToUse) {
      try {
        // Primero intentar buscar por NIT estándar colombiano (más confiable)
        const { data: customerByNIT } = await this.supabase
          .from('customers')
          .select('id')
          .eq('company_id', companyId)
          .eq('identification_number', '22222222-2')
          .eq('identification_type', 'NIT')
          .limit(1)
          .maybeSingle();

        if (customerByNIT?.id) {
          customerIdToUse = customerByNIT.id;
        } else {
          // Si no se encuentra por NIT, buscar por business_name
          const searchTerms = ['%consumidor%final%', '%contado%', '%generico%', '%general%', '%publico%'];
          let defaultCustomer = null;

          for (const term of searchTerms) {
            const { data } = await this.supabase
              .from('customers')
              .select('id')
              .eq('company_id', companyId)
              .ilike('business_name', term)
              .limit(1)
              .maybeSingle();

            if (data?.id) {
              defaultCustomer = data;
              break;
            }
          }

          if (defaultCustomer?.id) {
            customerIdToUse = defaultCustomer.id;
          }
        }
      } catch (err) {
        console.error('Error buscando cliente por defecto:', err);
      }
    }

    // Validar que customerIdToUse sea válido antes de insertar
    if (customerIdToUse) {
      // Verificar que el cliente existe
      const { data: customerCheck } = await this.supabase
        .from('customers')
        .select('id')
        .eq('id', customerIdToUse)
        .eq('company_id', companyId)
        .maybeSingle();

      if (!customerCheck?.id) {
        console.warn('Cliente no encontrado, eliminando customer_id del insert');
        customerIdToUse = undefined;
      }
    }

    // Si no se proporciona numeration_id, obtener la numeración por defecto del servidor
    let numerationIdToUse = saleInfo.numeration_id;
    if (!numerationIdToUse) {
      try {
        const { data: defaultNumeration } = await this.supabase
          .from('numerations')
          .select('id')
          .eq('company_id', companyId)
          .eq('document_type', 'invoice')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (defaultNumeration?.id) {
          numerationIdToUse = defaultNumeration.id;
        }
      } catch (err) {
        console.error('Error buscando numeración por defecto:', err);
      }
    }

    // Validar que numerationIdToUse sea válido antes de insertar
    if (numerationIdToUse) {
      // Verificar que la numeración existe
      const { data: numerationCheck } = await this.supabase
        .from('numerations')
        .select('id')
        .eq('id', numerationIdToUse)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      if (!numerationCheck?.id) {
        console.warn('Numeración no encontrada o inactiva, eliminando numeration_id del insert');
        numerationIdToUse = undefined;
      }
    }

    // Generar número de venta usando la numeración específica si se proporciona
    const saleNumber = await this.generateSaleNumber(companyId, numerationIdToUse);

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

    const saleInsertData: any = {
      company_id: companyId,
      shift_id: activeShift?.id, // Asociar con el turno activo
      sale_number: saleNumber,
      customer_id: customerIdToUse, // Usar el cliente obtenido o proporcionado 
      numeration_id: numerationIdToUse, // Usar la numeración obtenida o proporcionada (puede ser undefined si no existe)
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      discount_amount: totals.discount_amount,
      total_amount: totals.total_amount, // Usar el total calculado
      payment_method: mapPaymentMethod(saleInfo.payment_method),
      // Incluir información de pago si está disponible
      payment_reference: saleInfo.payment_reference,
      payment_amount_received: saleInfo.payment_amount_received,
      payment_change: saleInfo.payment_change,
      // Notas y otros campos
      notes: saleInfo.notes,
      account_id: saleInfo.account_id,
      // Si se proporciona created_at, usarlo (para conversiones desde remisiones)
      created_at: saleInfo.created_at,
    };

    // IMPORTANTE: Para ventas del POS, siempre establecer como 'completed'
    // Solo si viene explícitamente definido Y es un string válido Y no está vacío, usar ese valor
    // Esto permite que el formulario de ventas (/dashboard/sales) pueda establecer 'pending'
    const hasExplicitPaymentStatus = saleInfo.payment_status !== undefined && 
                                     saleInfo.payment_status !== null && 
                                     typeof saleInfo.payment_status === 'string' &&
                                     saleInfo.payment_status.trim() !== '';
    
    if (hasExplicitPaymentStatus) {
      saleInsertData.payment_status = saleInfo.payment_status;
    } else {
      // No viene definido o está vacío = viene del POS, establecer como 'completed'
      saleInsertData.payment_status = 'completed';
    }

    const hasExplicitStatus = saleInfo.status !== undefined && 
                              saleInfo.status !== null && 
                              typeof saleInfo.status === 'string' &&
                              saleInfo.status.trim() !== '';
    
    if (hasExplicitStatus) {
      saleInsertData.status = saleInfo.status;
    } else {
      // No viene definido o está vacío = viene del POS, establecer como 'completed'
      saleInsertData.status = 'completed';
    }

    // Eliminar customer_id y numeration_id si quedaron undefined (para evitar error de FK)
    if (!saleInsertData.customer_id) {
      delete (saleInsertData as any).customer_id;
    }
    if (!saleInsertData.numeration_id) {
      delete (saleInsertData as any).numeration_id;
    }

    // Crear la venta
    const { data: sale, error: saleError } = await this.supabase
      .from('sales')
      .insert(saleInsertData)
      .select()
      .single();

    if (saleError) {
      console.error('Error creando venta:', saleError);

      // Verificar si es un error de conectividad
      if (saleError.message && (
        saleError.message.includes('Failed to fetch') ||
        saleError.message.includes('NetworkError') ||
        saleError.message.includes('ERR_NAME_NOT_RESOLVED') ||
        saleError.code === 'PGRST301' // Connection timeout
      )) {
        throw new Error('Error de conexión: No se pudo conectar al servidor');
      }

      throw new Error(`Error al crear la venta: ${saleError.message}`);
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

    const finalPaymentStatus = saleInsertData.payment_status || 'completed';
    if (finalPaymentStatus === 'completed') {
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
        }
      } catch (txError) {
        console.error('Error registrando transacción de cuenta para la venta:', txError);
        // No hacer rollback de la venta; se puede registrar manualmente luego
      }
    } else {
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
  static async getSalesStats(companyId: string, period?: { from: string; to: string }, referenceDate?: Date): Promise<SaleStats> {
    // Obtener todas las ventas completadas de la empresa
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

    // Calcular estadísticas generales
    const totalAmount = sales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
    const totalSales = sales?.length || 0;
    const averageSale = totalSales > 0 ? totalAmount / totalSales : 0;

    // Calcular total de items vendidos - obtener todos los items de la empresa
    const { data: itemsData } = await this.supabase
      .from('sale_items')
      .select(`
        quantity,
        created_at,
        sales!inner(
          id,
          company_id,
          status
        )
      `)
      .eq('sales.company_id', companyId)
      .eq('sales.status', 'completed');

    const totalItems = itemsData?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    // Calcular estadísticas por período (hoy, mes, año)
    // Usar la fecha de la venta más reciente como referencia si no se especifica una fecha
    const mostRecentSale = sales && sales.length > 0 ? new Date(sales[0].created_at) : new Date();
    const now = referenceDate || mostRecentSale;
    const today = now.toISOString().split('T')[0];
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

    // Ventas de hoy - usar comparación de fechas más robusta
    const salesToday = sales?.filter(s => {
      const saleDate = new Date(s.created_at);
      const saleDateStr = saleDate.toISOString().split('T')[0];
      return saleDateStr === today;
    }).length || 0;

    const amountToday = sales?.filter(s => {
      const saleDate = new Date(s.created_at);
      const saleDateStr = saleDate.toISOString().split('T')[0];
      return saleDateStr === today;
    }).reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

    // Ventas del mes actual - usar comparación de fechas más robusta
    const salesThisMonth = sales?.filter(s => {
      const saleDate = new Date(s.created_at);
      return saleDate >= new Date(startOfMonth);
    }).length || 0;

    const amountThisMonth = sales?.filter(s => {
      const saleDate = new Date(s.created_at);
      return saleDate >= new Date(startOfMonth);
    }).reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

    // Ventas del año actual - usar comparación de fechas más robusta
    const salesThisYear = sales?.filter(s => {
      const saleDate = new Date(s.created_at);
      return saleDate >= new Date(startOfYear);
    }).length || 0;

    const amountThisYear = sales?.filter(s => {
      const saleDate = new Date(s.created_at);
      return saleDate >= new Date(startOfYear);
    }).reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

    // Calcular items vendidos por período
    const itemsToday = itemsData?.filter(item => {
      const itemDate = new Date(item.created_at).toISOString().split('T')[0];
      return itemDate === today;
    }).reduce((sum, item) => sum + item.quantity, 0) || 0;

    const itemsThisMonth = itemsData?.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate >= new Date(startOfMonth);
    }).reduce((sum, item) => sum + item.quantity, 0) || 0;

    const itemsThisYear = itemsData?.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate >= new Date(startOfYear);
    }).reduce((sum, item) => sum + item.quantity, 0) || 0;

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
      items_today: itemsToday,
      items_this_month: itemsThisMonth,
      items_this_year: itemsThisYear,
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

  // Generar número de venta usando el servicio de numeraciones (disponible para uso desde POS offline)
  public static async generateSaleNumber(companyId: string, numerationId?: string): Promise<string> {
    try {
      if (numerationId) {
        // Usar la numeración específica proporcionada si existe
        try {
          const numeration = await NumerationsService.getNumeration(numerationId);
          const saleNumber = await NumerationsService.getNextNumber(
            companyId,
            'invoice', // Tipo de documento para ventas
            numeration.name
          );
          return saleNumber;
        } catch (e: any) {
          // Si no existe (0 rows / PGRST116) o 406, intentar usar cache offline
          const code = e?.code || '';
          const msg = e?.message || '';
          const isNoRows = code === 'PGRST116' || /0 rows|Cannot coerce/i.test(msg);
          const is406 = msg.includes('406') || code === '406';
          const isOffline = msg.includes('Failed to fetch') || code === '';

          if (isNoRows || is406 || isOffline) {

            // Intentar generar número desde cache offline
            const offlineNumber = await this.generateOfflineSaleNumber(companyId, numerationId);
            if (offlineNumber) {
              return offlineNumber;
            }

            // Si no hay cache, usar fallback

          } else {

          }

          // Último fallback: timestamp
          return `SALE-${Date.now()}`;
        }
      } else {
        // Usar la numeración por defecto
        try {
          const saleNumber = await NumerationsService.getNextNumber(
            companyId,
            'invoice', // Tipo de documento para ventas
            'Facturas de Venta Principal' // Nombre de la numeración por defecto
          );
          return saleNumber;
        } catch (error: any) {
          const msg = error?.message || '';
          const isOffline = msg.includes('Failed to fetch') || error?.code === '';

          if (isOffline) {
            const offlineNumber = await this.generateOfflineSaleNumber(companyId);
            if (offlineNumber) {
              return offlineNumber;
            }
          }

          console.error('Error generando número de venta:', error);
          return `SALE-${Date.now()}`;
        }
      }
    } catch (error) {
      console.error('Error generando número de venta:', error);
      // Fallback: usar timestamp si hay error
      return `SALE-${Date.now()}`;
    }
  }

  /**
   * Genera un número de venta usando numeraciones cacheadas (modo offline)
   */
  private static async generateOfflineSaleNumber(
    companyId: string,
    numerationId?: string
  ): Promise<string | null> {
    try {
      const { offlineStorage } = await import('./offline-storage-service');

      let numeration: any = null;

      if (numerationId) {
        // Buscar la numeración específica en cache
        numeration = await offlineStorage.getCachedNumeration(numerationId);
      } else {
        // Buscar la primera numeración activa de tipo invoice
        const numerations = await offlineStorage.getCachedNumerations(companyId);
        numeration = numerations.find(
          (n) => n.document_type === 'invoice' && n.is_active === true
        );
      }

      if (!numeration) {
        return null;
      }

      // Obtener el siguiente número
      const currentNumber = numeration.offline_counter || numeration.current_number || 0;
      const nextNumber = currentNumber + 1;

      // Formatear el número según la configuración de la numeración
      const prefix = numeration.prefix || 'FAC';
      const paddedNumber = String(nextNumber).padStart(6, '0');
      const saleNumber = `${prefix}${paddedNumber}`;

      // Actualizar el contador en el cache
      await offlineStorage.updateNumerationCounter(numeration.id, nextNumber);


      return saleNumber;
    } catch (error) {
      console.error('Error generando número offline:', error);
      return null;
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
        .maybeSingle();

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
