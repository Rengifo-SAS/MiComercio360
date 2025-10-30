'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, FileText, Calendar, Settings } from 'lucide-react';
import type { Report } from '@/lib/types/reports';
import { formatReportType } from '@/lib/types/reports';

interface ReportViewDialogProps {
  report: Report;
  onClose: () => void;
}

export function ReportViewDialog({ report, onClose }: ReportViewDialogProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl">{report.report_name}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{formatReportType(report.report_type)}</Badge>
                <Badge variant={report.is_active ? 'default' : 'secondary'}>
                  {report.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
                {report.is_template && <Badge variant="outline">Plantilla</Badge>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              Información General
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Formato de Exportación:</span>
                <p className="font-medium">{report.export_format}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Creado:</span>
                <p className="font-medium">
                  {new Date(report.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuración */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4" />
              Configuración
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Incluir Gráficos:</span>
                <Badge variant={report.include_charts ? 'default' : 'secondary'}>
                  {report.include_charts ? 'Sí' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Incluir Resumen:</span>
                <Badge variant={report.include_summary ? 'default' : 'secondary'}>
                  {report.include_summary ? 'Sí' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Incluir Detalles:</span>
                <Badge variant={report.include_details ? 'default' : 'secondary'}>
                  {report.include_details ? 'Sí' : 'No'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Filtros */}
          {(report.date_from || report.date_to) && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Período
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {report.date_from && (
                    <div>
                      <span className="text-muted-foreground">Desde:</span>
                      <p className="font-medium">
                        {new Date(report.date_from).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {report.date_to && (
                    <div>
                      <span className="text-muted-foreground">Hasta:</span>
                      <p className="font-medium">
                        {new Date(report.date_to).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Descripción */}
          {report.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-sm font-medium">Descripción:</span>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </div>
            </>
          )}

          {/* Notas */}
          {report.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-sm font-medium">Notas:</span>
                <p className="text-sm text-muted-foreground">{report.notes}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
