'use client';

import { useState, useEffect } from 'react';
import { ShiftsService } from '@/lib/services/shifts-service';
import { Shift } from '@/lib/types/shifts';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle } from 'lucide-react';
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
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Cargando turno...
        </span>
      </div>
    );
  }

  if (!activeShift) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            Sin turno activo
          </span>
        </div>
        <ShiftOpenDialog onOpen={handleOpenShift} companyId={companyId} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Badge
              variant="default"
              className="bg-green-100 text-green-800 text-xs"
            >
              Turno Activo
            </Badge>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              {shiftDuration}
            </span>
          </div>
          <span className="text-xs text-green-600 dark:text-green-400">
            Efectivo inicial: ${activeShift.initial_cash.toLocaleString()}
          </span>
        </div>
      </div>
      <ShiftCloseDialog shift={activeShift} onClose={handleCloseShift} />
    </div>
  );
}
