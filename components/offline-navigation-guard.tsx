'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';
import { useNavigationRestrictions } from '@/lib/hooks/use-offline-restrictions';
import { offlineStorage } from '@/lib/services/offline-storage-service';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';

interface OfflineNavigationGuardProps {
  currentPath: string;
}

export function OfflineNavigationGuard({
  currentPath,
}: OfflineNavigationGuardProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [targetPath, setTargetPath] = useState<string>('');
  const { isOnline } = useOnlineStatus();
  const { isNavigationAllowed, getNavigationWarning } =
    useNavigationRestrictions();
  const router = useRouter();

  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      // Verificar si hay ventas pendientes sin sincronizar
      try {
        const pendingCount = await offlineStorage.getPendingSalesCount();
        if (pendingCount > 0) {
          e.preventDefault();
          const message = `Tienes ${pendingCount} venta${
            pendingCount > 1 ? 's' : ''
          } pendiente${
            pendingCount > 1 ? 's' : ''
          } sin sincronizar. ¿Seguro que quieres salir?`;
          e.returnValue = message;
          return message;
        }
      } catch (error) {
        console.error('Error al verificar ventas pendientes:', error);
      }

      // Advertencia si estamos offline (en cualquier ruta del dashboard)
      if (!isOnline) {
        e.preventDefault();
        e.returnValue =
          'Estás en modo offline. ¿Seguro que quieres recargar o salir? Podrías perder el contexto.';
        return e.returnValue;
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      // Prevenir navegación no autorizada cuando está offline
      if (!isOnline) {
        e.preventDefault();
        const target = window.location.pathname;

        if (!isNavigationAllowed(target)) {
          setTargetPath(target);
          setShowWarning(true);
          // Restaurar la URL actual
          window.history.pushState(null, '', currentPath);
        }
      }
    };

    const handleLinkClick = (e: MouseEvent) => {
      if (isOnline) return;

      // Capturar clicks en enlaces para bloquear navegación restringida en offline
      const anchor = (e.target as HTMLElement)?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Ignorar enlaces externos
      const isExternal =
        /^https?:\/\//i.test(href) || href.startsWith('mailto:');
      if (isExternal) return;

      // Obtener la ruta de destino (relativa)
      const url = new URL(href, window.location.origin);
      const path = url.pathname;

      if (!isNavigationAllowed(path)) {
        e.preventDefault();
        setTargetPath(path);
        setShowWarning(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    // Usamos capture para asegurar que interceptamos antes que Next.js Link
    document.addEventListener('click', handleLinkClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [isOnline, currentPath, isNavigationAllowed]);

  const handleConfirmNavigation = () => {
    setShowWarning(false);
    if (targetPath) {
      router.push(targetPath);
    }
  };

  const handleCancelNavigation = () => {
    setShowWarning(false);
    setTargetPath('');
  };

  if (!showWarning) {
    return null;
  }

  const warningMessage = getNavigationWarning(targetPath);

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Navegación Restringida
          </DialogTitle>
          <DialogDescription>
            {warningMessage ||
              'Esta funcionalidad no está disponible en modo offline.'}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Modo Offline Activo</p>
              <p className="text-sm text-muted-foreground">
                Para acceder a otros módulos, necesitas una conexión a internet
                estable. El POS funciona completamente offline y las ventas se
                sincronizarán automáticamente.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCancelNavigation}>
            Permanecer aquí
          </Button>
          {isOnline && (
            <Button
              onClick={handleConfirmNavigation}
              className="flex items-center gap-2"
            >
              <Wifi className="h-4 w-4" />
              Continuar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook para usar el guard en cualquier página
export function useOfflineNavigationGuard() {
  const { isOnline } = useOnlineStatus();
  const { isNavigationAllowed } = useNavigationRestrictions();

  const checkNavigation = (targetPath: string): boolean => {
    if (isOnline) {
      return true;
    }

    return isNavigationAllowed(targetPath);
  };

  const getOfflineMessage = (): string => {
    if (!isOnline) {
      return 'Estás en modo offline. Solo el POS está disponible para evitar pérdida de datos.';
    }
    return '';
  };

  return {
    isOnline,
    checkNavigation,
    getOfflineMessage,
    canNavigateOffline: isNavigationAllowed,
  };
}
