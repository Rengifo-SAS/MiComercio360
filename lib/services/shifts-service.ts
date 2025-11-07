import { createClient } from '@/lib/supabase/client';
import {
  Shift,
  CreateShiftData,
  UpdateShiftData,
  CloseShiftData,
  ShiftFilters,
  ShiftSearchParams,
  ShiftStats,
  ShiftReport,
  ShiftCashSummary,
  CashMovement,
  CreateCashMovementData,
  calculateShiftDuration,
  formatShiftDuration,
  calculateExpectedCash,
  calculateCashDifference
} from '@/lib/types/shifts';

export class ShiftsService {
  private static supabase = createClient();

  // Obtener todos los turnos con filtros
  static async getShifts(
    companyId: string,
    params: ShiftSearchParams = {}
  ): Promise<{ shifts: Shift[]; total: number }> {
    const {
      query,
      filters = {},
      sort_by = 'start_time',
      sort_order = 'desc',
      page = 1,
      limit = 50
    } = params;



    let queryBuilder = this.supabase
      .from('shifts')
      .select(`
        *,
        cashier:profiles(id, full_name, email),
        source_account:accounts(id, account_name, account_type, bank_name),
        sales:sales(id, total_amount, payment_method, created_at)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    // Aplicar filtros
    if (filters.status && filters.status.length > 0) {
      queryBuilder = queryBuilder.in('status', filters.status);
    }

    if (filters.cashier_id) {
      queryBuilder = queryBuilder.eq('cashier_id', filters.cashier_id);
    }

    if (filters.date_from) {
      queryBuilder = queryBuilder.gte('start_time', filters.date_from);
    }

    if (filters.date_to) {
      queryBuilder = queryBuilder.lte('start_time', filters.date_to);
    }

    // Aplicar búsqueda por texto
    if (query) {
      queryBuilder = queryBuilder.or(`notes.ilike.%${query}%`);
    }

    // Aplicar ordenamiento
    queryBuilder = queryBuilder.order(sort_by, { ascending: sort_order === 'asc' });

    // Aplicar paginación
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    queryBuilder = queryBuilder.range(from, to);

    const { data, error, count } = await queryBuilder;



    if (error) {
      console.error('❌ Error obteniendo turnos:', error);
      throw new Error('Error al obtener los turnos');
    }



    return {
      shifts: data || [],
      total: count || 0
    };
  }

  // Obtener un turno por ID
  static async getShift(shiftId: string): Promise<Shift | null> {
    const { data, error } = await this.supabase
      .from('shifts')
      .select(`
        *,
        cashier:profiles(id, full_name, email),
        sales:sales(id, total_amount, payment_method, created_at)
      `)
      .eq('id', shiftId)
      .single();

    if (error) {
      console.error('Error obteniendo turno:', error);
      return null;
    }

    return data;
  }

  // Obtener turno activo del cajero actual
  static async getActiveShift(companyId: string): Promise<Shift | null> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabase
      .from('shifts')
      .select(`
        *,
        cashier:profiles(id, full_name, email),
        source_account:accounts(id, account_name, account_type, bank_name),
        sales:sales(id, total_amount, payment_method, created_at)
      `)
      .eq('company_id', companyId)
      .eq('cashier_id', user.id)
      .eq('status', 'open')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error obteniendo turno activo:', error);
      throw new Error('Error al obtener el turno activo');
    }

    return data;
  }

  // Crear un nuevo turno (apertura)
  static async createShift(
    companyId: string,
    shiftData: CreateShiftData
  ): Promise<Shift> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar que no haya un turno activo
    const activeShift = await this.getActiveShift(companyId);
    if (activeShift) {
      throw new Error('Ya existe un turno activo. Debe cerrarlo antes de abrir uno nuevo.');
    }

    const { data, error } = await this.supabase
      .from('shifts')
      .insert({
        cashier_id: user.id,
        company_id: companyId,
        start_time: new Date().toISOString(),
        initial_cash: shiftData.initial_cash,
        notes: shiftData.notes,
        source_account_id: shiftData.source_account_id,
        status: 'open'
      })
      .select(`
        *,
        cashier:profiles(id, full_name, email),
        source_account:accounts(id, account_name, account_type, bank_name)
      `)
      .single();

    if (error) {
      console.error('Error creando turno:', error);
      throw new Error('Error al crear el turno');
    }

    return data;
  }

  // Cerrar un turno
  static async closeShift(
    shiftId: string,
    closeData: CloseShiftData
  ): Promise<Shift> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Obtener el turno actual
    const currentShift = await this.getShift(shiftId);
    if (!currentShift) {
      throw new Error('Turno no encontrado');
    }

    if (currentShift.status === 'closed') {
      throw new Error('El turno ya está cerrado');
    }

    if (currentShift.cashier_id !== user.id) {
      throw new Error('No tiene permisos para cerrar este turno');
    }

    // Calcular totales de ventas
    const salesSummary = await this.getShiftSalesSummary(shiftId);

    const { data, error } = await this.supabase
      .from('shifts')
      .update({
        end_time: new Date().toISOString(),
        final_cash: closeData.final_cash,
        total_sales: salesSummary.total_sales,
        total_transactions: salesSummary.total_transactions,
        status: 'closed',
        notes: closeData.notes
      })
      .eq('id', shiftId)
      .select(`
        *,
        cashier:profiles(id, full_name, email),
        sales:sales(id, total_amount, payment_method, created_at)
      `)
      .single();

    if (error) {
      console.error('Error cerrando turno:', error);
      throw new Error('Error al cerrar el turno');
    }

    return data;
  }

  // Actualizar estadísticas de un turno (llamado después de crear una venta)
  static async updateShiftStats(shiftId: string): Promise<void> {
    try {
      // Obtener resumen de ventas del turno
      const salesSummary = await this.getShiftSalesSummary(shiftId);

      // Actualizar el turno con las nuevas estadísticas
      await this.supabase
        .from('shifts')
        .update({
          total_sales: salesSummary.total_sales,
          total_transactions: salesSummary.total_transactions
        })
        .eq('id', shiftId);
    } catch (error) {
      console.error('Error actualizando estadísticas del turno:', error);
      // No lanzar error para no interrumpir el flujo de venta
    }
  }

  // Actualizar un turno
  static async updateShift(
    shiftId: string,
    updateData: UpdateShiftData
  ): Promise<Shift> {
    const { data, error } = await this.supabase
      .from('shifts')
      .update(updateData)
      .eq('id', shiftId)
      .select(`
        *,
        cashier:profiles(id, full_name, email),
        sales:sales(id, total_amount, payment_method, created_at)
      `)
      .single();

    if (error) {
      console.error('Error actualizando turno:', error);
      throw new Error('Error al actualizar el turno');
    }

    return data;
  }

  // Obtener resumen de ventas de un turno
  static async getShiftSalesSummary(shiftId: string): Promise<{
    total_sales: number;
    total_transactions: number;
    payment_methods: {
      cash: number;
      card: number;
      transfer: number;
      mixed: number;
    };
  }> {
    const { data, error } = await this.supabase
      .from('sales')
      .select('total_amount, payment_method')
      .eq('shift_id', shiftId)
      .eq('status', 'completed');

    if (error) {
      console.error('Error obteniendo resumen de ventas:', error);
      throw new Error('Error al obtener el resumen de ventas');
    }

    const sales = data || [];
    const total_sales = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
    const total_transactions = sales.length;

    const payment_methods = sales.reduce((acc, sale) => {
      acc[sale.payment_method as keyof typeof acc] += Number(sale.total_amount);
      return acc;
    }, {
      cash: 0,
      card: 0,
      transfer: 0,
      mixed: 0
    });

    return {
      total_sales,
      total_transactions,
      payment_methods
    };
  }

  // Obtener resumen de efectivo de un turno
  static async getShiftCashSummary(shiftId: string): Promise<ShiftCashSummary> {
    const shift = await this.getShift(shiftId);
    if (!shift) {
      throw new Error('Turno no encontrado');
    }

    const salesSummary = await this.getShiftSalesSummary(shiftId);
    const cashMovements = await this.getShiftCashMovements(shiftId);

    const expected_cash = calculateExpectedCash(
      shift.initial_cash,
      salesSummary.payment_methods.cash,
      cashMovements
    );

    const actual_cash = shift.final_cash || 0;
    const difference = calculateCashDifference(expected_cash, actual_cash);

    return {
      initial_cash: shift.initial_cash,
      final_cash: actual_cash,
      total_sales: salesSummary.total_sales,
      cash_sales: salesSummary.payment_methods.cash,
      card_sales: salesSummary.payment_methods.card,
      transfer_sales: salesSummary.payment_methods.transfer,
      mixed_sales: salesSummary.payment_methods.mixed,
      expected_cash,
      actual_cash,
      difference
    };
  }

  // Obtener movimientos de efectivo de un turno
  static async getShiftCashMovements(shiftId: string): Promise<CashMovement[]> {
    const { data, error } = await this.supabase
      .from('cash_movements')
      .select(`
        *,
        created_by_profile:profiles(id, full_name)
      `)
      .eq('shift_id', shiftId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error obteniendo movimientos de efectivo:', error);
      return [];
    }

    return data || [];
  }

  // Crear movimiento de efectivo
  static async createCashMovement(
    shiftId: string,
    movementData: CreateCashMovementData
  ): Promise<CashMovement> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabase
      .from('cash_movements')
      .insert({
        shift_id: shiftId,
        movement_type: movementData.movement_type,
        amount: movementData.amount,
        description: movementData.description,
        reference: movementData.reference,
        created_by: user.id
      })
      .select(`
        *,
        created_by_profile:profiles(id, full_name)
      `)
      .single();

    if (error) {
      console.error('Error creando movimiento de efectivo:', error);
      throw new Error('Error al crear el movimiento de efectivo');
    }

    return data;
  }

  // Obtener estadísticas de turnos
  static async getShiftStats(companyId: string, dateFrom?: string, dateTo?: string): Promise<ShiftStats> {
    let query = this.supabase
      .from('shifts')
      .select('*')
      .eq('company_id', companyId);

    if (dateFrom) {
      query = query.gte('start_time', dateFrom);
    }

    if (dateTo) {
      query = query.lte('start_time', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo estadísticas de turnos:', error);
      throw new Error('Error al obtener las estadísticas');
    }

    const shifts = data || [];
    const total_shifts = shifts.length;
    const open_shifts = shifts.filter(s => s.status === 'open').length;
    const closed_shifts = shifts.filter(s => s.status === 'closed').length;

    const total_sales = shifts.reduce((sum, shift) => sum + Number(shift.total_sales), 0);
    const total_transactions = shifts.reduce((sum, shift) => sum + Number(shift.total_transactions), 0);

    // Calcular duración promedio
    const closedShiftsWithDuration = shifts
      .filter(s => s.status === 'closed' && s.end_time)
      .map(s => calculateShiftDuration(s.start_time, s.end_time!))
      .filter(d => d !== null) as number[];

    const average_shift_duration = closedShiftsWithDuration.length > 0
      ? closedShiftsWithDuration.reduce((sum, duration) => sum + duration, 0) / closedShiftsWithDuration.length
      : 0;

    // Calcular diferencia total de efectivo
    // IMPORTANTE: Solo contamos ventas con payment_method='cash' (NO tarjeta, transferencia, ni mixtas)
    // Las ventas con tarjeta, transferencia o mixtas NO aumentan el efectivo en caja
    const closedShifts = shifts.filter(s => s.status === 'closed' && s.final_cash !== null && s.final_cash !== undefined);
    const closedShiftIds = closedShifts.map(s => s.id).filter(id => id);

    let cashSalesByShift: Record<string, number> = {};
    let cashMovementsByShift: Record<string, number> = {};
    
    if (closedShiftIds.length > 0) {
      // Obtener SOLO ventas en efectivo (payment_method='cash')
      // NO incluir: 'card', 'transfer', 'mixed' - estas no generan efectivo físico
      const { data: salesData, error: salesError } = await this.supabase
        .from('sales')
        .select('shift_id, total_amount, payment_method')
        .in('shift_id', closedShiftIds)
        .eq('payment_method', 'cash')
        .eq('status', 'completed')
        .not('shift_id', 'is', null);

      if (salesError) {
        console.error('Error obteniendo ventas en efectivo:', salesError);
      }

      if (salesData && salesData.length > 0) {
        salesData.forEach(sale => {
          const shiftId = sale.shift_id;
          if (!shiftId || sale.payment_method !== 'cash') return;

          if (!cashSalesByShift[shiftId]) {
            cashSalesByShift[shiftId] = 0;
          }
          cashSalesByShift[shiftId] += Number(sale.total_amount) || 0;
        });
      }

      // Obtener movimientos de efectivo por turno (ingresos y egresos de efectivo)
      const { data: movementsData, error: movementsError } = await this.supabase
        .from('cash_movements')
        .select('shift_id, movement_type, amount')
        .in('shift_id', closedShiftIds)
        .not('shift_id', 'is', null);

      if (movementsError) {
        console.error('Error obteniendo movimientos de efectivo:', movementsError);
      }

      if (movementsData && movementsData.length > 0) {
        movementsData.forEach(movement => {
          const shiftId = movement.shift_id;
          if (!shiftId) return;

          if (!cashMovementsByShift[shiftId]) {
            cashMovementsByShift[shiftId] = 0;
          }

          const amount = Number(movement.amount) || 0;
          if (movement.movement_type === 'income') {
            cashMovementsByShift[shiftId] += amount;
          } else if (movement.movement_type === 'expense') {
            cashMovementsByShift[shiftId] -= amount;
          }
        });
      }
    }

    // Calcular diferencia total de efectivo usando la misma lógica que getShiftCashSummary
    // Efectivo esperado = Efectivo inicial + Ventas en efectivo + Movimientos de efectivo
    // Diferencia = Efectivo final - Efectivo esperado
    const total_cash_difference = closedShifts.reduce((sum, shift) => {
      const initialCash = Number(shift.initial_cash) || 0;
      const finalCash = Number(shift.final_cash) || 0;
      const cashSales = cashSalesByShift[shift.id] || 0;
      const cashMovements = cashMovementsByShift[shift.id] || 0;
      
      // Misma lógica que calculateExpectedCash y getShiftCashSummary
      const expectedCash = initialCash + cashSales + cashMovements;
      const difference = finalCash - expectedCash;
      
      return sum + difference;
    }, 0);

    return {
      total_shifts,
      open_shifts,
      closed_shifts,
      total_sales,
      total_transactions,
      average_shift_duration,
      total_cash_difference
    };
  }

  // Generar reporte de turno
  static async generateShiftReport(shiftId: string): Promise<ShiftReport> {
    const shift = await this.getShift(shiftId);
    if (!shift) {
      throw new Error('Turno no encontrado');
    }

    const salesSummary = await this.getShiftSalesSummary(shiftId);
    const cashSummary = await this.getShiftCashSummary(shiftId);

    const duration = calculateShiftDuration(shift.start_time, shift.end_time);
    const duration_formatted = duration ? formatShiftDuration(duration) : undefined;

    return {
      shift,
      cash_summary: cashSummary,
      sales_summary: {
        total_sales: salesSummary.total_sales,
        total_transactions: salesSummary.total_transactions,
        average_sale: salesSummary.total_transactions > 0
          ? salesSummary.total_sales / salesSummary.total_transactions
          : 0,
        payment_methods: salesSummary.payment_methods
      },
      time_summary: {
        start_time: shift.start_time,
        end_time: shift.end_time,
        duration: duration || 0,
        duration_formatted
      }
    };
  }

  // Eliminar un turno (solo para administradores)
  static async deleteShift(shiftId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('shifts')
      .delete()
      .eq('id', shiftId);

    if (error) {
      console.error('Error eliminando turno:', error);
      throw new Error('Error al eliminar el turno');
    }
  }
}
