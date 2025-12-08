'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Hook para detectar el estado de conexión a internet
 * Monitorea cambios online/offline y notifica al usuario
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  // Verificar conexión real mediante ping a Supabase (no a la API local)
  const checkRealConnection = useCallback(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Si no hay URL de Supabase configurada, usar el estado del navegador como fallback
    if (!supabaseUrl) {
      return navigator.onLine;
    }

    // Hacer un ping rápido a Supabase con timeout corto para evitar bloqueos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
      // Usar un simple DNS lookup en lugar de llamar a la API
      // Esto evita problemas de autenticación y es más rápido
      await fetch(supabaseUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    // Verificar estado inicial
    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      // Verificar conexión real antes de confirmar
      const reallyOnline = await checkRealConnection();

      if (reallyOnline) {
        setIsOnline(true);

        // Si estuvimos offline, mostrar notificación de reconexión
        if (wasOffline) {
          toast.success('Conexión restablecida', {
            description: 'Las ventas pendientes se sincronizarán automáticamente.',
            duration: 5000,
          });
        }

        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);

      toast.warning('Sin conexión a internet', {
        description: 'Puedes seguir haciendo ventas, tu información se sincronizará al recuperar la conexión.',
        duration: 10000,
      });
    };

    // Listeners para eventos de conexión
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar conexión periódicamente (cada 30 segundos)
    const intervalId = setInterval(async () => {
      const reallyOnline = await checkRealConnection();

      if (reallyOnline !== isOnline) {
        if (reallyOnline) {
          handleOnline();
        } else {
          handleOffline();
        }
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [isOnline, wasOffline, checkRealConnection]);

  return { isOnline, wasOffline };
}