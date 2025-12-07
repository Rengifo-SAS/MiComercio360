import { offlineStorage } from './offline-storage-service';
import { toast } from 'sonner';

export class OfflineDataCleanupService {
  /**
   * Limpia ventas offline con datos corruptos o incompletos
   */
  static async cleanupCorruptedSales(): Promise<void> {
    try {
      const pendingSales = await offlineStorage.getPendingSales();
      let cleanedCount = 0;

      for (const sale of pendingSales) {
        let needsCleanup = false;
        const issues: string[] = [];

        // Verificar que sale_data existe
        if (!sale.sale_data) {
          needsCleanup = true;
          issues.push('sale_data faltante');
        } else {
          const saleData = sale.sale_data as any;

          // Verificar que company_id existe
          if (!saleData.company_id) {
            needsCleanup = true;
            issues.push('company_id faltante');
          }

          // Verificar que items existe y es un array
          if (!saleData.items || !Array.isArray(saleData.items)) {
            needsCleanup = true;
            issues.push('items faltante o inválido');
          }

          // Verificar campos requeridos
          if (!saleData.total_amount || saleData.total_amount <= 0) {
            needsCleanup = true;
            issues.push('total_amount inválido');
          }

          if (!saleData.payment_method) {
            needsCleanup = true;
            issues.push('payment_method faltante');
          }
        }

        if (needsCleanup) {
          console.warn(`Eliminando venta corrupta ${sale.id}:`, issues);
          await offlineStorage.deleteSyncedSale(sale.id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        toast.info('Limpieza completada', {
          description: `Se eliminaron ${cleanedCount} venta(s) con datos corruptos.`,
          duration: 5000,
        });
      }

      return;
    } catch (error) {
      console.error('Error durante limpieza de datos offline:', error);
      toast.error('Error en limpieza de datos', {
        description: 'No se pudieron limpiar todas las ventas corruptas.',
        duration: 5000,
      });
    }
  }

  /**
   * Migra ventas existentes sin company_id agregándolo basado en el contexto
   */
  static async migrateOldSales(companyId: string): Promise<void> {
    try {
      const pendingSales = await offlineStorage.getPendingSales();
      let migratedCount = 0;

      for (const sale of pendingSales) {
        if (sale.sale_data) {
          const saleData = sale.sale_data as any;

          // Si no tiene company_id, agregarlo
          if (!saleData.company_id && companyId) {
            saleData.company_id = companyId;
            
            // Actualizar la venta en storage
            const updatedSale = {
              ...sale,
              sale_data: saleData,
            };

            await offlineStorage.savePendingSale(updatedSale);
            migratedCount++;
          }
        }
      }

      if (migratedCount > 0) {
        toast.success('Migración completada', {
          description: `Se actualizaron ${migratedCount} venta(s) offline.`,
          duration: 5000,
        });
      }

      return;
    } catch (error) {
      console.error('Error durante migración de ventas:', error);
      toast.error('Error en migración', {
        description: 'No se pudieron migrar todas las ventas.',
        duration: 5000,
      });
    }
  }

  /**
   * Obtiene estadísticas de ventas offline
   */
  static async getOfflineStats() {
    try {
      const pendingSales = await offlineStorage.getPendingSales();
      
      const stats = {
        total: pendingSales.length,
        withCompanyId: 0,
        withoutCompanyId: 0,
        corrupted: 0,
        valid: 0,
      };

      for (const sale of pendingSales) {
        if (!sale.sale_data) {
          stats.corrupted++;
          continue;
        }

        const saleData = sale.sale_data as any;

        if (saleData.company_id) {
          stats.withCompanyId++;
        } else {
          stats.withoutCompanyId++;
        }

        // Verificar si la venta es válida
        if (
          saleData.company_id &&
          saleData.items &&
          Array.isArray(saleData.items) &&
          saleData.total_amount > 0 &&
          saleData.payment_method
        ) {
          stats.valid++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }
}