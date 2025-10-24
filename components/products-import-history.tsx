'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import {
  ProductsImportService,
  ImportHistory,
} from '@/lib/services/products-import-service';

interface ProductsImportHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export function ProductsImportHistory({
  open,
  onOpenChange,
  companyId,
}: ProductsImportHistoryProps) {
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, companyId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await ProductsImportService.getImportHistory(companyId);
      setHistory(data);
    } catch (error) {
      console.error('Error cargando historial:', error);
      toast.error('Error al cargar el historial de importaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (filePath: string, filename: string) => {
    try {
      // Por ahora, mostrar un mensaje de que la funcionalidad no está disponible
      toast.info('La descarga de archivos no está disponible en este momento');
      console.log('Download requested for:', filePath, filename);
    } catch (error) {
      console.error('Error descargando archivo:', error);
      toast.error('Error al descargar el archivo');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Completado
          </Badge>
        );
      case 'failed':
        return <Badge variant="destructive">Fallido</Badge>;
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Procesando
          </Badge>
        );
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSuccessRate = (imported: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((imported / total) * 100);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de Importaciones</DialogTitle>
            <DialogDescription>
              Archivos Excel subidos para importación de productos
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="mx-auto w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-muted-foreground">
                Cargando historial...
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historial de Importaciones
          </DialogTitle>
          <DialogDescription>
            Archivos Excel subidos para importación de productos
          </DialogDescription>
        </DialogHeader>

        {history.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay importaciones</h3>
            <p className="text-sm text-muted-foreground">
              Aún no has importado ningún archivo de productos
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {history.length}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Total Importaciones
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {history.filter((h) => h.status === 'completed').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Exitosas</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {history.filter((h) => h.status === 'failed').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Fallidas</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {history.reduce((sum, h) => sum + h.imported_rows, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Productos Importados
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lista de Importaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Resultados</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{item.filename}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            {getStatusBadge(item.status)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1 mb-1">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span>{item.imported_rows} importados</span>
                            </div>
                            {item.error_rows > 0 && (
                              <div className="flex items-center gap-1">
                                <XCircle className="h-3 w-3 text-red-600" />
                                <span>{item.error_rows} errores</span>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {getSuccessRate(
                                item.imported_rows,
                                item.total_rows
                              )}
                              % éxito
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {(item as any).uploaded_by_user?.first_name}{' '}
                              {(item as any).uploaded_by_user?.last_name}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{formatDate(item.uploaded_at)}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDownloadFile(item.file_path, item.filename)
                            }
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Descargar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
