'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUpDown, Plus, Minus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface InventoryAdjustmentDialogProps {
  productId?: string;
  productName?: string;
  currentQuantity?: number;
  onAdjust?: () => void;
}

export function InventoryAdjustmentDialog({
  productId,
  productName,
  currentQuantity = 0,
  onAdjust,
}: InventoryAdjustmentDialogProps) {
  const [open, setOpen] = useState(true); // Abrir automáticamente cuando se renderiza
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>(
    'adjustment'
  );
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || !reason) return;

    setIsLoading(true);
    setError(null);

    try {
      // Calcular la nueva cantidad según el tipo de movimiento
      let newQuantity = 0;
      if (movementType === 'adjustment') {
        newQuantity = parseInt(quantity);
      } else if (movementType === 'in') {
        newQuantity = currentQuantity + parseInt(quantity);
      } else if (movementType === 'out') {
        newQuantity = currentQuantity - parseInt(quantity);
      }

      // Verificar que la cantidad no sea negativa
      if (newQuantity < 0) {
        throw new Error('La cantidad no puede ser negativa');
      }

      const { data, error: rpcError } = await supabase.rpc('adjust_inventory', {
        p_product_id: productId,
        p_new_quantity: newQuantity,
        p_reason: reason,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error desconocido');
      }

      // Cerrar el modal y limpiar el formulario
      setOpen(false);
      setQuantity('');
      setReason('');
      setMovementType('adjustment');

      // Notificar al componente padre
      onAdjust?.();

      // Refrescar la página para mostrar los cambios
      router.refresh();
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const getMovementIcon = () => {
    switch (movementType) {
      case 'in':
        return <Plus className="h-4 w-4" />;
      case 'out':
        return <Minus className="h-4 w-4" />;
      default:
        return <ArrowUpDown className="h-4 w-4" />;
    }
  };

  const getMovementLabel = () => {
    switch (movementType) {
      case 'in':
        return 'Entrada';
      case 'out':
        return 'Salida';
      default:
        return 'Ajuste';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Ajustar
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md sm:w-[90vw] md:w-[80vw]">
        <DialogHeader>
          <DialogTitle>Ajuste de Inventario</DialogTitle>
          <DialogDescription>
            {productName
              ? `Ajustar stock de ${productName}`
              : 'Realizar ajuste de inventario'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {productName && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="product" className="text-right">
                  Producto
                </Label>
                <div className="col-span-3">
                  <p className="text-sm font-medium">{productName}</p>
                  <p className="text-xs text-muted-foreground">
                    Stock actual: {currentQuantity}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Tipo
              </Label>
              <div className="col-span-3">
                <Select
                  value={movementType}
                  onValueChange={(value: any) => setMovementType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Entrada
                      </div>
                    </SelectItem>
                    <SelectItem value="out">
                      <div className="flex items-center gap-2">
                        <Minus className="h-4 w-4" />
                        Salida
                      </div>
                    </SelectItem>
                    <SelectItem value="adjustment">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Ajuste
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Cantidad
              </Label>
              <div className="col-span-3">
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ingrese la cantidad"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Motivo
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describa el motivo del ajuste"
                  rows={3}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="col-span-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                onAdjust?.();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {getMovementIcon()}
              {isLoading ? 'Procesando...' : getMovementLabel()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
