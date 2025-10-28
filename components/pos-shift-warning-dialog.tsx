'use client';

import { useState, useEffect } from 'react';
import { Shift, calculateShiftDuration, formatShiftDuration } from '@/lib/types/shifts';
import { ShiftsService } from '@/lib/services/shifts-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

interface POSShiftWarningDialogProps {
  companyId: string;
  userId: string;
}

export function POSShiftWarningDialog({
  companyId,
  userId,
}: POSShiftWarningDialogProps) {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [shiftDuration, setShiftDuration] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false);

  // Cargar turno activo y verificar duración
  useEffect(() => {
    if (companyId && userId) {
      loadActiveShift();
    }
  }, [companyId, userId]);

  // Verificar duración cada minuto
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeShift && activeShift.status === 'open') {
      interval = setInterval(() => {
        checkShiftDuration();
      }, 60000); // Verificar cada minuto
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeShift]);

  const loadActiveShift = async () => {
    try {
      const shift = await ShiftsService.getActiveShift(companyId);
      setActiveShift(shift);
      
      if (shift && shift.status === 'open') {
        checkShiftDuration();
      }
    } catch (error) {
      console.error('Error cargando turno activo:', error);
    }
  };

  const checkShiftDuration = () => {
    if (!activeShift || activeShift.status !== 'open') return;

    const duration = calculateShiftDuration(
      activeShift.start_time,
      new Date().toISOString()
    );

    if (duration !== null) {
      const durationInHours = duration / (1000 * 60 * 60);
      const formattedDuration = formatShiftDuration(duration);
      setShiftDuration(formattedDuration);

      // Mostrar advertencia si el turno lleva más de 12 horas
      if (durationInHours >= 12 && !hasShownWarning) {
        setShowDialog(true);
        setHasShownWarning(true);
        
        // Mostrar toast adicional para mayor visibilidad
        toast.warning(
          `⚠️ Turno activo por más de 12 horas (${formattedDuration})`,
          {
            duration: 10000,
            position: 'top-center',
            style: {
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              color: '#92400e',
            },
          }
        );
      }
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;

    try {
      setIsLoading(true);
      
      // Aquí podrías abrir un diálogo para cerrar el turno
      // Por ahora solo cerramos el diálogo de advertencia
      setShowDialog(false);
      
      toast.info('Considere cerrar el turno actual para evitar problemas');
    } catch (error) {
      console.error('Error cerrando turno:', error);
      toast.error('Error al cerrar el turno');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismissWarning = () => {
    setShowDialog(false);
    // Volver a mostrar la advertencia en 2 horas
    setTimeout(() => {
      setHasShownWarning(false);
    }, 2 * 60 * 60 * 1000); // 2 horas
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <DialogTitle className="text-lg font-semibold text-orange-700 dark:text-orange-400">
              Advertencia de Turno Largo
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
            Su turno actual lleva activo más de 12 horas consecutivas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Duración del turno:
              </p>
              <p className="text-lg font-bold text-orange-900 dark:text-orange-200">
                {shiftDuration}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              <strong>Recomendaciones:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Considere cerrar el turno actual y abrir uno nuevo</li>
              <li>Verifique que todas las transacciones estén registradas correctamente</li>
              <li>Realice un conteo de efectivo antes de continuar</li>
              <li>Consulte con su supervisor si es necesario</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDismissWarning}
            className="flex-1"
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Recordar más tarde
          </Button>
          <Button
            onClick={handleCloseShift}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : 'Cerrar Turno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
