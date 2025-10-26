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
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { SalesService } from '@/lib/services/sales-service';
import {
  Sale,
  SaleStats,
  SaleFilters,
  SaleSearchParams,
  PaymentMethodLabels,
  PaymentStatusLabels,
  SaleStatusLabels,
  formatCurrency,
  formatDateTime,
} from '@/lib/types/sales';
import { SalesFormDialog } from './sales-form-dialog';
import { SalesViewDialog } from './sales-view-dialog';
import { SalesDeleteDialog } from './sales-delete-dialog';
import { SalesPrintDialog } from './sales-print-dialog';
import { RefundRequestDialog } from './refund-request-dialog';
import { RefundsManagementDialog } from './refunds-management-dialog';
import { SalesPagination } from './sales-pagination';

interface SalesPageClientProps {
  companyId: string;
  initialSales: Sale[];
  initialStats: SaleStats | null;
}

export function SalesPageClient({
  companyId,
  initialSales,
  initialStats,
}: SalesPageClientProps) {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [stats, setStats] = useState<SaleStats | null>(initialStats);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SaleSearchParams>({
    query: '',
    filters: {},
    sort_by: 'created_at',
    sort_order: 'desc',
    page: 1,
    limit: 20,
  });
  const [totalSales, setTotalSales] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showRefundsManagement, setShowRefundsManagement] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  // Cargar ventas
  const loadSales = async () => {
    if (!companyId) {
      setSales([]);
      setTotalSales(0);
      return;
    }

    setLoading(true);
    try {
      const result = await SalesService.getSales(companyId, searchParams);
      setSales(result.sales);
      setTotalSales(result.total);
    } catch (error) {
      console.error('Error cargando ventas:', error);
      setSales([]);
      setTotalSales(0);
    } finally {
      setLoading(false);
    }
  };

  // Cargar estadísticas
  const loadStats = async () => {
    if (!companyId) {
      setStats({
        total_sales: 0,
        total_amount: 0,
        average_sale: 0,
        total_items: 0,
        sales_today: 0,
        sales_this_month: 0,
        sales_this_year: 0,
        amount_today: 0,
        amount_this_month: 0,
        amount_this_year: 0,
      });
      return;
    }

    try {
      const statsData = await SalesService.getSalesStats(companyId);
      setStats(statsData);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setStats({
        total_sales: 0,
        total_amount: 0,
        average_sale: 0,
        total_items: 0,
        sales_today: 0,
        sales_this_month: 0,
        sales_this_year: 0,
        amount_today: 0,
        amount_this_month: 0,
        amount_this_year: 0,
      });
    }
  };

  useEffect(() => {
    loadSales();
  }, [searchParams]);

  useEffect(() => {
    loadStats();
  }, [sales]);

  // Manejar búsqueda
  const handleSearch = (query: string) => {
    setSearchParams((prev) => ({
      ...prev,
      query,
      page: 1,
    }));
  };

  // Manejar filtros
  const handleFiltersChange = (filters: SaleFilters) => {
    setSearchParams((prev) => ({
      ...prev,
      filters,
      page: 1,
    }));
  };

  // Manejar ordenamiento
  const handleSort = (sortBy: string) => {
    setSearchParams((prev) => ({
      ...prev,
      sort_by: sortBy as any,
      sort_order:
        prev.sort_by === sortBy && prev.sort_order === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Manejar paginación
  const handlePageChange = (page: number) => {
    setSearchParams((prev) => ({
      ...prev,
      page,
    }));
  };

  // Manejar cambio de elementos por página
  const handleItemsPerPageChange = (limit: number) => {
    setSearchParams((prev) => ({
      ...prev,
      limit,
      page: 1, // Resetear a la primera página
    }));
  };

  // Manejar nueva venta
  const handleNewSale = () => {
    setEditingSale(null);
    setShowFormDialog(true);
  };

  // Manejar editar venta
  const handleEditSale = (sale: Sale) => {
    // Verificar si la venta está completada
    if (sale.status === 'completed') {
      alert(
        'No se puede editar una venta que ya está completada. Solo se pueden editar ventas pendientes o en proceso.'
      );
      return;
    }

    setEditingSale(sale);
    setShowFormDialog(true);
  };

  // Manejar ver venta
  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setShowViewDialog(true);
  };

  // Manejar eliminar venta
  const handleDeleteSale = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDeleteDialog(true);
  };

  // Manejar reembolso/anulación
  const handleRefundSale = (sale: Sale) => {
    // Verificar si la venta ya está anulada
    if (sale.status === 'cancelled') {
      alert('Esta venta ya ha sido anulada anteriormente.');
      return;
    }

    setSelectedSale(sale);
    setShowRefundDialog(true);
  };

  // Manejar imprimir venta
  const handlePrintSale = (sale: Sale) => {
    setSelectedSale(sale);
    setShowPrintDialog(true);
  };

  // Manejar guardar venta
  const handleSaveSale = async () => {
    await loadSales();
    await loadStats();
    setShowFormDialog(false);
  };

  // Manejar eliminar venta
  const handleConfirmDelete = async () => {
    if (selectedSale) {
      await SalesService.deleteSale(selectedSale.id);
      await loadSales();
      await loadStats();
      setShowDeleteDialog(false);
    }
  };

  // Exportar ventas
  const handleExport = async () => {
    try {
      const result = await SalesService.getSales(companyId, {
        ...searchParams,
        limit: 1000, // Exportar más registros
      });

      // Crear CSV
      const csvContent = [
        ['Número', 'Cliente', 'Total', 'Método de Pago', 'Estado', 'Fecha'],
        ...result.sales.map((sale) => [
          sale.sale_number,
          sale.customer?.business_name || 'Sin cliente',
          sale.total_amount.toString(),
          PaymentMethodLabels[sale.payment_method],
          SaleStatusLabels[sale.status],
          formatDateTime(sale.created_at),
        ]),
      ]
        .map((row) => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventas-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando ventas:', error);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ventas</h1>
          <p className="text-muted-foreground">
            Gestiona las transacciones de venta
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleNewSale}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sales_today || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.amount_today || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ventas del Mes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.sales_this_month || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.amount_this_month || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Promedio por Venta
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.average_sale || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.total_sales || 0} transacciones
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Items
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.items_today || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.amount_today || 0)} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número o notas..."
              value={searchParams.query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtrar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRefundsManagement(true)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reembolsos
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select
                  value={searchParams.filters?.status?.[0] || 'all'}
                  onValueChange={(value) =>
                    handleFiltersChange({
                      ...searchParams.filters,
                      status:
                        value && value !== 'all' ? [value as any] : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Método de Pago</label>
                <Select
                  value={searchParams.filters?.payment_method?.[0] || 'all'}
                  onValueChange={(value) =>
                    handleFiltersChange({
                      ...searchParams.filters,
                      payment_method:
                        value && value !== 'all' ? [value as any] : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los métodos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los métodos</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="mixed">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Ordenar por</label>
                <Select
                  value={searchParams.sort_by}
                  onValueChange={(value) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      sort_by: value as any,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Fecha</SelectItem>
                    <SelectItem value="sale_number">Número</SelectItem>
                    <SelectItem value="total_amount">Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas</CardTitle>
          <CardDescription>{totalSales} ventas encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Cargando ventas...</p>
            </div>
          ) : sales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('sale_number')}
                  >
                    Número
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort('total_amount')}
                  >
                    Total
                  </TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort('created_at')}
                  >
                    Fecha
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className={
                      sale.status === 'completed'
                        ? 'opacity-75 bg-muted/30'
                        : ''
                    }
                  >
                    <TableCell className="font-medium">
                      #{sale.sale_number}
                      {sale.status === 'completed' && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Finalizada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {sale.customer?.business_name || 'Sin cliente'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total_amount)}
                    </TableCell>
                    <TableCell>
                      {PaymentMethodLabels[sale.payment_method]}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.status === 'completed'
                            ? 'default'
                            : sale.status === 'cancelled'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {SaleStatusLabels[sale.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(sale.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleViewSale(sale)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditSale(sale)}
                            disabled={sale.status === 'completed'}
                            className={
                              sale.status === 'completed'
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handlePrintSale(sale)}
                          >
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRefundSale(sale)}
                            disabled={sale.status === 'cancelled'}
                            className={
                              sale.status === 'cancelled'
                                ? 'opacity-50 cursor-not-allowed'
                                : 'text-orange-600'
                            }
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reembolso/Anulación
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteSale(sale)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay ventas registradas</p>
              <p className="text-sm">Las ventas aparecerán aquí</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {sales && sales.length > 0 && (
        <SalesPagination
          pagination={{
            currentPage: searchParams.page || 1,
            totalPages: Math.ceil(totalSales / (searchParams.limit || 20)),
            totalItems: totalSales,
            itemsPerPage: searchParams.limit || 20,
            hasNextPage:
              (searchParams.page || 1) <
              Math.ceil(totalSales / (searchParams.limit || 20)),
            hasPreviousPage: (searchParams.page || 1) > 1,
          }}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Dialogs */}
      <SalesFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        companyId={companyId}
        sale={editingSale}
        onSave={handleSaveSale}
      />

      <SalesViewDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        sale={selectedSale}
        companyId={companyId}
      />

      <SalesDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        sale={selectedSale}
        onConfirm={handleConfirmDelete}
      />

      <SalesPrintDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        sale={selectedSale}
        companyId={companyId}
      />

      <RefundRequestDialog
        open={showRefundDialog}
        onOpenChange={setShowRefundDialog}
        sale={selectedSale}
        companyId={companyId}
        onSuccess={() => {
          loadSales();
          loadStats();
        }}
      />

      <RefundsManagementDialog
        open={showRefundsManagement}
        onOpenChange={setShowRefundsManagement}
        companyId={companyId}
        onSuccess={() => {
          loadSales();
          loadStats();
        }}
      />
    </div>
  );
}
