/**
 * Servicio de sincronización automática
 * Sincroniza ventas offline con el servidor cuando hay conexión
 */

import { offlineStorage, PendingSale } from './offline-storage-service';
import { SalesService } from './sales-service';
import { configCache } from './config-cache-service';
import { conflictResolver } from './conflict-resolution-service';
import { toast } from 'sonner';

class SyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  /**
   * Inicia el proceso de sincronización automática
   */
  async startAutoSync(intervalMs: number = 30000): Promise<void> {
    // Sincronización inicial (solo si hay conexión)
    if (typeof window === 'undefined' || navigator.onLine) {
      await this.syncPendingSales();
    }

    // Configurar sincronización periódica
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (typeof window === 'undefined' || navigator.onLine) {
        this.syncPendingSales();
      }
    }, intervalMs);

    // Reintentar al volver la conexión
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncPendingSales();
      });
    }
  }

  /**
   * Detiene la sincronización automática
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sincroniza todas las ventas pendientes
   */
  async syncPendingSales(): Promise<SyncResult> {
    // Evitar sincronización cuando no hay conexión
    if (typeof window !== 'undefined' && !navigator.onLine) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        pending: await offlineStorage.getPendingSalesCount(),
        message: 'Offline - Sync skipped',
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        pending: 0,
        message: 'Sync already in progress',
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      pending: 0,
    };

    try {
      // Obtener ventas pendientes
      const pendingSales = await offlineStorage.getPendingSales();
      result.pending = pendingSales.length;

      if (pendingSales.length === 0) {
        this.notifyListeners({
          isSyncing: false,
          pendingCount: 0,
          lastSyncAt: new Date(),
        });
        return result;
      }

      // Notificar inicio de sincronización
      this.notifyListeners({
        isSyncing: true,
        pendingCount: pendingSales.length,
      });

      // Sincronizar cada venta
      for (const sale of pendingSales) {
        try {
          // Validar que la venta tenga datos
          if (!sale.sale_data) {
            throw new Error('sale_data es undefined o null');
          }

          // Actualizar estado a "syncing"
          await offlineStorage.updateSaleStatus(sale.id, 'syncing');

          // Extraer company_id de los datos de venta
          const saleData = sale.sale_data;

          // Verificar estructura de datos
          if (typeof saleData !== 'object') {
            throw new Error(`sale_data tiene tipo inválido: ${typeof saleData}`);
          }

          const companyId = (saleData as any).company_id;

          if (!companyId) {
            console.error('Datos de venta sin company_id:', saleData);
            throw new Error('company_id no encontrado en los datos de venta');
          }

          // Remover company_id de saleData ya que createSale lo pasa como parámetro separado
          const { company_id, ...saleDataWithoutCompanyId } = saleData as any;

          // Validar que tengamos los campos necesarios
          if (!saleDataWithoutCompanyId.items) {
            console.error('Datos de venta sin items:', saleDataWithoutCompanyId);
            throw new Error('Datos de venta incompletos: falta campo items');
          }

          // Intentar crear la venta en el servidor
          try {
            await SalesService.createSale(companyId, saleDataWithoutCompanyId);
          } catch (createErr: any) {
            const errMsg = String(createErr?.message || createErr || '');
            const isCustomerFk = errMsg.includes('sales_customer_id_fkey');
            const isNumerationFk = errMsg.includes('sales_numeration_id_fkey');

            // Si la FK de cliente falla, reintentar sin customer_id (cliente contado)
            if (isCustomerFk && (saleDataWithoutCompanyId as any).customer_id) {

              const retryData = { ...(saleDataWithoutCompanyId as any) };
              delete (retryData as any).customer_id;

              try {
                await SalesService.createSale(companyId, retryData);


                toast.info('Venta sincronizada', {
                  description: 'Cliente no encontrado en servidor, venta guardada como "Contado"',
                  duration: 6000,
                });
              } catch (retryErr: any) {
                const retryErrMsg = String(retryErr?.message || retryErr || '');
                const isNumerationFkRetry = retryErrMsg.includes('sales_numeration_id_fkey');

                // Si ahora falla por FK de numeración, intentar obtener numeración por defecto
                if (isNumerationFkRetry) {

                  const retryData2 = { ...(retryData as any) };
                  delete (retryData2 as any).numeration_id;

                  try {
                    await SalesService.createSale(companyId, retryData2);


                    toast.info('Venta sincronizada', {
                      description: 'Cliente y numeración no encontrados, venta guardada con valores por defecto',
                      duration: 6000,
                    });
                  } catch (retry2Err) {
                    throw retry2Err;
                  }
                } else {
                  throw retryErr;
                }
              }
            } else if (isNumerationFk && (saleDataWithoutCompanyId as any).numeration_id) {
              // Si la FK de numeración falla directamente, reintentar sin numeration_id

              const retryData = { ...(saleDataWithoutCompanyId as any) };
              delete (retryData as any).numeration_id;

              try {
                await SalesService.createSale(companyId, retryData);


                toast.info('Venta sincronizada', {
                  description: 'Numeración no encontrada en servidor, venta guardada con numeración por defecto',
                  duration: 6000,
                });
              } catch (retryErr) {
                throw retryErr;
              }
            } else {
              throw createErr;
            }
          }

          // Marcar como sincronizada
          await offlineStorage.updateSaleStatus(sale.id, 'synced');

          // Eliminar de la cola de pendientes
          await offlineStorage.deleteSyncedSale(sale.id);

          result.synced++;
        } catch (error) {
          console.error('Error syncing sale:', error);
          console.error('Venta que falló:', sale);

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // Verificar si es un error de conectividad
          const isNetworkError = errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('NetworkError') ||
            errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
            errorMessage.includes('conexión') ||
            errorMessage.includes('PGRST301');

          // Si es error de red, mantener como pending para reintentar
          // Si es error de datos, marcar como failed
          const newStatus = isNetworkError ? 'pending' : 'failed';

          await offlineStorage.updateSaleStatus(
            sale.id,
            newStatus,
            errorMessage
          );

          result.failed++;

          // Solo notificar errores de datos, no de conectividad
          if (!isNetworkError && sale.sync_attempts >= 2) {
            toast.error('Error sincronizando venta', {
              description: `Venta ${sale.id.slice(0, 8)} tiene errores de datos. Revisa los detalles.`,
              duration: 8000,
            });
          }
        }
      }

      // Actualizar metadata de última sincronización
      await offlineStorage.saveMetadata('last_sync', new Date().toISOString());

      // Notificar resultado
      if (result.synced > 0) {
        toast.success('Ventas sincronizadas', {
          description: `${result.synced} venta(s) sincronizada(s) exitosamente.`,
          duration: 5000,
        });
      }

      if (result.failed > 0) {
        toast.warning('Algunas ventas no se sincronizaron', {
          description: `${result.failed} venta(s) fallaron. Se reintentará automáticamente.`,
          duration: 7000,
        });
      }

      // Actualizar conteo de pendientes
      const remainingPending = await offlineStorage.getPendingSalesCount();
      this.notifyListeners({
        isSyncing: false,
        pendingCount: remainingPending,
        lastSyncAt: new Date(),
      });

      result.success = result.failed === 0;
      result.message = `Synced: ${result.synced}, Failed: ${result.failed}`;

      return result;
    } catch (error) {
      console.error('Error in sync process:', error);
      result.success = false;
      result.message =
        error instanceof Error ? error.message : 'Unknown error';

      toast.error('Error en la sincronización', {
        description: 'Ocurrió un error al sincronizar las ventas. Se reintentará automáticamente.',
        duration: 5000,
      });

      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Registra un listener para cambios en el estado de sincronización
   */
  addListener(callback: (status: SyncStatus) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Elimina un listener
   */
  removeListener(callback: (status: SyncStatus) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Notifica a todos los listeners sobre cambios en el estado
   */
  private notifyListeners(status: SyncStatus): void {
    this.listeners.forEach((callback) => callback(status));
  }

  /**
   * Obtiene el conteo actual de ventas pendientes
   */
  async getPendingCount(): Promise<number> {
    return await offlineStorage.getPendingSalesCount();
  }

  /**
   * Fuerza una sincronización inmediata (manual)
   */
  async forceSyncNow(): Promise<SyncResult> {
    toast.info('Iniciando sincronización manual...', {
      duration: 2000,
    });

    return await this.syncPendingSales();
  }
}

// Tipos e interfaces
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  pending: number;
  message?: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt?: Date;
}

// Exportar instancia singleton
export const syncService = new SyncService();
