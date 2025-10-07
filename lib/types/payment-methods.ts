// Tipos para el módulo de métodos de pago
// lib/types/payment-methods.ts

export type PaymentType = 
  | 'CASH'           // Efectivo
  | 'CARD'           // Tarjeta (crédito/débito)
  | 'TRANSFER'       // Transferencia bancaria
  | 'CHECK'          // Cheque
  | 'DIGITAL_WALLET' // Billetera digital (Nequi, Daviplata, etc.)
  | 'CRYPTOCURRENCY' // Criptomonedas
  | 'GATEWAY'        // Pasarela de pago (Stripe, PayPal, etc.)
  | 'OTHER';         // Otros métodos

export type GatewayType = 
  | 'STRIPE'        // Stripe
  | 'PAYPAL'        // PayPal
  | 'MERCADOPAGO'   // MercadoPago
  | 'WOMIPAY'       // Wompi
  | 'EPAYCO'        // ePayco
  | 'PLACETOPAY'    // Place to Pay
  | 'CUSTOM';       // Pasarela personalizada

export type PaymentStatus = 
  | 'PENDING'       // Pendiente
  | 'PROCESSING'    // Procesando
  | 'COMPLETED'     // Completada
  | 'FAILED'        // Fallida
  | 'CANCELLED'     // Cancelada
  | 'REFUNDED'      // Reembolsada
  | 'PARTIALLY_REFUNDED'; // Parcialmente reembolsada

