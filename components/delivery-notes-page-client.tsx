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
  Truck,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileText,
  XCircle,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { DeliveryNotesService } from '@/lib/services/delivery-notes-service';
import { DeliveryNote } from '@/lib/types/delivery-notes';
import { DeliveryNoteFormDialog } from '@/components/delivery-note-form-dialog';
import { DeliveryNoteViewDialog } from '@/components/delivery-note-view-dialog';
import { ConvertDeliveryNoteDialog } from '@/components/convert-delivery-note-dialog';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface DeliveryNotesPageClientProps {
  companyId: string;
  initialDeliveryNotes: DeliveryNote[];
  customers: any[];
  numerations: any[];
  warehouses: any[];
  products: any[];
  taxes: any[];
  salespeople: any[];
}

export function DeliveryNotesPageClient({
  companyId,
  initialDeliveryNotes,
  customers,
  numerations,
  warehouses,
  products,
  taxes,
  salespeople,
}: DeliveryNotesPageClientProps) {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>(initialDeliveryNotes);
  const [allDeliveryNotes, setAllDeliveryNotes] = useState<DeliveryNote[]>(initialDeliveryNotes);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const loadDeliveryNotes = async () => {
    setLoading(true);
    try {
      const { deliveryNotes: data } = await DeliveryNotesService.getDeliveryNotes(companyId, {
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
        documentType: documentTypeFilter !== 'all' ? (documentTypeFilter as any) : undefined,
        limit: 1000,
      });
      setAllDeliveryNotes(data);
      setCurrentPage(1); // Resetear a la primera página cuando cambian los filtros
    } catch (error) {
      console.error('Error cargando remisiones:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar las remisiones',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveryNotes();
  }, [searchTerm, statusFilter, documentTypeFilter, companyId]);

  // Paginación
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = allDeliveryNotes.slice(startIndex, endIndex);
    setDeliveryNotes(paginated);
  }, [allDeliveryNotes, currentPage, itemsPerPage]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta remisión?')) {
      return;
    }

    try {
      await DeliveryNotesService.deleteDeliveryNote(id, companyId);
      toast.success('Éxito', {
        description: 'Remisión eliminada',
      });
      loadDeliveryNotes();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo eliminar',
      });
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Está seguro de que desea anular esta remisión?')) {
      return;
    }

    try {
      await DeliveryNotesService.cancelDeliveryNote(id, companyId);
      toast.success('Éxito', {
        description: 'Remisión anulada',
      });
      loadDeliveryNotes();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo anular',
      });
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await DeliveryNotesService.restoreDeliveryNote(id, companyId);
      toast.success('Éxito', {
        description: 'Remisión restaurada',
      });
      loadDeliveryNotes();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo restaurar',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'partially_invoiced':
        return <Badge className="bg-yellow-600">Parcialmente Facturada</Badge>;
      case 'invoiced':
        return <Badge className="bg-green-600">Facturada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Anulada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    switch (type) {
      case 'DELIVERY_NOTE':
        return <Badge variant="outline">Remisión</Badge>;
      case 'SERVICE_ORDER':
        return <Badge variant="outline">Orden de Servicio</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const totalAmount = allDeliveryNotes.reduce((sum, dn) => sum + dn.total_amount, 0);
  const pendingCount = allDeliveryNotes.filter((dn) => dn.status === 'pending').length;
  const partiallyInvoicedCount = allDeliveryNotes.filter((dn) => dn.status === 'partially_invoiced').length;
  const invoicedCount = allDeliveryNotes.filter((dn) => dn.status === 'invoiced').length;

  // Calcular paginación
  const totalPages = Math.ceil(allDeliveryNotes.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startItem = allDeliveryNotes.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, allDeliveryNotes.length);

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
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
            <Truck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Remisiones</h1>
            <p className="text-sm text-muted-foreground">
              Gestión de remisiones y órdenes de servicio
            </p>
          </div>
        </div>
        <DeliveryNoteFormDialog
          companyId={companyId}
          customers={customers}
          numerations={numerations}
          warehouses={warehouses}
          products={products}
          taxes={taxes}
          salespeople={salespeople}
          onSave={loadDeliveryNotes}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Remisión
            </Button>
          }
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Total</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{allDeliveryNotes.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Parcialmente Facturadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{partiallyInvoicedCount}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Valor Total</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Remisiones</CardTitle>
          <CardDescription className="text-sm">
            Lista de todas las remisiones creadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Buscar por número, cliente o notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="partially_invoiced">Parcialmente Facturada</SelectItem>
                <SelectItem value="invoiced">Facturada</SelectItem>
                <SelectItem value="cancelled">Anulada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DELIVERY_NOTE">Remisión</SelectItem>
                <SelectItem value="SERVICE_ORDER">Orden de Servicio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : allDeliveryNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay remisiones
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveryNotes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">
                        {note.delivery_note_number || 'N/A'}
                      </TableCell>
                      <TableCell>{formatDate(note.delivery_date)}</TableCell>
                      <TableCell>{getDocumentTypeBadge(note.document_type)}</TableCell>
                      <TableCell>{note.customer?.business_name || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(note.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(note.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DeliveryNoteViewDialog
                              deliveryNote={note}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalles
                                </DropdownMenuItem>
                              }
                            />
                            {note.status !== 'invoiced' && !note.is_cancelled && (
                              <DeliveryNoteFormDialog
                                companyId={companyId}
                                deliveryNote={note}
                                customers={customers}
                                numerations={numerations}
                                warehouses={warehouses}
                                products={products}
                                taxes={taxes}
                                salespeople={salespeople}
                                onSave={loadDeliveryNotes}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                }
                              />
                            )}
                            {(note.status === 'pending' || note.status === 'partially_invoiced') && (
                              <ConvertDeliveryNoteDialog
                                deliveryNote={note}
                                companyId={companyId}
                                onSave={loadDeliveryNotes}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Convertir a Venta
                                  </DropdownMenuItem>
                                }
                              />
                            )}
                            <DropdownMenuSeparator />
                            {!note.is_cancelled && note.status !== 'invoiced' && (
                              <DropdownMenuItem
                                onClick={() => handleCancel(note.id)}
                                className="text-destructive"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Anular
                              </DropdownMenuItem>
                            )}
                            {note.is_cancelled && (
                              <DropdownMenuItem onClick={() => handleRestore(note.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Restaurar
                              </DropdownMenuItem>
                            )}
                            {note.status !== 'invoiced' && !note.is_cancelled && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(note.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {allDeliveryNotes.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startItem} a {endItem} de {allDeliveryNotes.length} resultados
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

