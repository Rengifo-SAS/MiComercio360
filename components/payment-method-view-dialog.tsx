'use client';

import { PaymentMethod, getPaymentTypeInfo } from '@/lib/types/payment-methods';
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
  Copy,
  CheckCircle,
  XCircle,
  Settings,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  FileText,
  Smartphone,
  Coins,
  Globe,
  MoreHorizontal,
} from 'lucide-react';

interface PaymentMethodViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod?: PaymentMethod | null;
  onEdit: (paymentMethod: PaymentMethod) => void;
  onDelete: (paymentMethod: PaymentMethod) => void;
  onDuplicate: (paymentMethod: PaymentMethod) => void;
  onToggleStatus: (paymentMethod: PaymentMethod) => void;
  onSetAsDefault: (paymentMethod: PaymentMethod) => void;
}

export function PaymentMethodViewDialog({
  open,
  onOpenChange,
  paymentMethod,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
  onSetAsDefault,
}: PaymentMethodViewDialogProps) {
  if (!paymentMethod) return null;

  const typeInfo = getPaymentTypeInfo(paymentMethod.payment_type);

  const getPaymentTypeIcon = (type: string) => {
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      Banknote,
      CreditCard,
      ArrowRightLeft,
      FileText,
      Smartphone,
      Coins,
      Globe,
      MoreHorizontal,
    };
    return iconMap[type] || CreditCard;
  };

  const Icon = getPaymentTypeIcon(paymentMethod.icon || 'Banknote');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-lg text-white"
              style={{ backgroundColor: paymentMethod.color }}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {paymentMethod.name}
              </DialogTitle>
              <DialogDescription>
                {typeInfo.label} •{' '}
                {paymentMethod.description || 'Sin descripción'}
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
                  Tipo de Pago
                </label>
                <p className="text-sm">{typeInfo.label}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Estado
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={paymentMethod.is_active ? 'default' : 'secondary'}
                  >
                    {paymentMethod.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                  {paymentMethod.is_default && (
                    <Badge variant="outline">Predeterminado</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuración de comisiones */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Configuración de Comisiones
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Comisión Porcentual
                </label>
                <p className="text-sm font-medium">
                  {paymentMethod.fee_percentage}%
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Comisión Fija
                </label>
                <p className="text-sm font-medium">
                  ${paymentMethod.fee_fixed.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Límites de monto */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Límites de Monto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Monto Mínimo
                </label>
                <p className="text-sm font-medium">
                  ${paymentMethod.min_amount.toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Monto Máximo
                </label>
                <p className="text-sm font-medium">
                  {paymentMethod.max_amount
                    ? `$${paymentMethod.max_amount.toLocaleString()}`
                    : 'Sin límite'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuración de permisos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuración de Permisos</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Requiere Autorización</span>
                <div className="flex items-center gap-2">
                  {paymentMethod.requires_authorization ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {paymentMethod.requires_authorization ? 'Sí' : 'No'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Requiere Referencia</span>
                <div className="flex items-center gap-2">
                  {paymentMethod.requires_reference ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {paymentMethod.requires_reference ? 'Sí' : 'No'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Requiere Aprobación</span>
                <div className="flex items-center gap-2">
                  {paymentMethod.requires_approval ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {paymentMethod.requires_approval ? 'Sí' : 'No'}
                  </span>
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
                  Icono
                </label>
                <p className="text-sm font-medium">
                  {paymentMethod.icon || 'Banknote'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Color
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: paymentMethod.color }}
                  />
                  <span className="text-sm font-medium">
                    {paymentMethod.color}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Orden de Visualización
                </label>
                <p className="text-sm font-medium">
                  {paymentMethod.sort_order}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Creado
                </label>
                <p className="text-sm font-medium">
                  {new Date(paymentMethod.created_at).toLocaleDateString(
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
            onClick={() => onToggleStatus(paymentMethod)}
          >
            {paymentMethod.is_active ? (
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
          {!paymentMethod.is_default && (
            <Button
              variant="outline"
              onClick={() => onSetAsDefault(paymentMethod)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Establecer como Predeterminado
            </Button>
          )}
          <Button variant="outline" onClick={() => onDuplicate(paymentMethod)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicar
          </Button>
          <Button variant="outline" onClick={() => onEdit(paymentMethod)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="destructive" onClick={() => onDelete(paymentMethod)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
