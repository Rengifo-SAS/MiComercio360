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
import { CategoryFormDialog } from '@/components/category-form-dialog';
import { CategoryViewDialog } from '@/components/category-view-dialog';
import { CategoryDeleteDialog } from '@/components/category-delete-dialog';
import {
  Tag,
  Plus,
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
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">
            Organiza tus productos por categorías
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CategoryFormDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Categorías
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">Creadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCategories}</div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoriesWithProducts}</div>
            <p className="text-xs text-muted-foreground">En uso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Productos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalProductsInCategories}
            </div>
            <p className="text-xs text-muted-foreground">Categorizados</p>
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

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories && categories.length > 0 ? (
          categories.map((category) => {
            const productCount = category.products?.length || 0;

            return (
              <Card key={category.id} className="relative">
                <CardHeader className="pb-3">
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
  );
}
