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
import { ProductFormDialog } from '@/components/product-form-dialog';
import { ProductViewDialog } from '@/components/product-view-dialog';
import { ProductDeleteDialog } from '@/components/product-delete-dialog';
import { InventoryAdjustmentDialog } from '@/components/inventory-adjustment-dialog';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export default async function ProductsPage() {
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

  // Obtener productos con información de inventario y categorías
  const { data: products } = await supabase
    .from('products')
    .select(
      `
      *,
      categories (
        id,
        name,
        color
      ),
      suppliers (
        id,
        name
      ),
      warehouses (
        id,
        name,
        code
      ),
      inventory (
        id,
        quantity,
        location
      )
    `
    )
    .eq('company_id', setupStatus.company!.id)
    .order('created_at', { ascending: false });

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona tu catálogo de productos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProductFormDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Productos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
            <p className="text-xs text-muted-foreground">En catálogo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products?.filter((p) => p.is_active).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bajo Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Necesitan reposición
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Agotados</p>
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

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>Lista de productos en tu catálogo</CardDescription>
        </CardHeader>
        <CardContent>
          {products && products.length > 0 ? (
            <div className="space-y-4">
              {products.map((product) => {
                const inventory = product.inventory?.[0];
                const currentQuantity = inventory?.quantity || 0;
                const isLowStock =
                  product.min_stock > 0 && currentQuantity <= product.min_stock;
                const isOutOfStock = currentQuantity === 0;

                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {product.sku}
                        </p>
                        {product.categories && (
                          <Badge
                            variant="secondary"
                            className="mt-1 text-xs"
                            style={{
                              backgroundColor: product.categories.color + '20',
                              color: product.categories.color,
                            }}
                          >
                            {product.categories.name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{currentQuantity}</p>
                        <p className="text-xs text-muted-foreground">
                          {inventory?.location || 'Sin ubicación'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">
                          $
                          {Number(product.selling_price).toLocaleString(
                            'es-CO'
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Costo: $
                          {Number(product.cost_price).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          isOutOfStock
                            ? 'destructive'
                            : isLowStock
                            ? 'secondary'
                            : product.is_active
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {isOutOfStock
                          ? 'Sin Stock'
                          : isLowStock
                          ? 'Bajo Stock'
                          : product.is_active
                          ? 'Activo'
                          : 'Inactivo'}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <ProductViewDialog
                          product={product}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <ProductFormDialog
                          product={product}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Editar producto"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <InventoryAdjustmentDialog
                          productId={product.id}
                          productName={product.name}
                          currentQuantity={currentQuantity}
                        />
                        <ProductDeleteDialog
                          product={product}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Eliminar producto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay productos registrados</p>
              <p className="text-sm">Los productos aparecerán aquí</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
