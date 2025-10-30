'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  Download,
  FileText,
  Loader2,
  Calculator,
  TrendingUp,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ReportAccountingView } from '@/components/reports/report-accounting-view';
import { ReportTaxView } from '@/components/reports/report-tax-view';
import { ReportsService } from '@/lib/services/reports-service';
import { ReportExportService } from '@/lib/services/report-export-service';
import type {
  BalanceSheetReportResult,
  IncomeStatementReportResult,
  CashFlowReportResult,
  IVAReportResult,
} from '@/lib/types/reports';
import { toast } from 'sonner';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface ReportAccountingPageClientProps {
  companyId: string;
  userId: string;
  companyName: string;
  companyNit: string;
}

type AccountingReportType = 'balance' | 'income' | 'cashflow' | 'iva';

export function ReportAccountingPageClient({
  companyId,
  userId,
  companyName,
  companyNit,
}: ReportAccountingPageClientProps) {
  const [dateFrom, setDateFrom] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<AccountingReportType>('balance');

  const [balanceData, setBalanceData] =
    useState<BalanceSheetReportResult | null>(null);
  const [incomeData, setIncomeData] =
    useState<IncomeStatementReportResult | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowReportResult | null>(
    null
  );
  const [ivaData, setIvaData] = useState<IVAReportResult | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleGenerate = async (reportType: AccountingReportType) => {
    if (!companyId || !userId) return;

    try {
      setIsLoading(true);
      const dateFromStr = format(dateFrom, 'yyyy-MM-dd');
      const dateToStr = format(dateTo, 'yyyy-MM-dd');

      switch (reportType) {
        case 'balance':
          const balanceResult = await ReportsService.generateBalanceSheetReport(
            companyId,
            dateToStr
          );
          setBalanceData(balanceResult);
          break;

        case 'income':
          const incomeResult =
            await ReportsService.generateIncomeStatementReport(
              companyId,
              dateFromStr,
              dateToStr
            );
          setIncomeData(incomeResult);
          break;

        case 'cashflow':
          const cashFlowResult = await ReportsService.generateCashFlowReport(
            companyId,
            dateFromStr,
            dateToStr
          );
          setCashFlowData(cashFlowResult);
          break;

        case 'iva':
          const ivaResult = await ReportsService.generateIVADeclaracionReport(
            companyId,
            dateFromStr,
            dateToStr
          );
          setIvaData(ivaResult);
          break;
      }

      toast.success('Reporte generado exitosamente');
    } catch (error) {
      console.error('Error generating accounting report:', error);
      toast.error('Error al generar el reporte contable');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (
    exportFormat: 'pdf' | 'excel' | 'csv',
    reportType: AccountingReportType
  ) => {
    let data: any = null;
    let serviceType: string = '';
    let fileName: string = '';
    let title: string = '';

    switch (reportType) {
      case 'balance':
        data = balanceData;
        serviceType = 'balance_sheet';
        fileName = 'balance_general';
        title = 'Balance General';
        break;
      case 'income':
        data = incomeData;
        serviceType = 'income_statement';
        fileName = 'estado_resultados';
        title = 'Estado de Resultados';
        break;
      case 'cashflow':
        data = cashFlowData;
        serviceType = 'cash_flow';
        fileName = 'flujo_efectivo';
        title = 'Flujo de Efectivo';
        break;
      case 'iva':
        data = ivaData;
        serviceType = 'iva_declaration';
        fileName = 'declaracion_iva';
        title = 'Declaración de IVA';
        break;
    }

    if (!data || !companyId) return;

    try {
      setIsExporting(true);
      const periodText = `${format(dateFrom, 'dd/MM/yyyy')} - ${format(
        dateTo,
        'dd/MM/yyyy'
      )}`;

      if (exportFormat === 'pdf') {
        await ReportExportService.exportToPDF(
          data,
          serviceType as any,
          {
            name: companyName,
            nit: companyNit,
          },
          {
            title,
            period: periodText,
          }
        );
      } else if (exportFormat === 'excel') {
        await ReportExportService.exportToExcel(
          data,
          serviceType as any,
          `${fileName}_${format(dateFrom, 'yyyy-MM-dd')}_${format(
            dateTo,
            'yyyy-MM-dd'
          )}`
        );
      } else if (exportFormat === 'csv') {
        await ReportExportService.exportToCSV(
          data,
          serviceType as any,
          `${fileName}_${format(dateFrom, 'yyyy-MM-dd')}_${format(
            dateTo,
            'yyyy-MM-dd'
          )}`
        );
      }
      toast.success(`Reporte exportado como ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Error al exportar el reporte');
    } finally {
      setIsExporting(false);
    }
  };

  const getCurrentReportData = () => {
    switch (activeTab) {
      case 'balance':
        return balanceData;
      case 'income':
        return incomeData;
      case 'cashflow':
        return cashFlowData;
      case 'iva':
        return ivaData;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-8 w-8 text-purple-600" />
          Reportes Contables
        </h1>
        <p className="text-muted-foreground">
          Análisis financiero, contable y tributario
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración del Reporte</CardTitle>
          <CardDescription>
            Selecciona el período para generar los reportes contables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[240px] justify-start text-left font-normal',
                      !dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? (
                      format(dateFrom, 'PPP', { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => date && setDateFrom(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[240px] justify-start text-left font-normal',
                      !dateTo && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? (
                      format(dateTo, 'PPP', { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => date && setDateTo(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              onClick={() => handleGenerate(activeTab)}
              disabled={isLoading}
              size="lg"
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Generar Reporte
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as AccountingReportType)}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="balance" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Balance General
          </TabsTrigger>
          <TabsTrigger value="income" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Estado de Resultados
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Flujo de Efectivo
          </TabsTrigger>
          <TabsTrigger value="iva" className="gap-2">
            <FileText className="h-4 w-4" />
            Declaración IVA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balance" className="space-y-4">
          {balanceData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Acciones</CardTitle>
                  <CardDescription>
                    Exporta el Balance General en diferentes formatos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleExport('pdf', 'balance')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('excel', 'balance')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('csv', 'balance')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <ReportAccountingView type="BALANCE_SHEET" data={balanceData} />
            </>
          )}
          {!balanceData && !isLoading && (
            <EmptyState message="Selecciona un período y genera el Balance General" />
          )}
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          {incomeData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Acciones</CardTitle>
                  <CardDescription>
                    Exporta el Estado de Resultados en diferentes formatos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleExport('pdf', 'income')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('excel', 'income')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('csv', 'income')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <ReportAccountingView type="INCOME_STATEMENT" data={incomeData} />
            </>
          )}
          {!incomeData && !isLoading && (
            <EmptyState message="Selecciona un período y genera el Estado de Resultados" />
          )}
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          {cashFlowData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Acciones</CardTitle>
                  <CardDescription>
                    Exporta el Flujo de Efectivo en diferentes formatos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleExport('pdf', 'cashflow')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('excel', 'cashflow')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('csv', 'cashflow')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <ReportAccountingView type="CASH_FLOW" data={cashFlowData} />
            </>
          )}
          {!cashFlowData && !isLoading && (
            <EmptyState message="Selecciona un período y genera el Flujo de Efectivo" />
          )}
        </TabsContent>

        <TabsContent value="iva" className="space-y-4">
          {ivaData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Acciones</CardTitle>
                  <CardDescription>
                    Exporta el Flujo de Efectivo en diferentes formatos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleExport('pdf', 'cashflow')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('excel', 'cashflow')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('csv', 'cashflow')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {cashFlowData && (
                <ReportAccountingView type="CASH_FLOW" data={cashFlowData} />
              )}
            </>
          )}
          {!cashFlowData && !isLoading && (
            <EmptyState message="Selecciona un período y genera el Flujo de Efectivo" />
          )}
        </TabsContent>

        <TabsContent value="iva" className="space-y-4">
          {ivaData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Acciones</CardTitle>
                  <CardDescription>
                    Exporta la Declaración de IVA en diferentes formatos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleExport('pdf', 'iva')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('excel', 'iva')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport('csv', 'iva')}
                      disabled={isExporting}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <IVADeclarationView data={ivaData} />
            </>
          )}
          {!ivaData && !isLoading && (
            <EmptyState message="Selecciona un período y genera la Declaración de IVA" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          No hay datos para mostrar
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {message}
        </p>
      </CardContent>
    </Card>
  );
}

function IVADeclarationView({ data }: { data: IVAReportResult }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              IVA Generado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(data.ventas.iva_generado || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Base: {formatCurrency(data.ventas.base_gravada || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              IVA Descontable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(data.compras.iva_descontable || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Base: {formatCurrency(data.compras.base_gravada || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(data.saldo_a_pagar || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Período: {data.date_from} - {data.date_to}
            </p>
          </CardContent>
        </Card>
      </div>

      {data.detalle_por_tarifa && data.detalle_por_tarifa.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle por Tarifa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.detalle_por_tarifa.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <span className="text-sm font-medium">
                    Tarifa {formatPercent(item.tarifa / 100)}
                  </span>
                  <div className="text-right">
                    <p className="text-sm">Base: {formatCurrency(item.base)}</p>
                    <p className="text-sm font-bold">
                      IVA: {formatCurrency(item.iva)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
