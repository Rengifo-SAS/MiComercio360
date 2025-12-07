'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';

interface Customer {
  id: string;
  identification_type: string;
  identification_number: string;
  business_name: string;
  person_type: 'NATURAL' | 'JURIDICA';
  tax_responsibility: string;
  department: string;
  municipality: string;
  address: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  credit_limit: number;
  payment_terms: number;
  discount_percentage: number;
  is_active: boolean;
  is_vip: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomerExportDialogProps {
  customers: Customer[];
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  include_contact: boolean;
  include_location: boolean;
  include_commercial: boolean;
  include_tax: boolean;
  include_banking: boolean;
  include_system: boolean;
}

export function CustomerExportDialog({ customers }: CustomerExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    include_contact: true,
    include_location: true,
    include_commercial: true,
    include_tax: false,
    include_banking: false,
    include_system: false,
  });

  const handleExport = async () => {
    setLoading(true);

    try {
      // Simular exportación
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Aquí implementarías la lógica de exportación real
      console.log('Exportando clientes con opciones:', options);

      setOpen(false);
    } catch (error) {
      console.error('Error exportando clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const getExportData = () => {
    return customers.map((customer) => {
      const baseData = {
        Identificación: `${customer.identification_type} ${customer.identification_number}`,
        'Nombre/Razón Social': customer.business_name,
        'Tipo de Persona':
          customer.person_type === 'NATURAL'
            ? 'Persona Natural'
            : 'Persona Jurídica',
        'Responsabilidad Tributaria': customer.tax_responsibility,
        Estado: customer.is_active ? 'Activo' : 'Inactivo',
        VIP: customer.is_vip ? 'Sí' : 'No',
      };

      if (options.include_contact) {
        Object.assign(baseData, {
          Email: customer.email || '',
          Teléfono: customer.phone || '',
          Móvil: customer.mobile_phone || '',
        });
      }

      if (options.include_location) {
        Object.assign(baseData, {
          Departamento: customer.department,
          Municipio: customer.municipality,
          Dirección: customer.address,
        });
      }

      if (options.include_commercial) {
        Object.assign(baseData, {
          'Límite de Crédito': formatCurrency(customer.credit_limit),
          'Términos de Pago':
            customer.payment_terms > 0
              ? `${customer.payment_terms} días`
              : 'No definido',
          'Descuento (%)': customer.discount_percentage,
        });
      }

      if (options.include_system) {
        Object.assign(baseData, {
          'Fecha de Creación': formatDate(customer.created_at),
          'Última Actualización': formatDate(customer.updated_at),
        });
      }

      return baseData;
    });
  };

  const exportToPDF = () => {
    // Implementar exportación a PDF
    console.log('Exportando a PDF:', getExportData());
  };

  const exportToExcel = () => {
    // Implementar exportación a Excel
    console.log('Exportando a Excel:', getExportData());
  };

  const exportToCSV = () => {
    // Implementar exportación a CSV
    console.log('Exportando a CSV:', getExportData());
  };

  const handleFormatChange = (format: 'pdf' | 'excel' | 'csv') => {
    setOptions((prev) => ({ ...prev, format }));
  };

  const handleOptionChange = (
    key: keyof Omit<ExportOptions, 'format'>,
    value: boolean
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md sm:w-[90vw] md:w-[80vw]">
        <DialogHeader>
          <DialogTitle>Exportar Clientes</DialogTitle>
          <DialogDescription>
            Selecciona el formato y las opciones de exportación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formato de Exportación */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Formato de Exportación
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={options.format === 'pdf' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFormatChange('pdf')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button
                variant={options.format === 'excel' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFormatChange('excel')}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button
                variant={options.format === 'csv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFormatChange('csv')}
                className="flex items-center gap-2"
              >
                <File className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>

          {/* Opciones de Contenido */}
          <div className="space-y-4">
            <Label className="text-base font-medium">
              Incluir en la Exportación
            </Label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="include_contact" className="text-sm">
                  Información de Contacto
                </Label>
                <Switch
                  id="include_contact"
                  checked={options.include_contact}
                  onCheckedChange={(checked) =>
                    handleOptionChange('include_contact', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_location" className="text-sm">
                  Información de Ubicación
                </Label>
                <Switch
                  id="include_location"
                  checked={options.include_location}
                  onCheckedChange={(checked) =>
                    handleOptionChange('include_location', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_commercial" className="text-sm">
                  Información Comercial
                </Label>
                <Switch
                  id="include_commercial"
                  checked={options.include_commercial}
                  onCheckedChange={(checked) =>
                    handleOptionChange('include_commercial', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_tax" className="text-sm">
                  Información Tributaria
                </Label>
                <Switch
                  id="include_tax"
                  checked={options.include_tax}
                  onCheckedChange={(checked) =>
                    handleOptionChange('include_tax', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_banking" className="text-sm">
                  Información Bancaria
                </Label>
                <Switch
                  id="include_banking"
                  checked={options.include_banking}
                  onCheckedChange={(checked) =>
                    handleOptionChange('include_banking', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_system" className="text-sm">
                  Información del Sistema
                </Label>
                <Switch
                  id="include_system"
                  checked={options.include_system}
                  onCheckedChange={(checked) =>
                    handleOptionChange('include_system', checked)
                  }
                />
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>{customers.length}</strong> clientes serán exportados en
              formato <strong>{options.format.toUpperCase()}</strong>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            )}
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
