'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar as CalendarIcon,
  Download,
  Loader2,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Percent,
  Filter,
  Minus,
  Plus,
  Equal,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface GeneralSalesReportClientProps {
  companyId: string;
  userId: string;
}

interface SalesData {
  total_sales: number;
  total_cost: number;
  gross_profit: number;
  profit_margin: number;
  total_transactions: number;
  avg_ticket: number;
  // Desglose de totales
  subtotal: number;
  discount: number;
  gross_sales: number;
  credit_notes: number;
  before_tax: number;
  tax_amount: number;
  after_tax: number;
  sales_by_period: Array<{
    period: string;
    total_sales: number;
    total_cost: number;
    profit: number;
    transactions: number;
  }>;
  recent_sales: Array<{
    id: string;
    sale_number: string;
    created_at: string;
    customer_name: string;
    customer_identification: string;
    status: string;
    payment_status: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
  }>;
}

export function GeneralSalesReportClient({
  companyId,
  userId,
}: GeneralSalesReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fechas por defecto: año actual completo
  const today = new Date();
  const [dateFrom, setDateFrom] = useState<Date>(startOfYear(today));
  const [dateTo, setDateTo] = useState<Date>(today);

  // Filtros adicionales
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedNumeration, setSelectedNumeration] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');

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
    setSalesData(null); // Limpiar datos anteriores

    try {
      const startDate = startOfDay(dateFrom).toISOString();
      const endDate = endOfDay(dateTo).toISOString();

      // Consultar ventas del período con JOIN de clientes para optimizar
      const { data: salesQuery, error } = await supabase
        .from('sales')
        .select(
          `
          id,
          sale_number,
          created_at,
          total_amount,
          subtotal,
          tax_amount,
          discount_amount,
          payment_method,
          status,
          payment_status,
          customer_id,
          customers (
            id,
            business_name,
            identification_number
          ),
          sale_items (
            id,
            quantity,
            unit_price,
            total_price,
            discount_amount,
            products (
              id,
              cost_price
            )
          )
        `,
          { count: 'exact' }
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

      if (!salesQuery || salesQuery.length === 0) {
        toast.info('No se encontraron ventas en el período seleccionado');
        setSalesData({
          total_sales: 0,
          total_cost: 0,
          gross_profit: 0,
          profit_margin: 0,
          total_transactions: 0,
          avg_ticket: 0,
          subtotal: 0,
          discount: 0,
          gross_sales: 0,
          credit_notes: 0,
          before_tax: 0,
          tax_amount: 0,
          after_tax: 0,
          sales_by_period: [],
          recent_sales: [],
        });
        setLoading(false);
        return;
      }

      // Calcular totales
      let totalSales = 0;
      let totalCost = 0;
      let totalSubtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      const salesByDateMap = new Map<
        string,
        {
          total_sales: number;
          total_cost: number;
          profit: number;
          transactions: number;
        }
      >();

      salesQuery.forEach((sale: any) => {
        if (!sale) return;
        
        const saleAmount = Number(sale.total_amount) || 0;
        const saleSubtotal = Number(sale.subtotal) || 0;
        const saleTax = Number(sale.tax_amount) || 0;
        const saleDiscount = Number(sale.discount_amount) || 0;

        totalSales += saleAmount;
        totalSubtotal += saleSubtotal;
        totalTax += saleTax;
        totalDiscount += saleDiscount;

        // Calcular costo de esta venta
        let saleCost = 0;
        if (sale.sale_items && Array.isArray(sale.sale_items)) {
          sale.sale_items.forEach((item: any) => {
            if (!item || !item.products) return;
            
            const product = Array.isArray(item.products)
              ? item.products[0]
              : item.products;
            const costPrice = Number(product?.cost_price) || 0;
            const quantity = Number(item.quantity) || 0;
            saleCost += costPrice * quantity;
          });
        }
        totalCost += saleCost;

        // Agrupar por fecha
        const saleDate = format(new Date(sale.created_at), 'yyyy-MM-dd');
        if (!salesByDateMap.has(saleDate)) {
          salesByDateMap.set(saleDate, {
            total_sales: 0,
            total_cost: 0,
            profit: 0,
            transactions: 0,
          });
        }
        const dateData = salesByDateMap.get(saleDate)!;
        dateData.total_sales += saleAmount;
        dateData.total_cost += saleCost;
        dateData.profit += saleAmount - saleCost;
        dateData.transactions += 1;
      });

      const grossProfit = totalSales - totalCost;
      const profitMargin =
        totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
      const totalTransactions = salesQuery.length;
      const avgTicket =
        totalTransactions > 0 ? totalSales / totalTransactions : 0;

      // Calcular desglose de totales
      const grossSales = totalSubtotal - totalDiscount; // Ventas brutas
      const beforeTax = grossSales; // Antes de impuestos (sin notas crédito por ahora)
      const afterTax = beforeTax + totalTax; // Después de impuestos

      // Convertir a arrays
      const salesByPeriod = Array.from(salesByDateMap.entries())
        .map(([period, data]) => ({
          period,
          ...data,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      // Obtener las 20 ventas más recientes para la tabla
      const recentSalesData = salesQuery.slice(0, 20);

      // Mapear ventas recientes con datos de clientes (ya incluidos en el JOIN)
      const recentSales = recentSalesData
        .filter((sale: any) => sale) // Filtrar ventas nulas
        .map((sale: any) => {
          // Los datos del cliente vienen en el objeto customers del JOIN
          // Puede ser null, un objeto único, o un array
          let customer = null;
          if (sale.customers) {
            customer = Array.isArray(sale.customers)
              ? sale.customers[0]
              : sale.customers;
          }

          return {
            id: sale.id || '',
            sale_number: sale.sale_number || 'N/A',
            created_at: sale.created_at || new Date().toISOString(),
            customer_name: customer?.business_name || 'Consumidor Final',
            customer_identification: customer?.identification_number || 'N/A',
            status: sale.status || 'PENDING',
            payment_status: sale.payment_status || 'pending',
            subtotal: Number(sale.subtotal) || 0,
            tax_amount: Number(sale.tax_amount) || 0,
            total_amount: Number(sale.total_amount) || 0,
          };
        });

      setSalesData({
        total_sales: totalSales,
        total_cost: totalCost,
        gross_profit: grossProfit,
        profit_margin: profitMargin,
        total_transactions: totalTransactions,
        avg_ticket: avgTicket,
        subtotal: totalSubtotal,
        discount: totalDiscount,
        gross_sales: grossSales,
        credit_notes: 0, // Por ahora en 0, se puede agregar después
        before_tax: beforeTax,
        tax_amount: totalTax,
        after_tax: afterTax,
        sales_by_period: salesByPeriod,
        recent_sales: recentSales,
      });

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
      setSalesData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
        <span className="text-foreground font-medium">Ventas generales</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
          Ventas generales
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Revisa el desempeño de tus ventas para crear estrategias comerciales.
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
      {loading && !salesData && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Generando reporte...</p>
        </div>
      )}

      {salesData && (
        <div className="space-y-6">
          {/* Indicador de período del reporte */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg border gap-3">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Período del reporte</p>
                <p className="text-xs text-muted-foreground">
                  {format(dateFrom, 'dd MMMM yyyy', { locale: es })} -{' '}
                  {format(dateTo, 'dd MMMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-sm font-medium">
                  {salesData.total_transactions}
                </p>
                <p className="text-xs text-muted-foreground">Transacciones</p>
              </div>
              <div className="border-l pl-4">
                <p className="text-sm font-medium">
                  {salesData.sales_by_period.length}
                </p>
                <p className="text-xs text-muted-foreground">Días con ventas</p>
              </div>
            </div>
          </div>

          {/* Tarjetas resumen */}
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Card className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Total Ventas
                </CardTitle>
                <div className="rounded-full bg-blue-100 p-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  {formatCurrency(salesData.total_sales)}
                </div>
                <p className="text-xs text-muted-foreground">Ventas brutas</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Utilidad Bruta
                </CardTitle>
                <div className="rounded-full bg-green-100 p-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  {formatCurrency(salesData.gross_profit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Después de costos
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Transacciones
                </CardTitle>
                <div className="rounded-full bg-orange-100 p-2">
                  <ShoppingCart className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  {salesData.total_transactions.toLocaleString('es-CO')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ticket promedio: {formatCurrency(salesData.avg_ticket)}
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  Margen de Utilidad
                </CardTitle>
                <div className="rounded-full bg-purple-100 p-2">
                  <Percent className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  {salesData.profit_margin.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Sobre ventas totales
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Desglose de totales */}
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-center">
                {/* Subtotal */}
                <div className="my-1 w-full md:w-1/2 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                  <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                    Subtotal
                  </p>
                  <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                    {formatCurrency(salesData.subtotal)}
                  </p>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Minus className="h-4 w-4 text-[#47536b]" />
                  </div>
                </div>

                {/* Descuento */}
                <div className="my-1 w-full md:w-1/2 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                  <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                    Descuento
                  </p>
                  <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#E85E42]">
                    {formatCurrency(salesData.discount)}
                  </p>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <span className="text-[#47536b] font-medium"> = </span>
                  </div>
                </div>

                {/* Ventas brutas */}
                <div className="my-1 w-full md:w-1/2 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                  <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                    Ventas brutas
                  </p>
                  <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                    {formatCurrency(salesData.gross_sales)}
                  </p>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Minus className="h-4 w-4 text-[#47536b]" />
                  </div>
                </div>

                {/* Notas crédito */}
                <div className="my-1 w-full md:w-1/2 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                  <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                    Notas crédito
                  </p>
                  <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#E85E42]">
                    {formatCurrency(salesData.credit_notes)}
                  </p>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <span className="text-[#47536b] font-medium"> = </span>
                  </div>
                </div>

                {/* Antes de impuestos */}
                <div className="my-1 w-full md:w-1/2 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                  <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                    Antes de impuestos
                  </p>
                  <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                    {formatCurrency(salesData.before_tax)}
                  </p>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-[#47536b]" />
                  </div>
                </div>

                {/* Impuestos */}
                <div className="my-1 w-full md:w-1/2 relative md:border-r md:border-solid md:border-[#EDEDED] last:border-none px-4">
                  <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                    Impuestos
                  </p>
                  <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                    {formatCurrency(salesData.tax_amount)}
                  </p>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <span className="text-[#47536b] font-medium"> = </span>
                  </div>
                </div>

                {/* Después de impuestos */}
                <div className="my-1 w-full md:w-1/2 relative px-4">
                  <p className="my-1 text-center font-normal text-xs text-muted-foreground">
                    Después de impuestos
                  </p>
                  <p className="my-1 text-center whitespace-nowrap text-sm font-medium text-[#474747]">
                    {formatCurrency(salesData.after_tax)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfica de tendencia diaria */}
          {salesData.sales_by_period &&
            salesData.sales_by_period.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl font-bold">
                    Tendencia de Ventas Diarias
                  </CardTitle>
                  <CardDescription>
                    Ventas y utilidad por día en el período seleccionado
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart
                      data={salesData.sales_by_period}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis
                        dataKey="period"
                        tickFormatter={(value) =>
                          format(new Date(value), 'dd/MM', { locale: es })
                        }
                        className="text-xs"
                        interval="preserveStartEnd"
                        minTickGap={30}
                      />
                      <YAxis
                        tickFormatter={(value) => formatCurrency(value)}
                        className="text-xs"
                      />
                      <Tooltip
                        formatter={(value: any) => formatCurrency(value)}
                        labelFormatter={(label) =>
                          format(new Date(label), 'PPP', { locale: es })
                        }
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          paddingTop: '20px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_sales"
                        stroke="#10b981"
                        name="Ventas"
                        strokeWidth={2}
                        dot={salesData.sales_by_period.length <= 31}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="#3b82f6"
                        name="Utilidad"
                        strokeWidth={2}
                        dot={salesData.sales_by_period.length <= 31}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

          {/* Listado de ventas recientes */}
          {salesData.recent_sales && salesData.recent_sales.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl font-bold">
                  Ventas Recientes
                </CardTitle>
                <CardDescription>
                  Últimas {salesData.recent_sales.length} transacciones del
                  período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Identificación
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Estado
                        </TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right hidden lg:table-cell">
                          Impuestos
                        </TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.recent_sales.map((sale) => (
                        <TableRow key={sale.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <span className="text-primary">
                              {sale.sale_number}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {sale.customer_name}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {sale.customer_identification}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge
                              variant={
                                sale.payment_status === 'completed'
                                  ? 'default'
                                  : sale.payment_status === 'pending'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="text-xs"
                            >
                              {sale.payment_status === 'completed'
                                ? 'Cobrada'
                                : sale.payment_status === 'pending'
                                ? 'Por cobrar'
                                : sale.payment_status === 'refunded'
                                ? 'Reembolsada'
                                : sale.payment_status === 'partially_refunded'
                                ? 'Parcialmente reembolsada'
                                : 'Pendiente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-primary font-medium">
                            {formatCurrency(sale.subtotal)}
                          </TableCell>
                          <TableCell className="text-right text-primary font-medium hidden lg:table-cell">
                            {formatCurrency(sale.tax_amount)}
                          </TableCell>
                          <TableCell className="text-right text-primary font-semibold">
                            {formatCurrency(sale.total_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
