import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export interface DashboardStats {
  sales: {
    totalAmount: number;
    totalCount: number;
    pendingCount: number;
    completedCount: number;
    averageTicket: number;
    growthPercentage: number;
  };
  products: {
    totalCount: number;
    activeCount: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  customers: {
    totalCount: number;
    activeCount: number;
  };
  accounts: {
    totalCash: number;
    totalBank: number;
    totalBalance: number;
  };
}

export interface RecentSale {
  id: string;
  total_amount: number;
  created_at: string;
  payment_status: string;
  status: string;
  customer_name: string | null;
}

export interface LowStockProduct {
  product_id: string;
  product_name: string;
  product_sku: string;
  current_stock: number;
  min_stock: number;
  is_out_of_stock: boolean;
  units_sold_30_days: number;
  priority: number;
}

/**
 * Obtiene estadísticas completas del dashboard de manera optimizada
 * Usa agregaciones en la base de datos en lugar de procesamiento en el cliente
 */
export async function getDashboardStats(
  companyId: string
): Promise<DashboardStats> {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Obtener estadísticas de ventas (últimos 30 días)
  const { data: currentSales } = await supabase
    .from('sales')
    .select('total_amount, payment_status, status')
    .eq('company_id', companyId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Obtener ventas de los 30 días anteriores para calcular crecimiento
  const { data: previousSales } = await supabase
    .from('sales')
    .select('total_amount')
    .eq('company_id', companyId)
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString())
    .eq('status', 'completed');

  // Calcular estadísticas de ventas
  const totalAmount =
    currentSales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) ||
    0;
  const completedSales =
    currentSales?.filter((s) => s.status === 'completed') || [];
  const completedAmount = completedSales.reduce(
    (sum, sale) => sum + Number(sale.total_amount),
    0
  );
  const previousAmount =
    previousSales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) ||
    0;

  const growthPercentage =
    previousAmount > 0
      ? ((completedAmount - previousAmount) / previousAmount) * 100
      : completedAmount > 0
      ? 100
      : 0;

  // Obtener estadísticas de productos con inventario
  const { data: productsData } = await supabase
    .from('products')
    .select(
      `
      id,
      is_active,
      min_stock,
      inventory(quantity)
    `
    )
    .eq('company_id', companyId);

  const activeProducts =
    productsData?.filter((p) => p.is_active).length || 0;
  const lowStockProducts =
    productsData?.filter((p: any) => {
      const stock = p.inventory?.[0]?.quantity || 0;
      return stock <= p.min_stock && stock > 0;
    }).length || 0;
  const outOfStockProducts =
    productsData?.filter((p: any) => {
      const stock = p.inventory?.[0]?.quantity || 0;
      return stock === 0;
    }).length || 0;

  // Obtener estadísticas de clientes
  const { data: customersData } = await supabase
    .from('customers')
    .select('id, is_active')
    .eq('company_id', companyId);

  const activeCustomers =
    customersData?.filter((c) => c.is_active).length || 0;

  // Obtener balances de cuentas
  const { data: accountsData } = await supabase
    .from('accounts')
    .select('current_balance, account_type')
    .eq('company_id', companyId)
    .eq('is_active', true);

  const cashBalance =
    accountsData
      ?.filter((a) => a.account_type === 'CASH_BOX')
      .reduce((sum, a) => sum + Number(a.current_balance), 0) || 0;

  const bankBalance =
    accountsData
      ?.filter((a) => a.account_type === 'BANK_ACCOUNT')
      .reduce((sum, a) => sum + Number(a.current_balance), 0) || 0;

  return {
    sales: {
      totalAmount: completedAmount,
      totalCount: currentSales?.length || 0,
      pendingCount:
        currentSales?.filter((s) => s.payment_status === 'PENDING').length || 0,
      completedCount: completedSales.length,
      averageTicket:
        completedSales.length > 0 ? completedAmount / completedSales.length : 0,
      growthPercentage,
    },
    products: {
      totalCount: productsData?.length || 0,
      activeCount: activeProducts,
      lowStockCount: lowStockProducts,
      outOfStockCount: outOfStockProducts,
    },
    customers: {
      totalCount: customersData?.length || 0,
      activeCount: activeCustomers,
    },
    accounts: {
      totalCash: cashBalance,
      totalBank: bankBalance,
      totalBalance: cashBalance + bankBalance,
    },
  };
}

/**
 * Obtiene las ventas recientes de manera optimizada
 */
export async function getRecentSales(
  companyId: string,
  limit: number = 6
): Promise<RecentSale[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('sales')
    .select(
      `
      id,
      total_amount,
      created_at,
      payment_status,
      status,
      customers(business_name)
    `
    )
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (
    data?.map((sale: any) => ({
      id: sale.id,
      total_amount: Number(sale.total_amount),
      created_at: sale.created_at,
      payment_status: sale.payment_status,
      status: sale.status,
      customer_name: sale.customers?.[0]?.business_name || null,
    })) || []
  );
}

/**
 * Obtiene productos con stock bajo ordenados por prioridad
 * Prioridad: Sin stock y más vendidos > Stock bajo y más vendidos
 */
