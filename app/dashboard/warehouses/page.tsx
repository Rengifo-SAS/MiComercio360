import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
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
import { WarehouseFormDialog } from '@/components/warehouse-form-dialog';
import { WarehouseViewDialog } from '@/components/warehouse-view-dialog';
import { WarehouseDeleteDialog } from '@/components/warehouse-delete-dialog';
import {
  Warehouse,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Building2,
  Phone,
  Mail,
} from 'lucide-react';

export default async function WarehousesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect('/auth/login');
  }

  const userId = data.claims.sub;
  const setupStatus = await checkCompanySetup(userId);

  if (!setupStatus.isSetupComplete) {
    redirect('/protected');
  }

  // Obtener bodegas
  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('*')
    .eq('company_id', setupStatus.company!.id)
    .order('is_main', { ascending: false })
    .order('name');

  // Obtener estadísticas de inventario por bodega
  const { data: warehouseStats } = await supabase
    .from('products')
    .select(
      `
      warehouse_id,
      cost_price,
      inventory (
        quantity
      )
    `
    )
    .eq('company_id', setupStatus.company!.id)
    .not('warehouse_id', 'is', null);

  // Calcular estadísticas
  const totalWarehouses = warehouses?.length || 0;
  const activeWarehouses = warehouses?.filter((w) => w.is_active).length || 0;
  const mainWarehouse = warehouses?.find((w) => w.is_main);

  // Calcular valor total por bodega
  const warehouseValues =
    warehouses?.map((warehouse) => {
      const productsInWarehouse =
        warehouseStats?.filter((stat) => stat.warehouse_id === warehouse.id) ||
        [];

      const totalValue = productsInWarehouse.reduce((sum, product) => {
        const quantity = product.inventory?.[0]?.quantity || 0;
        // Usar el cost_price del producto (necesitamos obtenerlo de la consulta)
        return sum + quantity * Number(product.cost_price || 0);
      }, 0);

      const totalQuantity = productsInWarehouse.reduce((sum, product) => {
        const quantity = product.inventory?.[0]?.quantity || 0;
        return sum + quantity;
      }, 0);

      return {
        ...warehouse,
        totalValue,
        totalQuantity,
        productCount: productsInWarehouse.length,
      };
    }) || [];

  return (
    <RouteGuard requiredPermission="warehouses.read">
      <div className="flex-1 w-full flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bodegas</h1>
            <p className="text-muted-foreground">
              Gestiona las bodegas y ubicaciones de almacenamiento
            </p>
          </div>
          <WarehouseFormDialog />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Bodegas
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWarehouses}</div>
              <p className="text-xs text-muted-foreground">Configuradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activas</CardTitle>
              <Warehouse className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeWarehouses}</div>
              <p className="text-xs text-muted-foreground">En operación</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Bodega Principal
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mainWarehouse ? mainWarehouse.name : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {mainWarehouse ? mainWarehouse.code : 'No configurada'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Warehouses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouseValues.map((warehouse) => (
            <Card key={warehouse.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {warehouse.name}
                      {warehouse.is_main && (
                        <Badge variant="default" className="text-xs">
                          Principal
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Código: {warehouse.code}</CardDescription>
                  </div>
                  <Badge
                    variant={warehouse.is_active ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {warehouse.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Información de contacto */}
                <div className="space-y-2">
                  {warehouse.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="break-words">{warehouse.address}</span>
                    </div>
                  )}
                  {warehouse.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{warehouse.phone}</span>
                    </div>
                  )}
                  {warehouse.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="break-all">{warehouse.email}</span>
                    </div>
                  )}
                </div>

                {/* Estadísticas de inventario */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {warehouse.productCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Productos
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {warehouse.totalQuantity}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Unidades
                    </div>
                  </div>
                </div>

                {/* Valor total */}
                <div className="text-center pt-2 border-t">
                  <div className="text-lg font-bold">
                    ${warehouse.totalValue.toLocaleString('es-CO')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Valor Total
                  </div>
                </div>

                {/* Descripción */}
                {warehouse.description && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {warehouse.description}
                    </p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t">
                  <WarehouseViewDialog
                    warehouse={warehouse}
                    trigger={
                      <Button variant="ghost" size="sm" title="Ver detalles">
                        <Eye className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <WarehouseFormDialog
                    warehouse={warehouse}
                    trigger={
                      <Button variant="ghost" size="sm" title="Editar bodega">
                        <Edit className="h-4 w-4" />
                      </Button>
                    }
                  />
                  {!warehouse.is_main && (
                    <WarehouseDeleteDialog
                      warehouse={warehouse}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Eliminar bodega"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {warehouses && warehouses.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay bodegas</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crea tu primera bodega para comenzar a gestionar el inventario
              </p>
              <WarehouseFormDialog />
            </CardContent>
          </Card>
        )}
      </div>
    </RouteGuard>
  );
}
