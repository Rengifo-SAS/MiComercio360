'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/lib/types/sales';
import { formatCurrency } from '@/lib/types/sales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Scale } from 'lucide-react';

// Funciones auxiliares para manejo de unidades de medida
const getQuantityStep = (unit: string): number => {
  switch (unit) {
    case 'kg':
    case 'l':
      return 0.1; // Incrementos de 100g o 100ml
    case 'g':
    case 'ml':
      return 1; // Incrementos de 1g o 1ml
    case 'm':
      return 0.1; // Incrementos de 10cm
    case 'cm':
      return 1; // Incrementos de 1cm
    default:
      return 1; // Para piezas (pcs) y otros
  }
};

const getUnitLabel = (unit: string): string => {
  const unitLabels: { [key: string]: string } = {
    pcs: 'piezas',
    kg: 'kilogramos',
    g: 'gramos',
    l: 'litros',
    ml: 'mililitros',
    m: 'metros',
    cm: 'centímetros',
  };
  return unitLabels[unit] || unit;
};

const formatQuantity = (quantity: number, unit: string): string => {
  if (unit === 'kg' || unit === 'l' || unit === 'm') {
    return quantity.toFixed(1);
  }
  return quantity.toString();
};

interface POSQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  currentQuantity: number;
  onConfirm: (quantity: number) => void;
}

export function POSQuantityDialog({
  open,
  onOpenChange,
  product,
  currentQuantity,
  onConfirm,
}: POSQuantityDialogProps) {
  const [quantity, setQuantity] = useState<number>(currentQuantity);
  const [inputValue, setInputValue] = useState<string>('');

  useEffect(() => {
    if (product) {
      setQuantity(currentQuantity);
      setInputValue(formatQuantity(currentQuantity, product.unit));
    }
  }, [product, currentQuantity]);

  const handleQuantityChange = (newQuantity: number) => {
    if (!product) return;

    const availableQuantity = product.available_quantity || 0;
    const clampedQuantity = Math.max(
      0,
      Math.min(newQuantity, availableQuantity)
    );

    setQuantity(clampedQuantity);
    setInputValue(formatQuantity(clampedQuantity, product.unit));
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    const numericValue = parseFloat(value) || 0;
    if (!product) return;

    const availableQuantity = product.available_quantity || 0;
    const clampedQuantity = Math.max(
      0,
      Math.min(numericValue, availableQuantity)
    );
    setQuantity(clampedQuantity);
  };

  const handleConfirm = () => {
    onConfirm(quantity);
    onOpenChange(false);
  };

  const step = product ? getQuantityStep(product.unit) : 1;
  const unitLabel = product ? getUnitLabel(product.unit) : '';
  const availableQuantity = product?.available_quantity || 0;
  const totalPrice = product
    ? parseFloat(product.selling_price.toString()) * quantity
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Ajustar Cantidad
          </DialogTitle>
          <DialogDescription>
            Especifica la cantidad exacta de {product?.name}
          </DialogDescription>
        </DialogHeader>

        {product && (
          <div className="space-y-4">
            {/* Información del producto */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {unitLabel}
                </Badge>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Precio por {getUnitLabel(product.unit)}:
                </span>
                <span className="font-medium">
                  {formatCurrency(parseFloat(product.selling_price.toString()))}
                </span>
              </div>
            </div>

            {/* Controles de cantidad */}
            <div className="space-y-3">
              <Label htmlFor="quantity-input">Cantidad ({unitLabel})</Label>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(quantity - step)}
                  disabled={quantity <= 0}
                  className="h-10 w-10 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <Input
                  id="quantity-input"
                  type="number"
                  min="0"
                  max={availableQuantity}
                  step={step}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="text-center font-medium"
                  placeholder="0"
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(quantity + step)}
                  disabled={quantity >= availableQuantity}
                  className="h-10 w-10 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Información de stock */}
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Disponible: {formatQuantity(availableQuantity, product.unit)}{' '}
                {getUnitLabel(product.unit)}
              </div>
            </div>

            {/* Total calculado */}
            <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Total:
                </span>
                <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={quantity <= 0}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
