'use client';

import { useState } from 'react';
import {
  PendingSale,
  calculatePendingSaleTotal,
  getPendingSaleItemCount,
} from '@/lib/types/multiventas';
import { formatCurrency } from '@/lib/types/sales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  X,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';

interface POSMultiVentasTabsProps {
  pendingSales: PendingSale[];
  activeSaleId: string | null;
  onAddNewSale: () => void;
  onSetActiveSale: (saleId: string) => void;
  onRenameSale: (saleId: string, newName: string) => void;
  onDeleteSale: (saleId: string) => void;
}

export function POSMultiVentasTabs({
  pendingSales,
  activeSaleId,
  onAddNewSale,
  onSetActiveSale,
  onRenameSale,
  onDeleteSale,
}: POSMultiVentasTabsProps) {
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  const handleRenameClick = (sale: PendingSale) => {
    setEditingSaleId(sale.id);
    setEditingName(sale.name);
    setShowRenameDialog(true);
  };

  const handleRenameConfirm = () => {
    if (editingSaleId && editingName.trim()) {
      onRenameSale(editingSaleId, editingName.trim());
      setShowRenameDialog(false);
      setEditingSaleId(null);
      setEditingName('');
      toast.success('Venta renombrada exitosamente');
    }
  };

  const handleDeleteClick = (saleId: string) => {
    setSaleToDelete(saleId);
  };

  const handleDeleteConfirm = () => {
    if (saleToDelete) {
      onDeleteSale(saleToDelete);
      setSaleToDelete(null);
      toast.success('Venta eliminada exitosamente');
    }
  };

  const handleAddNewSale = () => {
    try {
      onAddNewSale();
    } catch (error) {
      console.error('Error adding new sale:', error);
    }
  };

  return (
    <>
      {/* Contenedor de pestañas */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto">
          {/* Pestañas de ventas */}
          {pendingSales.map((sale) => {
            const isActive = sale.id === activeSaleId;
            const total = calculatePendingSaleTotal(sale.cart);
            const itemCount = getPendingSaleItemCount(sale.cart);

            return (
              <div
                key={sale.id}
                className={`flex items-center gap-1 px-2 py-1 rounded-t-md border-b-2 transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-700 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {/* Botón de la pestaña */}
                <button
                  onClick={() => onSetActiveSale(sale.id)}
                  className="flex items-center gap-1 text-xs font-medium min-w-0 flex-1"
                  title={`${String(sale.name || 'Venta')} - ${formatCurrency(
                    total
                  )} (${itemCount} items)`}
                >
                  <ShoppingCart className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate max-w-20">
                    {String(sale.name || 'Venta')}
                  </span>
                  {itemCount > 0 && (
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white dark:text-white text-xs px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold shadow-sm">
                      {itemCount}
                    </span>
                  )}
                </button>

                {/* Menú de acciones */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => handleRenameClick(sale)}
                      className="text-xs"
                    >
                      <Edit2 className="h-3 w-3 mr-2" />
                      Renombrar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(sale.id)}
                      className="text-xs text-red-600 dark:text-red-400"
                      disabled={pendingSales.length === 1}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          {/* Botón para agregar nueva venta */}
          <Button
            onClick={handleAddNewSale}
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
            title="Agregar nueva venta"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline ml-1">Nueva</span>
          </Button>
        </div>
      </div>

      {/* Diálogo para renombrar venta */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Renombrar Venta</DialogTitle>
            <DialogDescription className="text-xs">
              Ingresa el nuevo nombre para esta venta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder="Ej: Mesa 1, Cliente Juan..."
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameConfirm();
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRenameDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleRenameConfirm}
              disabled={!editingName.trim()}
            >
              Renombrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar venta */}
      <Dialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Eliminar Venta</DialogTitle>
            <DialogDescription className="text-xs">
              ¿Estás seguro de que quieres eliminar esta venta? Esta acción no
              se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaleToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
