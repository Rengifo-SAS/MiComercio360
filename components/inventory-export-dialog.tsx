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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileText, Settings } from 'lucide-react';
import {
  ExportService,
  ExportOptions,
  InventoryItem,
} from '@/lib/export-service';

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

// ExportOptions ya está importado desde el servicio

interface InventoryExportDialogProps {
  warehouses: Warehouse[];
  inventoryData: InventoryItem[];
  onExport?: (options: ExportOptions) => void;
  trigger?: React.ReactNode;
}

export function InventoryExportDialog({
  warehouses,
  inventoryData,
  onExport,
  trigger,
}: InventoryExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    warehouse_id: '',
    include_images: false,
    include_categories: true,
    include_suppliers: true,
    include_prices: true,
    include_stock_levels: true,
    title: 'Reporte de Inventario',
    notes: '',
  });

  const handleExport = async () => {
    setIsLoading(true);
    try {
      // Filtrar datos según la bodega seleccionada
      let filteredData = inventoryData;
      if (options.warehouse_id && options.warehouse_id !== 'all') {
        filteredData = inventoryData.filter(
          (item) => item.warehouse?.id === options.warehouse_id
        );
      }

      // Exportar usando el servicio
      await ExportService.exportInventory(filteredData, options);

      // Notificar al componente padre si es necesario
      onExport?.(options);

      setOpen(false);
    } catch (error) {
      console.error('Error exporting:', error);
      setError(error instanceof Error ? error.message : 'Error al exportar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionChange = (field: keyof ExportOptions, value: any) => {
    setOptions((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exportar Inventario
          </DialogTitle>
          <DialogDescription>
            Genera un reporte del inventario en el formato seleccionado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Formato */}
          <div className="space-y-2">
            <Label htmlFor="format">Formato de Exportación</Label>
            <Select
              value={options.format}
              onValueChange={(value: 'pdf' | 'excel' | 'csv') =>
                handleOptionChange('format', value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bodega */}
          <div className="space-y-2">
            <Label htmlFor="warehouse">Bodega</Label>
            <Select
              value={options.warehouse_id || 'all'}
              onValueChange={(value) =>
                handleOptionChange('warehouse_id', value === 'all' ? '' : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las bodegas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las bodegas</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título del reporte */}
          <div className="space-y-2">
            <Label htmlFor="title">Título del Reporte</Label>
            <Input
              id="title"
              value={options.title}
              onChange={(e) => handleOptionChange('title', e.target.value)}
              placeholder="Título del reporte"
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={options.notes}
              onChange={(e) => handleOptionChange('notes', e.target.value)}
              placeholder="Notas adicionales para el reporte"
              rows={3}
            />
          </div>

          {/* Opciones de contenido */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Opciones de Contenido</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="include_categories" className="text-sm">
                  Incluir Categorías
                </Label>
                <input
                  type="checkbox"
                  id="include_categories"
                  checked={options.include_categories}
                  onChange={(e) =>
                    handleOptionChange('include_categories', e.target.checked)
                  }
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_suppliers" className="text-sm">
                  Incluir Proveedores
                </Label>
                <input
                  type="checkbox"
                  id="include_suppliers"
                  checked={options.include_suppliers}
                  onChange={(e) =>
                    handleOptionChange('include_suppliers', e.target.checked)
                  }
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_prices" className="text-sm">
                  Incluir Precios
                </Label>
                <input
                  type="checkbox"
                  id="include_prices"
                  checked={options.include_prices}
                  onChange={(e) =>
                    handleOptionChange('include_prices', e.target.checked)
                  }
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include_stock_levels" className="text-sm">
                  Incluir Niveles de Stock
                </Label>
                <input
                  type="checkbox"
                  id="include_stock_levels"
                  checked={options.include_stock_levels}
                  onChange={(e) =>
                    handleOptionChange('include_stock_levels', e.target.checked)
                  }
                  className="rounded"
                />
              </div>

              {options.format === 'pdf' && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="include_images" className="text-sm">
                    Incluir Imágenes
                  </Label>
                  <input
                    type="checkbox"
                    id="include_images"
                    checked={options.include_images}
                    onChange={(e) =>
                      handleOptionChange('include_images', e.target.checked)
                    }
                    className="rounded"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isLoading}>
            {isLoading ? 'Exportando...' : 'Exportar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
