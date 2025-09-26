// Tipos para el módulo de plantillas de impresión
// lib/types/print-templates.ts

export type TemplateDocumentType = 
  | 'INVOICE'           // Factura de venta
  | 'QUOTATION'         // Cotización
  | 'RECEIPT'           // Recibo de caja
  | 'PURCHASE_ORDER'    // Orden de compra
  | 'DELIVERY_NOTE'     // Remisión
  | 'CREDIT_NOTE'       // Nota crédito
  | 'DEBIT_NOTE'        // Nota débito
  | 'PAYMENT_VOUCHER'   // Comprobante de pago
  | 'EXPENSE_VOUCHER'   // Comprobante de egreso
  | 'INVENTORY_REPORT'  // Reporte de inventario
  | 'SALES_REPORT'      // Reporte de ventas
  | 'OTHER';            // Otros documentos

export const PrintDocumentTypeValues: TemplateDocumentType[] = [
  'INVOICE',
  'QUOTATION',
  'RECEIPT',
  'PURCHASE_ORDER',
  'DELIVERY_NOTE',
  'CREDIT_NOTE',
  'DEBIT_NOTE',
  'PAYMENT_VOUCHER',
  'EXPENSE_VOUCHER',
  'INVENTORY_REPORT',
  'SALES_REPORT',
  'OTHER'
];

export type PaperSize = 
  | 'A4'           // A4 (210 x 297 mm)
  | 'A5'           // A5 (148 x 210 mm)
  | 'LETTER'       // Carta (8.5 x 11 pulgadas)
  | 'LEGAL'        // Legal (8.5 x 14 pulgadas)
  | 'HALF_LETTER'  // Media carta (5.5 x 8.5 pulgadas)
  | 'CUSTOM';      // Tamaño personalizado

export const PaperSizeValues: PaperSize[] = [
  'A4',
  'A5',
  'LETTER',
  'LEGAL',
  'HALF_LETTER',
  'CUSTOM'
];

export type PageOrientation = 
  | 'PORTRAIT'     // Vertical
  | 'LANDSCAPE';   // Horizontal

export const PageOrientationValues: PageOrientation[] = [
  'PORTRAIT',
  'LANDSCAPE'
];

export type ChangeType = 
  | 'CREATED'      // Creado
  | 'UPDATED'      // Actualizado
  | 'ACTIVATED'    // Activado
  | 'DEACTIVATED'  // Desactivado
  | 'DELETED';     // Eliminado

