export interface Shift {
  id: string;
  cashier_id: string;
  start_time: string;
  end_time?: string;
  initial_cash: number;
  final_cash?: number;
  total_sales: number;
  total_transactions: number;
  status: 'open' | 'closed';
  notes?: string;
  created_at: string;
  company_id: string;
  source_account_id?: string;
  
  // Relaciones
  cashier?: {
    id: string;
    full_name: string;
    email: string;
  };
  source_account?: {
    id: string;
    account_name: string;
    account_type: string;
    bank_name?: string;
  };
  sales?: {
    id: string;
    total_amount: number;
    payment_method: string;
    created_at: string;
  }[];
}

export interface CreateShiftData {
  initial_cash: number;
  notes?: string;
  source_account_id?: string;
}

export interface UpdateShiftData {
  final_cash?: number;
  notes?: string;
}

export interface CloseShiftData {
  final_cash: number;
  notes?: string;
}

export interface ShiftFilters {
  status?: ('open' | 'closed')[];
  cashier_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface ShiftSearchParams {
  query?: string;
  filters?: ShiftFilters;
  sort_by?: 'start_time' | 'end_time' | 'total_sales' | 'total_transactions';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ShiftStats {
  total_shifts: number;
  open_shifts: number;
  closed_shifts: number;
  total_sales: number;
  total_transactions: number;
  average_shift_duration: number;
  total_cash_difference: number;
}

export interface ShiftCashSummary {
  initial_cash: number;
  final_cash: number;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
  mixed_sales: number;
  expected_cash: number;
  actual_cash: number;
  difference: number;
}

export interface ShiftReport {
  shift: Shift;
  cash_summary: ShiftCashSummary;
  sales_summary: {
    total_sales: number;
    total_transactions: number;
    average_sale: number;
    payment_methods: {
      cash: number;
      card: number;
      transfer: number;
      mixed: number;
    };
  };
  time_summary: {
    start_time: string;
    end_time?: string;
    duration?: number;
    duration_formatted?: string;
  };
}

export interface CashMovement {
  id: string;
  shift_id: string;
  movement_type: 'income' | 'expense';
  amount: number;
  description: string;
  reference?: string;
  created_at: string;
  created_by: string;
}

export interface CreateCashMovementData {
  movement_type: 'income' | 'expense';
  amount: number;
  description: string;
  reference?: string;
}

// Funciones de utilidad
export function calculateShiftDuration(startTime: string, endTime?: string): number | null {
  if (!endTime) return null;
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  return end.getTime() - start.getTime();
}

export function formatShiftDuration(duration: number): string {
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((duration % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export function calculateExpectedCash(
  initialCash: number,
  cashSales: number,
  cashMovements: CashMovement[]
): number {
  let expected = initialCash + cashSales;
  
  cashMovements.forEach(movement => {
    if (movement.movement_type === 'income') {
      expected += movement.amount;
    } else {
      expected -= movement.amount;
    }
  });
  
  return expected;
}

export function calculateCashDifference(
  expectedCash: number,
  actualCash: number
): number {
  return actualCash - expectedCash;
}
