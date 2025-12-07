'use client';

import { ReportLineChart } from './report-line-chart';
import { ReportBarChart } from './report-bar-chart';
import { ReportPieChart } from './report-pie-chart';
import { ReportTable } from './report-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface SalesData {
  period: string;
  total_sales: number;
  total_cost: number;
  profit: number;
  transactions: number;
}

interface ProductSales {
  product_name: string;
  quantity: number;
  total: number;
}

interface PaymentMethodSales {
  method: string;
  total: number;
}

interface ReportSalesViewProps {
  data: {
    summary: {
      total_sales: number;
      total_cost: number;
      gross_profit: number;
      profit_margin: number;
      total_transactions: number;
      avg_ticket: number;
    };
    sales_trend: SalesData[];
    top_products: ProductSales[];
    payment_methods: PaymentMethodSales[];
    by_cashier?: any[];
    by_customer?: any[];
  };
  reportType:
    | 'SALES'
    | 'SALES_BY_PRODUCT'
    | 'SALES_BY_CUSTOMER'
    | 'SALES_BY_CASHIER'
    | 'SALES_BY_PAYMENT_METHOD';
}

export function ReportSalesView({ data, reportType }: ReportSalesViewProps) {
  return (
    <div className="space-y-6">
      {/* Resumen de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.total_sales)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Costo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.summary.total_cost)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utilidad Bruta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.summary.gross_profit)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data.summary.profit_margin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data.summary.total_transactions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(data.summary.avg_ticket)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica de tendencia de ventas */}
      {data.sales_trend && data.sales_trend.length > 0 && (
        <ReportLineChart
          title="Tendencia de Ventas"
          data={data.sales_trend}
          xKey="period"
          lines={[
            { dataKey: 'total_sales', name: 'Ventas', color: '#10b981' },
            { dataKey: 'total_cost', name: 'Costos', color: '#f97316' },
            { dataKey: 'profit', name: 'Utilidad', color: '#3b82f6' },
          ]}
          height={350}
          formatValue={(value) => formatCurrency(value)}
        />
      )}

      {/* Productos más vendidos */}
      {data.top_products && data.top_products.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReportBarChart
            title="Top Productos por Cantidad"
            data={data.top_products.slice(0, 10)}
            xKey="product_name"
            bars={[{ dataKey: 'quantity', name: 'Cantidad', color: '#3b82f6' }]}
            height={350}
            formatValue={(value) => value.toLocaleString('es-CO')}
          />

          <ReportBarChart
            title="Top Productos por Valor"
            data={data.top_products.slice(0, 10)}
            xKey="product_name"
            bars={[{ dataKey: 'total', name: 'Total', color: '#10b981' }]}
            height={350}
            formatValue={(value) => formatCurrency(value)}
          />
        </div>
      )}

      {/* Métodos de pago */}
      {data.payment_methods && data.payment_methods.length > 0 && (
        <ReportPieChart
          title="Ventas por Método de Pago"
          data={data.payment_methods}
          nameKey="method"
          valueKey="total"
          height={350}
          formatValue={(value) => formatCurrency(value)}
        />
      )}

      {/* Tabla detallada según tipo de reporte */}
      {reportType === 'SALES_BY_PRODUCT' && data.top_products && (
        <ReportTable
          title="Detalle de Ventas por Producto"
          columns={[
            { key: 'product_name', label: 'Producto', align: 'left' },
            { key: 'quantity', label: 'Cantidad', align: 'right' },
            {
              key: 'total',
              label: 'Total',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
            {
              key: 'avg_price',
              label: 'Precio Promedio',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
          ]}
          data={data.top_products}
          showFooter
          footerData={{
            product_name: 'TOTAL',
            quantity: data.top_products.reduce((sum, p) => sum + p.quantity, 0),
            total: data.top_products.reduce((sum, p) => sum + p.total, 0),
            avg_price: '',
          }}
        />
      )}

      {reportType === 'SALES_BY_CASHIER' && data.by_cashier && (
        <ReportTable
          title="Ventas por Cajero"
          columns={[
            { key: 'cashier_name', label: 'Cajero', align: 'left' },
            { key: 'transactions', label: 'Transacciones', align: 'right' },
            {
              key: 'total_sales',
              label: 'Total Ventas',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
            {
              key: 'avg_ticket',
              label: 'Ticket Promedio',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
          ]}
          data={data.by_cashier}
        />
      )}
    </div>
  );
}
