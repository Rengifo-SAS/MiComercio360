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
import dynamic from 'next/dynamic';

// Lazy load componentes de gráficos pesados
const SalesChart = dynamic(() => import('@/components/dashboard/sales-chart').then(mod => ({ default: mod.SalesChart })), {
  loading: () => <div className="h-64 flex items-center justify-center">Cargando gráfico...</div>,
});

const TopProductsChart = dynamic(() => import('@/components/dashboard/top-products-chart').then(mod => ({ default: mod.TopProductsChart })), {
  loading: () => <div className="h-64 flex items-center justify-center">Cargando gráfico...</div>,
});

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

  // Obtener estadísticas completas del dashboard usando el servicio optimizado
  const {
    getDashboardStats,
    getRecentSales,
    getLowStockProducts,
  } = await import('@/lib/services/dashboard-service');

  const [dashboardStats, recentSales, lowStockProducts] = await Promise.all([
    getDashboardStats(companyId),
    getRecentSales(companyId, 6),
    getLowStockProducts(companyId, 5),
  ]);

  const totalSales = dashboardStats.sales.totalAmount;
  const salesCount = dashboardStats.sales.totalCount;
  const pendingSales = dashboardStats.sales.pendingCount;
  const averageTicket = dashboardStats.sales.averageTicket;
  const growthPercentage = dashboardStats.sales.growthPercentage;

  const totalProducts = dashboardStats.products.totalCount;
  const activeProducts = dashboardStats.products.activeCount;
  const lowStockCount = dashboardStats.products.lowStockCount;
  const outOfStockCount = dashboardStats.products.outOfStockCount;

  const totalCustomers = dashboardStats.customers.totalCount;
  const activeCustomers = dashboardStats.customers.activeCount;

  const totalCash = dashboardStats.accounts.totalBalance;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
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
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              {salesCount} transacciones
              {growthPercentage !== 0 && (
                <span
                  className={`inline-flex items-center gap-0.5 ${
                    growthPercentage > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {growthPercentage > 0 ? '↑' : '↓'}
                  {Math.abs(growthPercentage).toFixed(1)}%
                </span>
              )}
            </p>
            {pendingSales > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                {pendingSales} pendientes
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Ticket Promedio
            </CardTitle>
            <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
              ${averageTicket.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Por transacción completada
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

        <Card className="hover:shadow-md transition-shadow">
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
              Caja y bancos
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
            {lowStockProducts.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-orange-800 dark:text-orange-200 truncate">
                      Stock Bajo
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-300 truncate">
                      {lowStockProducts.length} productos prioritarios con stock
                      bajo o sin stock
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
                {lowStockProducts.map((product) => {
                  return (
                    <div
                      key={product.product_id}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {product.product_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          SKU: {product.product_sku} | Stock:{' '}
                          {product.current_stock} / Mín: {product.min_stock}
                          {product.units_sold_30_days > 0 && (
                            <span className="ml-2 text-blue-600">
                              | Vendidos: {product.units_sold_30_days}
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge
                        variant={
                          product.is_out_of_stock ? 'destructive' : 'secondary'
                        }
                        className="text-xs flex-shrink-0 ml-2"
                      >
                        {product.is_out_of_stock ? 'Sin Stock' : 'Stock Bajo'}
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
            {recentSales && recentSales.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {recentSales.map((sale) => {
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
                            {sale.customer_name || 'Consumidor Final'}
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
                          ${sale.total_amount.toLocaleString('es-CO')}
                        </p>
                        <Badge
                          variant={
                            sale.status === 'completed' ? 'default' : 'secondary'
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
                })}
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
