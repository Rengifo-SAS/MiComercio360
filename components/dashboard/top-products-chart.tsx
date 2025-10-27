'use client';

import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Package, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TopProduct {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  total_amount: number;
}

interface TopProductsChartProps {
  companyId: string;
}

const COLORS = [
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#84cc16',
  '#f97316',
];

export function TopProductsChart({ companyId }: TopProductsChartProps) {
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchTopProducts = async () => {
    setLoading(true);
    try {
      // Obtener productos más vendidos de los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('sale_items')
        .select(
          `
          product_id,
          quantity,
          total_price,
          products!inner(name, company_id)
        `
        )
        .eq('products.company_id', companyId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('quantity', { ascending: false })
        .limit(8);

      if (error) {
        console.error('Error obteniendo productos más vendidos:', error);
        return;
      }

      // Agrupar por producto
      const productMap = new Map<string, TopProduct>();

      data?.forEach((item: any) => {
        const productId = item.product_id;
        const productName = item.products?.name;

        if (!productName) return; // Skip if no product name found

        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!;
          existing.quantity_sold += item.quantity;
          existing.total_amount += Number(item.total_price);
        } else {
          productMap.set(productId, {
            product_id: productId,
            product_name: productName,
            quantity_sold: item.quantity,
            total_amount: Number(item.total_price),
          });
        }
      });

      // Convertir a array y ordenar por cantidad vendida
      const topProductsArray = Array.from(productMap.values())
        .sort((a, b) => b.quantity_sold - a.quantity_sold)
        .slice(0, 8);

      setTopProducts(topProductsArray);
    } catch (error) {
      console.error('Error procesando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopProducts();
  }, [companyId]);

  const chartData = topProducts.map((product, index) => ({
    name:
      product.product_name.length > 20
        ? product.product_name.substring(0, 20) + '...'
        : product.product_name,
    value: product.quantity_sold,
    amount: product.total_amount,
    color: COLORS[index % COLORS.length],
  }));

  const formatTooltip = (value: number, name: string, props: any) => {
    const product = topProducts.find(
      (p) =>
        (p.product_name.length > 20
          ? p.product_name.substring(0, 20) + '...'
          : p.product_name) === props.payload.name
    );

    return [
      `${value} unidades vendidas\n$${product?.total_amount.toLocaleString(
        'es-CO'
      )} en ventas`,
      'Cantidad',
    ];
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Package className="h-4 w-4 sm:h-5 sm:w-5" />
          Productos Más Vendidos
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Top productos vendidos en los últimos 30 días
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-36 xs:h-40 sm:h-48 lg:h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Cargando datos...
              </p>
            </div>
          </div>
        ) : topProducts.length === 0 ? (
          <div className="flex items-center justify-center h-36 xs:h-40 sm:h-48 lg:h-64 text-center">
            <div>
              <Package className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base text-muted-foreground">
                No hay datos de productos vendidos
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Los productos aparecerán aquí una vez que se realicen ventas
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* Lista de productos */}
            <div className="space-y-2">
              {topProducts.slice(0, 5).map((product, index) => (
                <div
                  key={product.product_id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {product.product_name.length > 30
                          ? product.product_name.substring(0, 30) + '...'
                          : product.product_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.quantity_sold} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs sm:text-sm font-bold">
                      ${product.total_amount.toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Gráfica de pie */}
            {chartData.length > 0 && (
              <div className="h-40 sm:h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={formatTooltip} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
