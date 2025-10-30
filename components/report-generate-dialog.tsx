'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Report } from '@/lib/types/reports';
import { ReportsService } from '@/lib/services/reports-service';

interface ReportGenerateDialogProps {
  report: Report;
  companyId: string;
  userId: string;
  onClose: () => void;
  onGenerated: () => void;
}

export function ReportGenerateDialog({
  report,
  companyId,
  userId,
  onClose,
  onGenerated,
}: ReportGenerateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [customerId, setCustomerId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [cashierId, setCashierId] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [limit, setLimit] = useState<string>('10');

  // Configurar fechas por defecto
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateFrom(firstDayOfMonth);
    setDateTo(today);
  }, []);

  const handleGenerate = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Por favor selecciona un período de fechas');
      return;
    }

    if (dateFrom > dateTo) {
      toast.error('La fecha inicial debe ser anterior a la fecha final');
      return;
    }

    try {
      setLoading(true);

      // Preparar parámetros
      const parameters: Record<string, any> = {
        date_from: format(dateFrom, 'yyyy-MM-dd'),
        date_to: format(dateTo, 'yyyy-MM-dd'),
      };

      if (customerId) parameters.customer_id = customerId;
      if (productId) parameters.product_id = productId;
      if (cashierId) parameters.cashier_id = cashierId;
      if (warehouseId) parameters.warehouse_id = warehouseId;
      if (limit) parameters.limit = parseInt(limit);

      // Crear entrada en historial
      const history = await ReportsService.createReportHistory(companyId, userId, {
        report_id: report.id,
        report_name: report.report_name,
        report_type: report.report_type,
        parameters,
        date_from: parameters.date_from,
        date_to: parameters.date_to,
        export_format: report.export_format,
      });

      // Generar reporte
      const result = await ReportsService.generateReport(
        companyId,
        userId,
        report.report_type,
        parameters
      );

      // Actualizar historial con resultado
      await ReportsService.updateReportHistory(history.id, {
        status: 'COMPLETED',
        report_data: result.data,
        execution_time_ms: result.execution_time_ms,
        total_records: Array.isArray(result.data) ? result.data.length : 0,
      });

      toast.success('Reporte generado exitosamente');
      onGenerated();
    } catch (error) {
      toast.error('Error al generar reporte');
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const requiresDateRange = [
    'SALES',
    'SALES_BY_PRODUCT',
    'SALES_BY_CUSTOMER',
    'SALES_BY_CASHIER',
    'SALES_BY_PAYMENT_METHOD',
    'PRODUCTS_BEST_SELLING',
    'CUSTOMERS',
    'CUSTOMERS_TOP',
    'FINANCIAL',
    'SHIFTS',
    'CASH_MOVEMENTS',
    'PURCHASES',
  ].includes(report.report_type);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generar Reporte: {report.report_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {requiresDateRange && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !dateFrom && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, 'PPP', { locale: es }) : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Fecha Final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !dateTo && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, 'PPP', { locale: es }) : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          )}

          {['PRODUCTS_BEST_SELLING', 'CUSTOMERS_TOP'].includes(report.report_type) && (
            <div className="space-y-2">
              <Label htmlFor="limit">Cantidad de Registros</Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger id="limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg text-sm">
            <p className="font-medium mb-2">Información:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>El reporte se generará según la configuración guardada</li>
              <li>Formato de exportación: {report.export_format}</li>
              {requiresDateRange && <li>Selecciona el período para el reporte</li>}
              <li>El reporte quedará guardado en el historial</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generar Reporte
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
