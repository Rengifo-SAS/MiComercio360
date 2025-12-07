'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  REFUND_REASONS,
  REFUND_METHODS,
  REFUND_REQUEST_TYPES,
  PRODUCT_CONDITIONS,
} from '@/lib/types/refunds';
import { RefundsService } from '@/lib/services/refunds-service';
import { PaymentMethodsService } from '@/lib/services/payment-methods-service';
import { Sale } from '@/lib/types/sales';
import { PaymentMethod } from '@/lib/types/payment-methods';
import { Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface RefundRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  companyId: string;
  onSuccess: () => void;
}

export function RefundRequestDialog({
  open,
  onOpenChange,
  sale,
  companyId,
  onSuccess,
}: RefundRequestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [formData, setFormData] = useState({
    request_type: 'REFUND' as 'REFUND' | 'CANCELLATION',
    reason: '',
    refund_method: 'CASH' as
      | 'CASH'
      | 'CARD_REVERSAL'
      | 'TRANSFER'
      | 'STORE_CREDIT',
    description: '',
    requested_amount: 0,
    items: [] as Array<{
      sale_item_id: string;
      product_id: string;
      quantity: number;
      unit_price: number;
      total_amount: number;
      condition: 'NEW' | 'USED' | 'DAMAGED';
      notes: string;
    }>,
  });

  // Cargar métodos de pago
  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!companyId || !open) return;

      setLoadingPaymentMethods(true);
      try {
        const result = await PaymentMethodsService.getPaymentMethods(companyId);
        setPaymentMethods(result || []);
      } catch (error) {
        console.error('Error cargando métodos de pago:', error);
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    loadPaymentMethods();
  }, [companyId, open]);

  // Inicializar formulario cuando cambie la venta o los métodos de pago
  useEffect(() => {
    if (sale && open && paymentMethods.length > 0) {
      const suggestedMethod = getSuggestedRefundMethod();
      setFormData({
        request_type: 'REFUND',
        reason: '',
        refund_method: suggestedMethod as any,
        description: '',
        requested_amount: sale.total_amount || 0,
        items: (sale.items || []).map((item) => ({
          sale_item_id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.quantity * item.unit_price,
          condition: 'NEW' as 'NEW' | 'USED' | 'DAMAGED',
          notes: '',
        })),
      });
      setError(null);
    }
  }, [sale, open, paymentMethods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;

    setLoading(true);
    setError(null);

    try {
      await RefundsService.createRefundRequest({
        sale_id: sale.id,
        company_id: companyId,
        request_type: formData.request_type,
        reason: formData.reason as any,
        requested_amount: formData.requested_amount,
        refund_method: formData.refund_method,
        description: formData.description,
        items: formData.items,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al crear la solicitud de reembolso'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateItemCondition = (
    index: number,
    condition: 'NEW' | 'USED' | 'DAMAGED'
  ) => {
    const newItems = [...formData.items];
    newItems[index].condition = condition;
    setFormData({ ...formData, items: newItems });
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...formData.items];
    newItems[index].quantity = quantity;
    newItems[index].total_amount = quantity * newItems[index].unit_price;
    setFormData({ ...formData, items: newItems });

    // Recalcular monto total solicitado
    const totalAmount = newItems.reduce(
      (sum, item) => sum + item.total_amount,
      0
    );
    setFormData((prev) => ({ ...prev, requested_amount: totalAmount }));
  };

  const getReasonDescription = (reason: string) => {
    const descriptions = {
      CONSUMER_RETRACT:
        'Derecho de retracto dentro de 5 días hábiles (ventas no tradicionales)',
      WARRANTY_CLAIM: 'Reclamo por garantía del producto',
      PRODUCT_DEFECT: 'Producto con defectos de fábrica',
      FRAUD: 'Transacción fraudulenta',
      CUSTOMER_DISSATISFACTION: 'Insatisfacción del cliente (política interna)',
      OTHER: 'Otro motivo (especificar en descripción)',
    };
    return descriptions[reason as keyof typeof descriptions] || '';
  };

  // Mapear métodos de pago a métodos de reembolso disponibles
  const getAvailableRefundMethods = () => {
    const availableMethods = new Map<string, string>();

    // Siempre incluir efectivo
    availableMethods.set('CASH', 'Efectivo');

    // Agregar métodos basados en los métodos de pago configurados
    paymentMethods.forEach((method) => {
      switch (method.payment_type) {
        case 'CASH':
          availableMethods.set('CASH', 'Efectivo');
          break;
        case 'CARD':
          availableMethods.set('CARD_REVERSAL', 'Reversión a Tarjeta');
          break;
        case 'TRANSFER':
          availableMethods.set('TRANSFER', 'Transferencia');
          break;
        case 'DIGITAL_WALLET':
          availableMethods.set('TRANSFER', 'Transferencia');
          break;
        case 'GATEWAY':
          availableMethods.set('CARD_REVERSAL', 'Reversión a Tarjeta');
          break;
        default:
          // Para otros métodos, ofrecer crédito en tienda
          availableMethods.set('STORE_CREDIT', 'Crédito en Tienda');
          break;
      }
    });

    // Siempre incluir crédito en tienda como opción
    availableMethods.set('STORE_CREDIT', 'Crédito en Tienda');

    return Array.from(availableMethods.entries()).map(([key, value]) => ({
      key,
      value,
    }));
  };

  // Obtener el método de reembolso sugerido basado en el método de pago de la venta
  const getSuggestedRefundMethod = () => {
    if (!sale) return 'CASH';

    const availableMethods = getAvailableRefundMethods();

    // Si la venta fue con tarjeta, sugerir reversión a tarjeta
    if (
      sale.payment_method === 'card' &&
      availableMethods.some((m) => m.key === 'CARD_REVERSAL')
    ) {
      return 'CARD_REVERSAL';
    }

    // Si la venta fue con transferencia, sugerir transferencia
    if (
      sale.payment_method === 'transfer' &&
      availableMethods.some((m) => m.key === 'TRANSFER')
    ) {
      return 'TRANSFER';
    }

    // Por defecto, efectivo
    return 'CASH';
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {formData.request_type === 'CANCELLATION'
              ? 'Anular Venta'
              : 'Solicitar Reembolso'}
          </DialogTitle>
          <DialogDescription>
            {formData.request_type === 'CANCELLATION'
              ? 'Anular completamente la venta y procesar reembolso total'
              : 'Crear solicitud de reembolso conforme a normativa colombiana'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información de la venta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de la Venta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Número de Venta</Label>
                  <p className="text-sm text-muted-foreground">
                    {sale.sale_number}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Fecha</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(sale.created_at).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Cliente</Label>
                  <p className="text-sm text-muted-foreground">
                    {sale.customer?.business_name ||
                      sale.customer?.name ||
                      'Consumidor Final'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Total de la Venta
                  </Label>
                  <p className="text-sm font-medium">
                    ${(sale.total_amount || 0).toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tipo de solicitud y motivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="request_type">Tipo de Solicitud</Label>
              <Select
                value={formData.request_type}
                onValueChange={(value: 'REFUND' | 'CANCELLATION') =>
                  setFormData({ ...formData, request_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REFUND_REQUEST_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">Motivo del Reembolso</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) =>
                  setFormData({ ...formData, reason: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REFUND_REASONS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.reason && (
                <p className="text-xs text-muted-foreground mt-1">
                  {getReasonDescription(formData.reason)}
                </p>
              )}
            </div>
          </div>

          {/* Método de reembolso y monto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="refund_method">Método de Reembolso</Label>
              <Select
                value={formData.refund_method}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, refund_method: value })
                }
                disabled={loadingPaymentMethods}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingPaymentMethods
                        ? 'Cargando métodos...'
                        : 'Seleccionar método'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRefundMethods().map((method) => (
                    <SelectItem key={method.key} value={method.key}>
                      {method.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingPaymentMethods && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cargando métodos de pago configurados...
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="requested_amount">Monto Solicitado</Label>
              <Input
                id="requested_amount"
                type="number"
                min="0"
                max={sale.total_amount || 0}
                value={formData.requested_amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    requested_amount: Number(e.target.value),
                  })
                }
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Máximo: ${(sale.total_amount || 0).toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="description">Descripción Detallada</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe detalladamente el motivo del reembolso..."
              rows={3}
            />
          </div>

          {/* Items de la venta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Productos a Devolver</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.items.map((item, index) => {
                  const product = sale.items?.[index]?.product;
                  return (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">
                            {product?.name || 'Producto'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            SKU: {product?.sku || 'N/A'}
                          </p>
                        </div>
                        <Badge variant="outline">
                          ${item.total_amount.toLocaleString('es-CO')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`quantity-${index}`}>
                            Cantidad a Devolver
                          </Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(index, Number(e.target.value))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Máximo: {item.quantity}
                          </p>
                        </div>

                        <div>
                          <Label htmlFor={`condition-${index}`}>
                            Condición del Producto
                          </Label>
                          <Select
                            value={item.condition}
                            onValueChange={(value: any) =>
                              updateItemCondition(index, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PRODUCT_CONDITIONS).map(
                                ([key, value]) => (
                                  <SelectItem key={key} value={key}>
                                    {value}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={`notes-${index}`}>Notas</Label>
                          <Input
                            id={`notes-${index}`}
                            value={item.notes}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].notes = e.target.value;
                              setFormData({ ...formData, items: newItems });
                            }}
                            placeholder="Observaciones..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen de la Solicitud</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Tipo:</span>
                <span className="font-medium">
                  {REFUND_REQUEST_TYPES[formData.request_type]}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Motivo:</span>
                <span className="font-medium">
                  {
                    REFUND_REASONS[
                      formData.reason as keyof typeof REFUND_REASONS
                    ]
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>Método de Reembolso:</span>
                <span className="font-medium">
                  {getAvailableRefundMethods().find(
                    (m) => m.key === formData.refund_method
                  )?.value || 'No especificado'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total a Reembolsar:</span>
                <span>
                  ${formData.requested_amount.toLocaleString('es-CO')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
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
            <Button
              type="submit"
              disabled={
                loading || !formData.reason || formData.requested_amount <= 0
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formData.request_type === 'CANCELLATION'
                ? 'Anular Venta'
                : 'Crear Solicitud'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
