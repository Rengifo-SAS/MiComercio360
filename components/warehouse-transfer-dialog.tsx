'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown, Package, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface WarehouseTransferDialogProps {
  onTransfer?: () => void;
  trigger?: React.ReactNode;
  selectedProduct?: {
    id: string;
    name: string;
    sku: string;
  };
}

export function WarehouseTransferDialog({
  onTransfer,
  trigger,
  selectedProduct,
}: WarehouseTransferDialogProps) {
  const [open, setOpen] = useState(!!selectedProduct); // Abrir automáticamente si hay producto seleccionado
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableQuantity, setAvailableQuantity] = useState(0);

  const [formData, setFormData] = useState({
    from_warehouse_id: '',
    to_warehouse_id: '',
    product_id: selectedProduct?.id || '',
    quantity: 0,
    reason: '',
    notes: '',
  });

  const router = useRouter();
  const supabase = createClient();

  // Cargar datos iniciales
  useEffect(() => {
    if (open) {
      loadWarehouses();
      loadProducts();
    }
  }, [open]);

  // Cargar cantidad disponible cuando se selecciona bodega y producto
  useEffect(() => {
    if (formData.from_warehouse_id && formData.product_id) {
      loadAvailableQuantity();
    }
  }, [formData.from_warehouse_id, formData.product_id]);

  const loadWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadAvailableQuantity = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouse_inventory')
        .select('quantity')
        .eq('warehouse_id', formData.from_warehouse_id)
        .eq('product_id', formData.product_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setAvailableQuantity(data?.quantity || 0);
    } catch (error) {
      console.error('Error loading available quantity:', error);
      setAvailableQuantity(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (formData.from_warehouse_id === formData.to_warehouse_id) {
        throw new Error('La bodega origen y destino deben ser diferentes');
      }

      if (formData.quantity <= 0) {
        throw new Error('La cantidad debe ser mayor a 0');
      }

      if (formData.quantity > availableQuantity) {
        throw new Error('La cantidad excede el stock disponible');
      }

      const { data, error: rpcError } = await supabase.rpc(
        'create_warehouse_transfer',
        {
          p_from_warehouse_id: formData.from_warehouse_id,
          p_to_warehouse_id: formData.to_warehouse_id,
          p_product_id: formData.product_id,
          p_quantity: formData.quantity,
          p_reason: formData.reason || null,
          p_notes: formData.notes || null,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error creando transferencia');
      }

      // Cerrar el modal y limpiar
      setOpen(false);
      setFormData({
        from_warehouse_id: '',
        to_warehouse_id: '',
        product_id: '',
        quantity: 0,
        reason: '',
        notes: '',
      });

      // Notificar al componente padre
      onTransfer?.();
      setAvailableQuantity(0);
      router.refresh();
    } catch (error) {
      console.error('Error creating transfer:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const currentProduct = products.find((p) => p.id === formData.product_id);
  const fromWarehouse = warehouses.find(
    (w) => w.id === formData.from_warehouse_id
  );
  const toWarehouse = warehouses.find((w) => w.id === formData.to_warehouse_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Transferir
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Transferir Productos
          </DialogTitle>
          <DialogDescription>
            Transfiere productos entre bodegas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Bodegas */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Bodegas
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from_warehouse">Bodega Origen *</Label>
                <Select
                  value={formData.from_warehouse_id}
                  onValueChange={(value: string) =>
                    handleInputChange('from_warehouse_id', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar bodega origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="to_warehouse">Bodega Destino *</Label>
                <Select
                  value={formData.to_warehouse_id}
                  onValueChange={(value: string) =>
                    handleInputChange('to_warehouse_id', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar bodega destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter((w) => w.id !== formData.from_warehouse_id)
                      .map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name} ({warehouse.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Producto */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Producto
            </h4>
            <div className="space-y-2">
              <Label htmlFor="product">Producto *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value: string) =>
                  handleInputChange('product_id', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Información del producto seleccionado */}
            {currentProduct && fromWarehouse && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4" />
                  <span className="font-medium">{currentProduct.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>
                    Stock disponible en {fromWarehouse.name}:{' '}
                    {availableQuantity} unidades
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Cantidad */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Cantidad
            </h4>
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad a Transferir *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={availableQuantity}
                value={formData.quantity || ''}
                onChange={(e) =>
                  handleInputChange('quantity', parseInt(e.target.value) || 0)
                }
                placeholder="Cantidad"
                required
              />
              <p className="text-xs text-muted-foreground">
                Máximo disponible: {availableQuantity} unidades
              </p>
            </div>
          </div>

          {/* Motivo y Notas */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Información Adicional
            </h4>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                placeholder="Motivo de la transferencia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notas adicionales"
                rows={3}
              />
            </div>
          </div>

          {/* Resumen */}
          {currentProduct &&
            fromWarehouse &&
            toWarehouse &&
            formData.quantity > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Resumen de Transferencia
                </h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>
                    <strong>Producto:</strong> {currentProduct.name} (
                    {currentProduct.sku})
                  </p>
                  <p>
                    <strong>Cantidad:</strong> {formData.quantity} unidades
                  </p>
                  <p>
                    <strong>Desde:</strong> {fromWarehouse.name}
                  </p>
                  <p>
                    <strong>Hacia:</strong> {toWarehouse.name}
                  </p>
                </div>
              </div>
            )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                onTransfer?.();
              }}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !formData.from_warehouse_id ||
                !formData.to_warehouse_id ||
                !formData.product_id ||
                formData.quantity <= 0
              }
            >
              {isLoading ? 'Creando...' : 'Crear Transferencia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
