'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RotateCcw,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { RefundsService } from '@/lib/services/refunds-service';
import { RefundRequest } from '@/lib/types/refunds';
import { RefundFormDialog } from '@/components/refund-form-dialog';
import { RefundViewDialog } from '@/components/refund-view-dialog';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { REFUND_STATUSES, REFUND_REQUEST_TYPES } from '@/lib/types/refunds';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface SalesReturnsPageClientProps {
  companyId: string;
  initialRefunds: RefundRequest[];
  sales: any[];
  customers: any[];
  products: any[];
}

export function SalesReturnsPageClient({
  companyId,
  initialRefunds,
  sales,
  customers,
  products,
}: SalesReturnsPageClientProps) {
  const [refunds, setRefunds] = useState<RefundRequest[]>(initialRefunds);
  const [allRefunds, setAllRefunds] = useState<RefundRequest[]>(initialRefunds);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const loadRefunds = async () => {
    setLoading(true);
    try {
      const { refundRequests } = await RefundsService.getRefundRequests(companyId, {
        status: statusFilter !== 'all' ? [statusFilter] : undefined,
        request_type: typeFilter !== 'all' ? [typeFilter] : undefined,
      });
      
      // Filtrar por término de búsqueda si existe
      let filtered = refundRequests || [];
      if (searchTerm) {
        filtered = (refundRequests || []).filter((refund: any) => {
          const saleNumber = refund.sale?.sale_number?.toLowerCase() || '';
          const customerName = refund.sale?.customer?.business_name?.toLowerCase() || '';
          const description = refund.description?.toLowerCase() || '';
          const search = searchTerm.toLowerCase();
          return saleNumber.includes(search) || customerName.includes(search) || description.includes(search);
        });
      }
      
      setAllRefunds(filtered);
      setCurrentPage(1); // Resetear a la primera página cuando cambian los filtros
    } catch (error) {
      console.error('Error cargando devoluciones:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar las devoluciones',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, [searchTerm, statusFilter, typeFilter, companyId]);

  // Paginación
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = allRefunds.slice(startIndex, endIndex);
    setRefunds(paginated);
  }, [allRefunds, currentPage, itemsPerPage]);

  const handleView = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setViewDialogOpen(true);
  };

  const handleApprove = async (id: string) => {
    try {
      await RefundsService.approveRefundRequest(id);
      toast.success('Éxito', {
        description: 'Devolución aprobada',
      });
      loadRefunds();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo aprobar',
      });
    }
  };

  const handleProcess = async (id: string) => {
    if (!confirm('¿Está seguro de que desea procesar esta devolución? Esto ejecutará el reembolso y actualizará el inventario.')) {
      return;
    }

    try {
      await RefundsService.processRefundRequest(id);
      toast.success('Éxito', {
        description: 'Devolución procesada exitosamente',
      });
      loadRefunds();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo procesar',
      });
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Ingrese la razón del rechazo:');
    if (!reason) return;

    try {
      await RefundsService.rejectRefundRequest(id, reason);
      toast.success('Éxito', {
        description: 'Devolución rechazada',
      });
      loadRefunds();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo rechazar',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      PENDING: { variant: 'secondary', label: REFUND_STATUSES.PENDING },
      APPROVED: { variant: 'default', label: REFUND_STATUSES.APPROVED },
      REJECTED: { variant: 'destructive', label: REFUND_STATUSES.REJECTED },
      PROCESSED: { variant: 'default', label: REFUND_STATUSES.PROCESSED },
    };
    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant="outline">
        {REFUND_REQUEST_TYPES[type as keyof typeof REFUND_REQUEST_TYPES] || type}
      </Badge>
    );
  };

  const stats = {
    total: allRefunds.length,
    pending: allRefunds.filter((r) => r.status === 'PENDING').length,
    approved: allRefunds.filter((r) => r.status === 'APPROVED').length,
    processed: allRefunds.filter((r) => r.status === 'PROCESSED').length,
    totalAmount: allRefunds.reduce((sum, r) => sum + (r.requested_amount || 0), 0),
  };

  // Calcular paginación
  const totalPages = Math.ceil(allRefunds.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startItem = allRefunds.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, allRefunds.length);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Calcular páginas visibles
  const getVisiblePages = () => {
    if (totalPages <= 1) return [1];
    
    const delta = 2;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
            <RotateCcw className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Devoluciones de Venta</h1>
            <p className="text-muted-foreground">
              Gestión de devoluciones y reembolsos de productos vendidos
            </p>
          </div>
        </div>
        <RefundFormDialog
          companyId={companyId}
          sales={sales}
          customers={customers}
          products={products}
          onSave={loadRefunds}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Devolución
            </Button>
          }
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Procesadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Buscar por número de venta, cliente o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDING">Pendiente</SelectItem>
                <SelectItem value="APPROVED">Aprobado</SelectItem>
                <SelectItem value="REJECTED">Rechazado</SelectItem>
                <SelectItem value="PROCESSED">Procesado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="REFUND">Reembolso</SelectItem>
                <SelectItem value="CANCELLATION">Anulación</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Devoluciones</CardTitle>
          <CardDescription>
            Lista de devoluciones y reembolsos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : refunds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay devoluciones registradas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.map((refund: any) => (
                  <TableRow key={refund.id}>
                    <TableCell className="font-medium">
                      {refund.sale?.sale_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {refund.sale?.customer?.business_name || 'N/A'}
                    </TableCell>
                    <TableCell>{getTypeBadge(refund.request_type)}</TableCell>
                    <TableCell>{getStatusBadge(refund.status)}</TableCell>
                    <TableCell>{formatCurrency(refund.requested_amount)}</TableCell>
                    <TableCell>{formatDate(refund.request_date)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleView(refund)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          {refund.status === 'PENDING' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleApprove(refund.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Aprobar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReject(refund.id)}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Rechazar
                              </DropdownMenuItem>
                            </>
                          )}
                          {refund.status === 'APPROVED' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleProcess(refund.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Procesar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {allRefunds.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startItem} a {endItem} de {allRefunds.length} resultados
                </p>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">Filas por página:</p>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 30, 50, 100].map((pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasPreviousPage) {
                            handlePageChange(currentPage - 1);
                          }
                        }}
                        className={
                          !hasPreviousPage
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                      />
                    </PaginationItem>

                    {visiblePages.map((page, index) => (
                      <PaginationItem key={index}>
                        {page === '...' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page as number);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasNextPage) {
                            handlePageChange(currentPage + 1);
                          }
                        }}
                        className={
                          !hasNextPage
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedRefund && (
        <RefundViewDialog
          refund={selectedRefund}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          companyId={companyId}
        />
      )}
    </div>
  );
}

