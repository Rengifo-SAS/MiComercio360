'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportBarChartProps {
  title: string;
  data: any[];
  xKey: string;
  bars: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  height?: number;
  formatValue?: (value: number) => string;
  stacked?: boolean;
}

export function ReportBarChart({
  title,
  data,
  xKey,
  bars,
  height = 300,
  formatValue = (value) => value.toLocaleString('es-CO'),
  stacked = false,
}: ReportBarChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={formatValue} />
            <Tooltip
              formatter={(value: number | undefined) => formatValue(value ?? 0)}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {bars.map((bar) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name}
                fill={bar.color}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
