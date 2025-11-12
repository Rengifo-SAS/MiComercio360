'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductFormDialog } from '@/components/product-form-dialog';
import { ProductViewDialog } from '@/components/product-view-dialog';
import { ProductDeleteDialog } from '@/components/product-delete-dialog';
import { InventoryAdjustmentDialog } from '@/components/inventory-adjustment-dialog';
import { ProductsImportDialog } from '@/components/products-import-dialog';
import { ProductsService } from '@/lib/services/products-service';
import {
  Package,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  Upload,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Product as BaseProduct } from '@/lib/types/products';

interface Product extends BaseProduct {
  categories?: {
    id: string;
    name: string;
    color: string;
  };
  suppliers?: {
    id: string;
    name: string;
  };
  warehouses?: {
    id: string;
    name: string;
    code: string;
  };
}

interface ProductsPageClientProps {
  initialProducts: Product[];
  companyId: string;
  userId: string;
}

export function ProductsPageClient({
  initialProducts,
  companyId,
  userId,
}: ProductsPageClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(initialProducts.length);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Estados para estadísticas de la base de datos
  const [stats, setStats] = useState({
    total_products: 0,
    active_products: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
  });

  const itemsPerPage = 20;

  // Función para cargar estadísticas desde la base de datos
  const loadStats = async () => {
    try {
      const statsData = await ProductsService.getProductsStats(companyId);
      setStats(statsData);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      // Mantener valores por defecto en caso de error
      setStats({
        total_products: 0,
        active_products: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
      });
    }
  };

  // Función para cargar productos con paginación
  const loadProducts = async (page: number = 1) => {
    setLoading(true);
    try {
      const offset = (page - 1) * itemsPerPage;
      const result = await ProductsService.getProducts(companyId, {
        search: searchTerm,
        categoryId: selectedCategory || undefined,
        sortBy,
        sortOrder,
        limit: itemsPerPage,
        offset,
      });

      setProducts(result.products);
      setTotalProducts(result.total);
      setTotalPages(Math.ceil(result.total / itemsPerPage));
      setCurrentPage(page);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar productos iniciales y estadísticas
  useEffect(() => {
    loadProducts(1);
    loadStats();
  }, []);

  // Efecto para cargar productos cuando cambian los filtros
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProducts(1);
    }, 300); // Debounce para búsqueda

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory, sortBy, sortOrder]);

  // Remover la apertura automática del formulario de ajuste
  // El formulario solo debe abrirse cuando el usuario haga clic en "Ajustar"

  const handleAdjustmentClose = () => {
    setShowAdjustmentDialog(false);
    setSelectedProduct(null);
  };

  const handleProductUpdate = (updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };

  const handleProductCreate = (newProduct: Product) => {
    // Recargar la lista para mantener la paginación correcta
    loadProducts(currentPage);
    // Recargar estadísticas para reflejar el nuevo producto
    loadStats();
  };

  const handleProductDelete = (deletedProductId: string) => {
    // Recargar la lista para mantener la paginación correcta
    loadProducts(currentPage);
    // Recargar estadísticas para reflejar el producto eliminado
    loadStats();
    // Cerrar el diálogo de ajuste si se eliminó el producto seleccionado
    if (selectedProduct?.id === deletedProductId) {
      setSelectedProduct(null);
      setShowAdjustmentDialog(false);
    }
  };

  const handleImportComplete = () => {
    // Recargar la lista para mostrar los nuevos productos
    loadProducts(1);
    // Recargar estadísticas para reflejar los productos importados
    loadStats();
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tu catálogo de productos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProductFormDialog onProductCreated={handleProductCreate} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">
              Total Productos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{stats.total_products}</div>
            <p className="text-xs text-muted-foreground">En catálogo</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Activos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{stats.active_products}</div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Bajo Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{stats.low_stock_count}</div>
            <p className="text-xs text-muted-foreground">
              Necesitan reposición
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Sin Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{stats.out_of_stock_count}</div>
            <p className="text-xs text-muted-foreground">Agotados</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4"
              aria-hidden="true"
            />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
              aria-label="Buscar productos por nombre, SKU o descripción"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nombre</SelectItem>
              <SelectItem value="sku">SKU</SelectItem>
              <SelectItem value="selling_price">Precio</SelectItem>
              <SelectItem value="created_at">Fecha</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            aria-label={`Cambiar orden a ${
              sortOrder === 'asc' ? 'descendente' : 'ascendente'
            }`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
            aria-label="Importar productos desde archivo Excel"
          >
            <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
            Importar Excel
          </Button>
          <Button
            variant="outline"
            aria-label="Exportar productos"
          >
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Productos</CardTitle>
          <CardDescription className="text-sm">Lista de productos en tu catálogo</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Cargando productos...
              </p>
            </div>
          ) : products.length > 0 ? (
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
                          {inventory?.warehouses?.name ||
                            product.warehouses?.name ||
                            'Sin bodega'}
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
                          onProductUpdated={handleProductUpdate}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Ajustar inventario"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowAdjustmentDialog(true);
                          }}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        <ProductDeleteDialog
                          product={product}
                          onProductDeleted={handleProductDelete}
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
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">No hay productos registrados</p>
              <p className="text-sm">Los productos aparecerán aquí</p>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && !loading && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a{' '}
                {Math.min(currentPage * itemsPerPage, totalProducts)} de{' '}
                {totalProducts} productos
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadProducts(1)}
                  disabled={currentPage === 1}
                >
                  Primera
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadProducts(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                {/* Números de página */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const startPage = Math.max(1, currentPage - 2);
                  const pageNum = startPage + i;
                  if (pageNum > totalPages) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => loadProducts(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadProducts(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadProducts(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Última
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Adjustment Dialog */}
      {showAdjustmentDialog && selectedProduct && (
        <InventoryAdjustmentDialog
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          currentQuantity={selectedProduct.inventory?.[0]?.quantity || 0}
          onAdjust={handleAdjustmentClose}
        />
      )}

      {/* Products Import Dialog */}
      <ProductsImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        companyId={companyId}
        userId={userId}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
