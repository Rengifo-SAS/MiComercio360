'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/types/sales';
import { PaymentMethod } from '@/lib/types/payment-methods';
import { toast } from 'sonner';
import {
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  Building2,
  DollarSign,
  Settings,
  ArrowRightLeft,
  Coins,
} from 'lucide-react';

interface POSPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  paymentMethods: PaymentMethod[];
  onProcessPayment: (paymentData: PaymentData) => Promise<void>;
  loading?: boolean;
}

interface PaymentData {
  method: PaymentMethod;
  amount: number;
  change?: number;
  reference?: string;
}

const paymentMethodIcons = {
  CASH: Banknote,
  CARD: CreditCard,
  TRANSFER: Building2,
  DIGITAL_WALLET: Smartphone,
  CHECK: Receipt,
  CRYPTOCURRENCY: Coins,
  GATEWAY: Settings,
  OTHER: Settings,
  COMBINED: ArrowRightLeft,
};

const paymentMethodLabels = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta de crédito',
  TRANSFER: 'Transferencia',
  DIGITAL_WALLET: 'Billetera digital',
  CHECK: 'Cheque',
  CRYPTOCURRENCY: 'Criptomoneda',
  GATEWAY: 'Pasarela de pago',
  OTHER: 'Otros métodos de pago',
  COMBINED: 'Combinado',
};

