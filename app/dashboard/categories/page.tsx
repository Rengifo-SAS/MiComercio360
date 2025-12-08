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
import { CategoryFormDialog } from '@/components/category-form-dialog';
import { CategoryViewDialog } from '@/components/category-view-dialog';
import { CategoryDeleteDialog } from '@/components/category-delete-dialog';
import {
  Tag,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Palette,
  Package,
} from 'lucide-react';

export default async function CategoriesPage() {
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

  // Obtener categorías con conteo de productos
  const { data: categories } = await supabase
    .from('categories')
    .select(
      `
      *,
      products (id)
    `
    )
    .eq('company_id', setupStatus.company!.id)
    .order('created_at', { ascending: false });

  // Calcular estadísticas
  const totalCategories = categories?.length || 0;
  const activeCategories = categories?.filter((c) => c.is_active).length || 0;
  const categoriesWithProducts =
    categories?.filter((c) => c.products && c.products.length > 0).length || 0;
  const totalProductsInCategories =
    categories?.reduce((sum, c) => sum + (c.products?.length || 0), 0) || 0;

  return (


    <RouteGuard requiredPermission="categories.read">
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            <Tag className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
            <p className="text-sm text-muted-foreground">
              Organiza tus productos por categorías
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CategoryFormDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">
              Total Categorías
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">Creadas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Activas</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{activeCategories}</div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Con Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{categoriesWithProducts}</div>
            <p className="text-xs text-muted-foreground">En uso</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">
              Total Productos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {totalProductsInCategories}
            </div>
            <p className="text-xs text-muted-foreground">Categorizados</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories && categories.length > 0 ? (
          categories.map((category) => {
            const productCount = category.products?.length || 0;

            return (
              <Card key={category.id} className="relative shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                    </div>
                    <Badge
                      variant={category.is_active ? 'default' : 'secondary'}
                    >
                      {category.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  {category.description && (
                    <CardDescription className="text-sm">
                      {category.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Información de productos */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Productos:</span>
                      <span className="font-medium">{productCount}</span>
                    </div>

                    {/* Color preview */}
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Color:
                      </span>
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: category.color }}
                        title={category.color}
                      />
                    </div>

                    {/* Fecha de creación */}
                    <div className="text-xs text-muted-foreground">
                      Creada:{' '}
                      {new Date(category.created_at).toLocaleDateString(
                        'es-CO'
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-4 pt-3 border-t">
                    <CategoryViewDialog
                      category={category}
                      trigger={
                        <Button variant="ghost" size="sm" title="Ver detalles">
                          <Eye className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <CategoryFormDialog
                      category={category}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Editar categoría"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <CategoryDeleteDialog
                      category={category}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Eliminar categoría"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay categorías registradas</p>
            <p className="text-sm">Las categorías aparecerán aquí</p>
          </div>
        )}
      </div>
    </div>
    </RouteGuard>

  );
}