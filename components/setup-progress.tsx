'use client';

import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetupProgressProps {
  hasProfile: boolean;
  hasCompany: boolean;
  className?: string;
}

export function SetupProgress({
  hasProfile,
  hasCompany,
  className,
}: SetupProgressProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="flex items-center space-x-4">
        {/* Step 1: Profile */}
        <div className="flex items-center">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-500 shadow-lg',
              hasProfile
                ? 'bg-green-500 text-white scale-110'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            )}
          >
            {hasProfile ? (
              <CheckCircle className="w-5 h-5 animate-in zoom-in duration-300" />
            ) : (
              <span className="animate-pulse">1</span>
            )}
          </div>
          <span
            className={cn(
              'ml-3 text-sm font-medium transition-colors duration-300',
              hasProfile
                ? 'text-green-600 dark:text-green-400'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            Perfil de Usuario
          </span>
        </div>

        {/* Connector */}
        <div
          className={cn(
            'w-16 h-1 rounded-full transition-all duration-500',
            hasProfile ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
          )}
        />

        {/* Step 2: Company */}
        <div className="flex items-center">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-500 shadow-lg',
              hasCompany
                ? 'bg-green-500 text-white scale-110'
                : hasProfile
                ? 'bg-blue-500 text-white scale-110'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            )}
          >
            {hasCompany ? (
              <CheckCircle className="w-5 h-5 animate-in zoom-in duration-300" />
            ) : (
              <span className="animate-pulse">2</span>
            )}
          </div>
          <span
            className={cn(
              'ml-3 text-sm font-medium transition-colors duration-300',
              hasCompany
                ? 'text-green-600 dark:text-green-400'
                : hasProfile
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            Datos de Empresa
          </span>
        </div>
      </div>
    </div>
  );
}
