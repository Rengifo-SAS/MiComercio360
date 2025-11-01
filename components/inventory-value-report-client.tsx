'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, endOfDay } from 'date-fns';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar as CalendarIcon,
  Loader2,
  Search,
  Download,
  Archive,
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

interface InventoryValueReportClientProps {
  companyId: string;
  userId: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface InventoryValueItem {
  id: string;
  name: string;
  sku?: string;
  reference?: string;
  description?: string;
  quantity: number;
  unit: string;
  cost_price: number;
  total_value: number;
  is_active: boolean;
  warehouse_name?: string;
}

export function InventoryValueReportClient({
  companyId,
  userId,
}: InventoryValueReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InventoryValueItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [searchItem, setSearchItem] = useState('');
  const [searchReference, setSearchReference] = useState('');
  const [totalValue, setTotalValue] = useState(0);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Cargar bodegas y generar reporte al montar
  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (dateTo) {
      generateReport();
    }
  }, [dateTo, selectedWarehouse]);

  const loadWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, code')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('is_main', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error al cargar bodegas:', error);
        return;
      }

      setWarehouses(data || []);
    } catch (error) {
      console.error('Error al cargar bodegas:', error);
    }
  };

  const generateReport = async () => {
    if (!dateTo) {
      toast.error('Por favor selecciona una fecha');
      return;
    }

    setLoading(true);

    try {
      let query = supabase
        .from('warehouse_inventory')
        .select(`
          quantity,
          product:products!warehouse_inventory_product_id_fkey (
            id,
            name,
            sku,
            barcode,
            description,
            cost_price,
            unit,
            is_active
          ),
          warehouse:warehouses!warehouse_inventory_warehouse_id_fkey (
            id,
            name,
            code
          )
        `)
        .eq('company_id', companyId)
        .limit(10000);

      // Filtrar por bodega si está seleccionada
      if (selectedWarehouse !== 'all') {
        query = query.eq('warehouse_id', selectedWarehouse);
      }

      const { data: inventoryData, error } = await query;

      if (error) {
        console.error('Error al consultar inventario:', error);
        throw error;
      }

      if (!inventoryData || inventoryData.length === 0) {
        toast.info('No se encontraron productos en el inventario');
        setItems([]);
        setTotalValue(0);
        setLoading(false);
        return;
      }

      // Procesar inventario y calcular valores
      const itemsMap = new Map<string, InventoryValueItem>();
      let calculatedTotalValue = 0;

      inventoryData.forEach((inv: any) => {
        const product = Array.isArray(inv.product) ? inv.product[0] : inv.product;
        const warehouse = Array.isArray(inv.warehouse)
          ? inv.warehouse[0]
          : inv.warehouse;

        if (!product) return;

        const productId = product.id;
        const quantity = Number(inv.quantity) || 0;
        const costPrice = Number(product.cost_price) || 0;
        const totalValueForProduct = quantity * costPrice;

        if (selectedWarehouse === 'all') {
          // Agrupar por producto, sumando cantidades de todas las bodegas
          const existing = itemsMap.get(productId);
          if (existing) {
            existing.quantity += quantity;
            existing.total_value += totalValueForProduct;
          } else {
            itemsMap.set(productId, {
              id: product.id,
              name: product.name,
              sku: product.sku,
              reference: product.barcode || product.sku || '',
              description: product.description || '',
              quantity: quantity,
              unit: product.unit || 'Unidad',
              cost_price: costPrice,
              total_value: totalValueForProduct,
              is_active: product.is_active,
            });
          }
        } else {
          // Mostrar cada producto por bodega
          itemsMap.set(`${productId}-${selectedWarehouse}`, {
            id: product.id,
            name: product.name,
            sku: product.sku,
            reference: product.barcode || product.sku || '',
            description: product.description || '',
            quantity: quantity,
            unit: product.unit || 'Unidad',
            cost_price: costPrice,
            total_value: totalValueForProduct,
            is_active: product.is_active,
            warehouse_name: warehouse?.name,
          });
        }
      });

      const processedItems = Array.from(itemsMap.values());
      calculatedTotalValue = processedItems.reduce((sum, item) => sum + item.total_value, 0);

      setItems(processedItems);
      setTotalValue(calculatedTotalValue);
      setCurrentPage(1);
    } catch (error: any) {
      console.error('Error al generar el reporte:', error);

      const errorMessage =
        error?.message ||
        error?.details ||
        'Error desconocido al generar el reporte';
      toast.error(`Error al generar el reporte: ${errorMessage}`);

      setItems([]);
      setTotalValue(0);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar items por búsqueda (cuando se hace clic en Filtrar)
  const [appliedSearchItem, setAppliedSearchItem] = useState('');
  const [appliedSearchReference, setAppliedSearchReference] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesItem =
        !appliedSearchItem.trim() ||
        item.name.toLowerCase().includes(appliedSearchItem.toLowerCase());
      const matchesReference =
        !appliedSearchReference.trim() ||
        (item.reference &&
          item.reference.toLowerCase().includes(appliedSearchReference.toLowerCase()));

      return matchesItem && matchesReference;
    });
  }, [items, appliedSearchItem, appliedSearchReference]);

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

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleFilter = () => {
    setAppliedSearchItem(searchItem);
    setAppliedSearchReference(searchReference);
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
          href="/dashboard/reports/administrative"
          className="hover:text-foreground transition-colors"
        >
          Administrativos
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">
          Valor de inventario
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            Valor de inventario
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Consulta el valor actual, cantidad y costo promedio de tu inventario.
          </p>
        </div>
        <Button variant="outline" size="sm" className="w-full md:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Descargar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-8 justify-start text-left font-normal',
                !dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                Hasta:{' '}
                {dateTo
                  ? format(dateTo, 'dd/MM/yyyy', { locale: es })
                  : 'Selecciona fecha'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              locale={es}
            />
          </PopoverContent>
        </Popover>

        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
          <SelectTrigger className="h-8 w-full md:w-[200px]">
            <Archive className="mr-2 h-4 w-4 flex-shrink-0" />
            <SelectValue placeholder="Bodega" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las bodegas</SelectItem>
            {warehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Total */}
      {!loading && items.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center py-1">
              <p className="text-xs mb-1 text-muted-foreground">Total</p>
              <p className="font-semibold text-slate-700 text-xl">
                {formatCurrency(totalValue)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Búsqueda y filtros */}
      {!loading && items.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ítem"
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                className="pl-10 h-10 w-full md:w-[200px]"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Referencia"
                value={searchReference}
                onChange={(e) => setSearchReference(e.target.value)}
                className="pl-10 h-10 w-full md:w-[200px]"
              />
            </div>
          </div>
          <Button variant="outline" onClick={handleFilter} className="w-full md:w-auto">
            Filtrar
          </Button>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Generando reporte...
              </span>
            </div>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">
                {items.length === 0
                  ? 'No se encontraron productos en el inventario'
                  : 'No hay productos que coincidan con los filtros seleccionados'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-sm">
            <CardContent className="pt-6 p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Ítem</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="max-w-[200px]">Descripción</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Costo promedio</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-accent">
                        <TableCell className="min-w-[200px]">
                          <Link
                            href={`/dashboard/products/${item.id}`}
                            className="text-primary hover:underline max-w-[200px] md:max-w-[300px] block break-words line-clamp-2"
                          >
                            {item.name}
                          </Link>
                        </TableCell>
                        <TableCell>{item.reference || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          <p className="truncate">{item.description || ''}</p>
                        </TableCell>
                        <TableCell>
                          <p>{item.quantity}</p>
                        </TableCell>
                        <TableCell>
                          <p>{item.unit}</p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.is_active ? 'default' : 'secondary'}
                            className={
                              item.is_active
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : ''
                            }
                          >
                            {item.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <p>{formatCurrency(item.cost_price)}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <p
                            className={cn(
                              item.total_value < 0 && 'text-red-600'
                            )}
                          >
                            {formatCurrency(item.total_value)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Descargar"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Ítems por página:
                </span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={handleItemsPerPageChange}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <div className="h-4 w-px bg-border" />
                <span className="text-sm text-muted-foreground">
                  {startItem}-{endItem} de {filteredItems.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Página</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value, 10);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="h-8 w-16 text-center"
                />
                <span className="text-sm text-muted-foreground">de {totalPages}</span>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasPreviousPage) setCurrentPage(1);
                      }}
                      className={
                        !hasPreviousPage ? 'pointer-events-none opacity-50' : ''
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasPreviousPage) setCurrentPage(currentPage - 1);
                      }}
                      className={
                        !hasPreviousPage ? 'pointer-events-none opacity-50' : ''
                      }
                    >
                      Anterior
                    </PaginationLink>
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
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasNextPage) setCurrentPage(currentPage + 1);
                      }}
                      className={
                        !hasNextPage ? 'pointer-events-none opacity-50' : ''
                      }
                    >
                      Siguiente
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasNextPage) setCurrentPage(totalPages);
                      }}
                      className={
                        !hasNextPage ? 'pointer-events-none opacity-50' : ''
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}

