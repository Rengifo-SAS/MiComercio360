'use client';

import { useState, useEffect } from 'react';
import { InventorySearchFilter } from '@/components/inventory-search-filter';
import { InventoryActionsBar } from '@/components/inventory-actions-bar';
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
import { WarehouseHistoryDialog } from '@/components/warehouse-history-dialog';
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
  const [inventoryData, setInventoryData] =
    useState<InventoryItem[]>(initialData);
  const [stats, setStats] = useState<SearchStats>(initialStats);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(
    null
  );

  const handleDataChange = (data: InventoryItem[]) => {
    setInventoryData(data);
  };

  const handleStatsChange = (newStats: SearchStats | null) => {
    if (newStats) {
      setStats(newStats);
    }
  };

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

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <p className="text-muted-foreground">
            Gestiona el stock y movimientos de productos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Productos
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_products}</div>
            <p className="text-xs text-muted-foreground">En inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.in_stock_count}
            </div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bajo Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.low_stock_count}
            </div>
            <p className="text-xs text-muted-foreground">
              Necesitan reposición
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.out_of_stock_count}
            </div>
            <p className="text-xs text-muted-foreground">Agotados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.total_value.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">En inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bodegas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses.length}</div>
            <p className="text-xs text-muted-foreground">Activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <InventorySearchFilter
          warehouses={warehouses}
          categories={categories}
          companyId={companyId}
          onDataChange={handleDataChange}
          onStatsChange={handleStatsChange}
        />

        <InventoryActionsBar
          warehouses={warehouses}
          categories={categories}
          inventoryData={inventoryData}
        />
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventario Actual</CardTitle>
          <CardDescription>
            Lista de productos con sus cantidades en stock
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inventoryData && inventoryData.length > 0 ? (
            <div className="space-y-4">
              {inventoryData.map((item) => {
                const isLowStock = item.quantity <= item.min_stock;
                const isOutOfStock = item.quantity === 0;

                return (
                  <div
                    key={item.id}
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
          onTransfer={() => setShowTransferDialog(false)}
        />
      )}

      {showHistoryDialog && <WarehouseHistoryDialog />}
    </div>
  );
}
