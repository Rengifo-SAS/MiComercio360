'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { Report, ReportType, ExportFormat, CreateReportData } from '@/lib/types/reports';
import { ReportsService } from '@/lib/services/reports-service';
import { reportTypeNames } from '@/lib/types/reports';

interface ReportFormDialogProps {
  report?: Report;
  companyId: string;
  userId: string;
  onClose: () => void;
  onSave: () => void;
}

export function ReportFormDialog({
  report,
  companyId,
  userId,
  onClose,
  onSave,
}: ReportFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateReportData>({
    report_name: report?.report_name || '',
    report_type: report?.report_type || 'SALES',
    export_format: report?.export_format || 'PDF',
    include_charts: report?.include_charts ?? true,
    include_summary: report?.include_summary ?? true,
    include_details: report?.include_details ?? true,
    is_template: report?.is_template || false,
    description: report?.description || '',
    notes: report?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.report_name.trim()) {
      toast.error('El nombre del reporte es requerido');
      return;
    }

    try {
      setLoading(true);

      if (report) {
        await ReportsService.updateReport({ id: report.id, ...formData }, userId);
        toast.success('Reporte actualizado exitosamente');
      } else {
        await ReportsService.createReport(companyId, userId, formData);
        toast.success('Reporte creado exitosamente');
      }

      onSave();
    } catch (error) {
      toast.error(report ? 'Error al actualizar reporte' : 'Error al crear reporte');
      console.error('Error saving report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{report ? 'Editar Reporte' : 'Nuevo Reporte'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report_name">Nombre del Reporte *</Label>
              <Input
                id="report_name"
                value={formData.report_name}
                onChange={(e) => setFormData({ ...formData, report_name: e.target.value })}
                placeholder="Ej: Reporte Mensual de Ventas"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report_type">Tipo de Reporte *</Label>
              <Select
                value={formData.report_type}
                onValueChange={(value: ReportType) =>
                  setFormData({ ...formData, report_type: value })
                }
              >
                <SelectTrigger id="report_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(reportTypeNames).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="export_format">Formato de Exportación</Label>
              <Select
                value={formData.export_format}
                onValueChange={(value: ExportFormat) =>
                  setFormData({ ...formData, export_format: value })
                }
              >
                <SelectTrigger id="export_format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="EXCEL">Excel</SelectItem>
                  <SelectItem value="CSV">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="include_charts">Incluir Gráficos</Label>
                <Switch
                  id="include_charts"
                  checked={formData.include_charts}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, include_charts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_summary">Incluir Resumen</Label>
                <Switch
                  id="include_summary"
                  checked={formData.include_summary}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, include_summary: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_details">Incluir Detalles</Label>
                <Switch
                  id="include_details"
                  checked={formData.include_details}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, include_details: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_template">Guardar como Plantilla</Label>
                <Switch
                  id="is_template"
                  checked={formData.is_template}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_template: checked })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción breve del reporte..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : report ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
