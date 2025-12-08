'use client';

import { ReportTable } from './report-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { FileText, AlertCircle } from 'lucide-react';

interface TaxData {
  period: string;
  base: number;
  rate: number;
  tax_amount: number;
  description?: string;
}

interface ReportTaxViewProps {
  data: {
    summary?: {
      total_base: number;
      total_tax: number;
      period: string;
    };
    retencion_fuente?: TaxData[];
    retencion_iva?: TaxData[];
    retencion_ica?: TaxData[];
    iva_declaration?: any[];
    medios_magneticos?: any[];
  };
  reportType:
    | 'RETENCION_FUENTE'
    | 'RETENCION_IVA'
    | 'RETENCION_ICA'
    | 'IVA_DECLARACION'
    | 'MEDIOS_MAGNETICOS'
    | 'CERTIFICADO_RETENCION'
    | 'FORMATO_1001';
}

export function ReportTaxView({ data, reportType }: ReportTaxViewProps) {
  return (
    <div className="space-y-6">
      {/* Resumen */}
      {data.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.summary.period}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Base Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(data.summary.total_base)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Retención Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(data.summary.total_tax)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerta DIAN */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-orange-900 dark:text-orange-200">
              Información Fiscal DIAN
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              Este reporte es para fines informativos y debe ser validado por un
              contador antes de su presentación oficial ante la DIAN. Verifique
              que todos los datos estén actualizados y completos.
            </p>
          </div>
          <FileText className="h-5 w-5 text-orange-600" />
        </CardContent>
      </Card>

      {/* Retención en la Fuente */}
      {reportType === 'RETENCION_FUENTE' && data.retencion_fuente && (
        <ReportTable
          title="Retención en la Fuente"
          description="Detalle de retenciones practicadas en el período"
          columns={[
            { key: 'period', label: 'Fecha', align: 'left' },
            { key: 'description', label: 'Descripción', align: 'left' },
            {
              key: 'base',
              label: 'Base',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
            {
              key: 'rate',
              label: 'Tarifa',
              align: 'right',
              format: (value) => formatPercent(value),
            },
            {
              key: 'tax_amount',
              label: 'Retención',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
          ]}
          data={data.retencion_fuente}
          showFooter
          footerData={{
            period: '',
            description: 'TOTAL',
            base: data.retencion_fuente.reduce((sum, row) => sum + row.base, 0),
            rate: '',
            tax_amount: data.retencion_fuente.reduce(
              (sum, row) => sum + row.tax_amount,
              0
            ),
          }}
        />
      )}

      {/* Retención de IVA */}
      {reportType === 'RETENCION_IVA' && data.retencion_iva && (
        <ReportTable
          title="Retención de IVA"
          description="Detalle de retenciones de IVA practicadas"
          columns={[
            { key: 'period', label: 'Fecha', align: 'left' },
            { key: 'description', label: 'Descripción', align: 'left' },
            {
              key: 'base',
              label: 'Base IVA',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
            {
              key: 'rate',
              label: '% Retención',
              align: 'right',
              format: (value) => formatPercent(value),
            },
            {
              key: 'tax_amount',
              label: 'Retención IVA',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
          ]}
          data={data.retencion_iva}
          showFooter
          footerData={{
            period: '',
            description: 'TOTAL',
            base: data.retencion_iva.reduce((sum, row) => sum + row.base, 0),
            rate: '',
            tax_amount: data.retencion_iva.reduce(
              (sum, row) => sum + row.tax_amount,
              0
            ),
          }}
        />
      )}

      {/* Retención de ICA */}
      {reportType === 'RETENCION_ICA' && data.retencion_ica && (
        <ReportTable
          title="Retención de ICA"
          description="Detalle de retenciones de ICA practicadas"
          columns={[
            { key: 'period', label: 'Fecha', align: 'left' },
            { key: 'description', label: 'Descripción', align: 'left' },
            {
              key: 'base',
              label: 'Base ICA',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
            {
              key: 'rate',
              label: '% Retención',
              align: 'right',
              format: (value) => formatPercent(value),
            },
            {
              key: 'tax_amount',
              label: 'Retención ICA',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
          ]}
          data={data.retencion_ica}
          showFooter
          footerData={{
            period: '',
            description: 'TOTAL',
            base: data.retencion_ica.reduce((sum, row) => sum + row.base, 0),
            rate: '',
            tax_amount: data.retencion_ica.reduce(
              (sum, row) => sum + row.tax_amount,
              0
            ),
          }}
        />
      )}

      {/* Declaración de IVA */}
      {reportType === 'IVA_DECLARACION' && data.iva_declaration && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Declaración de IVA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-green-600">
                    IVA Generado (Ventas)
                  </h4>
                  <ReportTable
                    columns={[
                      { key: 'concept', label: 'Concepto', align: 'left' },
                      {
                        key: 'amount',
                        label: 'Valor',
                        align: 'right',
                        format: (value) => formatCurrency(value),
                      },
                    ]}
                    data={[
                      {
                        concept: 'Ventas gravadas',
                        amount: data.iva_declaration[0]?.sales_base || 0,
                      },
                      {
                        concept: 'IVA generado',
                        amount: data.iva_declaration[0]?.sales_tax || 0,
                      },
                    ]}
                  />
                </div>

                <div>
                  <h4 className="font-semibold mb-3 text-red-600">
                    IVA Descontable (Compras)
                  </h4>
                  <ReportTable
                    columns={[
                      { key: 'concept', label: 'Concepto', align: 'left' },
                      {
                        key: 'amount',
                        label: 'Valor',
                        align: 'right',
                        format: (value) => formatCurrency(value),
                      },
                    ]}
                    data={[
                      {
                        concept: 'Compras gravadas',
                        amount: data.iva_declaration[0]?.purchase_base || 0,
                      },
                      {
                        concept: 'IVA descontable',
                        amount: data.iva_declaration[0]?.purchase_tax || 0,
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <span className="font-bold text-lg">Saldo a Pagar/Favor</span>
                  <span className="font-bold text-2xl text-blue-600">
                    {formatCurrency(
                      (data.iva_declaration[0]?.sales_tax || 0) -
                        (data.iva_declaration[0]?.purchase_tax || 0)
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Medios Magnéticos */}
      {reportType === 'MEDIOS_MAGNETICOS' && data.medios_magneticos && (
        <ReportTable
          title="Medios Magnéticos - Formato 1001"
          description="Información de pagos o abonos en cuenta y retenciones practicadas"
          columns={[
            { key: 'nit', label: 'NIT', align: 'left' },
            { key: 'name', label: 'Razón Social', align: 'left' },
            {
              key: 'payment',
              label: 'Pago',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
            {
              key: 'iva',
              label: 'IVA',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
            {
              key: 'retention',
              label: 'Retención',
              align: 'right',
              format: (value) => formatCurrency(value),
            },
          ]}
          data={data.medios_magneticos}
        />
      )}
    </div>
  );
}
