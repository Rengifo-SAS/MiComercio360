'use client';

import { useState, useEffect } from 'react';
import { InventorySearchFilter } from '@/components/inventory-search-filter';
import { InventoryActionsBar } from '@/components/inventory-actions-bar';
import { InventoryPagination } from '@/components/inventory-pagination';
import { useInventorySearch } from '@/lib/hooks/use-inventory-search';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InventoryAdjustmentDialog } from '@/components/inventory-adjustment-dialog';
import { ProductViewDialog } from '@/components/product-view-dialog';
import { ProductFormDialog } from '@/components/product-form-dialog';
import { WarehouseTransferDialog } from '@/components/warehouse-transfer-dialog';
import { InventoryHistoryDialog } from '@/components/inventory-history-dialog';
import { PaginationInfo } from '@/lib/hooks/use-inventory-search';
import {
  Store,
  Plus,
  Package,
  AlertTriangle,
  TrendingUp,
  Building2,
} from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  max_stock: number;
  unit: string;
  image_url: string;
  is_active: boolean;
  warehouse_id: string;
  quantity: number;
  last_updated: string;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  category_name: string;
  category_color: string;
  supplier_name: string;
  warehouse_name: string;
  warehouse_code: string;
  total_count: number;
}

interface SearchStats {
  total_products: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_value: number;
}

interface InventoryPageClientProps {
  warehouses: Warehouse[];
  categories: Category[];
  companyId: string;
  initialData: InventoryItem[];
  initialStats: SearchStats;
}

export function InventoryPageClient({
  warehouses,
  categories,
  companyId,
  initialData,
  initialStats,
}: InventoryPageClientProps) {
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(
    null
  );

  // Usar el hook de búsqueda de inventario
  const {
    data: inventoryData,
    stats,
    pagination,
    goToPage,
    changeItemsPerPage,
    search: refreshInventory,
  } = useInventorySearch(companyId);

  // Funciones para manejar cambios (ya no son necesarias porque usamos el hook)
  const handleDataChange = () => {};
  const handleStatsChange = () => {};
  const handlePaginationChange = () => {};

  const handleViewProduct = (product: InventoryItem) => {
    setSelectedProduct(product);
  };

  const handleEditProduct = (product: InventoryItem) => {
    setSelectedProduct(product);
    setShowProductDialog(true);
  };

  const handleAdjustInventory = (product: InventoryItem) => {
    setSelectedProduct(product);
    setShowAdjustmentDialog(true);
  };

  const handleTransferProduct = (product: InventoryItem) => {
    setSelectedProduct(product);
    setShowTransferDialog(true);
  };

  const handleTransferComplete = () => {
    // Refrescar el inventario después de completar una transferencia
    if (refreshInventory) {
      refreshInventory({
        search: '',
        warehouse_id: '',
        category_id: '',
        supplier_id: '',
        stock_status: '',
        sort_by: 'name',
        sort_order: 'asc',
        page: 1,
        limit: 20,
      });
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona el stock y movimientos de productos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">
              Total Productos
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {stats?.total_products || 0}
            </div>
            <p className="text-xs text-muted-foreground">En inventario</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">En Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-green-600">
              {stats?.in_stock_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Bajo Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-orange-600">
              {stats?.low_stock_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Necesitan reposición
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Sin Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-red-600">
              {stats?.out_of_stock_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Agotados</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              ${(stats?.total_value || 0).toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">En inventario</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Bodegas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{warehouses.length}</div>
            <p className="text-xs text-muted-foreground">Activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <InventorySearchFilter
          warehouses={warehouses}
          categories={categories}
          companyId={companyId}
          onDataChange={handleDataChange}
          onStatsChange={handleStatsChange}
          onPaginationChange={handlePaginationChange}
        />

        <InventoryActionsBar
          warehouses={warehouses}
          inventoryData={inventoryData}
          companyId={companyId}
          onTransferComplete={handleTransferComplete}
        />
      </div>

      {/* Inventory Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Inventario Actual</CardTitle>
          <CardDescription className="text-sm">
            Lista de productos con sus cantidades en stock
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {inventoryData && inventoryData.length > 0 ? (
            <div className="space-y-4">
              {inventoryData.map((item, index) => {
                const isLowStock = item.quantity <= item.min_stock;
                const isOutOfStock = item.quantity === 0;
                // Crear una clave única combinando ID del producto, bodega e índice
                const uniqueKey = `${item.id}-${
                  item.warehouse_id || 'default'
                }-${index}`;

                return (
                  <div
                    key={uniqueKey}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {item.sku}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.category_name && (
                            <Badge
                              variant="secondary"
                              className="text-xs"
                              style={{
                                backgroundColor: item.category_color + '20',
                                color: item.category_color,
                              }}
                            >
                              {item.category_name}
                            </Badge>
                          )}
                          {item.warehouse_name && (
                            <Badge variant="outline" className="text-xs">
                              {item.warehouse_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{item.quantity}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.warehouse_name || 'Sin ubicación'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${item.selling_price.toLocaleString('es-CO')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Valor: $
                          {(item.quantity * item.cost_price).toLocaleString(
                            'es-CO'
                          )}
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
                            : 'default'
                        }
                      >
                        {isOutOfStock
                          ? 'Sin Stock'
                          : isLowStock
                          ? 'Bajo Stock'
                          : 'En Stock'}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <ProductViewDialog
                          product={item as any}
                          trigger={
                            <Button variant="outline" size="sm">
                              Ver
                            </Button>
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdjustInventory(item)}
                        >
                          Ajustar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTransferProduct(item)}
                        >
                          Transferir
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No hay productos en inventario
              </h3>
              <p className="text-muted-foreground mb-4">
                Los productos aparecerán aquí
              </p>
              <Button onClick={() => setShowProductDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </div>
          )}
        </CardContent>

        {/* Paginación */}
        {inventoryData && inventoryData.length > 0 && (
          <div className="px-6 pb-6">
            <InventoryPagination
              pagination={pagination}
              onPageChange={goToPage}
              onItemsPerPageChange={changeItemsPerPage}
            />
          </div>
        )}
      </Card>

      {/* Dialogs */}
      {showAdjustmentDialog && selectedProduct && (
        <InventoryAdjustmentDialog
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          currentQuantity={selectedProduct.quantity}
          onAdjust={() => setShowAdjustmentDialog(false)}
        />
      )}

      {showProductDialog && (
        <ProductFormDialog
          product={selectedProduct as any}
          onSave={() => setShowProductDialog(false)}
        />
      )}

      {showTransferDialog && selectedProduct && (
        <WarehouseTransferDialog
          selectedProduct={{
            id: selectedProduct.id,
            name: selectedProduct.name,
            sku: selectedProduct.sku,
          }}
          onTransfer={() => setShowTransferDialog(false)}
        />
      )}

      {showHistoryDialog && (
        <InventoryHistoryDialog onTransferComplete={handleTransferComplete} />
      )}
    </div>
  );
}
