'use client';

import { useState, useEffect } from 'react';
import { TaxesService } from '@/lib/services/taxes-service';
import {
  Tax,
  CreateTaxData,
  UpdateTaxData,
  TaxType,
  getTaxTypeInfo,
} from '@/lib/types/taxes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Receipt,
  MinusCircle,
  ShoppingCart,
  Building2,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface TaxFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tax?: Tax | null;
  onSaved: () => void;
}

export function TaxFormDialog({
  open,
  onOpenChange,
  tax,
  onSaved,
}: TaxFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateTaxData>({
    name: '',
    description: '',
    tax_type: 'VAT',
    percentage: 0,
    is_inclusive: false,
    is_active: true,
  });

  // Resetear formulario cuando se abre/cierra
  useEffect(() => {
    if (open) {
      if (tax) {
        setFormData({
          name: tax.name,
          description: tax.description || '',
          tax_type: tax.tax_type,
          percentage: tax.percentage,
          is_inclusive: tax.is_inclusive,
          is_active: tax.is_active,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          tax_type: 'VAT',
          percentage: 0,
          is_inclusive: false,
          is_active: true,
        });
      }
      setError(null);
    }
  }, [open, tax]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre del impuesto es requerido');
      return;
    }

    if (formData.percentage < 0 || formData.percentage > 100) {
      setError('El porcentaje debe estar entre 0 y 100');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (tax) {
        await TaxesService.updateTax(tax.id, formData);
      } else {
        await TaxesService.createTax(formData);
      }

      onSaved();
    } catch (error: unknown) {
      console.error('Error guardando impuesto:', error);
      setError((error as Error)?.message || 'Error guardando el impuesto');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateTaxData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const getTaxIcon = (type: TaxType) => {
    const typeInfo = getTaxTypeInfo(type);
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      Receipt,
      MinusCircle,
      ShoppingCart,
      Building2,
      FileText,
    };
    return iconMap[typeInfo.icon] || FileText;
  };

  const TaxIcon = getTaxIcon(formData.tax_type);
  const typeInfo = getTaxTypeInfo(formData.tax_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TaxIcon className="h-5 w-5" />
            {tax ? 'Editar Impuesto' : 'Nuevo Impuesto'}
          </DialogTitle>
          <DialogDescription>
            {tax
              ? 'Modifica los datos del impuesto'
              : 'Crea un nuevo impuesto para tu empresa'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Básica</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Impuesto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ej: IVA 19%, Retención 3.5%"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange('description', e.target.value)
                  }
                  placeholder="Descripción opcional del impuesto"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_type">Tipo de Impuesto *</Label>
                <Select
                  value={formData.tax_type}
                  onValueChange={(value) =>
                    handleInputChange('tax_type', value as TaxType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VAT">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        IVA (Impuesto al Valor Agregado)
                      </div>
                    </SelectItem>
                    <SelectItem value="WITHHOLDING">
                      <div className="flex items-center gap-2">
                        <MinusCircle className="h-4 w-4" />
                        Retención en la Fuente
                      </div>
                    </SelectItem>
                    <SelectItem value="CONSUMPTION">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Impuesto al Consumo
                      </div>
                    </SelectItem>
                    <SelectItem value="INDUSTRY">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        ICA (Impuesto de Industria y Comercio)
                      </div>
                    </SelectItem>
                    <SelectItem value="OTHER">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Otros Impuestos
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Configuración del impuesto */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configuración</h3>

              <div className="space-y-2">
                <Label htmlFor="percentage">Porcentaje *</Label>
                <div className="relative">
                  <Input
                    id="percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.percentage}
                    onChange={(e) =>
                      handleInputChange(
                        'percentage',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0.00"
                    required
                  />
                  <span className="absolute right-3 top-3 text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ingresa el porcentaje del impuesto (0.00 a 100.00)
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_inclusive">Impuesto Incluido</Label>
                    <p className="text-sm text-muted-foreground">
                      El impuesto está incluido en el precio base
                    </p>
                  </div>
                  <Switch
                    id="is_inclusive"
                    checked={formData.is_inclusive}
                    onCheckedChange={(checked) =>
                      handleInputChange('is_inclusive', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active">Activo</Label>
                    <p className="text-sm text-muted-foreground">
                      El impuesto está disponible para usar
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      handleInputChange('is_active', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vista previa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vista Previa</h3>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                  <TaxIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">
                    {formData.name || 'Nombre del impuesto'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {typeInfo.label}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Porcentaje:</span>
                  <span className="font-semibold">
                    {formData.percentage.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-semibold">{typeInfo.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Incluido:</span>
                  <span className="font-semibold">
                    {formData.is_inclusive ? 'Sí' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className="font-semibold">
                    {formData.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tax ? 'Actualizar Impuesto' : 'Crear Impuesto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
