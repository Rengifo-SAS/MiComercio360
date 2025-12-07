// Tipos para el módulo de impuestos

export type TaxType = 
  | 'VAT'           // IVA (Impuesto al Valor Agregado)
  | 'WITHHOLDING'   // Retención en la Fuente
  | 'CONSUMPTION'   // Impuesto al Consumo
  | 'INDUSTRY'      // ICA (Impuesto de Industria y Comercio)
  | 'OTHER';        // Otros impuestos

export interface Tax {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  tax_type: TaxType;
  percentage: number;
  is_inclusive: boolean;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface TaxHistory {
  id: string;
  tax_id: string;
  old_percentage: number;
  new_percentage: number;
  change_reason?: string;
  changed_by?: string;
  changed_at: string;
  company_id: string;
  changed_by_user?: {
    first_name: string;
    last_name: string;
  };
}

export interface CreateTaxData {
  name: string;
  description?: string;
  tax_type: TaxType;
  percentage: number;
  is_inclusive?: boolean;
  is_active?: boolean;
}

export interface UpdateTaxData {
  name?: string;
  description?: string;
  tax_type?: TaxType;
  percentage?: number;
  is_inclusive?: boolean;
  is_active?: boolean;
}

export interface TaxSummary {
  total_taxes: number;
  active_taxes: number;
  tax_types: Array<{
    type: TaxType;
    count: number;
    active_count: number;
  }>;
}

// Información de tipos de impuestos para la UI
export interface TaxTypeInfo {
  type: TaxType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const getTaxTypeInfo = (type: TaxType): TaxTypeInfo => {
  const typeMap: Record<TaxType, TaxTypeInfo> = {
    VAT: {
      type: 'VAT',
      label: 'IVA',
      description: 'Impuesto al Valor Agregado',
      icon: 'Receipt',
      color: 'bg-blue-100 text-blue-800'
    },
    WITHHOLDING: {
      type: 'WITHHOLDING',
      label: 'Retención',
      description: 'Retención en la Fuente',
      icon: 'MinusCircle',
      color: 'bg-orange-100 text-orange-800'
    },
    CONSUMPTION: {
      type: 'CONSUMPTION',
      label: 'Consumo',
      description: 'Impuesto al Consumo',
      icon: 'ShoppingCart',
      color: 'bg-green-100 text-green-800'
    },
    INDUSTRY: {
      type: 'INDUSTRY',
      label: 'ICA',
      description: 'Impuesto de Industria y Comercio',
      icon: 'Building2',
      color: 'bg-purple-100 text-purple-800'
    },
    OTHER: {
      type: 'OTHER',
      label: 'Otros',
      description: 'Otros impuestos',
      icon: 'FileText',
      color: 'bg-gray-100 text-gray-800'
    }
  };

  return typeMap[type] || typeMap.OTHER;
};

// Función para formatear porcentaje
export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(2)}%`;
};

// Función para calcular el impuesto
export const calculateTax = (amount: number, percentage: number, isInclusive: boolean = false): {
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
} => {
  if (isInclusive) {
    // El impuesto está incluido en el precio base
    const baseAmount = amount / (1 + percentage / 100);
    const taxAmount = amount - baseAmount;
    return {
      baseAmount: Math.round(baseAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: amount
    };
  } else {
    // El impuesto se agrega al precio base
    const taxAmount = (amount * percentage) / 100;
    const totalAmount = amount + taxAmount;
    return {
      baseAmount: amount,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100
    };
  }
};
