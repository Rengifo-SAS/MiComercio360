'use client';

import React, { useState, useEffect } from 'react';
import { NumerationsService } from '@/lib/services/numerations-service';
import {
  Numeration,
  CreateNumerationData,
  UpdateNumerationData,
  DocumentType,
  DOCUMENT_TYPES,
  getDocumentTypeInfo,
  validateNumerationData,
} from '@/lib/types/numerations';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Receipt,
  CreditCard,
  PlusCircle,
  MinusCircle,
  ShoppingCart,
  Calculator,
  Truck,
  DollarSign,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle,
  Repeat,
  RotateCcw,
  FileCheck,
} from 'lucide-react';

interface NumerationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeration?: Numeration | null;
  onSave: () => void;
}

export function NumerationFormDialog({
  open,
  onOpenChange,
  numeration,
  onSave,
}: NumerationFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateNumerationData>({
    document_type: 'invoice',
    name: '',
    prefix: '',
    current_number: 0,
    number_length: 6,
    suffix: '',
    is_active: true,
    description: '',
  });

  // Resetear formulario cuando se abre/cierra
  useEffect(() => {
    if (open) {
      if (numeration) {
        // Modo edición
        setFormData({
          document_type: numeration.document_type,
          name: numeration.name,
          prefix: numeration.prefix,
          current_number: numeration.current_number,
          number_length: numeration.number_length,
          suffix: numeration.suffix,
          is_active: numeration.is_active,
          description: numeration.description || '',
        });
      } else {
        // Modo creación
        setFormData({
          document_type: 'invoice',
          name: '',
          prefix: '',
          current_number: 0,
          number_length: 6,
          suffix: '',
          is_active: true,
          description: '',
        });
      }
      setError(null);
      setSuccess(null);
    }
  }, [open, numeration]);

  // Actualizar prefijo cuando cambie el tipo de documento
  useEffect(() => {
    if (!numeration && formData.document_type) {
      const typeInfo = getDocumentTypeInfo(formData.document_type);
      if (typeInfo) {
        setFormData((prev) => ({
          ...prev,
          prefix: typeInfo.defaultPrefix,
        }));
      }
    }
  }, [formData.document_type, numeration]);

  const handleInputChange = (
    field: keyof CreateNumerationData,
    value: unknown
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Limpiar errores cuando el usuario modifica el formulario
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validar datos
      const validationErrors = validateNumerationData(formData);
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      if (numeration) {
        // Actualizar numeración existente
        const updateData: UpdateNumerationData = {
          name: formData.name,
          prefix: formData.prefix,
          current_number: formData.current_number,
          number_length: formData.number_length,
          suffix: formData.suffix,
          is_active: formData.is_active,
          description: formData.description,
        };

        await NumerationsService.updateNumeration(numeration.id, updateData);
        setSuccess('Numeración actualizada correctamente');
      } else {
        // Crear nueva numeración
        await NumerationsService.createNumeration(formData);
        setSuccess('Numeración creada correctamente');
      }

      // Cerrar diálogo después de un breve delay para mostrar el mensaje de éxito
      setTimeout(() => {
        onOpenChange(false);
        onSave();
      }, 1000);
    } catch (error: unknown) {
      console.error('Error guardando numeración:', error);
      setError((error as Error)?.message || 'Error guardando la numeración');
    } finally {
      setLoading(false);
    }
  };

  // Obtener icono para el tipo de documento seleccionado
  const getDocumentIcon = (type: DocumentType) => {
    const typeInfo = getDocumentTypeInfo(type);
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      FileText,
      Receipt,
      CreditCard,
      PlusCircle,
      MinusCircle,
      ShoppingCart,
      Calculator,
      Truck,
      DollarSign,
      Settings,
      Repeat,
      RotateCcw,
      FileCheck,
    };
    return iconMap[typeInfo?.icon || 'FileText'] || FileText;
  };

  // Generar vista previa del número
  const generatePreview = () => {
    const currentNumber = formData.current_number || 1;
    const numberLength = formData.number_length || 4;
    const formattedNumber = currentNumber
      .toString()
      .padStart(numberLength, '0');
    return `${formData.prefix}${formattedNumber}${formData.suffix}`;
  };

  const DocumentIcon = getDocumentIcon(formData.document_type);
  // const typeInfo = getDocumentTypeInfo(formData.document_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DocumentIcon className="h-5 w-5" />
            {numeration ? 'Editar Numeración' : 'Nueva Numeración'}
          </DialogTitle>
          <DialogDescription>
            {numeration
              ? 'Modifica los datos de la numeración seleccionada'
              : 'Configura una nueva numeración para tus documentos'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de documento */}
          <div className="space-y-2">
            <Label htmlFor="document_type">Tipo de Documento *</Label>
            <Select
              value={formData.document_type}
              onValueChange={(value) =>
                handleInputChange('document_type', value as DocumentType)
              }
              disabled={!!numeration} // No permitir cambiar el tipo en edición
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      {React.createElement(getDocumentIcon(type.value), {
                        className: 'h-4 w-4',
                      })}
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {type.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ej: Facturas de Venta Principal"
              required
            />
          </div>

          {/* Prefijo y Sufijo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefijo *</Label>
              <Input
                id="prefix"
                value={formData.prefix}
                onChange={(e) =>
                  handleInputChange('prefix', e.target.value.toUpperCase())
                }
                placeholder="Ej: FAC"
                maxLength={10}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suffix">Sufijo</Label>
              <Input
                id="suffix"
                value={formData.suffix}
                onChange={(e) => handleInputChange('suffix', e.target.value)}
                placeholder="Ej: -2024"
                maxLength={20}
              />
            </div>
          </div>

          {/* Número actual y longitud */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_number">Número Actual</Label>
              <Input
                id="current_number"
                type="number"
                min="0"
                value={formData.current_number}
                onChange={(e) =>
                  handleInputChange(
                    'current_number',
                    parseInt(e.target.value) || 0
                  )
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number_length">Longitud del Número</Label>
              <Input
                id="number_length"
                type="number"
                min="1"
                max="10"
                value={formData.number_length}
                onChange={(e) =>
                  handleInputChange(
                    'number_length',
                    parseInt(e.target.value) || 6
                  )
                }
                placeholder="6"
              />
            </div>
          </div>

          {/* Vista previa */}
          <div className="space-y-2">
            <Label>Vista Previa del Número</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-mono text-lg font-semibold text-primary">
                {generatePreview()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Próximo número que se generará
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descripción opcional de la numeración..."
              rows={3}
            />
          </div>

          {/* Estado activo */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Numeración Activa</Label>
              <div className="text-sm text-muted-foreground">
                Las numeraciones inactivas no generarán números automáticamente
              </div>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                handleInputChange('is_active', checked)
              }
            />
          </div>

          {/* Mensajes de error y éxito */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
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
              {numeration ? 'Actualizar' : 'Crear'} Numeración
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
