// Tipos para el módulo de numeraciones
export interface Numeration {
  id: string;
  company_id: string;
  document_type: DocumentType;
  name: string;
  prefix: string;
  current_number: number;
  number_length: number;
  suffix: string;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface NumerationHistory {
  id: string;
  numeration_id: string;
  old_number: number;
  new_number: number;
  change_reason?: string;
  changed_by?: string;
  changed_at: string;
  company_id: string;
}

export interface CreateNumerationData {
  document_type: DocumentType;
  name: string;
  prefix: string;
  current_number?: number;
  number_length?: number;
  suffix?: string;
  is_active?: boolean;
  description?: string;
}

export interface UpdateNumerationData {
  name?: string;
  prefix?: string;
  current_number?: number;
  number_length?: number;
  suffix?: string;
  is_active?: boolean;
  description?: string;
}

export interface NumerationSummary {
  total_numerations: number;
  active_numerations: number;
  document_types: Array<{
    type: DocumentType;
    count: number;
    active_count: number;
  }>;
}

// Tipos de documentos soportados
export type DocumentType = 
  | 'invoice'           // Factura de venta
  | 'receipt'           // Recibo de caja
  | 'expense_voucher'   // Comprobante de egreso
  | 'credit_note'       // Nota crédito
  | 'debit_note'        // Nota débito
  | 'purchase_order'    // Orden de compra
  | 'quotation'         // Cotización
  | 'delivery_note'     // Remisión
  | 'payment_voucher'   // Comprobante de pago
  | 'adjustment_note';  // Nota de ajuste

// Configuración de tipos de documentos
export const DOCUMENT_TYPES: Array<{
  value: DocumentType;
  label: string;
  description: string;
  defaultPrefix: string;
  icon: string;
}> = [
  {
    value: 'invoice',
    label: 'Factura de Venta',
    description: 'Documento de venta de productos o servicios',
    defaultPrefix: 'FAC',
    icon: 'FileText'
  },
  {
    value: 'receipt',
    label: 'Recibo de Caja',
    description: 'Comprobante de ingreso de dinero en caja',
    defaultPrefix: 'REC',
    icon: 'Receipt'
  },
  {
    value: 'expense_voucher',
    label: 'Comprobante de Egreso',
    description: 'Documento de salida de dinero de caja',
    defaultPrefix: 'EGR',
    icon: 'CreditCard'
  },
  {
    value: 'credit_note',
    label: 'Nota Crédito',
    description: 'Documento que reduce el valor de una factura',
    defaultPrefix: 'NC',
    icon: 'PlusCircle'
  },
  {
    value: 'debit_note',
    label: 'Nota Débito',
    description: 'Documento que aumenta el valor de una factura',
    defaultPrefix: 'ND',
    icon: 'MinusCircle'
  },
  {
    value: 'purchase_order',
    label: 'Orden de Compra',
    description: 'Solicitud de compra de productos o servicios',
    defaultPrefix: 'OC',
    icon: 'ShoppingCart'
  },
  {
    value: 'quotation',
    label: 'Cotización',
    description: 'Propuesta de precio para productos o servicios',
    defaultPrefix: 'COT',
    icon: 'Calculator'
  },
  {
    value: 'delivery_note',
    label: 'Remisión',
    description: 'Documento de entrega de mercancía',
    defaultPrefix: 'REM',
    icon: 'Truck'
  },
  {
    value: 'payment_voucher',
    label: 'Comprobante de Pago',
    description: 'Documento que acredita el pago realizado',
    defaultPrefix: 'CP',
    icon: 'DollarSign'
  },
  {
    value: 'adjustment_note',
    label: 'Nota de Ajuste',
    description: 'Documento para ajustes de inventario o contables',
    defaultPrefix: 'NA',
    icon: 'Settings'
  }
];

// Función para obtener información de un tipo de documento
export function getDocumentTypeInfo(type: DocumentType) {
  return DOCUMENT_TYPES.find(dt => dt.value === type);
}

// Función para formatear un número de documento
export function formatDocumentNumber(
  prefix: string,
  number: number,
  length: number,
  suffix: string = ''
): string {
  const formattedNumber = number.toString().padStart(length, '0');
  return `${prefix}${formattedNumber}${suffix}`;
}

// Función para generar el siguiente número
export function generateNextNumber(
  currentNumber: number,
  length: number
): string {
  const nextNumber = currentNumber + 1;
  return nextNumber.toString().padStart(length, '0');
}

// Validaciones
export function validateNumerationData(data: CreateNumerationData): string[] {
  const errors: string[] = [];

  if (!data.document_type) {
    errors.push('El tipo de documento es requerido');
  }

  if (!data.name || data.name.trim().length === 0) {
    errors.push('El nombre es requerido');
  }

  if (!data.prefix || data.prefix.trim().length === 0) {
    errors.push('El prefijo es requerido');
  }

  if (data.prefix && data.prefix.length > 10) {
    errors.push('El prefijo no puede tener más de 10 caracteres');
  }

  if (data.current_number !== undefined && data.current_number < 0) {
    errors.push('El número actual no puede ser negativo');
  }

  if (data.number_length !== undefined && (data.number_length < 1 || data.number_length > 10)) {
    errors.push('La longitud del número debe estar entre 1 y 10');
  }

  if (data.suffix && data.suffix.length > 20) {
    errors.push('El sufijo no puede tener más de 20 caracteres');
  }

  return errors;
}
