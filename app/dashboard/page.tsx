import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  CreditCard,
  ShoppingCart,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { TopProductsChart } from '@/components/dashboard/top-products-chart';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect('/auth/login');
  }

  const userId = user.id;
  const setupStatus = await checkCompanySetup(userId);

  // Si no está configurado, redirigir a la configuración
  if (!setupStatus.isSetupComplete) {
    redirect('/protected');
  }

  const companyId = setupStatus.company!.id;

  // Obtener estadísticas completas del dashboard
  const [
    salesStats,
    productsStats,
    customersStats,
    recentSales,
    lowStockProducts,
    accountsStats,
    topSoldProducts,
  ] = await Promise.all([
    // Estadísticas de ventas
    supabase
      .from('sales')
      .select('total_amount, created_at, payment_status')
      .eq('company_id', companyId)
      .gte(
        'created_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ),

    // Estadísticas de productos
    supabase
      .from('products')
      .select('id, is_active')
      .eq('company_id', companyId),

    // Estadísticas de clientes
    supabase
      .from('customers')
      .select('id, is_active')
      .eq('company_id', companyId),

    // Ventas recientes
    supabase
      .from('sales')
      .select(
        `
        id,
        total_amount,
        created_at,
        payment_status,
        status,
        customers(id, business_name)
      `
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(6),

    // Productos con stock bajo o sin stock - ordenados por más vendidos
    supabase
      .from('inventory')
      .select(
        `
        quantity,
        products!inner(
          id, 
          name, 
          sku, 
          min_stock, 
          company_id,
          created_at
        )
      `
      )
      .eq('products.company_id', companyId)
      .or('quantity.lte.products.min_stock,quantity.eq.0')
      .order('products.created_at', { ascending: false })
      .limit(10),

    // Estadísticas de cuentas
    supabase
      .from('accounts')
      .select('current_balance, account_type, is_active')
      .eq('company_id', companyId)
      .eq('is_active', true),

    // Productos más vendidos para ordenar alertas
    supabase
      .from('sale_items')
      .select(
        `
        product_id,
        quantity,
        products!inner(id, name, company_id)
      `
      )
      .eq('products.company_id', companyId)
      .gte(
        'created_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order('quantity', { ascending: false })
      .limit(20),
  ]);

  // Procesar estadísticas
  const totalSales =
    salesStats.data?.reduce(
      (sum: number, sale: { total_amount: string | number }) =>
        sum + Number(sale.total_amount),
      0
    ) || 0;
  const salesCount = salesStats.data?.length || 0;
  const pendingSales =
    salesStats.data?.filter(
      (sale: { payment_status: string }) => sale.payment_status === 'PENDING'
    ).length || 0;

  const totalProducts = productsStats.data?.length || 0;
  const activeProducts =
    productsStats.data?.filter((p: { is_active: boolean }) => p.is_active)
      .length || 0;

  const totalCustomers = customersStats.data?.length || 0;
  const activeCustomers =
    customersStats.data?.filter((c: { is_active: boolean }) => c.is_active)
      .length || 0;

  // Remover variable no utilizada
  // const totalInventoryValue = inventoryStats.data?.reduce((sum: number, item: any) => {
  //   // Necesitaríamos el precio de costo del producto para calcular el valor
  //   return sum + item.quantity * 0; // Placeholder - necesitaríamos join con products
  // }, 0) || 0;

  const lowStockCount = lowStockProducts.data?.length || 0;

  // Procesar productos con bajo stock ordenados por más vendidos
  const processedLowStockProducts =
    lowStockProducts.data
      ?.map((item: any) => {
        const product = item.products[0];
        const currentStock = item.quantity;
        const isOutOfStock = currentStock === 0;
        const isLowStock =
          currentStock <= product.min_stock && currentStock > 0;

        // Buscar información de ventas para este producto
        const salesData = topSoldProducts.data?.find(
          (sale: any) => sale.product_id === product.id
        );
        const totalSold = salesData?.quantity || 0;

        return {
          ...item,
          product: product,
          currentStock,
          isOutOfStock,
          isLowStock,
          totalSold,
          priority: isOutOfStock ? 1 : isLowStock ? 2 : 3, // Prioridad: sin stock > bajo stock > otros
        };
      })
      .sort((a: any, b: any) => {
        // Ordenar por prioridad (sin stock primero), luego por más vendidos
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return b.totalSold - a.totalSold;
      })
      .slice(0, 5) || [];

  const totalCash =
    accountsStats.data?.reduce(
      (
        sum: number,
        account: { account_type: string; current_balance: string | number }
      ) => {
        if (
          account.account_type === 'CASH_BOX' ||
          account.account_type === 'BANK_ACCOUNT'
        ) {
          return sum + Number(account.current_balance);
        }
        return sum;
      },
      0
    ) || 0;

  return (
    <div className="flex-1 w-full flex flex-col gap-2 xs:gap-3 sm:gap-4 lg:gap-6 p-2 xs:p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 xs:gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-bold truncate">
            {setupStatus.company?.name || 'Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground truncate">
            Bienvenido,{' '}
            {setupStatus.profile?.full_name || setupStatus.profile?.email}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-shrink-0">
          <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="truncate max-w-[200px] sm:max-w-none">
            {setupStatus.company?.name}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Ventas del Mes
            </CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
              ${totalSales.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {salesCount} transacciones
              {pendingSales > 0 && (
                <span className="text-orange-600 ml-1">
                  ({pendingSales} pendientes)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Clientes
            </CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold">
              {totalCustomers}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {activeCustomers} activos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow sm:col-span-2 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Efectivo Total
            </CardTitle>
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
              ${totalCash.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              En cuentas activas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        <SalesChart companyId={companyId} />
        <TopProductsChart companyId={companyId} />
      </div>

      {/* Alerts and Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Alerts */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              Alertas
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Elementos que requieren atención
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {processedLowStockProducts.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-orange-800 dark:text-orange-200 truncate">
                      Stock Bajo
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-300 truncate">
                      {processedLowStockProducts.length} productos prioritarios
                      con stock bajo o sin stock
                    </p>
                  </div>
                  <Link href="/dashboard/inventory">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0 text-xs"
                    >
                      Ver
                    </Button>
                  </Link>
                </div>
                {processedLowStockProducts.map((item: any) => {
                  const product = item.product;
                  const currentStock = item.currentStock;
                  const isOutOfStock = item.isOutOfStock;
                  const isLowStock = item.isLowStock;
                  const totalSold = item.totalSold;

                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          SKU: {product.sku} | Stock: {currentStock} / Mín:{' '}
                          {product.min_stock}
                          {totalSold > 0 && (
                            <span className="ml-2 text-blue-600">
                              | Vendidos: {totalSold}
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge
                        variant={isOutOfStock ? 'destructive' : 'secondary'}
                        className="text-xs flex-shrink-0 ml-2"
                      >
                        {isOutOfStock ? 'Sin Stock' : 'Stock Bajo'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No hay alertas pendientes</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              Ventas Recientes
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Últimas transacciones realizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {recentSales.data && recentSales.data.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {recentSales.data.map(
                  (sale: {
                    id: string;
                    total_amount: string | number;
                    created_at: string;
                    payment_status: string;
                    status: string;
                    customers: { id: string; business_name: string }[];
                  }) => {
                    const customer = sale.customers?.[0]; // Tomar el primer cliente del array si existe
                    return (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="p-1 sm:p-2 bg-green-100 dark:bg-green-900/20 rounded-full flex-shrink-0">
                            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">
                              {customer?.business_name || 'Consumidor Final'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(sale.created_at).toLocaleDateString(
                                'es-CO'
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2 sm:ml-3">
                          <p className="text-xs sm:text-sm font-bold">
                            ${Number(sale.total_amount).toLocaleString('es-CO')}
                          </p>
                          <Badge
                            variant={
                              sale.status === 'completed'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {sale.status === 'completed'
                              ? 'Completada'
                              : 'Pendiente'}
                          </Badge>
                        </div>
                      </div>
                    );
                  }
                )}
                <div className="pt-2">
                  <Link href="/dashboard/sales">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs sm:text-sm"
                    >
                      Ver todas las ventas
                      <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">No hay ventas recientes</p>
                <p className="text-xs sm:text-sm">
                  Las transacciones aparecerán aquí
                </p>
                <Link
                  href="/dashboard/pos"
                  className="mt-3 sm:mt-4 inline-block"
                >
                  <Button size="sm" className="text-xs sm:text-sm">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Realizar Primera Venta
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
