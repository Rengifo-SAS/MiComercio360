'use client';

import { useState, useEffect } from 'react';
import { PaymentMethodsService } from '@/lib/services/payment-methods-service';
import {
  PaymentMethod,
  CreatePaymentMethodData,
  UpdatePaymentMethodData,
  PaymentType,
  PaymentTypeValues,
  getPaymentTypeInfo,
} from '@/lib/types/payment-methods';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentMethodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod?: PaymentMethod | null;
  companyId: string;
  onSaved: () => void;
}

export function PaymentMethodFormDialog({
  open,
  onOpenChange,
  paymentMethod,
  companyId,
  onSaved,
}: PaymentMethodFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePaymentMethodData>({
    name: '',
    description: '',
    payment_type: 'CASH',
    is_active: true,
    requires_authorization: false,
    requires_reference: false,
    requires_approval: false,
    fee_percentage: 0,
    fee_fixed: 0,
    min_amount: 0,
    max_amount: undefined,
    icon: 'Banknote',
    color: '#10B981',
    sort_order: 0,
  });

  const isEditing = !!paymentMethod;

  useEffect(() => {
    if (paymentMethod) {
      setFormData({
        name: paymentMethod.name,
        description: paymentMethod.description || '',
        payment_type: paymentMethod.payment_type,
        is_active: paymentMethod.is_active,
        requires_authorization: paymentMethod.requires_authorization,
        requires_reference: paymentMethod.requires_reference,
        requires_approval: paymentMethod.requires_approval,
        fee_percentage: paymentMethod.fee_percentage,
        fee_fixed: paymentMethod.fee_fixed,
        min_amount: paymentMethod.min_amount,
        max_amount: paymentMethod.max_amount,
        icon: paymentMethod.icon || 'Banknote',
        color: paymentMethod.color,
        sort_order: paymentMethod.sort_order,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        payment_type: 'CASH',
        is_active: true,
        requires_authorization: false,
        requires_reference: false,
        requires_approval: false,
        fee_percentage: 0,
        fee_fixed: 0,
        min_amount: 0,
        max_amount: undefined,
        icon: 'Banknote',
        color: '#10B981',
        sort_order: 0,
      });
    }
    setError(null);
  }, [paymentMethod, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && paymentMethod) {
        const updateData: UpdatePaymentMethodData = {
          id: paymentMethod.id,
          ...formData,
        };
        await PaymentMethodsService.updatePaymentMethod(
          paymentMethod.id,
          updateData
        );
      } else {
        await PaymentMethodsService.createPaymentMethod(companyId, formData);
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('Error guardando método de pago:', err);
      setError((err as Error).message || 'Error al guardar el método de pago');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof CreatePaymentMethodData,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const selectedTypeInfo = getPaymentTypeInfo(formData.payment_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica la información del método de pago.'
              : 'Crea un nuevo método de pago para tu empresa.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ej: Efectivo, Tarjeta de Crédito"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_type">Tipo de Pago *</Label>
              <Select
                value={formData.payment_type}
                onValueChange={(value: PaymentType) =>
                  handleInputChange('payment_type', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {PaymentTypeValues.map((type) => {
                    const typeInfo = getPaymentTypeInfo(type);
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <span style={{ color: typeInfo.color }}>●</span>
                          {typeInfo.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descripción del método de pago"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fee_percentage">Comisión (%)</Label>
              <Input
                id="fee_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.fee_percentage}
                onChange={(e) =>
                  handleInputChange(
                    'fee_percentage',
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fee_fixed">Comisión Fija ($)</Label>
              <Input
                id="fee_fixed"
                type="number"
                step="0.01"
                min="0"
                value={formData.fee_fixed}
                onChange={(e) =>
                  handleInputChange(
                    'fee_fixed',
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_amount">Monto Mínimo ($)</Label>
              <Input
                id="min_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.min_amount}
                onChange={(e) =>
                  handleInputChange(
                    'min_amount',
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_amount">Monto Máximo ($)</Label>
              <Input
                id="max_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.max_amount || ''}
                onChange={(e) =>
                  handleInputChange(
                    'max_amount',
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                placeholder="Sin límite"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icono</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => handleInputChange('icon', e.target.value)}
                placeholder="Banknote"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="#10B981"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Activo</Label>
                <p className="text-sm text-muted-foreground">
                  El método de pago estará disponible para usar
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  handleInputChange('is_active', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Requiere Autorización</Label>
                <p className="text-sm text-muted-foreground">
                  Necesita autorización especial para usar este método
                </p>
              </div>
              <Switch
                checked={formData.requires_authorization}
                onCheckedChange={(checked) =>
                  handleInputChange('requires_authorization', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Requiere Referencia</Label>
                <p className="text-sm text-muted-foreground">
                  Necesita número de referencia o comprobante
                </p>
              </div>
              <Switch
                checked={formData.requires_reference}
                onCheckedChange={(checked) =>
                  handleInputChange('requires_reference', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Requiere Aprobación</Label>
                <p className="text-sm text-muted-foreground">
                  Necesita aprobación manual antes de procesar
                </p>
              </div>
              <Switch
                checked={formData.requires_approval}
                onCheckedChange={(checked) =>
                  handleInputChange('requires_approval', checked)
                }
              />
            </div>
          </div>

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
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
