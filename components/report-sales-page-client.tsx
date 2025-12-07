'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  Download,
  FileText,
  Loader2,
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
import { cn } from '@/lib/utils';
import { ReportSalesView } from '@/components/reports/report-sales-view';
import { ReportsService } from '@/lib/services/reports-service';
import { ReportExportService } from '@/lib/services/report-export-service';
import type { SalesReportResult } from '@/lib/types/reports';

interface ReportSalesPageClientProps {
  companyId: string;
  userId: string;
  companyName: string;
  companyNit: string;
}

export function ReportSalesPageClient({
  companyId,
  userId,
  companyName,
  companyNit,
}: ReportSalesPageClientProps) {
  const [dateFrom, setDateFrom] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [reportData, setReportData] = useState<SalesReportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleGenerate = async () => {
    if (!companyId || !userId) return;

    try {
      setIsLoading(true);
      const result = await ReportsService.generateSalesReport(
        companyId,
        format(dateFrom, 'yyyy-MM-dd'),
        format(dateTo, 'yyyy-MM-dd')
      );
      setReportData(result);
    } catch (error) {
      console.error('Error generating sales report:', error);
      alert('Error al generar el reporte de ventas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (exportFormat: 'pdf' | 'excel' | 'csv') => {
    if (!reportData || !companyId) return;

    try {
      setIsExporting(true);
      const periodText = `${format(dateFrom, 'dd/MM/yyyy')} - ${format(
        dateTo,
        'dd/MM/yyyy'
      )}`;

      if (exportFormat === 'pdf') {
        await ReportExportService.exportToPDF(
          reportData,
          'sales',
          {
            name: companyName,
            nit: companyNit,
          },
          {
            title: 'Reporte de Ventas',
            period: periodText,
          }
        );
      } else if (exportFormat === 'excel') {
        await ReportExportService.exportToExcel(
          reportData,
          'sales',
          `ventas_${format(dateFrom, 'yyyy-MM-dd')}_${format(
            dateTo,
            'yyyy-MM-dd'
          )}`
        );
      } else if (exportFormat === 'csv') {
        await ReportExportService.exportToCSV(
          reportData,
          'sales',
          `ventas_${format(dateFrom, 'yyyy-MM-dd')}_${format(
            dateTo,
            'yyyy-MM-dd'
          )}`
        );
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Error al exportar el reporte');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reporte de Ventas</h1>
        <p className="text-muted-foreground">
          Análisis detallado de ventas con gráficas y métricas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración del Reporte</CardTitle>
          <CardDescription>
            Selecciona el período para generar el reporte
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
                    {dateFrom
                      ? format(dateFrom, 'PPP', { locale: es })
                      : 'Seleccionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => date && setDateFrom(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
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
                    {dateTo
                      ? format(dateTo, 'PPP', { locale: es })
                      : 'Seleccionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => date && setDateTo(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleGenerate} disabled={isLoading || !companyId}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generar Reporte
                </>
              )}
            </Button>

            {reportData && (
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('excel')}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Generando reporte...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : reportData ? (
        <ReportSalesView data={reportData} reportType="SALES" />
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Selecciona un período y genera el reporte para ver los
                resultados
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
