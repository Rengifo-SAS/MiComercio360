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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Repeat, Plus, MoreHorizontal, Eye, Edit, Trash2, Play, Calendar } from 'lucide-react';
import { RecurringInvoicesService } from '@/lib/services/recurring-invoices-service';
import { RecurringInvoice } from '@/lib/types/recurring-invoices';
import { RecurringInvoiceFormDialog } from '@/components/recurring-invoice-form-dialog';
import { RecurringInvoiceViewDialog } from '@/components/recurring-invoice-view-dialog';
import { SalesPrintDialog } from '@/components/sales-print-dialog';
import { SalesService } from '@/lib/services/sales-service';
import { Sale } from '@/lib/types/sales';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RecurringInvoicesPageClientProps {
  companyId: string;
  initialRecurringInvoices: RecurringInvoice[];
  customers: any[];
  numerations: any[];
  warehouses: any[];
  products: any[];
  taxes: any[];
}

export function RecurringInvoicesPageClient({
  companyId,
  initialRecurringInvoices,
  customers,
  numerations,
  warehouses,
  products,
  taxes,
}: RecurringInvoicesPageClientProps) {
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>(initialRecurringInvoices);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedSale, setGeneratedSale] = useState<Sale | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const loadRecurringInvoices = async () => {
    setLoading(true);
    try {
      const { recurringInvoices: data } = await RecurringInvoicesService.getRecurringInvoices(
        companyId,
        { search: searchTerm || undefined, limit: 100 }
      );
      setRecurringInvoices(data);
    } catch (error) {
      console.error('Error cargando facturas recurrentes:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar las facturas recurrentes',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecurringInvoices();
    setCurrentPage(1); // Resetear a la primera página cuando cambian los filtros
  }, [searchTerm, companyId]);

  const handleGenerateInvoice = async (recurringInvoice: RecurringInvoice) => {
    try {
      const { saleId } = await RecurringInvoicesService.generateInvoiceFromRecurring(
        recurringInvoice.id,
        companyId
      );
      
      // Obtener la venta completa para mostrar el diálogo
      const sale = await SalesService.getSaleById(saleId);
      if (sale) {
        setGeneratedSale(sale);
        setShowPrintDialog(true);
      }
      
      toast.success('Éxito', {
        description: 'Factura generada correctamente',
      });
      loadRecurringInvoices();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo generar la factura',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await RecurringInvoicesService.deleteRecurringInvoice(id, companyId);
      toast.success('Éxito', {
        description: 'Factura recurrente eliminada',
      });
      loadRecurringInvoices();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo eliminar',
      });
    }
  };

  const handleStatusToggle = async (recurringInvoice: RecurringInvoice) => {
    try {
      await RecurringInvoicesService.toggleRecurringInvoice(
        recurringInvoice.id,
        companyId,
        !recurringInvoice.is_active
      );
      toast.success('Éxito', {
        description: `Factura recurrente ${!recurringInvoice.is_active ? 'activada' : 'desactivada'}`,
      });
      loadRecurringInvoices();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo actualizar',
      });
    }
  };

  const allFilteredInvoices = recurringInvoices.filter((invoice) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      invoice.customer?.business_name?.toLowerCase().includes(search) ||
      invoice.numeration?.name?.toLowerCase().includes(search) ||
      invoice.notes?.toLowerCase().includes(search)
    );
  });

  // Paginación
  const totalPages = Math.ceil(allFilteredInvoices.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startItem = allFilteredInvoices.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, allFilteredInvoices.length);

  const filteredInvoices = allFilteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Repeat className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Facturas Recurrentes</h1>
            <p className="text-muted-foreground">
              Programa y gestiona facturas que se generan automáticamente
            </p>
          </div>
        </div>
        <RecurringInvoiceFormDialog
          companyId={companyId}
          customers={customers}
          numerations={numerations}
          warehouses={warehouses}
          products={products}
          taxes={taxes}
          onSave={loadRecurringInvoices}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Factura Recurrente
            </Button>
          }
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recurringInvoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recurringInvoices.filter((i) => i.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recurringInvoices.filter((i) => !i.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                recurringInvoices.reduce((sum, i) => sum + i.total_amount, 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas Recurrentes</CardTitle>
          <CardDescription>
            Lista de todas las facturas recurrentes configuradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Buscar por cliente, numeración o notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Día del Mes</TableHead>
                  <TableHead>Próxima Generación</TableHead>
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
                ) : allFilteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay facturas recurrentes
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.customer?.business_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        Cada {invoice.frequency_months} mes(es)
                      </TableCell>
                      <TableCell>Día {invoice.day_of_month}</TableCell>
                      <TableCell>
                        {invoice.next_generation_date
                          ? formatDate(invoice.next_generation_date)
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.is_active ? 'default' : 'secondary'}>
                          {invoice.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <RecurringInvoiceViewDialog
                              recurringInvoice={invoice}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalles
                                </DropdownMenuItem>
                              }
                            />
                            <RecurringInvoiceFormDialog
                              companyId={companyId}
                              recurringInvoice={invoice}
                              customers={customers}
                              numerations={numerations}
                              warehouses={warehouses}
                              products={products}
                              taxes={taxes}
                              onSave={loadRecurringInvoices}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              }
                            />
                            <DropdownMenuItem
                              onClick={() => handleGenerateInvoice(invoice)}
                              disabled={!invoice.is_active}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Generar ahora
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusToggle(invoice)}
                            >
                              {invoice.is_active ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(invoice.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
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
          {allFilteredInvoices.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startItem} a {endItem} de {allFilteredInvoices.length} resultados
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

      {/* Diálogo de impresión y email después de generar factura */}
      <SalesPrintDialog
        open={showPrintDialog}
        onOpenChange={(open) => {
          setShowPrintDialog(open);
          if (!open) {
            setGeneratedSale(null);
          }
        }}
        sale={generatedSale}
        companyId={companyId}
      />
    </div>
  );
}

