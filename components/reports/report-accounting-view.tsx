'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type {
  BalanceSheetReportResult,
  IncomeStatementReportResult,
  CashFlowReportResult,
} from '@/lib/types/reports';

interface ReportAccountingViewProps {
  type: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW';
  data:
    | BalanceSheetReportResult
    | IncomeStatementReportResult
    | CashFlowReportResult;
}

export function ReportAccountingView({
  type,
  data,
}: ReportAccountingViewProps) {
  if (type === 'BALANCE_SHEET') {
    return <BalanceSheetView data={data as BalanceSheetReportResult} />;
  }

  if (type === 'INCOME_STATEMENT') {
    return <IncomeStatementView data={data as IncomeStatementReportResult} />;
  }

  if (type === 'CASH_FLOW') {
    return <CashFlowView data={data as CashFlowReportResult} />;
  }

  return null;
}

// Balance General
function BalanceSheetView({ data }: { data: BalanceSheetReportResult }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">BALANCE GENERAL</h2>
        <p className="text-muted-foreground">
          Al{' '}
          {data.as_of_date
            ? new Date(data.as_of_date).toLocaleDateString('es-CO')
            : 'Fecha no especificada'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.assets.total_assets)}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <div>
                Corrientes: {formatCurrency(data.assets.current_assets)}
              </div>
              <div>Fijos: {formatCurrency(data.assets.fixed_assets)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pasivos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data.liabilities.total_liabilities)}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <div>
                Corrientes:{' '}
                {formatCurrency(data.liabilities.current_liabilities)}
              </div>
              <div>
                Largo Plazo:{' '}
                {formatCurrency(data.liabilities.long_term_liabilities)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patrimonio</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.equity.total_equity)}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <div>Capital: {formatCurrency(data.equity.capital)}</div>
              <div>
                Utilidades: {formatCurrency(data.equity.retained_earnings)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ecuación Contable</CardTitle>
          <CardDescription>Activos = Pasivos + Patrimonio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-lg">
              <span>Activos:</span>
              <span className="font-bold">
                {formatCurrency(data.assets.total_assets)}
              </span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Pasivos + Patrimonio:</span>
              <span className="font-bold">
                {formatCurrency(
                  data.liabilities.total_liabilities + data.equity.total_equity
                )}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Diferencia:</span>
              <span
                className={
                  Math.abs(
                    data.assets.total_assets -
                      (data.liabilities.total_liabilities +
                        data.equity.total_equity)
                  ) < 0.01
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {formatCurrency(
                  data.assets.total_assets -
                    (data.liabilities.total_liabilities +
                      data.equity.total_equity)
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Estado de Resultados
function IncomeStatementView({ data }: { data: IncomeStatementReportResult }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">ESTADO DE RESULTADOS</h2>
        <p className="text-muted-foreground">
          Del{' '}
          {data.date_from
            ? new Date(data.date_from).toLocaleDateString('es-CO')
            : ''}{' '}
          al{' '}
          {data.date_to
            ? new Date(data.date_to).toLocaleDateString('es-CO')
            : ''}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Ventas:</span>
              <span className="font-semibold">
                {formatCurrency(data.revenue.sales)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Otros Ingresos:</span>
              <span className="font-semibold">
                {formatCurrency(data.revenue.other_income)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total Ingresos:</span>
              <span className="text-green-600">
                {formatCurrency(data.revenue.total_revenue)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costos y Gastos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Costo de Ventas:</span>
              <span className="font-semibold">
                {formatCurrency(data.cost_of_sales.direct_costs)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Gastos Administrativos:</span>
              <span className="font-semibold">
                {formatCurrency(data.operating_expenses.administrative)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Gastos de Ventas:</span>
              <span className="font-semibold">
                {formatCurrency(data.operating_expenses.sales_expenses)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resultado del Ejercicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-lg">
            <span>Utilidad Bruta:</span>
            <span className="font-bold">
              {formatCurrency(data.gross_profit)}
            </span>
          </div>
          <div className="flex justify-between text-lg">
            <span>Utilidad Operacional:</span>
            <span className="font-bold">
              {formatCurrency(data.operating_income)}
            </span>
          </div>
          <div className="flex justify-between text-xl font-bold pt-2 border-t">
            <span>Utilidad Neta:</span>
            <span
              className={
                data.net_income >= 0 ? 'text-green-600' : 'text-red-600'
              }
            >
              {formatCurrency(data.net_income)}
            </span>
          </div>
          <div className="text-sm text-muted-foreground text-center pt-2">
            Margen Neto:{' '}
            {data.revenue.total_revenue > 0
              ? formatPercent(
                  (data.net_income / data.revenue.total_revenue) * 100
                )
              : '0%'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Flujo de Caja
function CashFlowView({ data }: { data: CashFlowReportResult }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">FLUJO DE CAJA</h2>
        <p className="text-muted-foreground">
          Del{' '}
          {data.date_from
            ? new Date(data.date_from).toLocaleDateString('es-CO')
            : ''}{' '}
          al{' '}
          {data.date_to
            ? new Date(data.date_to).toLocaleDateString('es-CO')
            : ''}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Actividades de Operación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Cobros:</span>
              <span>
                {formatCurrency(data.operating_activities.cash_from_sales)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pagos:</span>
              <span>
                {formatCurrency(data.operating_activities.cash_paid_suppliers)}
              </span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Neto:</span>
              <span
                className={
                  data.operating_activities.net_operating_cash >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {formatCurrency(data.operating_activities.net_operating_cash)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Actividades de Inversión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Compra Activos:</span>
              <span>
                {formatCurrency(data.investing_activities.purchase_assets)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Venta Activos:</span>
              <span>
                {formatCurrency(data.investing_activities.sale_assets)}
              </span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Neto:</span>
              <span
                className={
                  data.investing_activities.net_investing_cash >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {formatCurrency(data.investing_activities.net_investing_cash)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Actividades de Financiación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Préstamos Recibidos:</span>
              <span>
                {formatCurrency(data.financing_activities.loans_received)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Préstamos Pagados:</span>
              <span>
                {formatCurrency(data.financing_activities.loans_paid)}
              </span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Neto:</span>
              <span
                className={
                  data.financing_activities.net_financing_cash >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {formatCurrency(data.financing_activities.net_financing_cash)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Efectivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-lg">
            <span>Efectivo Inicial:</span>
            <span className="font-bold">
              {formatCurrency(data.beginning_cash)}
            </span>
          </div>
          <div className="flex justify-between text-lg">
            <span>Variación Neta:</span>
            <span
              className={`font-bold ${
                data.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(data.net_cash_flow)}
            </span>
          </div>
          <div className="flex justify-between text-xl font-bold pt-2 border-t">
            <span>Efectivo Final:</span>
            <span
              className={
                data.ending_cash >= 0 ? 'text-green-600' : 'text-red-600'
              }
            >
              {formatCurrency(data.ending_cash)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
