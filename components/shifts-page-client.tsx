'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShiftsService } from '@/lib/services/shifts-service';
import {
  Shift,
  ShiftStats,
  formatShiftDuration,
  calculateShiftDuration,
} from '@/lib/types/shifts';
import { createClient } from '@/lib/supabase/client';
import { ShiftOpenDialog } from './shift-open-dialog';
import { ShiftCloseDialog } from './shift-close-dialog';
import { ShiftViewDialog } from './shift-view-dialog';
import { CashMovementDialog } from './cash-movement-dialog';

export function ShiftsPageClient() {
  const router = useRouter();
  const supabase = createClient();
  const [companyId, setCompanyId] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [stats, setStats] = useState<ShiftStats | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalShifts, setTotalShifts] = useState(0);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showCashMovementDialog, setShowCashMovementDialog] = useState(false);

  // Cargar usuario y compañía
  useEffect(() => {
    loadUserAndCompany();
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (companyId) {
      loadShifts();
      loadStats();
      loadActiveShift();
    }
  }, [companyId, currentPage, statusFilter, dateFilter, searchQuery]);

  const loadUserAndCompany = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profile?.company_id) {
        setUser(user);
        setCompanyId(profile.company_id);
      }
    } catch (error) {
      console.error('Error cargando usuario y compañía:', error);
    }
  };

  const loadShifts = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      console.log('🔍 Cargando turnos para companyId:', companyId);

      const filters: any = {};

      if (statusFilter !== 'all') {
        filters.status = [statusFilter];
      }

      // Aplicar filtro de fecha
      const now = new Date();
      let dateFrom: string | undefined;
      let dateTo: string | undefined;

      switch (dateFilter) {
        case 'today':
          dateFrom = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          ).toISOString();
          dateTo = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
          ).toISOString();
          break;
        case 'week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          dateFrom = new Date(
            startOfWeek.getFullYear(),
            startOfWeek.getMonth(),
            startOfWeek.getDate()
          ).toISOString();
          dateTo = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
          ).toISOString();
          break;
        case 'month':
          dateFrom = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
          ).toISOString();
          dateTo = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
          ).toISOString();
          break;
      }

      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      console.log('📋 Filtros aplicados:', filters);
      console.log('🔍 Búsqueda:', searchQuery);

      const result = await ShiftsService.getShifts(companyId, {
        query: searchQuery,
        filters,
        page: currentPage,
        limit: 20,
      });

      console.log('📊 Resultado de turnos:', result);

      setShifts(result.shifts);
      setTotalShifts(result.total);
      setTotalPages(Math.ceil(result.total / 20));
    } catch (error) {
      console.error('❌ Error cargando turnos:', error);
      toast.error('Error al cargar los turnos');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!companyId) return;

    try {
      const now = new Date();
      const dateFrom = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();
      const dateTo = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      ).toISOString();

      const statsData = await ShiftsService.getShiftStats(
        companyId,
        dateFrom,
        dateTo
      );
      setStats(statsData);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const loadActiveShift = async () => {
    if (!companyId) return;

    try {
      const active = await ShiftsService.getActiveShift(companyId);
      setActiveShift(active);
    } catch (error) {
      console.error('Error cargando turno activo:', error);
    }
  };

  const handleOpenShift = async (initialCash: number, notes?: string) => {
    if (!companyId) return;

    try {
      await ShiftsService.createShift(companyId, {
        initial_cash: initialCash,
        notes,
      });

      toast.success('Turno abierto exitosamente');
      loadShifts();
      loadActiveShift();
      loadStats();
    } catch (error: any) {
      console.error('Error abriendo turno:', error);
      toast.error(error.message || 'Error al abrir el turno');
    }
  };

  const handleCloseShift = async (
    shiftId: string,
    finalCash: number,
    notes?: string
  ) => {
    try {
      await ShiftsService.closeShift(shiftId, {
        final_cash: finalCash,
        notes,
      });

      toast.success('Turno cerrado exitosamente');
      loadShifts();
      loadActiveShift();
      loadStats();
    } catch (error: any) {
      console.error('Error cerrando turno:', error);
      toast.error(error.message || 'Error al cerrar el turno');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Abierto
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Cerrado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  if (loading && shifts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando turnos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Gestión de Turnos
          </h1>
          <p className="text-muted-foreground text-sm">
            Administra los turnos de caja y controla el efectivo
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeShift ? (
            <div className="flex items-center gap-3">
              <Badge variant="default" className="bg-green-100 text-green-800 px-3 py-1">
                <CheckCircle className="w-3 h-3 mr-1.5" />
                Turno Activo
              </Badge>
              <ShiftCloseDialog
                shift={activeShift}
                onClose={handleCloseShift}
              />
            </div>
          ) : (
            <ShiftOpenDialog companyId={companyId} onOpen={handleOpenShift} />
          )}
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">
                Turnos Totales
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-bold">{stats.total_shifts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.open_shifts} abiertos, {stats.closed_shifts} cerrados
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">
                Ventas Totales
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-bold">
                {formatCurrency(stats.total_sales)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.total_transactions} transacciones
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">
                Duración Promedio
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-bold">
                {stats.average_shift_duration > 0
                  ? formatShiftDuration(stats.average_shift_duration)
                  : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">Por turno cerrado</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">
                Diferencia Efectivo
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <div
                className={`text-3xl font-bold ${
                  stats.total_cash_difference >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {formatCurrency(stats.total_cash_difference)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.total_cash_difference >= 0 ? 'Sobrante' : 'Faltante'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por notas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="open">Abiertos</SelectItem>
                <SelectItem value="closed">Cerrados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de turnos */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Turnos</CardTitle>
          <CardDescription className="text-sm">
            Lista de todos los turnos registrados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px] px-4 py-3">Cajero</TableHead>
                  <TableHead className="min-w-[120px] px-4 py-3">Inicio</TableHead>
                  <TableHead className="min-w-[120px] px-4 py-3">Fin</TableHead>
                  <TableHead className="min-w-[100px] px-4 py-3">Duración</TableHead>
                  <TableHead className="min-w-[140px] px-4 py-3">
                    Efectivo Inicial
                  </TableHead>
                  <TableHead className="min-w-[140px] px-4 py-3">
                    Efectivo Final
                  </TableHead>
                  <TableHead className="min-w-[120px] px-4 py-3">Ventas</TableHead>
                  <TableHead className="min-w-[100px] px-4 py-3">Estado</TableHead>
                  <TableHead className="text-right min-w-[100px] px-4 py-3">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => {
                  const duration = calculateShiftDuration(
                    shift.start_time,
                    shift.end_time
                  );
                  const durationFormatted = duration
                    ? formatShiftDuration(duration)
                    : 'En curso';

                  return (
                    <TableRow key={shift.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium px-4 py-3">
                        <div
                          className="truncate max-w-[140px]"
                          title={shift.cashier?.full_name || 'N/A'}
                        >
                          {shift.cashier?.full_name || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="text-sm">
                          {formatDate(shift.start_time)}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="text-sm">
                          {shift.end_time ? formatDate(shift.end_time) : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="text-sm font-mono">
                          {durationFormatted}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="text-sm font-mono">
                          {formatCurrency(shift.initial_cash)}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="text-sm font-mono">
                          {shift.final_cash
                            ? formatCurrency(shift.final_cash)
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="text-sm font-mono font-semibold">
                          {formatCurrency(shift.total_sales)}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">{getStatusBadge(shift.status)}</TableCell>
                      <TableCell className="text-right px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setSelectedShift(shift)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>
                            {shift.status === 'open' && (
                              <DropdownMenuItem
                                onClick={() => setShowCashMovementDialog(true)}
                              >
                                <DollarSign className="mr-2 h-4 w-4" />
                                Movimiento de Efectivo
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {shifts.length === 0 && !loading && (
            <div className="text-center py-12 px-4">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay turnos</h3>
              <p className="text-muted-foreground mb-6">
                No se encontraron turnos con los filtros aplicados.
              </p>
              {!activeShift && (
                <ShiftOpenDialog
                  companyId={companyId}
                  onOpen={handleOpenShift}
                />
              )}
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {(currentPage - 1) * 20 + 1} a{' '}
                {Math.min(currentPage * 20, totalShifts)} de {totalShifts}{' '}
                turnos
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm px-2">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      {selectedShift && (
        <ShiftViewDialog
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
        />
      )}

      {showCashMovementDialog && activeShift && (
        <CashMovementDialog
          shiftId={activeShift.id}
          onMovementAdded={() => {
            loadShifts();
            setShowCashMovementDialog(false);
          }}
          onClose={() => setShowCashMovementDialog(false)}
        />
      )}
    </div>
  );
}
