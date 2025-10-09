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
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Eye,
  Plus,
  ArrowUpRight,
  Activity,
  CreditCard,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

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
    recentActivities,
    accountsStats,
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
        customers(id, name)
      `
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Productos con stock bajo
    supabase
      .from('warehouse_inventory')
      .select(
        `
        quantity,
        min_stock,
        products!inner(id, name, sku, company_id)
      `
      )
      .eq('products.company_id', companyId)
      .lt('quantity', 'min_stock')
      .limit(5),

    // Actividades recientes (audit_log)
    supabase
      .from('audit_log')
      .select(
        `
        id,
        table_name,
        action,
        created_at,
        profiles!inner(full_name, email)
      `
      )
      .order('created_at', { ascending: false })
      .limit(10),

    // Estadísticas de cuentas
    supabase
      .from('accounts')
      .select('current_balance, account_type, is_active')
      .eq('company_id', companyId)
      .eq('is_active', true),
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
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido,{' '}
            {setupStatus.profile?.full_name || setupStatus.profile?.email}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>{setupStatus.company?.name}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ventas del Mes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalSales.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesCount} transacciones
              {pendingSales > 0 && (
                <span className="text-orange-600 ml-1">
                  ({pendingSales} pendientes)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {activeProducts} activos
              {lowStockCount > 0 && (
                <span className="text-red-600 ml-1">
                  ({lowStockCount} con stock bajo)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {activeCustomers} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Efectivo Total
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCash.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">En cuentas activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/pos">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Punto de Venta
              </CardTitle>
              <CardDescription>
                Iniciar una nueva transacción de venta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Venta
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/inventory">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventario
              </CardTitle>
              <CardDescription>Gestionar productos y stock</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Ver Inventario
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/sales">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ventas
              </CardTitle>
              <CardDescription>Ver historial de ventas</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <BarChart3 className="h-4 w-4 mr-2" />
                Ver Ventas
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/customers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clientes
              </CardTitle>
              <CardDescription>Gestionar base de clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Ver Clientes
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Alerts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas
            </CardTitle>
            <CardDescription>Elementos que requieren atención</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockCount > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      Stock Bajo
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-300">
                      {lowStockCount} productos con stock bajo
                    </p>
                  </div>
                  <Link href="/dashboard/inventory">
                    <Button size="sm" variant="outline">
                      Ver
                    </Button>
                  </Link>
                </div>
                {lowStockProducts.data?.slice(0, 3).map(
                  (item: {
                    quantity: number;
                    min_stock: number;
                    products: {
                      id: string;
                      name: string;
                      sku: string;
                      company_id: string;
                    }[];
                  }) => {
                    const product = item.products[0]; // Tomar el primer producto del array
                    return (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {item.quantity} / Mín: {item.min_stock}
                          </p>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          Bajo
                        </Badge>
                      </div>
                    );
                  }
                )}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ventas Recientes
            </CardTitle>
            <CardDescription>Últimas transacciones realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSales.data && recentSales.data.length > 0 ? (
              <div className="space-y-3">
                {recentSales.data.map(
                  (sale: {
                    id: string;
                    total_amount: string | number;
                    created_at: string;
                    payment_status: string;
                    customers: { id: string; name: string }[];
                  }) => {
                    const customer = sale.customers[0]; // Tomar el primer cliente del array
                    return (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {customer?.name || 'Cliente General'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(sale.created_at).toLocaleDateString(
                                'es-CO'
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            ${Number(sale.total_amount).toLocaleString('es-CO')}
                          </p>
                          <Badge
                            variant={
                              sale.payment_status === 'COMPLETED'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {sale.payment_status === 'COMPLETED'
                              ? 'Pagado'
                              : 'Pendiente'}
                          </Badge>
                        </div>
                      </div>
                    );
                  }
                )}
                <div className="pt-2">
                  <Link href="/dashboard/sales">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver todas las ventas
                      <ArrowUpRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay ventas recientes</p>
                <p className="text-sm">Las transacciones aparecerán aquí</p>
                <Link href="/dashboard/pos" className="mt-4 inline-block">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Realizar Primera Venta
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
          <CardDescription>
            Últimas acciones realizadas en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.data && recentActivities.data.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.data
                .slice(0, 5)
                .map(
                  (activity: {
                    id: string;
                    action: string;
                    table_name: string;
                    created_at: string;
                    profiles: { full_name?: string; email?: string }[];
                  }) => {
                    const profile = activity.profiles[0]; // Tomar el primer perfil del array
                    return (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {activity.action} en {activity.table_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Por{' '}
                            {profile?.full_name || profile?.email || 'Usuario'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleDateString(
                              'es-CO'
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleTimeString(
                              'es-CO',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay actividad reciente</p>
              <p className="text-sm">
                Las acciones del sistema aparecerán aquí
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
