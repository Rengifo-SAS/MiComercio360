'use client';

import { useMemo, useState } from 'react';
import { Category } from '@/lib/types/products';
import { cn } from '@/lib/utils';

interface POSCategoriesPanelProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

// Colores vibrantes para las categorías (paleta Alegra-style)
const CATEGORY_COLORS = [
  'rgb(26, 188, 156)',   // Turquesa
  'rgb(22, 160, 133)',   // Verde azulado
  'rgb(46, 204, 113)',   // Verde
  'rgb(39, 174, 96)',    // Verde oscuro
  'rgb(52, 152, 219)',   // Azul
  'rgb(41, 128, 185)',   // Azul oscuro
  'rgb(155, 89, 182)',   // Morado
  'rgb(142, 68, 173)',   // Morado oscuro
  'rgb(52, 73, 94)',     // Gris azulado
  'rgb(44, 62, 80)',     // Gris oscuro
  'rgb(241, 196, 15)',   // Amarillo
  'rgb(243, 156, 18)',   // Naranja
  'rgb(230, 126, 34)',   // Naranja oscuro
  'rgb(211, 84, 0)',     // Naranja quemado
  'rgb(231, 76, 60)',    // Rojo
  'rgb(192, 57, 43)',    // Rojo oscuro
  'rgb(149, 165, 166)',  // Gris claro
  'rgb(127, 140, 141)',  // Gris
];

// Función para obtener el color de una categoría basado en su índice
const getCategoryColor = (index: number): string => {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
};

// Función para obtener la inicial de una categoría
const getCategoryInitial = (name: string): string => {
  return name.charAt(0).toUpperCase();
};

export function POSCategoriesPanel({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: POSCategoriesPanelProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Ordenar categorías alfabéticamente
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  return (
    <div
      className={cn(
        'h-full flex flex-col bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex-shrink-0 transition-all duration-300 ease-in-out relative z-50',
        isHovered ? 'w-64' : 'w-16'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="p-3 border-b dark:border-gray-700 flex-shrink-0 overflow-hidden">
        <h3 className={cn(
          'text-sm font-bold text-gray-900 dark:text-gray-100 transition-all',
          !isHovered && 'opacity-0 w-0'
        )}>
          Categorías
        </h3>
      </div>

      {/* Opción "Todas" */}
      <div className="flex-shrink-0 border-b dark:border-gray-700">
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            'w-full flex items-center gap-3 p-3 transition-all hover:bg-gray-50 dark:hover:bg-gray-700',
            selectedCategoryId === null && 'bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 border-l-4 border-indigo-600',
            !isHovered && 'justify-center'
          )}
          title={!isHovered ? 'Todas las categorías' : ''}
        >
          <div
            className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border-2 font-bold text-sm"
            style={{
              backgroundColor: 'rgb(99, 102, 241)', // indigo-500
              borderColor: 'rgb(99, 102, 241)',
              color: 'white',
            }}
          >
            ★
          </div>
          {isHovered && (
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1 text-left whitespace-nowrap">
              Todas las categorías
            </p>
          )}
        </button>
      </div>

      {/* Lista de Categorías con Scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col">
          {sortedCategories.map((category, index) => {
            const color = getCategoryColor(index);
            const initial = getCategoryInitial(category.name);
            const isSelected = selectedCategoryId === category.id;

            return (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                  'flex items-center gap-3 p-3 transition-all hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700',
                  isSelected && 'bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 border-l-4 border-indigo-600',
                  !isHovered && 'justify-center'
                )}
                title={!isHovered ? category.name : ''}
              >
                <div
                  className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border-2 font-bold text-sm"
                  style={{
                    backgroundColor: color,
                    borderColor: color,
                    color: 'white',
                  }}
                >
                  {initial}
                </div>
                {isHovered && (
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1 text-left capitalize-first whitespace-nowrap">
                    {category.name}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
