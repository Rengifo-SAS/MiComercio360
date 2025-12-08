'use client';

import { useState, useEffect } from 'react';
import { PaymentMethodsService } from '@/lib/services/payment-methods-service';
import {
  PaymentGateway,
  CreatePaymentGatewayData,
  UpdatePaymentGatewayData,
  GatewayType,
  GatewayTypeValues,
  getGatewayTypeInfo,
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
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentGatewayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentGateway?: PaymentGateway | null;
  companyId: string;
  onSaved: () => void;
}

export function PaymentGatewayFormDialog({
  open,
  onOpenChange,
  paymentGateway,
  companyId,
  onSaved,
}: PaymentGatewayFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const [formData, setFormData] = useState<CreatePaymentGatewayData>({
    name: '',
    gateway_type: 'STRIPE',
    is_active: true,
    is_test_mode: true,
    api_key: '',
    secret_key: '',
    webhook_secret: '',
    merchant_id: '',
    public_key: '',
    environment: 'sandbox',
    supported_currencies: ['COP'],
    supported_methods: ['CARD'],
  });

  const isEditing = !!paymentGateway;

  useEffect(() => {
    if (paymentGateway) {
      setFormData({
        name: paymentGateway.name,
        gateway_type: paymentGateway.gateway_type,
        is_active: paymentGateway.is_active,
        is_test_mode: paymentGateway.is_test_mode,
        api_key: paymentGateway.api_key || '',
        secret_key: paymentGateway.secret_key || '',
        webhook_secret: paymentGateway.webhook_secret || '',
        merchant_id: paymentGateway.merchant_id || '',
        public_key: paymentGateway.public_key || '',
        environment: paymentGateway.environment,
        supported_currencies: paymentGateway.supported_currencies,
        supported_methods: paymentGateway.supported_methods,
      });
    } else {
      setFormData({
        name: '',
        gateway_type: 'STRIPE',
        is_active: true,
        is_test_mode: true,
        api_key: '',
        secret_key: '',
        webhook_secret: '',
        merchant_id: '',
        public_key: '',
        environment: 'sandbox',
        supported_currencies: ['COP'],
        supported_methods: ['CARD'],
      });
    }
    setError(null);
  }, [paymentGateway, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && paymentGateway) {
        const updateData: UpdatePaymentGatewayData = {
          id: paymentGateway.id,
          ...formData,
        };
        await PaymentMethodsService.updatePaymentGateway(
          paymentGateway.id,
          updateData
        );
      } else {
        await PaymentMethodsService.createPaymentGateway(companyId, formData);
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('Error guardando pasarela de pago:', err);
      setError(
        (err as Error).message || 'Error al guardar la pasarela de pago'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof CreatePaymentGatewayData,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const selectedGatewayInfo = getGatewayTypeInfo(formData.gateway_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Pasarela de Pago' : 'Nueva Pasarela de Pago'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica la configuración de la pasarela de pago.'
              : 'Configura una nueva pasarela de pago para tu empresa.'}
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
                placeholder="Ej: Stripe Producción, PayPal Sandbox"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gateway_type">Tipo de Pasarela *</Label>
              <Select
                value={formData.gateway_type}
                onValueChange={(value: GatewayType) =>
                  handleInputChange('gateway_type', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar pasarela" />
                </SelectTrigger>
                <SelectContent>
                  {GatewayTypeValues.map((type) => {
                    const typeInfo = getGatewayTypeInfo(type);
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="environment">Entorno</Label>
              <Select
                value={formData.environment}
                onValueChange={(value: 'sandbox' | 'production') =>
                  handleInputChange('environment', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Pruebas (Sandbox)</SelectItem>
                  <SelectItem value="production">Producción</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant_id">ID del Comerciante</Label>
              <Input
                id="merchant_id"
                value={formData.merchant_id}
                onChange={(e) =>
                  handleInputChange('merchant_id', e.target.value)
                }
                placeholder="Merchant ID o Store ID"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Credenciales de API</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="api_key">Clave API</Label>
                <div className="relative">
                  <Input
                    id="api_key"
                    type={showSecrets ? 'text' : 'password'}
                    value={formData.api_key}
                    onChange={(e) =>
                      handleInputChange('api_key', e.target.value)
                    }
                    placeholder="sk_test_... o pk_test_..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret_key">Clave Secreta</Label>
                <div className="relative">
                  <Input
                    id="secret_key"
                    type={showSecrets ? 'text' : 'password'}
                    value={formData.secret_key}
                    onChange={(e) =>
                      handleInputChange('secret_key', e.target.value)
                    }
                    placeholder="sk_live_... o sk_test_..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="public_key">Clave Pública</Label>
                <Input
                  id="public_key"
                  value={formData.public_key}
                  onChange={(e) =>
                    handleInputChange('public_key', e.target.value)
                  }
                  placeholder="pk_live_... o pk_test_..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook_secret">Secreto del Webhook</Label>
                <Input
                  id="webhook_secret"
                  type={showSecrets ? 'text' : 'password'}
                  value={formData.webhook_secret}
                  onChange={(e) =>
                    handleInputChange('webhook_secret', e.target.value)
                  }
                  placeholder="whsec_..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuración</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Activa</Label>
                  <p className="text-sm text-muted-foreground">
                    La pasarela estará disponible para procesar pagos
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
                  <Label>Modo de Pruebas</Label>
                  <p className="text-sm text-muted-foreground">
                    Usar credenciales de prueba (recomendado para desarrollo)
                  </p>
                </div>
                <Switch
                  checked={formData.is_test_mode}
                  onCheckedChange={(checked) =>
                    handleInputChange('is_test_mode', checked)
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Monedas y Métodos Soportados
            </h3>

            <div className="space-y-2">
              <Label>Monedas Soportadas</Label>
              <div className="flex flex-wrap gap-2">
                {formData.supported_currencies?.map((currency, index) => (
                  <Badge key={index} variant="secondary">
                    {currency}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Actualmente solo se soporta COP (Peso Colombiano)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Métodos de Pago Soportados</Label>
              <div className="flex flex-wrap gap-2">
                {formData.supported_methods?.map((method, index) => (
                  <Badge key={index} variant="outline">
                    {method}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Actualmente solo se soporta CARD (Tarjeta)
              </p>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Las credenciales de API se almacenan
              de forma segura y encriptada. Asegúrate de usar las credenciales
              correctas para el entorno seleccionado (pruebas o producción).
            </AlertDescription>
          </Alert>

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