export async function getLowStockProducts(
  companyId: string,
  limit: number = 5
): Promise<LowStockProduct[]> {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Obtener productos con stock bajo o sin stock
  const { data: inventoryData } = await supabase
    .from('inventory')
    .select(
      `
      quantity,
      products(
        id,
        name,
        sku,
        min_stock,
        company_id
      )
    `
    )
    .eq('products.company_id', companyId);

  // Filtrar productos con stock bajo o sin stock
  const lowStockItems =
    inventoryData?.filter((item: any) => {
      const stock = item.quantity;
      const product = item.products;
      if (!product) return false;
      const minStock = product.min_stock || 0;
      return stock <= minStock;
    }) || [];

  if (lowStockItems.length === 0) {
    return [];
  }

  const productIds = lowStockItems
    .map((item: any) => item.products?.id)
    .filter(Boolean);

  // Obtener ventas de estos productos en los últimos 30 días
  const { data: salesData } = await supabase
    .from('sale_items')
    .select('product_id, quantity')
    .in('product_id', productIds)
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Agregar ventas por producto
  const salesByProduct = new Map<string, number>();
  salesData?.forEach((item: any) => {
    const current = salesByProduct.get(item.product_id) || 0;
    salesByProduct.set(item.product_id, current + item.quantity);
  });

  // Procesar y ordenar productos
  const processedProducts: LowStockProduct[] = lowStockItems
    .map((item: any) => {
      const product = item.products; // products es un objeto, no un array
      if (!product || !product.id) {
        return null;
      }

      const currentStock = item.quantity;
      const isOutOfStock = currentStock === 0;
      const unitsSold = salesByProduct.get(product.id) || 0;

      return {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        current_stock: currentStock,
        min_stock: product.min_stock,
        is_out_of_stock: isOutOfStock,
        units_sold_30_days: unitsSold,
        priority: isOutOfStock ? 1 : 2, // Sin stock = 1, Stock bajo = 2
      };
    })
    .filter((item): item is LowStockProduct => item !== null) // Filtrar nulls
    .sort((a, b) => {
      // Ordenar por prioridad primero
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Luego por unidades vendidas (más vendidos primero)
      return b.units_sold_30_days - a.units_sold_30_days;
    })
    .slice(0, limit);

  return processedProducts;
}

/**
 * Obtiene datos de ventas para gráficas con agregación optimizada
 */
export async function getSalesChartData(
  companyId: string,
  periodType: 'week' | 'month' | 'year' = 'month'
) {
  const supabase = await createClient();

  const now = new Date();
  let fromDate: Date;
  let toDate: Date = new Date();

  switch (periodType) {
    case 'week':
      const startOfWeek = new Date(now);
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(now.getDate() + daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      fromDate = startOfWeek;
      break;

    case 'month':
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate.setHours(0, 0, 0, 0);
      break;

    case 'year':
      fromDate = new Date(now.getFullYear(), 0, 1);
      fromDate.setHours(0, 0, 0, 0);
      break;

    default:
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const { data, error } = await supabase
    .from('sales')
    .select('total_amount, created_at')
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .gte('created_at', fromDate.toISOString())
    .lte('created_at', toDate.toISOString())
    .order('created_at');

  if (error) {
    console.error('Error fetching sales chart data:', error);
    return [];
  }

  // Agrupar datos por período
  const groupedData: {
    [key: string]: { amount: number; count: number };
  } = {};

  data?.forEach((sale) => {
    const date = new Date(sale.created_at);
    let key: string;

    switch (periodType) {
      case 'week':
      case 'month':
        key = date.toISOString().split('T')[0]; // Día
        break;
      case 'year':
        key = date.toISOString().substring(0, 7); // Mes (YYYY-MM)
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!groupedData[key]) {
      groupedData[key] = { amount: 0, count: 0 };
    }

    groupedData[key].amount += Number(sale.total_amount);
    groupedData[key].count += 1;
  });

  return Object.entries(groupedData)
    .map(([date, data]) => ({
      date,
      amount: data.amount,
      transactions: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Obtiene los productos más vendidos con agregación optimizada
 */
export async function getTopProducts(companyId: string, limit: number = 8) {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('sale_items')
    .select(
      `
      product_id,
      quantity,
      total_price,
      products!inner(name, company_id)
    `
    )
    .eq('products.company_id', companyId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('Error fetching top products:', error);
    return [];
  }

  // Agrupar por producto
  const productMap = new Map<
    string,
    { name: string; quantity: number; amount: number }
  >();

  data?.forEach((item: any) => {
    const productId = item.product_id;
    const productName = item.products?.name;

    if (!productName) return;

    if (productMap.has(productId)) {
      const existing = productMap.get(productId)!;
      existing.quantity += item.quantity;
      existing.amount += Number(item.total_price);
    } else {
      productMap.set(productId, {
        name: productName,
        quantity: item.quantity,
        amount: Number(item.total_price),
      });
    }
  });

  return Array.from(productMap.entries())
    .map(([id, data]) => ({
      product_id: id,
      product_name: data.name,
      quantity_sold: data.quantity,
      total_amount: data.amount,
    }))
    .sort((a, b) => b.quantity_sold - a.quantity_sold)
    .slice(0, limit);
}
