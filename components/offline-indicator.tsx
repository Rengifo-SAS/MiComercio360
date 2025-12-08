'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';
import { syncService, SyncStatus } from '@/lib/services/sync-service';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Indicador visual del estado de conexión y sincronización
 * Muestra si está online/offline y cuántas ventas hay pendientes de sincronizar
 */
export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
  });

  useEffect(() => {
    // Listener para actualizaciones de sincronización
    const handleSyncUpdate = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    syncService.addListener(handleSyncUpdate);

    // Obtener conteo inicial
    syncService.getPendingCount().then((count) => {
      setSyncStatus((prev) => ({ ...prev, pendingCount: count }));
    });

    return () => {
      syncService.removeListener(handleSyncUpdate);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline || syncStatus.isSyncing) return;
    try {
      await syncService.forceSyncNow();
    } catch (error) {
      console.error('Error en sincronización manual:', error);
      // La gestión de errores ya está en el syncService
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              isOnline
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
            )}
          >
            {/* Icono de estado */}
            {isOnline ? (
              <Cloud className="h-4 w-4" />
            ) : (
              <CloudOff className="h-4 w-4 animate-pulse" />
            )}

            {/* Estado */}
            <span className="hidden sm:inline">
              {isOnline ? 'En línea' : 'Sin conexión'}
            </span>

            {/* Contador de pendientes */}
            {syncStatus.pendingCount > 0 && (
              <>
                <span className="text-xs opacity-75">•</span>
                <span className="flex items-center gap-1">
                  {syncStatus.isSyncing ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {syncStatus.pendingCount}
                  <span className="hidden md:inline">pendiente(s)</span>
                </span>
              </>
            )}

            {/* Botón de sincronización manual */}
            {isOnline &&
              syncStatus.pendingCount > 0 &&
              !syncStatus.isSyncing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                  onClick={handleManualSync}
                  title="Sincronizar ahora"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">
              {isOnline ? 'Conectado a Internet' : 'Modo Offline'}
            </p>
            {!isOnline && (
              <p className="text-xs text-muted-foreground">
                Puedes seguir facturando. Las ventas se sincronizarán
                automáticamente al recuperar la conexión.
              </p>
            )}
            {syncStatus.pendingCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {syncStatus.pendingCount} venta(s) esperando sincronización
              </p>
            )}
            {syncStatus.lastSyncAt && (
              <p className="text-xs text-muted-foreground">
                Última sincronización:{' '}
                {syncStatus.lastSyncAt.toLocaleTimeString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
