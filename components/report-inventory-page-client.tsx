'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, FileText, Loader2, Package, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ReportInventoryView } from '@/components/reports/report-inventory-view';
import { ReportsService } from '@/lib/services/reports-service';
import { ReportExportService } from '@/lib/services/report-export-service';
import { toast } from 'sonner';

interface InventoryReportData {
  summary: {
    total_products: number;
    total_stock_value: number;
    low_stock_count: number;
    out_of_stock_count: number;
    overstock_count: number;
  };
  inventory: Array<{
    product_name: string;
    sku: string;
    current_stock: number;
    min_stock: number;
    max_stock: number;
    stock_value: number;
    status: 'critical' | 'warning' | 'ok' | 'overstock';
  }>;
}

interface ReportInventoryPageClientProps {
  companyId: string;
  userId: string;
  companyName: string;
  companyNit: string;
}

export function ReportInventoryPageClient({
  companyId,
  userId,
  companyName,
  companyNit,
}: ReportInventoryPageClientProps) {
  const [reportData, setReportData] = useState<InventoryReportData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleGenerate = async () => {
    if (!companyId || !userId) return;

    try {
      setIsLoading(true);
      const result = await ReportsService.generateInventoryReport(
        companyId,
        {}
      );
      setReportData(result);
      toast.success('Reporte generado exitosamente');
    } catch (error) {
      console.error('Error generating inventory report:', error);
      toast.error('Error al generar el reporte de inventario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (exportFormat: 'pdf' | 'excel' | 'csv') => {
    if (!reportData || !companyId) return;

    try {
      setIsExporting(true);
      const today = new Date();
      const periodText = format(today, 'dd/MM/yyyy');

      if (exportFormat === 'pdf') {
        await ReportExportService.exportToPDF(
          reportData,
          'inventory',
          {
            name: companyName,
            nit: companyNit,
          },
          {
            title: 'Reporte de Inventario',
            period: periodText,
          }
        );
      } else if (exportFormat === 'excel') {
        await ReportExportService.exportToExcel(
          reportData,
          'inventory',
          `inventario_${format(today, 'yyyy-MM-dd')}`
        );
      } else if (exportFormat === 'csv') {
        await ReportExportService.exportToCSV(
          reportData,
          'inventory',
          `inventario_${format(today, 'yyyy-MM-dd')}`
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-8 w-8 text-blue-600" />
          Reporte de Inventario
        </h1>
        <p className="text-muted-foreground">
          Análisis detallado de stock, movimientos y valorización
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generar Reporte</CardTitle>
          <CardDescription>
            Visualiza el estado actual del inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerate}
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
                Generar Reporte de Inventario
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {reportData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
              <CardDescription>
                Exporta el reporte en diferentes formatos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Exportar PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport('excel')}
                  disabled={isExporting}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <ReportInventoryView data={reportData} reportType="INVENTORY" />
        </>
      )}

      {!reportData && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No hay datos para mostrar
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Selecciona un período y haz clic en "Generar Reporte" para ver el
              análisis de inventario
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
