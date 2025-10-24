export interface Customer {
  id: string;
  company_id: string;
  
  // Identificación básica
  identification_type: 'CC' | 'CE' | 'NIT' | 'PP' | 'TI' | 'RC' | 'PA';
  identification_number: string;
  
  // Información personal/empresarial
  business_name: string; // Razón social o nombre completo
  person_type: 'NATURAL' | 'JURIDICA';
  
  // Responsabilidad tributaria (DIAN Colombia)
  tax_responsibility: 
    | 'RESPONSABLE_DE_IVA'
    | 'NO_RESPONSABLE_DE_IVA'
    | 'RESPONSABLE_DE_IVA_REINCORPORADO'
    | 'NO_RESPONSABLE_DE_IVA_POR_ARTICULO_23'
    | 'REGIMEN_SIMPLIFICADO'
    | 'REGIMEN_COMUN'
    | 'REGIMEN_ESPECIAL'
    | 'AUTORRETENEDOR'
    | 'AGENTE_RETENCION_IVA'
    | 'AGENTE_RETENCION_ICA'
    | 'AGENTE_RETENCION_FUENTE'
    | 'GRAN_CONTRIBUYENTE'
    | 'AUTORRETENEDOR_ICA'
    | 'AUTORRETENEDOR_IVA'
    | 'AUTORRETENEDOR_FUENTE'
    | 'NO_OBLIGADO_A_FACTURAR';
  
  // Ubicación geográfica
  department: string;
  municipality: string;
  address: string;
  postal_code?: string;
  
  // Información de contacto
  email?: string;
  phone?: string;
  mobile_phone?: string;
  website?: string;
  
  // Información tributaria adicional
  tax_id?: string; // NIT para personas jurídicas
  tax_regime?: string; // Régimen tributario
  economic_activity_code?: string; // Código CIIU
  economic_activity_description?: string;
  
  // Información bancaria
  bank_name?: string;
  account_type?: 'AHORROS' | 'CORRIENTE' | 'FIDUCIARIA';
  account_number?: string;
  
  // Información comercial
  credit_limit: number;
  payment_terms: number; // Días de pago
  discount_percentage: number;
  
  // Estados y fechas
  is_active: boolean;
  is_vip: boolean;
  notes?: string;
  
  // Auditoría
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CustomerStats {
  total_customers: number;
  natural_persons: number;
  juridical_persons: number;
  active_customers: number;
  vip_customers: number;
}

export interface CreateCustomerData {
  company_id: string;
  identification_type: Customer['identification_type'];
  identification_number: string;
  business_name: string;
  person_type: Customer['person_type'];
  tax_responsibility: Customer['tax_responsibility'];
  department: string;
  municipality: string;
  address: string;
  postal_code?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  website?: string;
  tax_id?: string;
  tax_regime?: string;
  economic_activity_code?: string;
  economic_activity_description?: string;
  bank_name?: string;
  account_type?: Customer['account_type'];
  account_number?: string;
  credit_limit?: number;
  payment_terms?: number;
  discount_percentage?: number;
  is_active?: boolean;
  is_vip?: boolean;
  notes?: string;
  created_by?: string;
  updated_by?: string;
}