export interface PrintTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  document_type: TemplateDocumentType;
  is_default: boolean;
  is_active: boolean;
  
  // Configuración de página
  paper_size: PaperSize;
  page_orientation: PageOrientation;
  custom_width: number | null;
  custom_height: number | null;
  
  // Configuración de márgenes (mm)
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  
  // Configuración de fuente
  font_family: string;
  font_size: number;
  line_height: number;
  
  // Plantilla HTML/CSS
  header_template: string | null;
  body_template: string;
  footer_template: string | null;
  css_styles: string | null;
  
  // Configuración de elementos
  show_company_logo: boolean;
  show_company_info: boolean;
  show_document_number: boolean;
  show_document_date: boolean;
  show_customer_info: boolean;
  show_items_table: boolean;
  show_totals: boolean;
  show_payment_info: boolean;
  show_notes: boolean;
  
  // Metadatos
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PrintTemplateHistory {
  id: string;
  template_id: string;
  company_id: string;
  change_type: ChangeType;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  change_reason: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface CreatePrintTemplateData {
  name: string;
  description?: string;
  document_type: TemplateDocumentType;
  is_default?: boolean;
  is_active?: boolean;
  
  // Configuración de página
  paper_size: PaperSize;
  page_orientation: PageOrientation;
  custom_width?: number;
  custom_height?: number;
  
  // Configuración de márgenes (mm)
  margin_top?: number;
  margin_bottom?: number;
  margin_left?: number;
  margin_right?: number;
  
  // Configuración de fuente
  font_family?: string;
  font_size?: number;
  line_height?: number;
  
  // Plantilla HTML/CSS
  header_template?: string;
  body_template: string;
  footer_template?: string;
  css_styles?: string;
  
  // Configuración de elementos
  show_company_logo?: boolean;
  show_company_info?: boolean;
  show_document_number?: boolean;
  show_document_date?: boolean;
  show_customer_info?: boolean;
  show_items_table?: boolean;
  show_totals?: boolean;
  show_payment_info?: boolean;
  show_notes?: boolean;
}

export type UpdatePrintTemplateData = Partial<CreatePrintTemplateData>;

// Información de tipos de documentos para UI
export interface DocumentTypeInfo {
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultPaperSize: PaperSize;
  defaultOrientation: PageOrientation;
}

// Información de tamaños de papel para UI
export interface PaperSizeInfo {
  label: string;
  dimensions: string;
  width: number;  // mm
  height: number; // mm
  icon: string;
}

// Información de orientación para UI
export interface OrientationInfo {
  label: string;
  description: string;
  icon: string;
}

// Utilidades
export function getDocumentTypeInfo(type: TemplateDocumentType): DocumentTypeInfo {
  const types: Record<TemplateDocumentType, DocumentTypeInfo> = {
    INVOICE: {
      label: 'Factura de Venta',
      description: 'Documento de venta con efectos tributarios',
      icon: 'FileText',
      color: 'bg-green-500',
      defaultPaperSize: 'A4',
      defaultOrientation: 'PORTRAIT'
    },
    QUOTATION: {
      label: 'Cotización',
      description: 'Propuesta de precio para productos o servicios',
      icon: 'Calculator',
      color: 'bg-blue-500',
      defaultPaperSize: 'A4',
      defaultOrientation: 'PORTRAIT'
    },
    RECEIPT: {
      label: 'Recibo de Caja',
      description: 'Comprobante de pago recibido',
      icon: 'Receipt',
      color: 'bg-emerald-500',
      defaultPaperSize: 'HALF_LETTER',
      defaultOrientation: 'PORTRAIT'
    },
    PURCHASE_ORDER: {
      label: 'Orden de Compra',
      description: 'Solicitud de compra a proveedores',
      icon: 'ShoppingCart',
      color: 'bg-orange-500',
      defaultPaperSize: 'A4',
      defaultOrientation: 'PORTRAIT'
    },
    DELIVERY_NOTE: {
      label: 'Remisión',
      description: 'Documento de entrega de mercancía',
      icon: 'Truck',
      color: 'bg-purple-500',
      defaultPaperSize: 'A4',
      defaultOrientation: 'PORTRAIT'
    },
    CREDIT_NOTE: {
      label: 'Nota Crédito',
      description: 'Documento que reduce el valor de una factura',
      icon: 'ArrowUpCircle',
      color: 'bg-green-600',
      defaultPaperSize: 'A4',
      defaultOrientation: 'PORTRAIT'
    },
    DEBIT_NOTE: {
      label: 'Nota Débito',
      description: 'Documento que aumenta el valor de una factura',
      icon: 'ArrowDownCircle',
      color: 'bg-red-500',
      defaultPaperSize: 'A4',
      defaultOrientation: 'PORTRAIT'
    },
    PAYMENT_VOUCHER: {
      label: 'Comprobante de Pago',
      description: 'Documento que acredita un pago realizado',
      icon: 'CreditCard',
      color: 'bg-indigo-500',
      defaultPaperSize: 'HALF_LETTER',
      defaultOrientation: 'PORTRAIT'
    },
    EXPENSE_VOUCHER: {
      label: 'Comprobante de Egreso',
      description: 'Documento que registra un gasto o egreso',
      icon: 'ArrowRightCircle',
      color: 'bg-red-600',
      defaultPaperSize: 'HALF_LETTER',
      defaultOrientation: 'PORTRAIT'
    },
    INVENTORY_REPORT: {
      label: 'Reporte de Inventario',
      description: 'Reporte del estado del inventario',
      icon: 'Package',
      color: 'bg-amber-500',
      defaultPaperSize: 'A4',
      defaultOrientation: 'LANDSCAPE'
    },
    SALES_REPORT: {
      label: 'Reporte de Ventas',
      description: 'Reporte de ventas realizadas',
      icon: 'TrendingUp',
      color: 'bg-green-600',
      defaultPaperSize: 'A4',
      defaultOrientation: 'LANDSCAPE'
    },
    OTHER: {
      label: 'Otros Documentos',
      description: 'Otros tipos de documentos personalizados',
      icon: 'File',
      color: 'bg-gray-500',
      defaultPaperSize: 'A4',
      defaultOrientation: 'PORTRAIT'
    }
  };
  
  return types[type];
}

export function getPaperSizeInfo(size: PaperSize): PaperSizeInfo {
  const sizes: Record<PaperSize, PaperSizeInfo> = {
    A4: {
      label: 'A4',
      dimensions: '210 × 297 mm',
      width: 210,
      height: 297,
      icon: 'FileText'
    },
    A5: {
      label: 'A5',
      dimensions: '148 × 210 mm',
      width: 148,
      height: 210,
      icon: 'FileText'
    },
    LETTER: {
      label: 'Carta',
      dimensions: '8.5 × 11 pulgadas',
      width: 215.9, // mm
      height: 279.4, // mm
      icon: 'FileText'
    },
    LEGAL: {
      label: 'Legal',
      dimensions: '8.5 × 14 pulgadas',
      width: 215.9, // mm
      height: 355.6, // mm
      icon: 'FileText'
    },
    HALF_LETTER: {
      label: 'Media Carta',
      dimensions: '5.5 × 8.5 pulgadas',
      width: 139.7, // mm
      height: 215.9, // mm
      icon: 'FileText'
    },
    CUSTOM: {
      label: 'Personalizado',
      dimensions: 'Definido por usuario',
      width: 0,
      height: 0,
      icon: 'Settings'
    }
  };
  
  return sizes[size];
}

export function getOrientationInfo(orientation: PageOrientation): OrientationInfo {
  const orientations: Record<PageOrientation, OrientationInfo> = {
    PORTRAIT: {
      label: 'Vertical',
      description: 'Página en orientación vertical',
      icon: 'Smartphone'
    },
    LANDSCAPE: {
      label: 'Horizontal',
      description: 'Página en orientación horizontal',
      icon: 'Monitor'
    }
  };
  
  return orientations[orientation];
}

// Función para generar código de plantilla
export function generateTemplateCode(documentType: TemplateDocumentType, existingCodes: string[]): string {
  const typePrefix: Record<TemplateDocumentType, string> = {
    INVOICE: 'FAC',
    QUOTATION: 'COT',
    RECEIPT: 'REC',
    PURCHASE_ORDER: 'OC',
    DELIVERY_NOTE: 'REM',
    CREDIT_NOTE: 'NC',
    DEBIT_NOTE: 'ND',
    PAYMENT_VOUCHER: 'CP',
    EXPENSE_VOUCHER: 'CE',
    INVENTORY_REPORT: 'RI',
    SALES_REPORT: 'RV',
    OTHER: 'DOC'
  };
  
  const prefix = typePrefix[documentType];
  let counter = 1;
  let code = `${prefix}${counter.toString().padStart(3, '0')}`;
  
  while (existingCodes.includes(code)) {
    counter++;
    code = `${prefix}${counter.toString().padStart(3, '0')}`;
  }
  
  return code;
}

// Función para validar plantilla
export function validateTemplate(template: CreatePrintTemplateData): string[] {
  const errors: string[] = [];
  
  if (!template.name.trim()) {
    errors.push('El nombre de la plantilla es requerido');
  }
  
  if (!template.body_template.trim()) {
    errors.push('La plantilla del cuerpo es requerida');
  }
  
  if (template.paper_size === 'CUSTOM') {
    if (!template.custom_width || template.custom_width <= 0) {
      errors.push('El ancho personalizado debe ser mayor a 0');
    }
    if (!template.custom_height || template.custom_height <= 0) {
      errors.push('La altura personalizada debe ser mayor a 0');
    }
  }
  
  if (template.margin_top < 0 || template.margin_bottom < 0 || 
      template.margin_left < 0 || template.margin_right < 0) {
    errors.push('Los márgenes no pueden ser negativos');
  }
  
  if (template.font_size <= 0) {
    errors.push('El tamaño de fuente debe ser mayor a 0');
  }
  
  if (template.line_height <= 0) {
    errors.push('El interlineado debe ser mayor a 0');
  }
  
  return errors;
}
