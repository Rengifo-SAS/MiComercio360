'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: any) => React.ReactNode;
}

interface ReportTableProps {
  title?: string;
  description?: string;
  columns: Column[];
  data: any[];
  showFooter?: boolean;
  footerData?: any;
  highlightNegative?: boolean;
  maxHeight?: string;
}

export function ReportTable({
  title,
  description,
  columns,
  data,
  showFooter = false,
  footerData,
  highlightNegative = false,
  maxHeight = '500px',
}: ReportTableProps) {
  const formatCell = (value: any, column: Column, row: any) => {
    if (column.format) {
      return column.format(value, row);
    }

    if (typeof value === 'number') {
      const formatted = value.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

      if (highlightNegative && value < 0) {
        return <span className="text-red-600 font-medium">{formatted}</span>;
      }

      return formatted;
    }

    return value;
  };

  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent>
        <div style={{ maxHeight, overflowY: 'auto' }}>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={
                      column.align === 'right'
                        ? 'text-right'
                        : column.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    }
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={
                        column.align === 'right'
                          ? 'text-right'
                          : column.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }
                    >
                      {formatCell(row[column.key], column, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-muted-foreground py-8"
                  >
                    No hay datos para mostrar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {showFooter && footerData && (
              <TableHeader>
                <TableRow className="bg-muted/50 font-bold">
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={
                        column.align === 'right'
                          ? 'text-right font-bold'
                          : column.align === 'center'
                          ? 'text-center font-bold'
                          : 'text-left font-bold'
                      }
                    >
                      {formatCell(footerData[column.key], column, footerData)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface StockAlertProps {
  productName: string;
  currentStock: number;
  minStock: number;
  status: 'critical' | 'warning' | 'ok';
}

export function StockAlert({
  productName,
  currentStock,
  minStock,
  status,
}: StockAlertProps) {
  const colors = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    ok: 'text-green-600 bg-green-50 border-green-200',
  };

  const icons = {
    critical: AlertTriangle,
    warning: TrendingDown,
    ok: TrendingUp,
  };

  const Icon = icons[status];

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${colors[status]}`}
    >
      <Icon className="h-5 w-5" />
      <div className="flex-1">
        <p className="font-medium">{productName}</p>
        <p className="text-sm">
          Stock actual: {currentStock} | Mínimo: {minStock}
        </p>
      </div>
      <Badge variant="outline">{status.toUpperCase()}</Badge>
    </div>
  );
}
