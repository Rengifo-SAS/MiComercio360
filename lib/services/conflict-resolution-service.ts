/**
 * Servicio de resolución de conflictos para sincronización offline
 * Implementa estrategia last-write-wins con detección de conflictos
 */

import { toast } from 'sonner';

export interface ConflictData<T = any> {
  id: string;
  localVersion: T;
  serverVersion: T;
  localTimestamp: string;
  serverTimestamp: string;
  conflictType: 'update' | 'delete' | 'create';
}

export type ConflictResolutionStrategy = 'local-wins' | 'server-wins' | 'manual';

class ConflictResolutionService {
  /**
   * Detecta conflictos entre versión local y servidor
   */
  detectConflict<T extends { updated_at?: string; created_at?: string }>(
    localData: T,
    serverData: T | null,
    localModifiedAt: string
  ): ConflictData<T> | null {
    // Si no hay versión en servidor, no hay conflicto
    if (!serverData) {
      return null;
    }

    const serverTimestamp = serverData.updated_at || serverData.created_at || '';
    const localTimestamp = localModifiedAt;

    // Si las timestamps son diferentes, hay un posible conflicto
    if (serverTimestamp && serverTimestamp !== localTimestamp) {
      const serverTime = new Date(serverTimestamp).getTime();
      const localTime = new Date(localTimestamp).getTime();

      // Solo es conflicto si el servidor fue modificado después de nuestra última sincronización
      if (serverTime > localTime) {
        return {
          id: (localData as any).id || '',
          localVersion: localData,
          serverVersion: serverData,
          localTimestamp,
          serverTimestamp,
          conflictType: 'update',
        };
      }
    }

    return null;
  }

  /**
   * Resuelve un conflicto según la estrategia especificada
   */
  resolveConflict<T>(
    conflict: ConflictData<T>,
    strategy: ConflictResolutionStrategy = 'local-wins'
  ): T {
    switch (strategy) {
      case 'local-wins':
        console.log('Conflict resolved: local version wins', conflict.id);
        return conflict.localVersion;

      case 'server-wins':
        console.log('Conflict resolved: server version wins', conflict.id);
        return conflict.serverVersion;

      case 'manual':
        // En estrategia manual, devolver versión local y notificar
        toast.warning('Conflicto de datos detectado', {
          description: `Los datos han cambiado en el servidor. Se usará la versión local.`,
          duration: 8000,
        });
        return conflict.localVersion;

      default:
        return conflict.localVersion;
    }
  }

  /**
   * Combina datos de ventas con resolución de conflictos
   */
  mergeSaleData(local: any, server: any): any {
    // Para ventas, priorizar datos locales pero preservar IDs del servidor
    return {
      ...local,
      id: server.id, // Usar ID del servidor si existe
      sale_number: server.sale_number || local.sale_number,
      created_at: server.created_at || local.created_at,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Verifica si los datos locales son más recientes
   */
  isLocalNewer(localTimestamp: string, serverTimestamp: string): boolean {
    const localTime = new Date(localTimestamp).getTime();
    const serverTime = new Date(serverTimestamp).getTime();
    return localTime > serverTime;
  }

  /**
   * Registra conflictos para auditoría
   */
  async logConflict(conflict: ConflictData): Promise<void> {
    console.warn('Data conflict detected:', {
      id: conflict.id,
      type: conflict.conflictType,
      localTime: conflict.localTimestamp,
      serverTime: conflict.serverTimestamp,
    });

    // Aquí podrías guardar en IndexedDB para auditoría
    // await offlineStorage.saveMetadata(`conflict_${conflict.id}`, conflict);
  }
}

// Exportar instancia singleton
export const conflictResolver = new ConflictResolutionService();
