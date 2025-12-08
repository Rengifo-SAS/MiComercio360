'use client';

import { useState, useEffect } from 'react';
import { ShiftsService } from '@/lib/services/shifts-service';
import { Shift } from '@/lib/types/shifts';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import { ShiftOpenDialog } from './shift-open-dialog';
import { ShiftCloseDialog } from './shift-close-dialog';
import {
  formatShiftDuration,
  calculateShiftDuration,
} from '@/lib/types/shifts';
import { toast } from 'sonner';

interface POSShiftIndicatorProps {
  companyId: string;
  userId: string;
}

export function POSShiftIndicator({
  companyId,
  userId,
}: POSShiftIndicatorProps) {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [shiftDuration, setShiftDuration] = useState<string>('');
  const [isLongShift, setIsLongShift] = useState(false);

  useEffect(() => {
    if (companyId && userId) {
      loadActiveShift();
    }
  }, [companyId, userId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeShift && activeShift.status === 'open') {
      // Actualizar duración cada segundo
      interval = setInterval(() => {
        const duration = calculateShiftDuration(
          activeShift.start_time,
          new Date().toISOString()
        );
        if (duration) {
          setShiftDuration(formatShiftDuration(duration));
          // Verificar si el turno lleva más de 12 horas
          const durationInHours = duration / (1000 * 60 * 60);
          setIsLongShift(durationInHours >= 12);
        }
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeShift]);

  const loadActiveShift = async () => {
    try {
      setLoading(true);
      const shift = await ShiftsService.getActiveShift(companyId);
      setActiveShift(shift);

      if (shift && shift.status === 'open') {
        const duration = calculateShiftDuration(
          shift.start_time,
          new Date().toISOString()
        );
        if (duration) {
          setShiftDuration(formatShiftDuration(duration));
          // Verificar si el turno lleva más de 12 horas
          const durationInHours = duration / (1000 * 60 * 60);
          setIsLongShift(durationInHours >= 12);
        }
      }
    } catch (error) {
      console.error('Error cargando turno activo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async (
    initialCash: number,
    notes?: string,
    sourceAccountId?: string
  ) => {
    try {
      await ShiftsService.createShift(companyId, {
        initial_cash: initialCash,
        notes,
        source_account_id: sourceAccountId,
      });

      toast.success('Turno abierto exitosamente');
      loadActiveShift();
    } catch (error) {
      console.error('Error abriendo turno:', error);
      toast.error('Error al abrir el turno');
    }
  };

  const handleCloseShift = async (
    shiftId: string,
    finalCash: number,
    notes?: string
  ) => {
    try {
      await ShiftsService.closeShift(shiftId, {
        final_cash: finalCash,
        notes,
      });

      toast.success('Turno cerrado exitosamente');
      loadActiveShift();
    } catch (error) {
      console.error('Error cerrando turno:', error);
      toast.error('Error al cerrar el turno');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-teal-600"></div>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          Cargando...
        </span>
      </div>
    );
  }

  if (!activeShift) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
          <span className="text-xs font-medium text-red-700 dark:text-red-300">
            Sin turno activo
          </span>
        </div>
        <ShiftOpenDialog onOpen={handleOpenShift} companyId={companyId} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className={`flex items-center gap-1 px-2 py-1 border rounded ${
        isLongShift 
          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' 
          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      }`}>
        {isLongShift ? (
          <AlertTriangle className="h-3 w-3 text-orange-600 dark:text-orange-400" />
        ) : (
          <Clock className="h-3 w-3 text-green-600 dark:text-green-400" />
        )}
        <div className="flex items-center gap-1">
          <Badge
            variant="default"
            className={`text-xs px-1 py-0 ${
              isLongShift 
                ? 'bg-orange-100 text-orange-800' 
                : 'bg-green-100 text-green-800'
            }`}
          >
            {isLongShift ? 'Largo' : 'Activo'}
          </Badge>
          <span className={`text-xs font-medium ${
            isLongShift 
              ? 'text-orange-700 dark:text-orange-300' 
              : 'text-green-700 dark:text-green-300'
          }`}>
            {shiftDuration}
          </span>
        </div>
      </div>
      <ShiftCloseDialog shift={activeShift} onClose={handleCloseShift} />
    </div>
  );
}
