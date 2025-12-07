// Tipos para el módulo de plantillas de impresión
// lib/types/print-templates.ts

export type TemplateDocumentType = 
  | 'INVOICE'           // Factura de venta
  | 'QUOTATION'         // Cotización
  | 'DELIVERY_NOTE'     // Remisión
  | 'TRANSACTION'       // Transacción
  | 'PURCHASE_ORDER';   // Orden de compra

export const PrintDocumentTypeValues: TemplateDocumentType[] = [
  'INVOICE',
  'QUOTATION',
  'DELIVERY_NOTE',
  'TRANSACTION',
  'PURCHASE_ORDER'
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

// Tipos para configuración de plantillas
export type TemplateStyle = 
  | 'CLASSIC'      // Clásico (Carta electrónica)
  | 'MODERN'       // Moderno
  | 'MINIMAL'      // Minimalista
  | 'CORPORATE';   // Corporativo

export const TemplateStyleValues: TemplateStyle[] = [
  'CLASSIC',
  'MODERN',
  'MINIMAL',
  'CORPORATE'
];

export type FontType = 
  | 'HELVETICA'    // Helvetica
  | 'ARIAL'        // Arial
  | 'TIMES'        // Times New Roman
  | 'CALIBRI'      // Calibri
  | 'GEORGIA'      // Georgia
  | 'VERDANA';     // Verdana

export const FontTypeValues: FontType[] = [
  'HELVETICA',
  'ARIAL',
  'TIMES',
  'CALIBRI',
  'GEORGIA',
  'VERDANA'
];

export type FontSize = 
  | 'SMALL'        // Pequeño
  | 'NORMAL'       // Normal
  | 'LARGE'        // Grande
  | 'EXTRA_LARGE'; // Extra Grande

export const FontSizeValues: FontSize[] = [
  'SMALL',
  'NORMAL',
  'LARGE',
  'EXTRA_LARGE'
];

export type ChangeType = 
  | 'CREATED'      // Creado
  | 'UPDATED'      // Actualizado
  | 'ACTIVATED'    // Activado
  | 'DEACTIVATED'  // Desactivado
  | 'DELETED';     // Eliminado

export interface PrintTemplate {
  [key: string]: unknown;
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
  
  // Nueva configuración de plantilla
  template_style: TemplateStyle;
  font_type: FontType;
  font_size_preset: FontSize;
  item_spacing: number;
  show_total_items: boolean;
  third_party_income: boolean;
  taxes_included: boolean;
  
  // Configuración de columnas
  show_discount_column: boolean;
  show_tax_value_column: boolean;
  show_tax_percentage_column: boolean;
  show_unit_measure_column: boolean;
  
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
  [key: string]: unknown;
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
  
  // Nueva configuración de plantilla
  template_style?: TemplateStyle;
  font_type?: FontType;
  font_size_preset?: FontSize;
  item_spacing?: number;
  show_total_items?: boolean;
  third_party_income?: boolean;
  taxes_included?: boolean;
  
  // Configuración de columnas
  show_discount_column?: boolean;
  show_tax_value_column?: boolean;
  show_tax_percentage_column?: boolean;
  show_unit_measure_column?: boolean;
  
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
export function getDocumentTypeInfo(type: TemplateDocumentType): DocumentTypeInfo | undefined {
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
    DELIVERY_NOTE: {
      label: 'Remisión',
      description: 'Documento de entrega de mercancía',
      icon: 'Truck',
      color: 'bg-purple-500',
      defaultPaperSize: 'A4',
      defaultOrientation: 'PORTRAIT'
    },
    TRANSACTION: {
      label: 'Transacción',
      description: 'Documento de transacción comercial',
      icon: 'CreditCard',
      color: 'bg-indigo-500',
      defaultPaperSize: 'A4',
      defaultOrientation: 'PORTRAIT'
    },
    PURCHASE_ORDER: {
      label: 'Orden de Compra',
      description: 'Solicitud de compra a proveedores',
      icon: 'ShoppingCart',
      color: 'bg-orange-500',
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

// Información de estilos de plantilla para UI
export interface TemplateStyleInfo {
  label: string;
  description: string;
  icon: string;
}

// Información de tipos de fuente para UI
export interface FontTypeInfo {
  label: string;
  fontFamily: string;
  icon: string;
}

// Información de tamaños de fuente para UI
export interface FontSizeInfo {
  label: string;
  size: number;
  icon: string;
}

export function getTemplateStyleInfo(style: TemplateStyle): TemplateStyleInfo {
  const styles: Record<TemplateStyle, TemplateStyleInfo> = {
    CLASSIC: {
      label: 'Clásico (Carta electrónica)',
      description: 'Estilo clásico para documentos electrónicos',
      icon: 'FileText'
    },
    MODERN: {
      label: 'Moderno',
      description: 'Diseño moderno y limpio',
      icon: 'Zap'
    },
    MINIMAL: {
      label: 'Minimalista',
      description: 'Diseño minimalista y simple',
      icon: 'Minus'
    },
    CORPORATE: {
      label: 'Corporativo',
      description: 'Diseño profesional corporativo',
      icon: 'Building'
    }
  };
  
  return styles[style];
}

export function getFontTypeInfo(fontType: FontType): FontTypeInfo {
  const fonts: Record<FontType, FontTypeInfo> = {
    HELVETICA: {
      label: 'Helvetica',
      fontFamily: 'Helvetica, Arial, sans-serif',
      icon: 'Type'
    },
    ARIAL: {
      label: 'Arial',
      fontFamily: 'Arial, sans-serif',
      icon: 'Type'
    },
    TIMES: {
      label: 'Times New Roman',
      fontFamily: 'Times New Roman, serif',
      icon: 'Type'
    },
    CALIBRI: {
      label: 'Calibri',
      fontFamily: 'Calibri, sans-serif',
      icon: 'Type'
    },
    GEORGIA: {
      label: 'Georgia',
      fontFamily: 'Georgia, serif',
      icon: 'Type'
    },
    VERDANA: {
      label: 'Verdana',
      fontFamily: 'Verdana, sans-serif',
      icon: 'Type'
    }
  };
  
  return fonts[fontType];
}

export function getFontSizeInfo(fontSize: FontSize): FontSizeInfo {
  const sizes: Record<FontSize, FontSizeInfo> = {
    SMALL: {
      label: 'Pequeño',
      size: 10,
      icon: 'Minus'
    },
    NORMAL: {
      label: 'Normal',
      size: 12,
      icon: 'Type'
    },
    LARGE: {
      label: 'Grande',
      size: 14,
      icon: 'Plus'
    },
    EXTRA_LARGE: {
      label: 'Extra Grande',
      size: 16,
      icon: 'Maximize'
    }
  };
  
  return sizes[fontSize];
}

// Función para generar código de plantilla
export function generateTemplateCode(documentType: TemplateDocumentType, existingCodes: string[]): string {
  const typePrefix: Record<TemplateDocumentType, string> = {
    INVOICE: 'FAC',
    QUOTATION: 'COT',
    DELIVERY_NOTE: 'REM',
    TRANSACTION: 'TRA',
    PURCHASE_ORDER: 'OC'
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
  
  if ((template.margin_top ?? 0) < 0 || (template.margin_bottom ?? 0) < 0 || 
      (template.margin_left ?? 0) < 0 || (template.margin_right ?? 0) < 0) {
    errors.push('Los márgenes no pueden ser negativos');
  }
  
  if ((template.font_size ?? 0) <= 0) {
    errors.push('El tamaño de fuente debe ser mayor a 0');
  }
  
  if ((template.line_height ?? 0) <= 0) {
    errors.push('El interlineado debe ser mayor a 0');
  }
  
  return errors;
}