// Types for Import Jobs System

export type ImportJobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIALLY_COMPLETED';

export interface ImportJob {
  id: string;
  company_id: string;
  filename: string;
  file_size?: number;
  file_path?: string;
  config: ImportConfig;
  status: ImportJobStatus;
  total_rows: number;
  processed_rows: number;
  imported_rows: number;
  updated_rows: number;
  skipped_rows: number;
  error_rows: number;
  progress_percentage: number;
  current_step?: string;
  result_data?: ImportResult;
  errors: ImportError[];
  warnings: ImportWarning[];
  started_at?: string;
  completed_at?: string;
  execution_time_ms?: number;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface ImportConfig {
  companyId: string;
  userId: string;
  updateExistingProducts: boolean;
  createMissingCategories: boolean;
  createMissingWarehouses: boolean;
  skipProductsWithErrors: boolean;
  batchSize?: number; // Tamaño de lote para procesamiento
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  data?: any;
}

export interface ImportWarning {
  row: number;
  message: string;
  data?: any;
}

export interface ProductImportData {
  // Campos básicos
  name: string;
  sku: string;
  barcode?: string;
  description?: string;

  // Categoría y bodega
  category_name: string;
  warehouse_name?: string;

  // Precios
  cost_price: number;
  selling_price: number;

  // Stock
  available_quantity: number;
  min_stock?: number;
  max_stock?: number;
  unit?: string;

  // Impuestos (en porcentaje: 19 para 19%)
  iva_rate: number;
  ica_rate: number;
  retencion_rate: number;

  // Clasificación fiscal
  fiscal_classification?: string;
  excise_tax?: boolean;
}

// Evento de progreso de importación
export interface ImportProgressEvent {
  jobId: string;
  status: ImportJobStatus;
  progress: number;
  currentStep: string;
  processedRows: number;
  totalRows: number;
  importedRows: number;
  updatedRows: number;
  errorRows: number;
  skippedRows: number;
}

// Parámetros para crear un job
export interface CreateImportJobData {
  filename: string;
  file_size?: number;
  total_rows: number;
  config: ImportConfig;
}

// Parámetros para actualizar un job
export interface UpdateImportJobData {
  status?: ImportJobStatus;
  processed_rows?: number;
  imported_rows?: number;
  updated_rows?: number;
  skipped_rows?: number;
  error_rows?: number;
  progress_percentage?: number;
  current_step?: string;
  result_data?: ImportResult;
  errors?: ImportError[];
  warnings?: ImportWarning[];
}

// Helper functions
export function getStatusColor(status: ImportJobStatus): string {
  const colors: Record<ImportJobStatus, string> = {
    PENDING: 'text-gray-600 bg-gray-50 border-gray-200',
    PROCESSING: 'text-blue-600 bg-blue-50 border-blue-200',
    COMPLETED: 'text-green-600 bg-green-50 border-green-200',
    FAILED: 'text-red-600 bg-red-50 border-red-200',
    PARTIALLY_COMPLETED: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  };
  return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
}

export function getStatusLabel(status: ImportJobStatus): string {
  const labels: Record<ImportJobStatus, string> = {
    PENDING: 'Pendiente',
    PROCESSING: 'Procesando',
    COMPLETED: 'Completado',
    FAILED: 'Fallido',
    PARTIALLY_COMPLETED: 'Completado con errores',
  };
  return labels[status] || status;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
