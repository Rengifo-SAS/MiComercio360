'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, startOfYear, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar as CalendarIcon,
  Loader2,
  Download,
  Filter,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
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

interface ItemProfitabilityReportClientProps {
  companyId: string;
  userId: string;
}

interface ItemProfitabilityData {
  product_id: string;
  item_name: string;
  reference: string;
  total_sold: number;
  total_cost: number;
  profitability: number;
  profitability_percentage: number;
}

export function ItemProfitabilityReportClient({
  companyId,
  userId,
}: ItemProfitabilityReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ItemProfitabilityData[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemProfitabilityData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fechas por defecto: año actual completo
  const today = new Date();
  const [dateFrom, setDateFrom] = useState<Date>(startOfYear(today));
  const [dateTo, setDateTo] = useState<Date>(today);

  // Totales
  const [totalSold, setTotalSold] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalProfitability, setTotalProfitability] = useState(0);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Generar reporte automáticamente al cambiar fechas
  useEffect(() => {
    if (dateFrom && dateTo) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const generateReport = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Por favor selecciona ambas fechas');
      return;
    }

    if (dateFrom > dateTo) {
      toast.error('La fecha inicial no puede ser mayor a la fecha final');
      return;
    }

    setLoading(true);
    setItems([]);
    setFilteredItems([]);
    setTotalSold(0);
    setTotalCost(0);
    setTotalProfitability(0);

    try {
      const startDate = startOfDay(dateFrom).toISOString();
      const endDate = endOfDay(dateTo).toISOString();

      // Consultar ventas con items y productos
      const { data: salesData, error } = await supabase
        .from('sales')
        .select(
          `
          id,
          created_at,
          status,
          sale_items (
            id,
            quantity,
            unit_price,
            total_price,
            products (
              id,
              name,
              sku,
              cost_price
            )
          )
        `
        )
        .eq('company_id', companyId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error) {
        console.error('Error al consultar ventas:', error);
        toast.error('Error al consultar las ventas. Por favor intenta de nuevo.');
        throw error;
      }

      if (!salesData || salesData.length === 0) {
        toast.info('No se encontraron ventas en el período seleccionado');
        setItems([]);
        setFilteredItems([]);
        setTotalSold(0);
        setTotalCost(0);
        setTotalProfitability(0);
        setLoading(false);
        return;
      }

      // Agrupar por producto
      const itemsMap = new Map<string, ItemProfitabilityData>();

      salesData.forEach((sale: any) => {
        if (!sale || !sale.sale_items || !Array.isArray(sale.sale_items)) return;

        sale.sale_items.forEach((item: any) => {
          if (!item || !item.products) return;

          const product = Array.isArray(item.products)
            ? item.products[0]
            : item.products;

          if (!product || !product.id) return;

          const productKey = product.id;
          const productName = product.name || 'Sin nombre';
          const productRef = product.sku || '';

          if (!itemsMap.has(productKey)) {
            itemsMap.set(productKey, {
              product_id: productKey,
              item_name: productName,
              reference: productRef,
              total_sold: 0,
              total_cost: 0,
              profitability: 0,
              profitability_percentage: 0,
            });
          }

          const itemData = itemsMap.get(productKey)!;
          
          // Calcular total vendido (total_price ya incluye todo)
          const totalPrice = Number(item.total_price) || 0;
          itemData.total_sold += totalPrice;

          // Calcular costo total
          const costPrice = Number(product.cost_price) || 0;
          const quantity = Number(item.quantity) || 0;
          const itemCost = costPrice * quantity;
          itemData.total_cost += itemCost;
        });
      });

      // Calcular rentabilidad y porcentaje para cada producto
      const itemsArray = Array.from(itemsMap.values())
        .map((item) => {
          item.profitability = item.total_sold - item.total_cost;
          item.profitability_percentage =
            item.total_sold > 0
              ? (item.profitability / item.total_sold) * 100
              : 0;
          return item;
        })
        .sort((a, b) => b.profitability - a.profitability); // Ordenar por rentabilidad descendente

      setItems(itemsArray);
      setFilteredItems(itemsArray);
      setCurrentPage(1);

      // Calcular totales
      const sumSold = itemsArray.reduce((sum, item) => sum + item.total_sold, 0);
      const sumCost = itemsArray.reduce((sum, item) => sum + item.total_cost, 0);
      const sumProfitability = sumSold - sumCost;

      setTotalSold(sumSold);
      setTotalCost(sumCost);
      setTotalProfitability(sumProfitability);

      toast.success(
        `Reporte generado: ${format(dateFrom, 'dd/MMM/yy', {
          locale: es,
        })} - ${format(dateTo, 'dd/MMM/yy', { locale: es })}`
      );
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);

      const errorMessage = error?.message || error?.details || 'Error desconocido al generar el reporte';
      toast.error(`Error al generar el reporte: ${errorMessage}`);

      // Limpiar estado en caso de error
      setItems([]);
      setFilteredItems([]);
      setTotalSold(0);
      setTotalCost(0);
      setTotalProfitability(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Resetear a la primera página cuando se busca

    if (!query.trim()) {
      setFilteredItems(items);
      return;
    }

    const filtered = items.filter(
      (item) =>
        item.item_name.toLowerCase().includes(query.toLowerCase()) ||
        item.reference.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  // Calcular items paginados
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Calcular páginas visibles
  const getVisiblePages = () => {
    const delta = 2;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];

    if (totalPages <= 1) return [1];

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
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startItem = filteredItems.length > 0 ? startIndex + 1 : 0;
  const endItem = Math.min(endIndex, filteredItems.length);

  // Resetear página cuando cambia itemsPerPage
  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/reports"
          className="hover:text-foreground transition-colors"
        >
          Reportes
        </Link>
        <span>/</span>
        <Link
          href="/dashboard/reports/sales"
          className="hover:text-foreground transition-colors"
        >
          Ventas
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">
          Rentabilidad por ítem
        </span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Rentabilidad por ítem
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Conoce la utilidad que generan tus ítems inventariables en valor monetario y porcentaje.
        </p>
      </div>

      {/* Filtros */}
      <Card className="shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg md:text-xl">
            Parámetros del reporte
          </CardTitle>
          <CardDescription className="text-sm">
            Selecciona el rango de fechas para generar el reporte
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fecha inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10',
                      !dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {dateFrom
                        ? format(dateFrom, 'PPP', { locale: es })
                        : 'Selecciona una fecha'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => date && setDateFrom(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Fecha final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10',
                      !dateTo && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {dateTo
                        ? format(dateTo, 'PPP', { locale: es })
                        : 'Selecciona una fecha'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => date && setDateTo(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button
                onClick={generateReport}
                disabled={loading}
                className="w-full h-10"
                size="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  'Generar reporte'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Generando reporte...</p>
        </div>
      )}

      {/* Resumen de totales */}
      {items.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center">
              <div className="my-1 w-full md:w-1/3 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                  Total vendido
                </p>
                <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                  {formatCurrency(totalSold)}
                </p>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <Minus className="h-4 w-4 text-[#47536b]" />
                </div>
              </div>

              <div className="my-1 w-full md:w-1/3 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                  Costo total
                </p>
                <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                  {formatCurrency(totalCost)}
                </p>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <span className="text-[#47536b] font-medium"> = </span>
                </div>
              </div>

              <div className="my-1 w-full md:w-1/3 relative px-4">
                <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                  Rentabilidad total
                </p>
                <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                  {formatCurrency(totalProfitability)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de resultados */}
      {items.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold">Resultados</CardTitle>
                <CardDescription className="text-sm">
                  {filteredItems.length} de {items.length} ítems
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar por nombre o referencia"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
                <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[200px] font-semibold">
                      Ítem
                    </TableHead>
                    <TableHead className="min-w-[120px] font-semibold">
                      Referencia
                    </TableHead>
                    <TableHead className="text-right min-w-[140px] font-semibold">
                      Total vendido
                    </TableHead>
                    <TableHead className="text-right min-w-[140px] font-semibold">
                      Costo total
                    </TableHead>
                    <TableHead className="text-right min-w-[140px] font-semibold">
                      Rentabilidad total
                    </TableHead>
                    <TableHead className="text-right min-w-[120px] font-semibold">
                      Porcentaje
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow key={item.product_id} className="hover:bg-muted/50">
                      <TableCell className="font-medium max-w-[200px]">
                        <span className="text-primary truncate block">
                          {item.item_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.reference || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-primary font-medium">
                          {formatCurrency(item.total_sold)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">
                          {formatCurrency(item.total_cost)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold ${
                            item.profitability >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(item.profitability)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold ${
                            item.profitability_percentage >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {item.profitability_percentage.toFixed(2)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredItems.length === 0 && searchQuery && (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No se encontraron ítems que coincidan con &quot;
                  <span className="font-medium">{searchQuery}</span>&quot;
                </p>
              </div>
            )}

            {/* Paginación */}
            {filteredItems.length > 0 && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {startItem}-{endItem}{' '}
                    <span className="text-muted-foreground">de {filteredItems.length}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Resultados por página</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={handleItemsPerPageChange}
                    >
                      <SelectTrigger className="h-9 w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasPreviousPage) {
                            setCurrentPage(currentPage - 1);
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
                              setCurrentPage(page as number);
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
                            setCurrentPage(currentPage + 1);
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
              </div>
            )}

            {/* Información de paginación cuando solo hay una página */}
            {filteredItems.length > 0 && totalPages === 1 && (
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startItem}-{endItem} de {filteredItems.length}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Resultados por página</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="h-9 w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estado vacío */}
      {items.length === 0 && !loading && !isInitialLoad && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              No hay datos para mostrar
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No se encontraron ventas en el período seleccionado. Intenta con otro rango de fechas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
