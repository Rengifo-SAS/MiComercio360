'use client';

import {
  PaymentGateway,
  getGatewayTypeInfo,
} from '@/lib/types/payment-methods';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Globe,
  Shield,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';

interface PaymentGatewayViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentGateway?: PaymentGateway | null;
  onEdit: (paymentGateway: PaymentGateway) => void;
  onDelete: (paymentGateway: PaymentGateway) => void;
  onToggleStatus: (paymentGateway: PaymentGateway) => void;
}

export function PaymentGatewayViewDialog({
  open,
  onOpenChange,
  paymentGateway,
  onEdit,
  onDelete,
  onToggleStatus,
}: PaymentGatewayViewDialogProps) {
  const [showSecrets, setShowSecrets] = useState(false);

  if (!paymentGateway) return null;

  const gatewayInfo = getGatewayTypeInfo(paymentGateway.gateway_type);

  const maskSecret = (secret: string | undefined) => {
    if (!secret) return 'No configurado';
    if (showSecrets) return secret;
    return secret.substring(0, 8) + '••••••••';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500 text-white">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {paymentGateway.name}
              </DialogTitle>
              <DialogDescription>
                {gatewayInfo.label} • {gatewayInfo.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Tipo de Pasarela
                </label>
                <p className="text-sm">{gatewayInfo.label}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Estado
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={paymentGateway.is_active ? 'default' : 'secondary'}
                  >
                    {paymentGateway.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <Badge variant="outline">
                    {paymentGateway.is_test_mode ? 'Pruebas' : 'Producción'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuración de entorno */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuración de Entorno</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Entorno
                </label>
                <p className="text-sm font-medium">
                  {paymentGateway.environment === 'production'
                    ? 'Producción'
                    : 'Pruebas'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  ID del Comerciante
                </label>
                <p className="text-sm font-medium">
                  {paymentGateway.merchant_id || 'No configurado'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Credenciales de API */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Credenciales de API</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSecrets(!showSecrets)}
              >
                {showSecrets ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Mostrar
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Clave API
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {maskSecret(paymentGateway.api_key)}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Clave Secreta
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {maskSecret(paymentGateway.secret_key)}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Clave Pública
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {maskSecret(paymentGateway.public_key)}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Secreto del Webhook
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {maskSecret(paymentGateway.webhook_secret)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Monedas y métodos soportados */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Soporte</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Monedas Soportadas
                </label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {paymentGateway.supported_currencies.map(
                    (currency, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {currency}
                      </Badge>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Métodos Soportados
                </label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {paymentGateway.supported_methods.map((method, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Información adicional */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Adicional</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Creado
                </label>
                <p className="text-sm font-medium">
                  {new Date(paymentGateway.created_at).toLocaleDateString(
                    'es-ES'
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Última Actualización
                </label>
                <p className="text-sm font-medium">
                  {new Date(paymentGateway.updated_at).toLocaleDateString(
                    'es-ES'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onToggleStatus(paymentGateway)}
          >
            {paymentGateway.is_active ? (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Desactivar
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Activar
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => onEdit(paymentGateway)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDelete(paymentGateway)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