export function POSPaymentDialog({
  open,
  onOpenChange,
  totalAmount,
  paymentMethods,
  onProcessPayment,
  loading = false,
}: POSPaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [change, setChange] = useState<number>(0);
  const [reference, setReference] = useState<string>('');

  // Valores de billetes rápidos predefinidos
  const getQuickBillOptions = (totalAmount: number) => {
    // Generar opciones basadas en el total
    const options = [];

    // Opción 1: El monto exacto
    options.push(totalAmount);

    // Opción 2: Redondear hacia arriba a la siguiente milena
    const nextThousand = Math.ceil(totalAmount / 1000) * 1000;
    if (nextThousand !== totalAmount) {
      options.push(nextThousand);
    }

    // Opción 3: Agregar 1000 al monto exacto
    options.push(totalAmount + 1000);

    // Si no hay suficientes opciones, agregar más
    if (options.length < 3) {
      options.push(totalAmount + 2000);
    }

    return options.slice(0, 3); // Solo mostrar 3 opciones
  };

  // Calcular devuelta automáticamente
  useEffect(() => {
    const selectedPaymentMethod = paymentMethods.find(
      (m) => m.id === selectedMethod
    );
    if (selectedPaymentMethod?.payment_type === 'CASH' && cashAmount > 0) {
      setChange(Math.max(0, cashAmount - totalAmount));
    } else {
      setChange(0);
    }
  }, [cashAmount, totalAmount, selectedMethod, paymentMethods]);

  // Auto-seleccionar primer método de pago disponible
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedMethod]);

  const handleSubmit = async () => {
    if (!selectedMethod) return;

    const selectedPaymentMethod = paymentMethods.find(
      (m) => m.id === selectedMethod
    );

    if (!selectedPaymentMethod) {
      toast.error('Método de pago no encontrado');
      return;
    }

    const paymentData: PaymentData = {
      method: selectedPaymentMethod,
      amount:
        selectedPaymentMethod?.payment_type === 'CASH'
          ? cashAmount
          : totalAmount,
      change:
        selectedPaymentMethod?.payment_type === 'CASH' ? change : undefined,
      reference: reference || undefined,
    };

    await onProcessPayment(paymentData);
  };

  // Seleccionar método de pago sin procesar automáticamente
  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const getPaymentMethodIcon = (paymentType: string) => {
    const IconComponent =
      paymentMethodIcons[paymentType as keyof typeof paymentMethodIcons] ||
      CreditCard;
    return <IconComponent className="h-6 w-6" />;
  };

  // Icono personalizado para efectivo (billetes superpuestos)
  const CashIcon = ({ className }: { className?: string }) => (
    <div className={className}>
      <div className="relative">
        {/* Billete de atrás */}
        <div className="w-6 h-4 bg-gray-500 rounded-sm shadow-sm"></div>
        {/* Billete de adelante */}
        <div className="absolute top-0.5 left-0.5 w-6 h-4 bg-gray-600 rounded-sm shadow-sm"></div>
      </div>
    </div>
  );

  // Icono personalizado para tarjeta de crédito
  const CardIcon = ({ className }: { className?: string }) => (
    <div className={className}>
      <CreditCard className="h-6 w-6" />
    </div>
  );

  // Icono personalizado para transferencia (banco)
  const TransferIcon = ({ className }: { className?: string }) => (
    <div className={className}>
      <Building2 className="h-6 w-6" />
    </div>
  );

  // Icono personalizado para combinado
  const CombinedIcon = ({ className }: { className?: string }) => (
    <div className={className}>
      <div className="relative">
        <DollarSign className="h-4 w-4 absolute top-0 left-0" />
        <div className="flex flex-col space-y-0.5 mt-2 ml-1">
          <div className="w-3 h-1.5 bg-gray-500 rounded-full"></div>
          <div className="w-3 h-1.5 bg-gray-500 rounded-full"></div>
          <div className="w-3 h-1.5 bg-gray-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );

  // Icono personalizado para otros métodos
  const OtherIcon = ({ className }: { className?: string }) => (
    <div className={`${className} relative`}>
      <Settings className="h-6 w-6" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"></div>
    </div>
  );

  const getCustomIcon = (paymentType: string) => {
    const iconProps = { className: 'h-6 w-6' };

    switch (paymentType) {
      case 'CASH':
        return <CashIcon {...iconProps} />;
      case 'CARD':
        return <CardIcon {...iconProps} />;
      case 'TRANSFER':
        return <TransferIcon {...iconProps} />;
      case 'COMBINED':
        return <CombinedIcon {...iconProps} />;
      case 'OTHER':
        return <OtherIcon {...iconProps} />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Pagar factura
          </DialogTitle>
          <DialogDescription>
            Selecciona el método de pago y completa la transacción
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Total a Pagar */}
          <div className="text-center" role="status" aria-live="polite">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              TOTAL
            </div>
            <div
              className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white"
              aria-label={`Total a pagar: ${formatCurrency(totalAmount)}`}
            >
              {formatCurrency(totalAmount)}
            </div>
          </div>

          {/* Métodos de Pago - Diseño de Tarjetas */}
          <div className="space-y-4">
            {/* Primera fila - Métodos principales */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {paymentMethods.slice(0, 3).map((method) => {
                const customIcon = getCustomIcon(method.payment_type);
                const isSelected = selectedMethod === method.id;
                const label =
                  method.name ||
                  paymentMethodLabels[
                    method.payment_type as keyof typeof paymentMethodLabels
                  ] ||
                  method.payment_type;

                return (
                  <button
                    key={method.id}
                    onClick={() => handleMethodSelect(method.id)}
                    disabled={!method.is_active}
                    className={`
                      relative p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 min-h-[80px] sm:min-h-[100px] flex flex-col justify-center focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none
                      ${
                        isSelected
                          ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 shadow-md'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                      ${
                        !method.is_active
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer hover:shadow-sm'
                      }
                    `}
                    aria-label={`Seleccionar método de pago: ${label}`}
                    aria-pressed={isSelected}
                    role="radio"
                    aria-checked={isSelected}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected
                            ? 'bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-indigo-800 dark:via-purple-800 dark:to-pink-800'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                        aria-hidden="true"
                      >
                        {customIcon}
                      </div>
                      <span
                        className={`text-xs sm:text-sm font-medium text-center leading-tight px-1 break-words ${
                          isSelected
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                        title={label}
                      >
                        {label.length > 15
                          ? `${label.substring(0, 15)}...`
                          : label}
                      </span>
                    </div>
                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                        aria-hidden="true"
                      ></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Separador */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                  Otros métodos
                </span>
              </div>
            </div>

            {/* Segunda fila - Otros métodos */}
            {paymentMethods.length > 3 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {paymentMethods.slice(3).map((method) => {
                  const customIcon = getCustomIcon(method.payment_type);
                  const isSelected = selectedMethod === method.id;
                  const label =
                    method.name ||
                    paymentMethodLabels[
                      method.payment_type as keyof typeof paymentMethodLabels
                    ] ||
                    method.payment_type;

                  return (
                    <button
                      key={method.id}
                      onClick={() => handleMethodSelect(method.id)}
                      disabled={!method.is_active}
                      className={`
                        relative p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 min-h-[80px] sm:min-h-[100px] flex flex-col justify-center
                        ${
                          isSelected
                            ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                        ${
                          !method.is_active
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer hover:shadow-sm'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected
                              ? 'bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-indigo-800 dark:via-purple-800 dark:to-pink-800'
                              : 'bg-gray-100 dark:bg-gray-700'
                          }`}
                        >
                          {customIcon}
                        </div>
                        <span
                          className={`text-xs sm:text-sm font-medium text-center leading-tight px-1 ${
                            isSelected
                              ? 'text-indigo-700 dark:text-indigo-300'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                          title={label}
                        >
                          {label.length > 12
                            ? `${label.substring(0, 12)}...`
                            : label}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pago en Efectivo */}
          {selectedMethod &&
            paymentMethods.find((m) => m.id === selectedMethod)
              ?.payment_type === 'CASH' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cash-amount">Monto Recibido</Label>
                  <Input
                    id="cash-amount"
                    type="number"
                    value={cashAmount || ''}
                    onChange={(e) =>
                      setCashAmount(parseFloat(e.target.value) || 0)
                    }
                    placeholder="Ingrese el monto recibido"
                    className="text-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    aria-label="Monto recibido del cliente"
                    aria-describedby="cash-amount-help"
                  />
                  <p id="cash-amount-help" className="text-xs text-gray-500">
                    Ingrese la cantidad de dinero que recibió del cliente
                  </p>
                </div>

                {/* Opciones rápidas */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600 dark:text-gray-400">
                    Opciones rápidas
                  </Label>
                  <div
                    className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                    role="group"
                    aria-label="Opciones rápidas de monto"
                  >
                    {getQuickBillOptions(totalAmount).map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setCashAmount(amount)}
                        className="flex flex-col h-auto py-2 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        aria-label={`Establecer monto recibido a ${formatCurrency(
                          amount
                        )}`}
                      >
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          {formatCurrency(amount)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Devuelta */}
                {change > 0 && (
                  <div
                    className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-green-800 dark:text-green-200">
                        Devuelta:
                      </span>
                      <span
                        className="text-lg font-bold text-green-600 dark:text-green-400"
                        aria-label={`Devuelta: ${formatCurrency(change)}`}
                      >
                        {formatCurrency(change)}
                      </span>
                    </div>
                  </div>
                )}

                {change < 0 && (
                  <div
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
                    role="alert"
                    aria-live="polite"
                  >
                    <div className="text-sm text-red-800 dark:text-red-200">
                      El monto recibido es menor al total a pagar
                    </div>
                  </div>
                )}

                {/* Botón Vender para efectivo */}
                {cashAmount >= totalAmount && (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white py-3 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    aria-label="Procesar venta con pago en efectivo"
                  >
                    {loading ? 'Procesando...' : 'Vender'}
                  </Button>
                )}
              </div>
            )}

          {/* Referencia para otros métodos */}
          {selectedMethod &&
            paymentMethods.find((m) => m.id === selectedMethod)
              ?.payment_type !== 'CASH' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reference">
                    Referencia{' '}
                    {paymentMethods.find((m) => m.id === selectedMethod)
                      ?.payment_type === 'TRANSFER'
                      ? '(Número de transacción)'
                      : '(Opcional)'}
                  </Label>
                  <Input
                    id="reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={
                      paymentMethods.find((m) => m.id === selectedMethod)
                        ?.payment_type === 'TRANSFER'
                        ? 'Número de transacción'
                        : 'Referencia del pago'
                    }
                    className="focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    aria-label="Referencia del pago"
                  />
                </div>

                {/* Botón Vender para métodos no efectivo */}
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white py-3 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  aria-label="Procesar venta con método de pago seleccionado"
                >
                  {loading ? 'Procesando...' : 'Vender'}
                </Button>
              </div>
            )}

          {/* Botón Cancelar */}
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-6 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              disabled={loading}
              aria-label="Cancelar proceso de pago"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
