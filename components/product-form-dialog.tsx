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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Product {
  id?: string;
  name: string;
  sku: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  warehouse_id?: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  max_stock?: number;
  unit: string;
  image_url?: string;
  is_active: boolean;
  initial_quantity?: number;
  // Campos fiscales colombianos
  iva_rate: number;
  ica_rate: number;
  retencion_rate: number;
  fiscal_classification: string;
  excise_tax: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface ProductFormDialogProps {
  product?: Product | null;
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function ProductFormDialog({
  product,
  onSave,
  trigger,
}: ProductFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [formData, setFormData] = useState<Product>({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    supplier_id: '',
    warehouse_id: '',
    cost_price: 0,
    selling_price: 0,
    min_stock: 0,
    max_stock: 0,
    unit: 'pcs',
    image_url: '',
    is_active: true,
    initial_quantity: 0,
    iva_rate: 19,
    ica_rate: 0,
    retencion_rate: 0,
    fiscal_classification: 'Bien',
    excise_tax: false,
  });

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (open && product) {
      setFormData({
        ...product,
        description: product.description || '',
        category_id: product.category_id || '',
        supplier_id: product.supplier_id || '',
        warehouse_id: product.warehouse_id || '',
        max_stock: product.max_stock || 0,
        image_url: product.image_url || '',
        initial_quantity: 0, // No es parte del producto existente
        iva_rate: product.iva_rate || 19,
        ica_rate: product.ica_rate || 0,
        retencion_rate: product.retencion_rate || 0,
        fiscal_classification: product.fiscal_classification || 'Bien',
        excise_tax: product.excise_tax || false,
      });
    } else if (open && !product) {
      setFormData({
        name: '',
        sku: '',
        description: '',
        category_id: '',
        supplier_id: '',
        warehouse_id: '',
        cost_price: 0,
        selling_price: 0,
        min_stock: 0,
        max_stock: 0,
        unit: 'pcs',
        image_url: '',
        is_active: true,
        initial_quantity: 0,
        iva_rate: 19,
        ica_rate: 0,
        retencion_rate: 0,
        fiscal_classification: 'Bien',
        excise_tax: false,
      });
    }
  }, [open, product]);

  const router = useRouter();
  const supabase = createClient();

  // Cargar categorías, proveedores y bodegas
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar categorías
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name, color')
          .eq('is_active', true)
          .order('name');

        // Cargar proveedores
        const { data: suppliersData } = await supabase
          .from('suppliers')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        // Cargar bodegas
        const { data: warehousesData } = await supabase
          .from('warehouses')
          .select('id, name, code')
          .eq('is_active', true)
          .order('name');

        setCategories(categoriesData || []);
        setSuppliers(suppliersData || []);
        setWarehouses(warehousesData || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (open) {
      loadData();
    }
  }, [open, supabase]);

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (open) {
      if (product) {
        setFormData({
          ...product,
          category_id: product.category_id || '',
          supplier_id: product.supplier_id || '',
          max_stock: product.max_stock || 0,
        });
      } else {
        setFormData({
          name: '',
          sku: '',
          description: '',
          category_id: '',
          supplier_id: '',
          cost_price: 0,
          selling_price: 0,
          min_stock: 0,
          max_stock: 0,
          unit: 'pcs',
          image_url: '',
          is_active: true,
          initial_quantity: 0,
          iva_rate: 19,
          ica_rate: 0,
          retencion_rate: 0,
          fiscal_classification: 'Bien',
          excise_tax: false,
        });
      }
    }
  }, [open, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (product?.id) {
        // Actualizar producto existente
        const { data, error: rpcError } = await supabase.rpc('update_product', {
          p_product_id: product.id,
          p_name: formData.name,
          p_sku: formData.sku,
          p_description: formData.description || null,
          p_category_id: formData.category_id || null,
          p_supplier_id: formData.supplier_id || null,
          p_warehouse_id: formData.warehouse_id || null,
          p_cost_price: formData.cost_price,
          p_selling_price: formData.selling_price,
          p_min_stock: formData.min_stock,
          p_max_stock: formData.max_stock || null,
          p_unit: formData.unit,
          p_image_url: formData.image_url || null,
          p_is_active: formData.is_active,
          p_iva_rate: formData.iva_rate,
          p_ica_rate: formData.ica_rate,
          p_retencion_rate: formData.retencion_rate,
          p_fiscal_classification: formData.fiscal_classification,
          p_excise_tax: formData.excise_tax,
        });

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Error actualizando producto');
        }
      } else {
        // Crear nuevo producto
        const { data, error: rpcError } = await supabase.rpc(
          'create_product_with_inventory',
          {
            p_name: formData.name,
            p_sku: formData.sku,
            p_description: formData.description || null,
            p_category_id: formData.category_id || null,
            p_supplier_id: formData.supplier_id || null,
            p_warehouse_id: formData.warehouse_id || null,
            p_cost_price: formData.cost_price,
            p_selling_price: formData.selling_price,
            p_min_stock: formData.min_stock,
            p_max_stock: formData.max_stock || null,
            p_unit: formData.unit,
            p_image_url: formData.image_url || null,
            p_initial_quantity: formData.initial_quantity || 0,
            p_iva_rate: formData.iva_rate,
            p_ica_rate: formData.ica_rate,
            p_retencion_rate: formData.retencion_rate,
            p_fiscal_classification: formData.fiscal_classification,
            p_excise_tax: formData.excise_tax,
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Error creando producto');
        }
      }

      // Cerrar el modal y limpiar
      setOpen(false);
      onSave?.();
      router.refresh();
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Product, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
          <DialogDescription>
            {product
              ? 'Modifica la información del producto'
              : 'Crea un nuevo producto en tu catálogo'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Información básica */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Información Básica
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Producto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ej: Coca Cola 350ml"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">Código Interno (SKU) *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Ej: COC-350-001"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) =>
                    handleInputChange('description', e.target.value)
                  }
                  placeholder="Descripción del producto"
                  rows={3}
                />
              </div>
            </div>

            {/* Clasificación */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Clasificación
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select
                    value={formData.category_id || ''}
                    onValueChange={(value: string) =>
                      handleInputChange('category_id', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Proveedor</Label>
                  <Select
                    value={formData.supplier_id || ''}
                    onValueChange={(value: string) =>
                      handleInputChange('supplier_id', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse">Bodega *</Label>
                  <Select
                    value={formData.warehouse_id || ''}
                    onValueChange={(value: string) =>
                      handleInputChange('warehouse_id', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar bodega" />
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
              </div>
            </div>

            {/* Precios y Stock */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Precios y Stock
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Precio de Costo *</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) =>
                      handleInputChange(
                        'cost_price',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Precio de Venta *</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.selling_price}
                    onChange={(e) =>
                      handleInputChange(
                        'selling_price',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Stock Mínimo</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    min="0"
                    value={formData.min_stock}
                    onChange={(e) =>
                      handleInputChange(
                        'min_stock',
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_stock">Stock Máximo</Label>
                  <Input
                    id="max_stock"
                    type="number"
                    min="0"
                    value={formData.max_stock}
                    onChange={(e) =>
                      handleInputChange(
                        'max_stock',
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidad</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value: string) =>
                      handleInputChange('unit', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Piezas</SelectItem>
                      <SelectItem value="kg">Kilogramos</SelectItem>
                      <SelectItem value="g">Gramos</SelectItem>
                      <SelectItem value="l">Litros</SelectItem>
                      <SelectItem value="ml">Mililitros</SelectItem>
                      <SelectItem value="m">Metros</SelectItem>
                      <SelectItem value="cm">Centímetros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Imagen */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Imagen
              </h4>
              <div className="space-y-2">
                <Label htmlFor="image_url">URL de Imagen</Label>
                <Input
                  id="image_url"
                  value={formData.image_url || ''}
                  onChange={(e) =>
                    handleInputChange('image_url', e.target.value)
                  }
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>
            </div>

            {/* Cantidad inicial (solo para productos nuevos) */}
            {!product && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Inventario Inicial
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="initial_quantity">Cantidad Inicial</Label>
                  <Input
                    id="initial_quantity"
                    type="number"
                    min="0"
                    value={formData.initial_quantity}
                    onChange={(e) =>
                      handleInputChange(
                        'initial_quantity',
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cantidad inicial en inventario
                  </p>
                </div>
              </div>
            )}

            {/* Campos fiscales colombianos */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Información Fiscal (Colombia)
              </h4>

              {/* IVA, ICA y Retención */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iva_rate">IVA (%)</Label>
                  <Select
                    value={formData.iva_rate?.toString() || '0'}
                    onValueChange={(value: string) =>
                      handleInputChange('iva_rate', parseFloat(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% - Exento</SelectItem>
                      <SelectItem value="5">5% - Reducido</SelectItem>
                      <SelectItem value="19">19% - General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ica_rate">ICA (%)</Label>
                  <Input
                    id="ica_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.ica_rate}
                    onChange={(e) =>
                      handleInputChange(
                        'ica_rate',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retencion_rate">Retención (%)</Label>
                  <Input
                    id="retencion_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.retencion_rate}
                    onChange={(e) =>
                      handleInputChange(
                        'retencion_rate',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Clasificación fiscal e impuesto al consumo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fiscal_classification">
                    Clasificación Fiscal
                  </Label>
                  <Select
                    value={formData.fiscal_classification || 'Bien'}
                    onValueChange={(value: string) =>
                      handleInputChange('fiscal_classification', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bien">Bien</SelectItem>
                      <SelectItem value="Servicio">Servicio</SelectItem>
                      <SelectItem value="Bien de Capital">
                        Bien de Capital
                      </SelectItem>
                      <SelectItem value="Materia Prima">
                        Materia Prima
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="excise_tax"
                    checked={formData.excise_tax}
                    onCheckedChange={(checked: boolean) =>
                      handleInputChange('excise_tax', checked)
                    }
                  />
                  <Label htmlFor="excise_tax">Impuesto al Consumo</Label>
                </div>
              </div>
            </div>

            {/* Estado activo */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Estado
              </h4>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked: boolean) =>
                    handleInputChange('is_active', checked)
                  }
                />
                <Label htmlFor="is_active">Producto activo</Label>
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {product ? (
                <Edit className="h-4 w-4 mr-2" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              {isLoading
                ? 'Guardando...'
                : product
                ? 'Actualizar'
                : 'Crear Producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
