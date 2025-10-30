import { createClient } from '@/lib/supabase/client';
import type {
  ImportJob,
  ImportJobStatus,
  CreateImportJobData,
  UpdateImportJobData,
  ImportProgressEvent,
  ImportResult,
  ImportConfig,
  ProductImportData,
} from '@/lib/types/import-jobs';
import { ProductsImportService } from './products-import-service';

/**
 * Servicio para gestionar jobs asíncronos de importación
 */
export class ImportJobsService {
  private static supabase = createClient();
  private static readonly BATCH_SIZE = 50; // Procesar productos en lotes de 50
  private static readonly POLLING_INTERVAL = 1000; // Actualizar cada segundo

  /**
   * Crear un nuevo job de importación
   */
  static async createJob(
    companyId: string,
    userId: string,
    data: CreateImportJobData
  ): Promise<ImportJob> {
    try {
      const { data: job, error } = await this.supabase
        .from('import_jobs')
        .insert({
          company_id: companyId,
          filename: data.filename,
          file_size: data.file_size,
          total_rows: data.total_rows,
          config: data.config,
          status: 'PENDING',
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      return job;
    } catch (error) {
      console.error('Error creating import job:', error);
      throw new Error('Error al crear job de importación');
    }
  }

  /**
   * Obtener un job por ID
   */
  static async getJob(jobId: string): Promise<ImportJob | null> {
    try {
      const { data, error } = await this.supabase
        .from('import_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching import job:', error);
      return null;
    }
  }

  /**
   * Obtener todos los jobs de una empresa
   */
  static async getJobs(
    companyId: string,
    limit: number = 50
  ): Promise<ImportJob[]> {
    try {
      const { data, error } = await this.supabase
        .from('import_jobs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching import jobs:', error);
      return [];
    }
  }

  /**
   * Actualizar el estado de un job
   */
  static async updateJob(
    jobId: string,
    updates: UpdateImportJobData
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('import_jobs')
        .update(updates)
        .eq('id', jobId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating import job:', error);
      throw new Error('Error al actualizar job');
    }
  }

  /**
   * Iniciar el procesamiento de un job
   */
  static async startJob(jobId: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('start_import_job', {
        p_job_id: jobId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error starting import job:', error);
      throw new Error('Error al iniciar job');
    }
  }

  /**
   * Completar un job con resultados
   */
  static async completeJob(
    jobId: string,
    status: ImportJobStatus,
    result: ImportResult
  ): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('complete_import_job', {
        p_job_id: jobId,
        p_status: status,
        p_result_data: result,
        p_errors: result.errors,
        p_warnings: result.warnings,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error completing import job:', error);
      throw new Error('Error al completar job');
    }
  }

  /**
   * Actualizar el progreso de un job
   */
  static async updateProgress(
    jobId: string,
    processedRows: number,
    importedRows: number,
    updatedRows: number,
    skippedRows: number,
    errorRows: number,
    currentStep: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('update_import_job_progress', {
        p_job_id: jobId,
        p_processed_rows: processedRows,
        p_imported_rows: importedRows,
        p_updated_rows: updatedRows,
        p_skipped_rows: skippedRows,
        p_error_rows: errorRows,
        p_current_step: currentStep,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating job progress:', error);
      // No lanzar error, solo loguear
    }
  }

  /**
   * Procesar productos en lotes con actualizaciones de progreso
   */
  static async processProductsInBatches(
    jobId: string,
    products: ProductImportData[],
    config: ImportConfig,
    onProgress?: (event: ImportProgressEvent) => void
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Marcar job como iniciado
      await this.startJob(jobId);

      // Obtener datos necesarios una sola vez
      const [categoriesResult, existingProductsResult, warehousesResult] = await Promise.all([
        this.supabase
          .from('categories')
          .select('id, name')
          .eq('company_id', config.companyId)
          .eq('is_active', true),
        this.supabase
          .from('products')
          .select('id, sku, barcode, name')
          .eq('company_id', config.companyId),
        this.supabase
          .from('warehouses')
          .select('id, name, is_main')
          .eq('company_id', config.companyId)
          .eq('is_active', true)
      ]);

      if (categoriesResult.error) throw new Error(`Error obteniendo categorías: ${categoriesResult.error.message}`);
      if (existingProductsResult.error) throw new Error(`Error obteniendo productos: ${existingProductsResult.error.message}`);
      if (warehousesResult.error) throw new Error(`Error obteniendo bodegas: ${warehousesResult.error.message}`);

      const categories = categoriesResult.data || [];
      const existingProducts = existingProductsResult.data || [];
      const warehouses = warehousesResult.data || [];

      // Crear mapas
      const categoryMap = new Map(categories.map((c: any) => [c.name.toLowerCase().trim(), c.id]));
      const warehouseMap = new Map(warehouses.map((w: any) => [w.name.toLowerCase().trim(), w.id]));
      const existingProductMap = new Map();

      existingProducts.forEach((p: any) => {
        if (p.sku) existingProductMap.set(`sku:${p.sku.toLowerCase().trim()}`, p);
        if (p.barcode) existingProductMap.set(`barcode:${p.barcode.toLowerCase().trim()}`, p);
      });

      const mainWarehouse = warehouses.find((w: any) => w.is_main);
      const mainWarehouseId = mainWarehouse?.id || (warehouses.length > 0 ? warehouses[0].id : null);

      // Procesar en lotes
      const batchSize = config.batchSize || this.BATCH_SIZE;
      const totalBatches = Math.ceil(products.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * batchSize;
        const end = Math.min(start + batchSize, products.length);
        const batch = products.slice(start, end);

        // Procesar productos del lote
        for (let i = 0; i < batch.length; i++) {
          const product = batch[i];
          const rowNumber = start + i + 2; // +2 por headers

          try {
            const processResult = await (ProductsImportService as any).processProduct(
              product,
              config,
              categoryMap,
              warehouseMap,
              existingProductMap,
              mainWarehouseId,
              rowNumber
            );

            if (processResult.success) {
              if (processResult.updated) {
                result.updated++;
              } else {
                result.imported++;
              }

              if (processResult.warning) {
                result.warnings.push(processResult.warning);
              }
            } else if (processResult.error) {
              result.errors.push(processResult.error);
              result.skipped++;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            result.errors.push({
              row: rowNumber,
              field: 'import',
              message: `Error procesando producto: ${errorMessage}`,
              data: product
            });
            result.skipped++;
          }
        }

        // Actualizar progreso en la base de datos
        const processedRows = end;
        const progress = Math.round((processedRows / products.length) * 100);

        await this.updateProgress(
          jobId,
          processedRows,
          result.imported,
          result.updated,
          result.skipped,
          result.errors.length,
          `Procesando lote ${batchIndex + 1} de ${totalBatches}`
        );

        // Notificar progreso
        if (onProgress) {
          onProgress({
            jobId,
            status: 'PROCESSING',
            progress,
            currentStep: `Procesando lote ${batchIndex + 1} de ${totalBatches}`,
            processedRows,
            totalRows: products.length,
            importedRows: result.imported,
            updatedRows: result.updated,
            errorRows: result.errors.length,
            skippedRows: result.skipped,
          });
        }

        // Pequeña pausa entre lotes para no saturar la BD
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Determinar estado final
      result.success = result.errors.length === 0;
      const finalStatus: ImportJobStatus =
        result.errors.length === 0 ? 'COMPLETED' :
        result.imported > 0 || result.updated > 0 ? 'PARTIALLY_COMPLETED' :
        'FAILED';

      // Completar job
      await this.completeJob(jobId, finalStatus, result);

      // Notificar finalización
      if (onProgress) {
        onProgress({
          jobId,
          status: finalStatus,
          progress: 100,
          currentStep: 'Importación completada',
          processedRows: products.length,
          totalRows: products.length,
          importedRows: result.imported,
          updatedRows: result.updated,
          errorRows: result.errors.length,
          skippedRows: result.skipped,
        });
      }

      return result;
    } catch (error) {
      console.error('Error processing products in batches:', error);

      // Marcar job como fallido
      const errorResult: ImportResult = {
        success: false,
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errors: [
          ...result.errors,
          {
            row: 0,
            field: 'process',
            message: `Error durante el procesamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          }
        ],
        warnings: result.warnings,
      };

      await this.completeJob(jobId, 'FAILED', errorResult);

      throw error;
    }
  }

  /**
   * Suscribirse a actualizaciones de un job en tiempo real
   */
  static subscribeToJob(
    jobId: string,
    onUpdate: (job: ImportJob) => void
  ): () => void {
    const channel = this.supabase
      .channel(`import-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'import_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          onUpdate(payload.new as ImportJob);
        }
      )
      .subscribe();

    // Retornar función de limpieza
    return () => {
      channel.unsubscribe();
    };
  }

  /**
   * Polling manual del estado de un job (fallback si realtime no funciona)
   */
  static async pollJobStatus(
    jobId: string,
    onUpdate: (job: ImportJob) => void,
    intervalMs: number = 1000
  ): Promise<() => void> {
    let polling = true;

    const poll = async () => {
      while (polling) {
        try {
          const job = await this.getJob(jobId);
          if (job) {
            onUpdate(job);

            // Dejar de hacer polling si el job está completo
            if (['COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED'].includes(job.status)) {
              polling = false;
              break;
            }
          }
        } catch (error) {
          console.error('Error polling job status:', error);
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    };

    // Iniciar polling
    poll();

    // Retornar función de limpieza
    return () => {
      polling = false;
    };
  }

  /**
   * Eliminar un job
   */
  static async deleteJob(jobId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('import_jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting import job:', error);
      throw new Error('Error al eliminar job');
    }
  }

  /**
   * Limpiar jobs antiguos (más de 30 días)
   */
  static async cleanupOldJobs(): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('cleanup_old_import_jobs');

      if (error) throw error;

      return data || 0;
    } catch (error) {
      console.error('Error cleaning up old jobs:', error);
      return 0;
    }
  }
}
