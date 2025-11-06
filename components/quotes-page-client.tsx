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
  FileCheck,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  FileText,
  Send,
  CheckCircle,
  X,
  Printer,
} from 'lucide-react';
import { QuotesService } from '@/lib/services/quotes-service';
import { Quote } from '@/lib/types/quotes';
import { QuoteFormDialog } from '@/components/quote-form-dialog';
import { QuoteViewDialog } from '@/components/quote-view-dialog';
import { ConvertQuoteDialog } from '@/components/convert-quote-dialog';
import { PDFService } from '@/lib/services/pdf-service';
import { createClient } from '@/lib/supabase/client';
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

interface QuotesPageClientProps {
  companyId: string;
  initialQuotes: Quote[];
  customers: any[];
  numerations: any[];
  warehouses: any[];
  products: any[];
  taxes: any[];
  salespeople: any[];
}

export function QuotesPageClient({
  companyId,
  initialQuotes,
  customers,
  numerations,
  warehouses,
  products,
  taxes,
  salespeople,
}: QuotesPageClientProps) {
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [allQuotes, setAllQuotes] = useState<Quote[]>(initialQuotes);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const { quotes: data } = await QuotesService.getQuotes(companyId, {
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
        limit: 1000,
      });
      setAllQuotes(data);
      setCurrentPage(1); // Resetear a la primera página cuando cambian los filtros
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar las cotizaciones',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, [searchTerm, statusFilter, companyId]);

  // Paginación
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = allQuotes.slice(startIndex, endIndex);
    setQuotes(paginated);
  }, [allQuotes, currentPage, itemsPerPage]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta cotización?')) {
      return;
    }

    try {
      await QuotesService.deleteQuote(id, companyId);
      toast.success('Éxito', {
        description: 'Cotización eliminada',
      });
      loadQuotes();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo eliminar',
      });
    }
  };

  const handleStatusChange = async (quote: Quote, newStatus: string) => {
    try {
      // Primero actualizar el estado
      await QuotesService.updateQuoteStatus(quote.id, companyId, newStatus as any);
      
      // Si se marca como enviada, intentar enviar el correo automáticamente
      if (newStatus === 'sent' && quote.customer?.email) {
        try {
          const response = await fetch('/api/send-quote', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              quoteId: quote.id,
              companyId,
              email: quote.customer.email,
              paperSize: 'letter',
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            // El estado ya se actualizó, solo mostrar advertencia
            toast.warning('Estado actualizado', {
              description: `Cotización marcada como enviada, pero no se pudo enviar el correo: ${result.error || 'Error desconocido'}`,
            });
          } else {
            toast.success('Éxito', {
              description: `Cotización marcada como enviada y correo enviado a ${quote.customer.email}`,
            });
          }
        } catch (emailError: any) {
          console.error('Error enviando correo:', emailError);
          // El estado ya se actualizó, solo mostrar advertencia
          toast.warning('Estado actualizado', {
            description: 'Cotización marcada como enviada, pero no se pudo enviar el correo. Verifica la configuración del servicio de correo.',
          });
        }
      } else {
      toast.success('Éxito', {
        description: 'Estado de cotización actualizado',
      });
        
        // Si se marca como enviada pero no hay email del cliente
        if (newStatus === 'sent' && !quote.customer?.email) {
          toast.warning('Aviso', {
            description: 'Estado actualizado, pero el cliente no tiene correo electrónico registrado',
          });
        }
      }
      
      loadQuotes();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo actualizar el estado',
      });
    }
  };

  const handleClone = async (quote: Quote) => {
    try {
      await QuotesService.cloneQuote(quote.id, companyId);
      toast.success('Éxito', {
        description: 'Cotización clonada',
      });
      loadQuotes();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo clonar',
      });
    }
  };

  const handleGeneratePDF = async (quote: Quote) => {
    try {
      setLoading(true);
      
      // Obtener datos completos de la cotización
      const fullQuote = await QuotesService.getQuoteById(quote.id, companyId);
      
      if (!fullQuote) {
        throw new Error('No se pudo obtener la cotización');
      }

      // Obtener datos de la empresa
      const supabase = createClient();
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        throw new Error('No se encontró la información de la empresa');
      }

      // Generar nombre del archivo
      const filename = `cotizacion-${fullQuote.quote_number || fullQuote.id.substring(0, 8)}.pdf`;

      // Generar PDF
      await PDFService.generateQuotePDF(fullQuote, company, filename, {
        format: 'letter',
        orientation: 'portrait',
        margin: 19.05,
      });

      toast.success('Éxito', {
        description: 'PDF generado exitosamente',
      });
    } catch (error: any) {
      console.error('Error generando PDF:', error);
      toast.error('Error', {
        description: error.message || 'No se pudo generar el PDF',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Borrador</Badge>;
      case 'sent':
        return <Badge variant="default">Enviada</Badge>;
      case 'accepted':
        return <Badge className="bg-green-600">Aceptada</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rechazada</Badge>;
      case 'expired':
        return <Badge variant="outline">Vencida</Badge>;
      case 'converted':
        return <Badge className="bg-blue-600">Convertida</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const totalAmount = allQuotes.reduce((sum, q) => sum + q.total_amount, 0);
  const draftCount = allQuotes.filter((q) => q.status === 'draft').length;
  const sentCount = allQuotes.filter((q) => q.status === 'sent').length;
  const convertedCount = allQuotes.filter((q) => q.status === 'converted').length;

  // Calcular paginación
  const totalPages = Math.ceil(allQuotes.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startItem = allQuotes.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, allQuotes.length);

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
          <div className="p-3 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
            <FileCheck className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Cotizaciones</h1>
            <p className="text-muted-foreground">
              Creación y gestión de cotizaciones para clientes
            </p>
          </div>
        </div>
        <QuoteFormDialog
          companyId={companyId}
          customers={customers}
          numerations={numerations}
          warehouses={warehouses}
          products={products}
          taxes={taxes}
          salespeople={salespeople}
          onSave={loadQuotes}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cotización
            </Button>
          }
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allQuotes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borradores</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Cotizaciones</CardTitle>
          <CardDescription>
            Lista de todas las cotizaciones creadas
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="accepted">Aceptada</SelectItem>
                <SelectItem value="rejected">Rechazada</SelectItem>
                <SelectItem value="expired">Vencida</SelectItem>
                <SelectItem value="converted">Convertida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vencimiento</TableHead>
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
                ) : allQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay cotizaciones
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {quote.quote_number || 'N/A'}
                      </TableCell>
                      <TableCell>{formatDate(quote.quote_date)}</TableCell>
                      <TableCell>{quote.customer?.business_name || 'N/A'}</TableCell>
                      <TableCell>
                        {quote.expiration_date ? formatDate(quote.expiration_date) : 'N/A'}
                      </TableCell>
                      <TableCell>{formatCurrency(quote.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <QuoteViewDialog
                              quote={quote}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalles
                                </DropdownMenuItem>
                              }
                            />
                            <DropdownMenuItem
                              onClick={() => handleGeneratePDF(quote)}
                            >
                              <Printer className="mr-2 h-4 w-4" />
                              Generar PDF
                            </DropdownMenuItem>
                            {quote.status !== 'converted' && (
                              <QuoteFormDialog
                                companyId={companyId}
                                quote={quote}
                                customers={customers}
                                numerations={numerations}
                                warehouses={warehouses}
                                products={products}
                                taxes={taxes}
                                salespeople={salespeople}
                                onSave={loadQuotes}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                }
                              />
                            )}
                            {quote.status === 'draft' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(quote, 'sent')}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Marcar como Enviada
                              </DropdownMenuItem>
                            )}
                            {quote.status === 'sent' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(quote, 'accepted')}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Marcar como Aceptada
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(quote, 'rejected')}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Marcar como Rechazada
                                </DropdownMenuItem>
                              </>
                            )}
                            {quote.status === 'accepted' && (
                              <ConvertQuoteDialog
                                quote={quote}
                                companyId={companyId}
                                onSave={loadQuotes}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Convertir a Venta
                                  </DropdownMenuItem>
                                }
                              />
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleClone(quote)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Clonar
                            </DropdownMenuItem>
                            {quote.status !== 'converted' && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(quote.id)}
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
          {allQuotes.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startItem} a {endItem} de {allQuotes.length} resultados
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

