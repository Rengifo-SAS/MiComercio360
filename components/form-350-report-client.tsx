'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, startOfYear, startOfDay, endOfDay } from 'date-fns';
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

interface Form350ReportClientProps {
  companyId: string;
  userId: string;
}

interface RetentionRecord {
  id: string;
  retention_date: string;
  supplier_customer_name: string;
  identification_number: string;
  retention_type: string;
  base_amount: number;
  retention_rate: number;
  retention_amount: number;
  concept: string;
}

export function Form350ReportClient({ companyId, userId }: Form350ReportClientProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfYear(new Date()),
    to: new Date(),
  });
  const [retentions, setRetentions] = useState<RetentionRecord[]>([]);
  const [totalRetention, setTotalRetention] = useState(0);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) generateReport();
  }, [dateRange]);

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    setLoading(true);
    try {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();
      const allRetentions: RetentionRecord[] = [];

      const { data: purchasesData } = await supabase
        .from('purchases')
        .select(`
          id,
          purchase_number,
          subtotal,
          tax_amount,
          created_at,
          supplier_id,
          suppliers:suppliers!purchases_supplier_id_fkey (
            name,
            identification_number
          )
        `)
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .limit(10000);

      if (purchasesData) {
        purchasesData.forEach((purchase: any) => {
          const supplier = Array.isArray(purchase.suppliers) ? purchase.suppliers[0] : purchase.suppliers;
          const subtotal = Number(purchase.subtotal) || 0;
          
          if (subtotal > 0) {
            allRetentions.push({
              id: purchase.id,
              retention_date: purchase.created_at,
              supplier_customer_name: supplier?.name || 'Sin proveedor',
              identification_number: supplier?.identification_number || '',
              retention_type: 'RETENCION_FUENTE',
              base_amount: subtotal,
              retention_rate: 3.5,
              retention_amount: subtotal * 0.035,
              concept: 'Compra de bienes',
            });
          }
        });
      }

      allRetentions.sort((a, b) => new Date(b.retention_date).getTime() - new Date(a.retention_date).getTime());
      setRetentions(allRetentions);
      setTotalRetention(allRetentions.reduce((sum, r) => sum + r.retention_amount, 0));
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Error: ${error?.message || 'Error desconocido'}`);
      setRetentions([]);
      setTotalRetention(0);
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
        <span className="text-foreground font-medium">Formulario 350</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">Formulario 350</h1>
        <p className="text-sm md:text-base text-muted-foreground">Declaración retenciones en la fuente.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('h-10 justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (dateRange.to ? (
                <>
                  {format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: es })}
                </>
              ) : (
                format(dateRange.from, 'dd/MM/yyyy', { locale: es })
              )) : (
                'Selecciona un rango'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })} numberOfMonths={2} locale={es} />
          </PopoverContent>
        </Popover>

        <Button onClick={handleExportExcel} className="ml-auto">
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {!loading && retentions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-normal text-muted-foreground mb-1">Total retenciones</p>
              <p className="text-lg font-semibold">{formatCurrency(totalRetention)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="pt-6"><div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">Generando reporte...</span></div></CardContent></Card>
      ) : retentions.length === 0 ? (
        <Card><CardContent className="pt-6"><div className="flex flex-col items-center justify-center py-12 text-center"><p className="text-muted-foreground">No se encontraron retenciones en el período seleccionado</p></div></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="pt-6 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor/Cliente</TableHead>
                    <TableHead>NIT/CC</TableHead>
                    <TableHead>Tipo retención</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Valor retenido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retentions.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell>{format(new Date(ret.retention_date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                      <TableCell className="truncate max-w-[200px]">{ret.supplier_customer_name}</TableCell>
                      <TableCell>{ret.identification_number || 'N/A'}</TableCell>
                      <TableCell>{ret.retention_type}</TableCell>
                      <TableCell>{ret.concept}</TableCell>
                      <TableCell className="text-right">{formatCurrency(ret.base_amount)}</TableCell>
                      <TableCell className="text-right">{ret.retention_rate}%</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(ret.retention_amount)}</TableCell>
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

