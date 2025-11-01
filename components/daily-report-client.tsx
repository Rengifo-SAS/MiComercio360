'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface DailyReportClientProps {
  companyId: string;
  userId: string;
}

interface DailyInvoice {
  invoice_number: string;
  invoice_date: string;
  invoice_type: string;
  customer_name: string;
  customer_identification: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
}

export function DailyReportClient({ companyId, userId }: DailyReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [invoices, setInvoices] = useState<DailyInvoice[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalTax, setTotalTax] = useState(0);

  useEffect(() => {
    if (selectedDate) generateReport();
  }, [selectedDate]);

  const generateReport = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      const start = startOfDay(selectedDate).toISOString();
      const end = endOfDay(selectedDate).toISOString();

      const { data: salesData, error } = await supabase
        .from('sales')
        .select(`
          sale_number,
          created_at,
          subtotal,
          tax_amount,
          total_amount,
          payment_method,
          customer_id,
          customers:customers!sales_customer_id_fkey (
            business_name,
            identification_number
          ),
          numeration:numerations!sales_numeration_id_fkey (
            name,
            document_type
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true })
        .limit(10000);

      if (error) throw error;

      const processedInvoices: DailyInvoice[] = (salesData || []).map((sale: any) => {
        const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
        const numeration = Array.isArray(sale.numeration) ? sale.numeration[0] : sale.numeration;

        return {
          invoice_number: sale.sale_number,
          invoice_date: sale.created_at,
          invoice_type: numeration?.document_type || 'Factura',
          customer_name: customer?.business_name || 'Consumidor Final',
          customer_identification: customer?.identification_number || '',
          subtotal: Number(sale.subtotal) || 0,
          tax_amount: Number(sale.tax_amount) || 0,
          total_amount: Number(sale.total_amount) || 0,
          payment_method: sale.payment_method || 'cash',
        };
      });

      setInvoices(processedInvoices);
      setTotalInvoices(processedInvoices.length);
      setTotalAmount(processedInvoices.reduce((sum, inv) => sum + inv.total_amount, 0));
      setTotalTax(processedInvoices.reduce((sum, inv) => sum + inv.tax_amount, 0));
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Error: ${error?.message || 'Error desconocido'}`);
      setInvoices([]);
      setTotalInvoices(0);
      setTotalAmount(0);
      setTotalTax(0);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  const handleExportExcel = () => {
    toast.info('Funcionalidad de exportación a Excel próximamente');
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/reports" className="hover:text-foreground transition-colors">Reportes</Link>
        <span>/</span>
        <Link href="/dashboard/reports/tax" className="hover:text-foreground transition-colors">Fiscales</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Comprobante de informe diario</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">Comprobante de informe diario</h1>
        <p className="text-sm md:text-base text-muted-foreground">Exporta el resumen de tus facturas registradas en tu punto de venta.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('h-10 justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: es }) : 'Selecciona una fecha'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} locale={es} />
          </PopoverContent>
        </Popover>

        <Button onClick={handleExportExcel} className="ml-auto">
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {!loading && invoices.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm font-normal text-muted-foreground mb-1">Total facturas</p><p className="text-lg font-semibold">{totalInvoices}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm font-normal text-muted-foreground mb-1">Total impuestos</p><p className="text-lg font-semibold">{formatCurrency(totalTax)}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm font-normal text-muted-foreground mb-1">Total del día</p><p className="text-lg font-semibold">{formatCurrency(totalAmount)}</p></div></CardContent></Card>
        </div>
      )}

      {loading ? (
        <Card><CardContent className="pt-6"><div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">Generando reporte...</span></div></CardContent></Card>
      ) : invoices.length === 0 ? (
        <Card><CardContent className="pt-6"><div className="flex flex-col items-center justify-center py-12 text-center"><p className="text-muted-foreground">No se encontraron facturas para la fecha seleccionada</p></div></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="pt-6 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Identificación</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Impuestos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{format(new Date(inv.invoice_date), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                      <TableCell>{inv.invoice_type}</TableCell>
                      <TableCell className="truncate max-w-[200px]">{inv.customer_name}</TableCell>
                      <TableCell>{inv.customer_identification || 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inv.subtotal)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inv.tax_amount)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(inv.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

