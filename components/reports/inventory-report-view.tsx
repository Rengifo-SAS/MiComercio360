'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Package,
  AlertTriangle,
  DollarSign,
  TrendingDown,
  Warehouse,
  CheckCircle,
} from 'lucide-react';
import type { InventoryReportResult } from '@/lib/types/reports';

interface InventoryReportViewProps {
  data: InventoryReportResult;
}

const COLORS = [
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

interface CategoryData {
  name: string;
  quantity: number;
  value: number;
  products: number;
  [key: string]: string | number;
}

export function InventoryReportView({ data }: InventoryReportViewProps) {
  const products = data.products || [];

  // Calcular métricas
  const totalProducts = products.length;
  const lowStockProducts = products.filter((p) => p.is_low_stock).length;
  const totalValue = products.reduce((sum, p) => sum + p.total_value, 0);
  const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
  const outOfStockProducts = products.filter((p) => p.quantity === 0).length;

  // Agrupar por categoría
  const byCategory = products.reduce((acc: Record<string, CategoryData>, p) => {
    const cat = p.category || 'Sin categoría';
    if (!acc[cat]) {
      acc[cat] = { name: cat, quantity: 0, value: 0, products: 0 };
    }
    acc[cat].quantity += p.quantity;
    acc[cat].value += p.total_value;
    acc[cat].products += 1;
    return acc;
  }, {});

  const categoryData: CategoryData[] = Object.values(byCategory).sort(
    (a, b) => b.value - a.value
  );

  // Productos con stock crítico
  const criticalStock = products
    .filter((p) => p.is_low_stock)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 10);

  // Top 10 productos por valor
  const topByValue = [...products]
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {lowStockProducts > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Atención: {lowStockProducts} producto(s) con stock bajo o agotado
          </AlertDescription>
        </Alert>
      )}

      {/* Resumen de métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Productos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Productos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">
              Inventario valorizado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cantidad Total
            </CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalQuantity.toLocaleString('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">Unidades en stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {lowStockProducts}
            </div>
            <p className="text-xs text-muted-foreground">Productos críticos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {outOfStockProducts}
            </div>
            <p className="text-xs text-muted-foreground">Productos agotados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Inventario por categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Inventario por Categoría</CardTitle>
            <CardDescription>
              Valor del inventario por categoría
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: any, name: string | undefined) => {
                    if (name === 'value') {
                      return [
                        '$' + Number(value).toLocaleString('es-CO'),
                        'Valor',
                      ];
                    }
                    return [
                      value,
                      name === 'quantity' ? 'Cantidad' : 'Productos',
                    ];
                  }}
                />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Valor" />
                <Bar dataKey="quantity" fill="#10b981" name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución de valor */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Valor</CardTitle>
            <CardDescription>Top categorías por valor</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.slice(0, 6).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) =>
                    '$' + Number(value).toLocaleString('es-CO')
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Productos con stock crítico */}
      {criticalStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Productos con Stock Crítico
            </CardTitle>
            <CardDescription>
              Productos que requieren reposición urgente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-medium">Producto</th>
                    <th className="pb-2 font-medium">SKU</th>
                    <th className="pb-2 font-medium">Categoría</th>
                    <th className="pb-2 font-medium text-right">
                      Stock Actual
                    </th>
                    <th className="pb-2 font-medium text-right">
                      Stock Mínimo
                    </th>
                    <th className="pb-2 font-medium text-right">Faltante</th>
                    <th className="pb-2 font-medium text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalStock.map((product, index) => {
                    const missing = Math.max(
                      0,
                      product.min_stock - product.quantity
                    );
                    return (
                      <tr key={index} className="border-b">
                        <td className="py-2">{product.product_name}</td>
                        <td className="py-2">{product.sku}</td>
                        <td className="py-2">{product.category || '-'}</td>
                        <td className="py-2 text-right font-medium">
                          {product.quantity}
                        </td>
                        <td className="py-2 text-right">{product.min_stock}</td>
                        <td className="py-2 text-right text-red-600 font-medium">
                          {missing}
                        </td>
                        <td className="py-2 text-center">
                          <Badge
                            variant={
                              product.quantity === 0 ? 'destructive' : 'outline'
                            }
                            className={
                              product.quantity === 0
                                ? ''
                                : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                            }
                          >
                            {product.quantity === 0 ? 'Agotado' : 'Stock Bajo'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top productos por valor */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Productos por Valor</CardTitle>
          <CardDescription>
            Productos con mayor valor en inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2 font-medium">Producto</th>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Categoría</th>
                  <th className="pb-2 font-medium text-right">Cantidad</th>
                  <th className="pb-2 font-medium text-right">Precio Costo</th>
                  <th className="pb-2 font-medium text-right">Valor Total</th>
                  <th className="pb-2 font-medium text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {topByValue.map((product, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{product.product_name}</td>
                    <td className="py-2">{product.sku}</td>
                    <td className="py-2">{product.category || '-'}</td>
                    <td className="py-2 text-right">{product.quantity}</td>
                    <td className="py-2 text-right">
                      ${product.cost_price.toLocaleString('es-CO')}
                    </td>
                    <td className="py-2 text-right font-bold">
                      ${product.total_value.toLocaleString('es-CO')}
                    </td>
                    <td className="py-2 text-center">
                      {product.is_low_stock ? (
                        <Badge
                          variant="outline"
                          className="border-yellow-200 bg-yellow-50 text-yellow-700"
                        >
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Bajo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-green-200 bg-green-50 text-green-700"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          OK
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
