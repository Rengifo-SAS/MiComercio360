'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  X,
  FileText,
  Package,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import type { ImportJob } from '@/lib/types/import-jobs';
import {
  getStatusColor,
  getStatusLabel,
  formatFileSize,
  formatExecutionTime,
} from '@/lib/types/import-jobs';
import { ImportJobsService } from '@/lib/services/import-jobs-service';

interface ImportJobProgressDialogProps {
  jobId: string;
  open: boolean;
  onClose: () => void;
  onComplete?: (job: ImportJob) => void;
}

export function ImportJobProgressDialog({
  jobId,
  open,
  onClose,
  onComplete,
}: ImportJobProgressDialogProps) {
  const [job, setJob] = useState<ImportJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !jobId) return;

    let cleanupFn: (() => void) | undefined;

    // Cargar job inicial y comenzar polling
    const initialize = async () => {
      setLoading(true);
      const jobData = await ImportJobsService.getJob(jobId);
      if (jobData) {
        setJob(jobData);
        if (
          ['COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED'].includes(
            jobData.status
          )
        ) {
          onComplete?.(jobData);
        }
      }
      setLoading(false);

      // Iniciar polling del estado
      cleanupFn = await ImportJobsService.pollJobStatus(
        jobId,
        (updatedJob) => {
          setJob(updatedJob);
          if (
            ['COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED'].includes(
              updatedJob.status
            )
          ) {
            onComplete?.(updatedJob);
          }
        },
        1000
      );
    };

    initialize();

    return () => {
      cleanupFn?.();
    };
  }, [jobId, open, onComplete]);

  if (loading || !job) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Cargando...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isProcessing = job.status === 'PROCESSING' || job.status === 'PENDING';
  const isCompleted = job.status === 'COMPLETED';
  const isFailed = job.status === 'FAILED';
  const isPartiallyCompleted = job.status === 'PARTIALLY_COMPLETED';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isProcessing && (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              )}
              {isCompleted && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              {isFailed && <XCircle className="h-5 w-5 text-red-600" />}
              {isPartiallyCompleted && (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              Importación de Productos
            </DialogTitle>
            {!isProcessing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <DialogDescription className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            {job.filename}
            {job.file_size && (
              <span className="text-muted-foreground">
                ({formatFileSize(job.file_size)})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estado */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estado:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                job.status
              )}`}
            >
              {getStatusLabel(job.status)}
            </span>
          </div>

          {/* Barra de progreso */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progreso</span>
                <span className="text-muted-foreground">
                  {job.progress_percentage}%
                </span>
              </div>
              <Progress value={job.progress_percentage} className="h-2" />
              {job.current_step && (
                <p className="text-xs text-muted-foreground">
                  {job.current_step}
                </p>
              )}
            </div>
          )}

          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Total de productos
                </p>
                <p className="text-lg font-bold">{job.total_rows}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Procesados</p>
                <p className="text-lg font-bold">{job.processed_rows}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-green-700">Importados</p>
                <p className="text-lg font-bold text-green-700">
                  {job.imported_rows}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-blue-700">Actualizados</p>
                <p className="text-lg font-bold text-blue-700">
                  {job.updated_rows}
                </p>
              </div>
            </div>

            {job.error_rows > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-xs text-red-700">Con errores</p>
                  <p className="text-lg font-bold text-red-700">
                    {job.error_rows}
                  </p>
                </div>
              </div>
            )}

            {job.skipped_rows > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-yellow-50">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-xs text-yellow-700">Omitidos</p>
                  <p className="text-lg font-bold text-yellow-700">
                    {job.skipped_rows}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tiempo de ejecución */}
          {job.execution_time_ms && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Tiempo de ejecución:</span>
              <span className="text-muted-foreground">
                {formatExecutionTime(job.execution_time_ms)}
              </span>
            </div>
          )}

          {/* Errores */}
          {job.errors && job.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">
                  Se encontraron {job.errors.length} error(es):
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto text-xs">
                  {job.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="border-l-2 border-red-300 pl-2">
                      <span className="font-medium">Fila {error.row}:</span>{' '}
                      {error.message}
                    </div>
                  ))}
                  {job.errors.length > 5 && (
                    <p className="text-muted-foreground mt-2">
                      ... y {job.errors.length - 5} error(es) más
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Advertencias */}
          {job.warnings && job.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">
                  {job.warnings.length} advertencia(s):
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                  {job.warnings.slice(0, 3).map((warning, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-yellow-300 pl-2"
                    >
                      <span className="font-medium">Fila {warning.row}:</span>{' '}
                      {warning.message}
                    </div>
                  ))}
                  {job.warnings.length > 3 && (
                    <p className="text-muted-foreground mt-2">
                      ... y {job.warnings.length - 3} advertencia(s) más
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Mensajes de estado */}
          {isCompleted && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Importación completada exitosamente. Se importaron{' '}
                {job.imported_rows} productos nuevos y se actualizaron{' '}
                {job.updated_rows} productos existentes.
              </AlertDescription>
            </Alert>
          )}

          {isFailed && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                La importación falló. Por favor, revisa los errores e intenta
                nuevamente.
              </AlertDescription>
            </Alert>
          )}

          {isPartiallyCompleted && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                Importación completada con errores. Se procesaron{' '}
                {job.imported_rows + job.updated_rows} productos exitosamente,
                pero {job.error_rows} productos tuvieron errores.
              </AlertDescription>
            </Alert>
          )}

          {/* Acciones */}
          {!isProcessing && (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              {job.result_data && (
                <Button
                  onClick={() => {
                    // Descargar reporte de errores
                    const blob = new Blob(
                      [JSON.stringify(job.result_data, null, 2)],
                      { type: 'application/json' }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `import-result-${job.id}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Reporte
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
