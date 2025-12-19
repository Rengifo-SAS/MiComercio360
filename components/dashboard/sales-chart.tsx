'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SalesChartData {
  date: string;
  sales: number;
  amount: number;
  transactions: number;
}

interface SalesChartProps {
  companyId: string;
}

type ChartType = 'line' | 'bar';
type PeriodType = 'week' | 'month' | 'year';

export function SalesChart({ companyId }: SalesChartProps) {
  const [chartData, setChartData] = useState<SalesChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<ChartType>('line');
  const [period, setPeriod] = useState<PeriodType>('week');
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [averageAmount, setAverageAmount] = useState(0);

  const supabase = createClient();

  const fetchSalesData = async (periodType: PeriodType) => {
    setLoading(true);
    try {
      // Calcular fechas según el período
      const now = new Date();
      let fromDate: Date;
      let toDate: Date = new Date();

      switch (periodType) {
        case 'week':
          const startOfWeek = new Date(now);
          const dayOfWeek = now.getDay();
          const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          startOfWeek.setDate(now.getDate() + daysToMonday);
          startOfWeek.setHours(0, 0, 0, 0);
          fromDate = startOfWeek;
          break;

        case 'month':
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          fromDate.setHours(0, 0, 0, 0);
          break;

        case 'year':
          fromDate = new Date(now.getFullYear(), 0, 1);
          fromDate.setHours(0, 0, 0, 0);
          break;

        default:
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Consulta optimizada - solo traer datos necesarios
      const { data: sales, error } = await supabase
        .from('sales')
        .select('total_amount, created_at')
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString())
        .order('created_at');

      if (error) {
        console.error('Error obteniendo datos de ventas:', error);
        return;
      }

      // Agrupar datos eficientemente
      const groupedData: {
        [key: string]: { amount: number; count: number };
      } = {};

      sales?.forEach((sale) => {
        const date = new Date(sale.created_at);
        let key: string;

        switch (periodType) {
          case 'week':
          case 'month':
            key = date.toISOString().split('T')[0];
            break;
          case 'year':
            key = date.toISOString().substring(0, 7); // YYYY-MM
            break;
          default:
            key = date.toISOString().split('T')[0];
        }

        if (!groupedData[key]) {
          groupedData[key] = { amount: 0, count: 0 };
        }

        groupedData[key].amount += Number(sale.total_amount);
        groupedData[key].count += 1;
      });

      // Convertir a array
      const chartDataArray = Object.entries(groupedData)
        .map(([date, data]) => ({
          date,
          sales: data.amount,
          amount: data.amount,
          transactions: data.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setChartData(chartDataArray);

      // Calcular totales
      const total = chartDataArray.reduce((sum, item) => sum + item.amount, 0);
      const transactions = chartDataArray.reduce(
        (sum, item) => sum + item.transactions,
        0
      );
      const average =
        chartDataArray.length > 0 ? total / chartDataArray.length : 0;
      setTotalAmount(total);
      setTotalTransactions(transactions);
      setAverageAmount(average);
    } catch (error) {
      console.error('Error procesando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData(period);
  }, [period, companyId]);

  const formatXAxisLabel = (date: string) => {
    try {
      switch (period) {
        case 'week':
          return new Date(date).toLocaleDateString('es-CO', {
            weekday: 'short',
            day: 'numeric',
          });
        case 'month':
          return new Date(date).toLocaleDateString('es-CO', { day: 'numeric' });
        case 'year':
          return new Date(date + '-01').toLocaleDateString('es-CO', {
            month: 'short',
          });
        default:
          return date;
      }
    } catch (error) {
      return date;
    }
  };

  const formatTooltipValue = (value: number | undefined, name: string | undefined) => {
    if (value === undefined) {
      return ['$0', 'Monto'];
    }
    if (name === 'amount' || name === 'sales') {
      return [`$${value.toLocaleString('es-CO')}`, 'Monto'];
    }
    return [value.toString(), 'Transacciones'];
  };

  const periodLabels = {
    week: 'Semana Actual',
    month: 'Mes Actual',
    year: 'Año Actual',
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              Ventas por Período
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Análisis de ventas basado en datos reales de la empresa
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select
              value={period}
              onValueChange={(value: PeriodType) => setPeriod(value)}
            >
              <SelectTrigger className="w-28 sm:w-32 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semana Actual</SelectItem>
                <SelectItem value="month">Mes Actual</SelectItem>
                <SelectItem value="year">Año Actual</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
                className="h-8 w-8 p-0"
              >
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="h-8 w-8 p-0"
              >
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-48 sm:h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Cargando datos...
              </p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 sm:h-64 text-center">
            <div>
              <Calendar className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base text-muted-foreground">
                No hay datos de ventas para mostrar
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Las ventas aparecerán aquí una vez que se realicen transacciones
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6">
              <div className="text-center p-2 sm:p-3 lg:p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                  ${totalAmount.toLocaleString('es-CO')}
                </p>
                <p className="text-xs sm:text-sm text-green-600">
                  Total Vendido
                </p>
              </div>
              <div className="text-center p-2 sm:p-3 lg:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                  {totalTransactions}
                </p>
                <p className="text-xs sm:text-sm text-blue-600">
                  Transacciones
                </p>
              </div>
              <div className="text-center p-2 sm:p-3 lg:p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
                  ${averageAmount.toLocaleString('es-CO')}
                </p>
                <p className="text-xs sm:text-sm text-purple-600">
                  Promedio por{' '}
                  {period === 'week'
                    ? 'día'
                    : period === 'month'
                    ? 'día'
                    : 'mes'}
                </p>
              </div>
            </div>

            {/* Gráfica */}
            <div className="h-36 xs:h-40 sm:h-48 lg:h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatXAxisLabel}
                      fontSize={10}
                      className="text-xs"
                    />
                    <YAxis
                      tickFormatter={(value) => {
                        if (value >= 1000000) {
                          return `$${(value / 1000000).toFixed(1)}M`;
                        }
                        if (value >= 1000) {
                          return `$${(value / 1000).toFixed(0)}K`;
                        }
                        return `$${value}`;
                      }}
                      fontSize={10}
                      className="text-xs"
                    />
                    <Tooltip
                      formatter={formatTooltipValue}
                      labelFormatter={(label) =>
                        `Período: ${formatXAxisLabel(label)}`
                      }
                      contentStyle={{
                        fontSize: '12px',
                        padding: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatXAxisLabel}
                      fontSize={10}
                      className="text-xs"
                    />
                    <YAxis
                      tickFormatter={(value) => {
                        if (value >= 1000000) {
                          return `$${(value / 1000000).toFixed(1)}M`;
                        }
                        if (value >= 1000) {
                          return `$${(value / 1000).toFixed(0)}K`;
                        }
                        return `$${value}`;
                      }}
                      fontSize={10}
                      className="text-xs"
                    />
                    <Tooltip
                      formatter={formatTooltipValue}
                      labelFormatter={(label) =>
                        `Período: ${formatXAxisLabel(label)}`
                      }
                      contentStyle={{
                        fontSize: '12px',
                        padding: '8px',
                      }}
                    />
                    <Bar
                      dataKey="amount"
                      fill="#10b981"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Extensión para obtener número de semana
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function () {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
};
