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
  FileText,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  X,
  CheckCircle,
  DollarSign,
} from 'lucide-react';
import { PurchaseInvoicesService } from '@/lib/services/purchase-invoices-service';
import { PurchaseInvoice } from '@/lib/types/purchase-invoices';
import { PurchaseInvoiceFormDialog } from '@/components/purchase-invoice-form-dialog';
import { PurchaseInvoiceViewDialog } from '@/components/purchase-invoice-view-dialog';
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

interface PurchaseInvoicesPageClientProps {
  companyId: string;
  initialPurchaseInvoices: PurchaseInvoice[];
  suppliers: any[];
  numerations: any[];
  warehouses: any[];
  products: any[];
  accounts: any[];
  taxes: any[];
  costCenters: any[];
}

export function PurchaseInvoicesPageClient({
  companyId,
  initialPurchaseInvoices,
  suppliers,
  numerations,
  warehouses,
  products,
  accounts,
  taxes,
  costCenters,
}: PurchaseInvoicesPageClientProps) {
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(
    initialPurchaseInvoices
  );
  const [allPurchaseInvoices, setAllPurchaseInvoices] = useState<PurchaseInvoice[]>(
    initialPurchaseInvoices
  );
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const loadPurchaseInvoices = async () => {
    setLoading(true);
    try {
      const { purchaseInvoices: data } =
        await PurchaseInvoicesService.getPurchaseInvoices(companyId, {
          search: searchTerm || undefined,
          status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
          paymentStatus:
            paymentStatusFilter !== 'all' ? (paymentStatusFilter as any) : undefined,
          limit: 1000,
        });
      setAllPurchaseInvoices(data);
      setCurrentPage(1); // Resetear a la primera página cuando cambian los filtros
    } catch (error) {
      console.error('Error cargando facturas de compra:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar las facturas de compra',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchaseInvoices();
  }, [searchTerm, statusFilter, paymentStatusFilter, companyId]);

  // Paginación
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = allPurchaseInvoices.slice(startIndex, endIndex);
    setPurchaseInvoices(paginated);
  }, [allPurchaseInvoices, currentPage, itemsPerPage]);

  const handleCancel = async (invoice: PurchaseInvoice) => {
    if (!confirm('¿Está seguro de que desea cancelar esta factura de compra?')) {
      return;
    }

    try {
      await PurchaseInvoicesService.cancelPurchaseInvoice(
        invoice.id,
        companyId,
        'Cancelado por el usuario'
      );
      toast.success('Éxito', {
        description: 'Factura de compra cancelada',
      });
      loadPurchaseInvoices();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo cancelar',
      });
    }
  };

  const handleRestore = async (invoice: PurchaseInvoice) => {
    try {
      await PurchaseInvoicesService.restorePurchaseInvoice(invoice.id, companyId);
      toast.success('Éxito', {
        description: 'Factura de compra restaurada',
      });
      loadPurchaseInvoices();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo restaurar',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta factura de compra?')) {
      return;
    }

    try {
      await PurchaseInvoicesService.deletePurchaseInvoice(id, companyId);
      toast.success('Éxito', {
        description: 'Factura de compra eliminada',
      });
      loadPurchaseInvoices();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo eliminar',
      });
    }
  };

  const handleClone = async (invoice: PurchaseInvoice) => {
    try {
      await PurchaseInvoicesService.clonePurchaseInvoice(invoice.id, companyId);
      toast.success('Éxito', {
        description: 'Factura de compra clonada',
      });
      loadPurchaseInvoices();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo clonar',
      });
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'partially_paid':
        return <Badge variant="default">Parcial</Badge>;
      case 'paid':
        return <Badge className="bg-green-600">Pagada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const totalAmount = allPurchaseInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const pendingAmount = allPurchaseInvoices
    .filter((inv) => inv.payment_status === 'pending')
    .reduce((sum, inv) => sum + inv.pending_amount, 0);
  const paidAmount = allPurchaseInvoices
    .filter((inv) => inv.payment_status === 'paid')
    .reduce((sum, inv) => sum + inv.total_amount, 0);

  // Calcular paginación
  const totalPages = Math.ceil(allPurchaseInvoices.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startItem = allPurchaseInvoices.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, allPurchaseInvoices.length);

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
          <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Facturas de Compra</h1>
            <p className="text-muted-foreground">
              Gestión de facturas de compra y documentos de proveedores
            </p>
          </div>
        </div>
        <PurchaseInvoiceFormDialog
          companyId={companyId}
          suppliers={suppliers}
          numerations={numerations}
          accounts={accounts}
          paymentMethods={[]}
          costCenters={costCenters}
          products={products}
          taxes={taxes}
          warehouses={warehouses}
          onSave={loadPurchaseInvoices}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Factura de Compra
            </Button>
          }
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allPurchaseInvoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(paidAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas de Compra</CardTitle>
          <CardDescription>
            Lista de todas las facturas de compra registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Buscar por número, proveedor u observaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado de Pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="partially_paid">Parcial</SelectItem>
                <SelectItem value="paid">Pagada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pendiente</TableHead>
                  <TableHead>Estado Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : allPurchaseInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay facturas de compra
                    </TableCell>
                  </TableRow>
                ) : (
                  purchaseInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.supplier_invoice_number}
                      </TableCell>
                      <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell>{invoice.supplier?.name || 'N/A'}</TableCell>
                      <TableCell>
                        {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>{formatCurrency(invoice.pending_amount)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(invoice.payment_status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <PurchaseInvoiceViewDialog
                              companyId={companyId}
                              onUpdate={loadPurchaseInvoices}
                              purchaseInvoice={invoice}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalles
                                </DropdownMenuItem>
                              }
                            />
                            {invoice.status !== 'cancelled' && (
                              <PurchaseInvoiceFormDialog
                                companyId={companyId}
                                receivedPayment={invoice}
                                suppliers={suppliers}
                                numerations={numerations}
                                accounts={accounts}
                                paymentMethods={[]}
                                costCenters={costCenters}
                                products={products}
                                taxes={taxes}
                                warehouses={warehouses}
                                onSave={loadPurchaseInvoices}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                }
                              />
                            )}
                            {invoice.status === 'cancelled' ? (
                              <DropdownMenuItem onClick={() => handleRestore(invoice)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Restaurar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleCancel(invoice)}>
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleClone(invoice)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Clonar
                            </DropdownMenuItem>
                            {invoice.status !== 'cancelled' && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(invoice.id)}
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
          {allPurchaseInvoices.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startItem} a {endItem} de {allPurchaseInvoices.length} resultados
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




