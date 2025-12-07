'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  Eye,
  Trash2,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Report, ReportHistory, ReportType } from '@/lib/types/reports';
import {
  formatReportType,
  formatReportStatus,
  getStatusColor,
  reportTypeNames,
} from '@/lib/types/reports';
import { ReportsService } from '@/lib/services/reports-service';
import { ReportFormDialog } from '@/components/report-form-dialog';
import { ReportViewDialog } from '@/components/report-view-dialog';
import { ReportGenerateDialog } from '@/components/report-generate-dialog';
import { useActionPermission } from '@/lib/hooks/use-permissions';

interface ReportsPageClientProps {
  initialReports: Report[];
  initialHistory: ReportHistory[];
  companyId: string;
  userId: string;
}

export function ReportsPageClient({
  initialReports,
  initialHistory,
  companyId,
  userId,
}: ReportsPageClientProps) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [history, setHistory] = useState<ReportHistory[]>(initialHistory);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<ReportHistory | null>(
    null
  );

  // Diálogos
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  // Permisos
  const canCreate = useActionPermission('reports', 'create');
  const canUpdate = useActionPermission('reports', 'update');
  const canDelete = useActionPermission('reports', 'delete');
  const canGenerate = useActionPermission('reports', 'generate');

  // Cargar reportes
  const loadReports = async () => {
    try {
      setLoading(true);
      const { reports: newReports } = await ReportsService.getReports(
        companyId,
        {
          query: searchQuery || undefined,
          report_type:
            reportTypeFilter !== 'all'
              ? (reportTypeFilter as ReportType)
              : undefined,
          page: 1,
          limit: 50,
          sort_by: 'created_at',
          sort_order: 'desc',
        }
      );
      setReports(newReports);
    } catch (error) {
      toast.error('Error al cargar reportes');
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar historial
  const loadHistory = async () => {
    try {
      setLoading(true);
      const { history: newHistory } = await ReportsService.getReportHistory(
        companyId,
        {
          query: searchQuery || undefined,
          report_type:
            reportTypeFilter !== 'all'
              ? (reportTypeFilter as ReportType)
              : undefined,
          status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
          page: 1,
          limit: 50,
          sort_by: 'generated_at',
          sort_order: 'desc',
        }
      );
      setHistory(newHistory);
    } catch (error) {
      toast.error('Error al cargar historial');
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar reporte
  const handleDelete = async (reportId: string) => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar reportes');
      return;
    }

    try {
      setDeletingReportId(reportId);
      await ReportsService.deleteReport(reportId);
      toast.success('Reporte eliminado exitosamente');
      await loadReports();
      setShowDeleteDialog(false);
      setSelectedReport(null);
    } catch (error) {
      toast.error('Error al eliminar reporte');
      console.error('Error deleting report:', error);
    } finally {
      setDeletingReportId(null);
    }
  };

  // Generar reporte
  const handleGenerateReport = async (report: Report) => {
    if (!canGenerate) {
      toast.error('No tienes permisos para generar reportes');
      return;
    }

    setSelectedReport(report);
    setShowGenerateDialog(true);
  };

  // Filtrar reportes
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      !searchQuery ||
      report.report_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      reportTypeFilter === 'all' || report.report_type === reportTypeFilter;

    return matchesSearch && matchesType;
  });

  // Filtrar historial
  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.report_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      reportTypeFilter === 'all' || item.report_type === reportTypeFilter;
    const matchesStatus =
      statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="flex-1 w-full flex flex-col gap-4 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">
            Genera y visualiza reportes del sistema
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Reporte
          </Button>
        )}
      </div>

      {/* Accesos Rápidos a Visualizaciones */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Visualización de Reportes
          </CardTitle>
          <CardDescription>
            Accede directamente a las páginas de visualización con gráficas
            interactivas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Button
              variant="outline"
              className="justify-start h-auto py-3 bg-white dark:bg-gray-900"
              onClick={() =>
                (window.location.href = '/dashboard/reports/sales')
              }
            >
              <div className="flex flex-col items-start gap-1 text-left">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-semibold">Ventas</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Análisis de ventas, productos y métodos de pago
                </span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-3 bg-white dark:bg-gray-900"
              onClick={() =>
                (window.location.href = '/dashboard/reports/inventory')
              }
            >
              <div className="flex flex-col items-start gap-1 text-left">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold">Inventario</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Análisis de stock, movimientos y valorización
                </span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-3 bg-white dark:bg-gray-900"
              onClick={() =>
                (window.location.href = '/dashboard/reports/accounting')
              }
            >
              <div className="flex flex-col items-start gap-1 text-left">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold">Contabilidad</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Balance general, estado de resultados y más
                </span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Reportes
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">
              Configuraciones guardadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.filter((h) => h.status === 'COMPLETED').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Reportes completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                history.filter(
                  (h) => h.status === 'PROCESSING' || h.status === 'PENDING'
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Reportes pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fallidos</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.filter((h) => h.status === 'FAILED').length}
            </div>
            <p className="text-xs text-muted-foreground">Reportes con error</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">
            <FileText className="mr-2 h-4 w-4" />
            Configuraciones
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="mr-2 h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab: Configuraciones de Reportes */}
        <TabsContent value="reports" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar reportes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={reportTypeFilter}
                  onValueChange={setReportTypeFilter}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Tipo de reporte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {Object.entries(reportTypeNames).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={loadReports}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de reportes */}
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No hay reportes configurados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.report_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatReportType(report.report_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.export_format}</TableCell>
                        <TableCell>
                          <Badge
                            variant={report.is_active ? 'default' : 'secondary'}
                          >
                            {report.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(report.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canGenerate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGenerateReport(report)}
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report);
                                setShowViewDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setShowDeleteDialog(true);
                                }}
                                disabled={deletingReportId === report.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="history" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar en historial..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={reportTypeFilter}
                  onValueChange={setReportTypeFilter}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(reportTypeNames).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                    <SelectItem value="PROCESSING">Procesando</SelectItem>
                    <SelectItem value="COMPLETED">Completado</SelectItem>
                    <SelectItem value="FAILED">Fallido</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={loadHistory}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de historial */}
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Generado</TableHead>
                    <TableHead>Tiempo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No hay reportes en el historial
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.report_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatReportType(item.report_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.status)}>
                            {formatReportStatus(item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(item.generated_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {item.execution_time_ms
                            ? `${item.execution_time_ms}ms`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === 'COMPLETED' && item.file_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  window.open(item.file_url, '_blank')
                                }
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedHistory(item);
                                setShowViewDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogos */}
      {showCreateDialog && (
        <ReportFormDialog
          companyId={companyId}
          userId={userId}
          onClose={() => setShowCreateDialog(false)}
          onSave={async () => {
            await loadReports();
            setShowCreateDialog(false);
          }}
        />
      )}

      {showGenerateDialog && selectedReport && (
        <ReportGenerateDialog
          report={selectedReport}
          companyId={companyId}
          userId={userId}
          onClose={() => {
            setShowGenerateDialog(false);
            setSelectedReport(null);
          }}
          onGenerated={async () => {
            await loadHistory();
            setShowGenerateDialog(false);
            setSelectedReport(null);
          }}
        />
      )}

      {showViewDialog && selectedReport && (
        <ReportViewDialog
          report={selectedReport}
          onClose={() => {
            setShowViewDialog(false);
            setSelectedReport(null);
          }}
        />
      )}

      {showDeleteDialog && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Eliminar Reporte
              </CardTitle>
              <CardDescription>
                ¿Estás seguro de que deseas eliminar este reporte? Esta acción
                no se puede deshacer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg mb-4">
                <p className="font-medium">{selectedReport.report_name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatReportType(selectedReport.report_type)}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setSelectedReport(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selectedReport.id)}
                  disabled={deletingReportId === selectedReport.id}
                >
                  {deletingReportId === selectedReport.id
                    ? 'Eliminando...'
                    : 'Eliminar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