export interface PaymentMethod {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  payment_type: PaymentType;
  is_active: boolean;
  is_default: boolean;
  requires_authorization: boolean;
  requires_reference: boolean;
  requires_approval: boolean;
  fee_percentage: number;
  fee_fixed: number;
  min_amount: number;
  max_amount?: number;
  gateway_config?: Record<string, any>;
  icon?: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface PaymentMethodHistory {
  id: string;
  payment_method_id: string;
  old_fee_percentage?: number;
  new_fee_percentage?: number;
  old_fee_fixed?: number;
  new_fee_fixed?: number;
  change_reason?: string;
  changed_by?: string;
  changed_at: string;
  company_id: string;
}

export interface PaymentGateway {
  id: string;
  company_id: string;
  name: string;
  gateway_type: GatewayType;
  is_active: boolean;
  is_test_mode: boolean;
  api_key?: string;
  secret_key?: string;
  webhook_secret?: string;
  merchant_id?: string;
  public_key?: string;
  environment: 'sandbox' | 'production';
  config?: Record<string, any>;
  supported_currencies: string[];
  supported_methods: PaymentType[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface PaymentTransaction {
  id: string;
  company_id: string;
  payment_method_id: string;
  gateway_id?: string;
  transaction_id?: string;
  external_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gateway_response?: Record<string, any>;
  reference?: string;
  authorization_code?: string;
  fee_amount: number;
  net_amount?: number;
  customer_email?: string;
  customer_phone?: string;
  description?: string;
  metadata?: Record<string, any>;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Información de tipos de pago para la UI
export interface PaymentTypeInfo {
  label: string;
  description: string;
  icon: string;
  color: string;
  requiresGateway: boolean;
  isDigital: boolean;
}

export const getPaymentTypeInfo = (type: PaymentType): PaymentTypeInfo => {
  const typeMap: Record<PaymentType, PaymentTypeInfo> = {
    CASH: {
      label: 'Efectivo',
      description: 'Pago en efectivo',
      icon: 'Banknote',
      color: '#10B981',
      requiresGateway: false,
      isDigital: false,
    },
    CARD: {
      label: 'Tarjeta',
      description: 'Tarjeta de crédito o débito',
      icon: 'CreditCard',
      color: '#3B82F6',
      requiresGateway: true,
      isDigital: false,
    },
    TRANSFER: {
      label: 'Transferencia',
      description: 'Transferencia bancaria',
      icon: 'ArrowRightLeft',
      color: '#F59E0B',
      requiresGateway: false,
      isDigital: false,
    },
    CHECK: {
      label: 'Cheque',
      description: 'Pago con cheque',
      icon: 'FileText',
      color: '#6B7280',
      requiresGateway: false,
      isDigital: false,
    },
    DIGITAL_WALLET: {
      label: 'Billetera Digital',
      description: 'Nequi, Daviplata, Movii, etc.',
      icon: 'Smartphone',
      color: '#8B5CF6',
      requiresGateway: true,
      isDigital: true,
    },
    CRYPTOCURRENCY: {
      label: 'Criptomoneda',
      description: 'Bitcoin, Ethereum, etc.',
      icon: 'Coins',
      color: '#F59E0B',
      requiresGateway: true,
      isDigital: true,
    },
    GATEWAY: {
      label: 'Pasarela',
      description: 'Stripe, PayPal, etc.',
      icon: 'Globe',
      color: '#6366F1',
      requiresGateway: true,
      isDigital: true,
    },
    OTHER: {
      label: 'Otro',
      description: 'Otro método de pago',
      icon: 'MoreHorizontal',
      color: '#6B7280',
      requiresGateway: false,
      isDigital: false,
    },
  };

  return typeMap[type] || typeMap.OTHER;
};

export const getGatewayTypeInfo = (type: GatewayType): PaymentTypeInfo => {
  const gatewayMap: Record<GatewayType, PaymentTypeInfo> = {
    STRIPE: {
      label: 'Stripe',
      description: 'Pasarela de pago Stripe',
      icon: 'CreditCard',
      color: '#635BFF',
      requiresGateway: true,
      isDigital: true,
    },
    PAYPAL: {
      label: 'PayPal',
      description: 'Pasarela de pago PayPal',
      icon: 'CreditCard',
      color: '#0070BA',
      requiresGateway: true,
      isDigital: true,
    },
    MERCADOPAGO: {
      label: 'MercadoPago',
      description: 'Pasarela de pago MercadoPago',
      icon: 'CreditCard',
      color: '#00B2CA',
      requiresGateway: true,
      isDigital: true,
    },
    WOMIPAY: {
      label: 'Wompi',
      description: 'Pasarela de pago Wompi',
      icon: 'CreditCard',
      color: '#00D4AA',
      requiresGateway: true,
      isDigital: true,
    },
    EPAYCO: {
      label: 'ePayco',
      description: 'Pasarela de pago ePayco',
      icon: 'CreditCard',
      color: '#FF6B35',
      requiresGateway: true,
      isDigital: true,
    },
    PLACETOPAY: {
      label: 'Place to Pay',
      description: 'Pasarela de pago Place to Pay',
      icon: 'CreditCard',
      color: '#8B5CF6',
      requiresGateway: true,
      isDigital: true,
    },
    CUSTOM: {
      label: 'Personalizada',
      description: 'Pasarela de pago personalizada',
      icon: 'Settings',
      color: '#6B7280',
      requiresGateway: true,
      isDigital: true,
    },
  };

  return gatewayMap[type] || gatewayMap.CUSTOM;
};

// Valores válidos para los tipos
export const PaymentTypeValues: PaymentType[] = [
  'CASH',
  'CARD',
  'TRANSFER',
  'CHECK',
  'DIGITAL_WALLET',
  'CRYPTOCURRENCY',
  'GATEWAY',
  'OTHER',
];

export const GatewayTypeValues: GatewayType[] = [
  'STRIPE',
  'PAYPAL',
  'MERCADOPAGO',
  'WOMIPAY',
  'EPAYCO',
  'PLACETOPAY',
  'CUSTOM',
];

export const PaymentStatusValues: PaymentStatus[] = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
];

// Interfaces para formularios
export interface CreatePaymentMethodData {
  name: string;
  description?: string;
  payment_type: PaymentType;
  is_active?: boolean;
  requires_authorization?: boolean;
  requires_reference?: boolean;
  requires_approval?: boolean;
  fee_percentage?: number;
  fee_fixed?: number;
  min_amount?: number;
  max_amount?: number;
  gateway_config?: Record<string, any>;
  icon?: string;
  color?: string;
  sort_order?: number;
}

export interface UpdatePaymentMethodData extends Partial<CreatePaymentMethodData> {
  id: string;
}

export interface CreatePaymentGatewayData {
  name: string;
  gateway_type: GatewayType;
  is_active?: boolean;
  is_test_mode?: boolean;
  api_key?: string;
  secret_key?: string;
  webhook_secret?: string;
  merchant_id?: string;
  public_key?: string;
  environment?: 'sandbox' | 'production';
  config?: Record<string, any>;
  supported_currencies?: string[];
  supported_methods?: PaymentType[];
}

export interface UpdatePaymentGatewayData extends Partial<CreatePaymentGatewayData> {
  id: string;
}

// Estadísticas de métodos de pago
export interface PaymentMethodStats {
  total_methods: number;
  active_methods: number;
  default_methods: number;
  methods_by_type: Record<PaymentType, number>;
  total_transactions: number;
  total_amount: number;
  average_fee: number;
}
