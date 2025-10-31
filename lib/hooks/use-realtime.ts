/**
 * Hook para suscribirse a cambios en tiempo real
 * Maneja automáticamente la suscripción y limpieza
 */

'use client';

import { useEffect, useState } from 'react';
import { realtimeService } from '@/lib/services/realtime-service';

interface UseRealtimeOptions {
  companyId: string;
  enabled?: boolean;
  onSaleCreated?: (sale: any) => void;
  onSaleUpdated?: (sale: any) => void;
  onProductUpdated?: (product: any) => void;
  onInventoryUpdated?: (inventory: any) => void;
  onShiftUpdated?: (shift: any) => void;
}

export function useRealtime(options: UseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const { companyId, enabled = true, ...callbacks } = options;

  useEffect(() => {
    if (!enabled || !companyId) {
      return;
    }

    // Inicializar suscripciones
    realtimeService.initializePOSSubscriptions({
      companyId,
      ...callbacks,
    });

    setIsConnected(true);

    // Limpiar al desmontar
    return () => {
      realtimeService.unsubscribeAll();
      setIsConnected(false);
    };
  }, [companyId, enabled]);

  return {
    isConnected,
    connectionStatus: realtimeService.getConnectionStatus(),
  };
}
