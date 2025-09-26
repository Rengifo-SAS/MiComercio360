'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Package,
  Tag,
  Building2,
  Calendar,
  DollarSign,
  BarChart3,
  Image,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  warehouse_id?: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  max_stock?: number;
  unit: string;
  barcode?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  categories?: Category;
  suppliers?: Supplier;
  warehouses?: Warehouse;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface ProductViewDialogProps {
  product: Product;
  trigger?: React.ReactNode;
}

export function ProductViewDialog({
  product,
  trigger,
}: ProductViewDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [inventoryQuantity, setInventoryQuantity] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Cargar información adicional cuando se abre el modal
  useEffect(() => {
    if (open) {
      const loadAdditionalData = async () => {
        setIsLoading(true);
        try {
          // Cargar categoría
          if (product.category_id) {
            const { data: categoryData } = await supabase
              .from('categories')
              .select('id, name, color')
              .eq('id', product.category_id)
              .single();
            setCategory(categoryData);
          }

          // Cargar proveedor
          if (product.supplier_id) {
            const { data: supplierData } = await supabase
              .from('suppliers')
              .select('id, name')
              .eq('id', product.supplier_id)
              .single();
            setSupplier(supplierData);
          }

          // Cargar cantidad en inventario
          const { data: inventoryData } = await supabase
            .from('inventory')
            .select('quantity')
            .eq('product_id', product.id)
            .single();

          setInventoryQuantity(inventoryData?.quantity || 0);
        } catch (error) {
          console.error('Error loading additional data:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadAdditionalData();
    }
  }, [open, product.id, product.category_id, product.supplier_id, supabase]);

  const profitMargin =
    product.cost_price > 0
      ? (
          ((product.selling_price - product.cost_price) / product.cost_price) *
          100
        ).toFixed(1)
      : '0';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" title="Ver detalles">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product.name}
          </DialogTitle>
          <DialogDescription>Detalles del producto</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado:</span>
              <Badge variant={product.is_active ? 'default' : 'secondary'}>
                {product.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">
                  Código Interno (SKU):
                </span>
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {product.sku}
                </p>
              </div>
              {product.barcode && (
                <div>
                  <span className="text-sm font-medium">Código de Barras:</span>
                  <p className="text-sm text-muted-foreground font-mono break-all">
                    {product.barcode}
                  </p>
                </div>
              )}
            </div>

            {/* Información de Bodega */}
            {product.warehouses && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Bodega:</span>
                  <p className="text-sm text-muted-foreground">
                    {product.warehouses.name} ({product.warehouses.code})
                  </p>
                </div>
              </div>
            )}

            {product.description && (
              <div>
                <span className="text-sm font-medium">Descripción:</span>
                <p className="text-sm text-muted-foreground mt-1 break-words">
                  {product.description}
                </p>
              </div>
            )}
          </div>

          {/* Categoría y Proveedor */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Clasificación</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <p className="text-sm font-medium">Categoría</p>
                    <p className="text-xs text-muted-foreground">
                      {category.name}
                    </p>
                  </div>
                </div>
              )}
              {supplier && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Proveedor</p>
                    <p className="text-xs text-muted-foreground">
                      {supplier.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Precios y Margen */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Información Financiera</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <DollarSign className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-medium">Costo</p>
                <p className="text-lg font-bold break-all">
                  ${product.cost_price.toLocaleString('es-CO')}
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <DollarSign className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-medium">Venta</p>
                <p className="text-lg font-bold break-all">
                  ${product.selling_price.toLocaleString('es-CO')}
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg sm:col-span-2 lg:col-span-1">
                <BarChart3 className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-medium">Margen</p>
                <p className="text-lg font-bold">{profitMargin}%</p>
              </div>
            </div>
          </div>

          {/* Inventario */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Inventario</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <Package className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-medium">En Stock</p>
                <p className="text-lg font-bold">
                  {isLoading ? '...' : inventoryQuantity}
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Package className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-medium">Mínimo</p>
                <p className="text-lg font-bold">{product.min_stock}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Package className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-medium">Máximo</p>
                <p className="text-lg font-bold">{product.max_stock || '∞'}</p>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span className="text-sm text-muted-foreground">
                Unidad: {product.unit}
              </span>
            </div>
          </div>

          {/* Imagen */}
          {product.image_url && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Imagen</h4>
              <div className="flex justify-center">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="max-w-full h-32 object-cover rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Información Adicional</h4>
            <div className="space-y-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono text-xs break-all">
                  {product.id}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-muted-foreground">Creado:</span>
                <span className="break-words">
                  {new Date(product.created_at).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-muted-foreground">Actualizado:</span>
                <span className="break-words">
                  {new Date(product.updated_at).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
