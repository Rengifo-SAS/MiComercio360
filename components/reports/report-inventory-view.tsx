'use client';

import { ReportBarChart } from './report-bar-chart';
import { ReportTable, StockAlert } from './report-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface InventoryProduct {
  product_name: string;
  sku: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  stock_value: number;
  status: 'critical' | 'warning' | 'ok' | 'overstock';
}

interface MovementData {
  date: string;
  product_name: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
}

interface ReportInventoryViewProps {
  data: {
    summary: {
      total_products: number;
      total_stock_value: number;
      low_stock_count: number;
      out_of_stock_count: number;
      overstock_count: number;
    };
    inventory: InventoryProduct[];
    movements?: MovementData[];
    by_category?: any[];
  };
  reportType: 'INVENTORY' | 'INVENTORY_MOVEMENTS' | 'INVENTORY_LOW_STOCK';
}

export function ReportInventoryView({
  data,
  reportType,
}: ReportInventoryViewProps) {
  const criticalProducts = data.inventory.filter(
    (p) => p.status === 'critical'
  );
  const warningProducts = data.inventory.filter((p) => p.status === 'warning');

  return (
    <div className="space-y-6">
      {/* Resumen de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <p className="text-2xl font-bold">
                {data.summary.total_products}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor del Inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.total_stock_value)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-600">
                {data.summary.low_stock_count}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sin Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-2xl font-bold text-red-600">
                {data.summary.out_of_stock_count}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sobre Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">
                {data.summary.overstock_count}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de stock crítico */}
      {(reportType === 'INVENTORY_LOW_STOCK' || reportType === 'INVENTORY') &&
        criticalProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Productos con Stock Crítico ({criticalProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {criticalProducts.slice(0, 5).map((product, index) => (
                <StockAlert
                  key={index}
                  productName={product.product_name}
                  currentStock={product.current_stock}
                  minStock={product.min_stock}
                  status="critical"
                />
              ))}
              {criticalProducts.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  ... y {criticalProducts.length - 5} productos más con stock
                  crítico
                </p>
              )}
            </CardContent>
          </Card>
        )}

      {/* Advertencias de stock bajo */}
      {(reportType === 'INVENTORY_LOW_STOCK' || reportType === 'INVENTORY') &&
        warningProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <TrendingDown className="h-5 w-5" />
                Productos con Stock Bajo ({warningProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {warningProducts.slice(0, 5).map((product, index) => (
                <StockAlert
                  key={index}
                  productName={product.product_name}
                  currentStock={product.current_stock}
                  minStock={product.min_stock}
                  status="warning"
                />
              ))}
              {warningProducts.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  ... y {warningProducts.length - 5} productos más con stock
                  bajo
                </p>
              )}
            </CardContent>
          </Card>
        )}

      {/* Inventario por categoría */}
      {data.by_category && data.by_category.length > 0 && (
        <ReportBarChart
          title="Valor de Inventario por Categoría"
          data={data.by_category}
          xKey="category"
          bars={[{ dataKey: 'value', name: 'Valor', color: '#3b82f6' }]}
          height={300}
          formatValue={(value) => formatCurrency(value)}
        />
      )}

      {/* Tabla de inventario */}
      {reportType === 'INVENTORY' && (
        <ReportTable
          title="Detalle de Inventario"
          columns={[
            { key: 'product_name', label: 'Producto', align: 'left' },
            { key: 'sku', label: 'SKU', align: 'left' },
            {
              key: 'current_stock',
              label: 'Stock Actual',
              align: 'right',
              format: (value) => formatNumber(value, 0),
            },
            {
              key: 'min_stock',
              label: 'Stock Mínimo',
              align: 'right',
              format: (value) => formatNumber(value, 0),
            },
            {
              key: 'max_stock',
              label: 'Stock Máximo',
              align: 'right',
              format: (value) => formatNumber(value, 0),
            },
            {
              key: 'stock_value',
              label: 'Valor',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
            {
              key: 'status',
              label: 'Estado',
              align: 'center',
              format: (value) => {
                const colors = {
                  critical: 'destructive',
                  warning: 'warning',
                  ok: 'success',
                  overstock: 'secondary',
                };
                const labels = {
                  critical: 'Crítico',
                  warning: 'Bajo',
                  ok: 'Normal',
                  overstock: 'Sobre Stock',
                };
                return (
                  <Badge variant={colors[value as keyof typeof colors] as any}>
                    {labels[value as keyof typeof labels]}
                  </Badge>
                );
              },
            },
          ]}
          data={data.inventory}
          maxHeight="600px"
        />
      )}

      {/* Tabla de movimientos */}
      {reportType === 'INVENTORY_MOVEMENTS' && data.movements && (
        <ReportTable
          title="Movimientos de Inventario"
          columns={[
            { key: 'date', label: 'Fecha', align: 'left' },
            { key: 'product_name', label: 'Producto', align: 'left' },
            {
              key: 'type',
              label: 'Tipo',
              align: 'center',
              format: (value) => {
                const colors = {
                  IN: 'success',
                  OUT: 'destructive',
                  ADJUSTMENT: 'secondary',
                };
                const labels = {
                  IN: 'Entrada',
                  OUT: 'Salida',
                  ADJUSTMENT: 'Ajuste',
                };
                return (
                  <Badge variant={colors[value as keyof typeof colors] as any}>
                    {labels[value as keyof typeof labels]}
                  </Badge>
                );
              },
            },
            {
              key: 'quantity',
              label: 'Cantidad',
              align: 'right',
              format: (value, row) => {
                const formatted = formatNumber(Math.abs(value), 0);
                if (row.type === 'OUT') {
                  return <span className="text-red-600">-{formatted}</span>;
                }
                return <span className="text-green-600">+{formatted}</span>;
              },
            },
            { key: 'reason', label: 'Razón', align: 'left' },
          ]}
          data={data.movements}
          maxHeight="600px"
        />
      )}
    </div>
  );
}
