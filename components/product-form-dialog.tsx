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
import { TaxesService } from '@/lib/services/taxes-service';
import { Tax } from '@/lib/types/taxes';
import { CostCentersService } from '@/lib/services/cost-centers-service';
import { Product as BaseProduct } from '@/lib/types/sales';

interface ProductFormData extends Partial<BaseProduct> {
  initial_quantity?: number;
}
import { CostCenter } from '@/lib/types/cost-centers';

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
  product?: ProductFormData | null;
  onSave?: () => void;
  onProductCreated?: (product: BaseProduct) => void;
  onProductUpdated?: (product: BaseProduct) => void;
  trigger?: React.ReactNode;
}

export function ProductFormDialog({
  product,
  onSave,
  onProductCreated,
  onProductUpdated,
  trigger,
}: ProductFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  const [formData, setFormData] = useState<ProductFormData>({
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
    tax_id: '',
    fiscal_classification: 'Bien',
    cost_center_id: '',
  });
  const [defaultTaxId, setDefaultTaxId] = useState<string>('');

  const router = useRouter();
  const supabase = createClient();

  // Cargar categorías, proveedores, bodegas e impuestos
  useEffect(() => {
    const loadData = async () => {
      try {
        // Obtener company_id del usuario
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!profile?.company_id) return;

        // Cargar categorías
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name, color')
          .eq('company_id', profile.company_id)
          .eq('is_active', true)
          .order('name');

        // Cargar proveedores
        const { data: suppliersData } = await supabase
          .from('suppliers')
          .select('id, name')
          .eq('company_id', profile.company_id)
          .eq('is_active', true)
          .order('name');

        // Cargar bodegas
        const { data: warehousesData } = await supabase
          .from('warehouses')
          .select('id, name, code')
          .eq('company_id', profile.company_id)
          .eq('is_active', true)
          .order('name');

        // Cargar impuestos
        const taxesData = await TaxesService.getActiveTaxes(profile.company_id);

        // Cargar centros de costos
        const costCentersData = await CostCentersService.getActiveCostCenters(
          profile.company_id
        );

        // Establecer las listas en el estado
        setCategories(categoriesData || []);
        setSuppliers(suppliersData || []);
        setWarehouses(warehousesData || []);
        setTaxes(taxesData);
        setCostCenters(costCentersData);

        // Encontrar el IVA 19% y establecerlo como predeterminado
        const iva19Tax = taxesData.find(
          (tax) =>
            tax.name === 'IVA 19%' &&
            tax.tax_type === 'VAT' &&
            tax.percentage === 19
        );

        if (iva19Tax) {
          setDefaultTaxId(iva19Tax.id);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (open) {
      loadData();
    }
  }, [open, supabase]);

  // Inicializar formulario cuando las listas estén cargadas Y haya un producto
  useEffect(() => {
    if (!open || !product?.id) {
      // Si no hay producto, solo establecer valores por defecto para nuevo producto
      if (open && !product && warehouses.length > 0 && taxes.length > 0) {
        const mainWarehouse = warehouses.find(
          (w) => w.name.toLowerCase() === 'main' || w.code.toLowerCase() === 'main'
        );
        const iva19Tax = taxes.find(
          (t) => t.name === 'IVA 19%' && t.tax_type === 'VAT' && t.percentage === 19
        );
        
        setFormData({
          name: '',
          sku: '',
          description: '',
          category_id: '',
          supplier_id: '',
          warehouse_id: mainWarehouse?.id || warehouses[0]?.id || '',
          cost_price: 0,
          selling_price: 0,
          min_stock: 0,
          max_stock: 0,
          unit: 'pcs',
          image_url: '',
          is_active: true,
          initial_quantity: 0,
          fiscal_classification: 'Bien',
          cost_center_id: '',
          tax_id: iva19Tax?.id || '',
        });
      }
      return;
    }

    // Solo proceder si las listas están cargadas
    if (categories.length === 0 && suppliers.length === 0 && warehouses.length === 0 && taxes.length === 0) {
      return;
    }

    const initializeFormData = async () => {
      // Cargar cantidad disponible del inventario
      let availableQuantity = 0;
      
      if ((product as any).available_quantity !== undefined) {
        availableQuantity = (product as any).available_quantity || 0;
      } else {
        try {
          const { data: inventoryData } = await supabase
            .from('inventory')
            .select('quantity')
            .eq('product_id', product.id)
            .maybeSingle();
          availableQuantity = inventoryData?.quantity || 0;
        } catch (error) {
          console.error('Error loading inventory quantity:', error);
        }
      }

      // Convertir precios a números si vienen como strings
      const costPrice = typeof product.cost_price === 'string' 
        ? parseFloat(product.cost_price) || 0 
        : (product.cost_price || 0);
      const sellingPrice = typeof product.selling_price === 'string'
        ? parseFloat(product.selling_price) || 0
        : (product.selling_price || 0);
      
      const formDataToSet = {
        id: product.id,
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        category_id: product.category_id || '',
        supplier_id: product.supplier_id || '',
        warehouse_id: product.warehouse_id || '',
        cost_price: costPrice,
        selling_price: sellingPrice,
        min_stock: typeof product.min_stock === 'string' 
          ? parseInt(product.min_stock) || 0 
          : (product.min_stock || 0),
        max_stock: product.max_stock !== null && product.max_stock !== undefined
          ? (typeof product.max_stock === 'string' ? parseInt(product.max_stock) : product.max_stock)
          : undefined,
        unit: product.unit || 'pcs',
        image_url: product.image_url || '',
        is_active: product.is_active ?? true,
        initial_quantity: availableQuantity,
        tax_id: product.tax_id || '',
        fiscal_classification: product.fiscal_classification || 'Bien',
        cost_center_id: product.cost_center_id || '',
        company_id: product.company_id || '',
        created_at: product.created_at,
        updated_at: product.updated_at,
      };
      
      // Log para debug
      console.log('Product form initialized:', {
        productIds: {
          category_id: product.category_id,
          supplier_id: product.supplier_id,
          warehouse_id: product.warehouse_id,
          tax_id: product.tax_id,
          cost_center_id: product.cost_center_id,
        },
        formData: formDataToSet,
        listsAvailable: {
          categories: categories.length,
          suppliers: suppliers.length,
          warehouses: warehouses.length,
          taxes: taxes.length,
          costCenters: costCenters.length,
        },
      });
      
      setFormData(formDataToSet);
    };

    initializeFormData();
  }, [open, product, categories, suppliers, warehouses, taxes, costCenters, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validaciones
    if (!formData.name?.trim()) {
      setError('El nombre del producto es requerido');
      setIsLoading(false);
      return;
    }

    if (!formData.sku?.trim()) {
      setError('El código SKU es requerido');
      setIsLoading(false);
      return;
    }

    if (!formData.tax_id) {
      setError('Debe seleccionar un impuesto principal');
      setIsLoading(false);
      return;
    }

    if ((formData.cost_price || 0) < 0) {
      setError('El precio de costo no puede ser negativo');
      setIsLoading(false);
      return;
    }

    if ((formData.selling_price || 0) < 0) {
      setError('El precio de venta no puede ser negativo');
      setIsLoading(false);
      return;
    }

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
          p_fiscal_classification: formData.fiscal_classification,
          p_tax_id: formData.tax_id || null,
          p_cost_center_id: formData.cost_center_id || null,
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
            p_fiscal_classification: formData.fiscal_classification,
            p_tax_id: formData.tax_id || null,
            p_cost_center_id: formData.cost_center_id || null,
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

      // Llamar callbacks apropiados
      const productData: BaseProduct = {
        id: product?.id || '', // Para productos nuevos, se generará en el backend
        name: formData.name || '',
        sku: formData.sku || '',
        description: formData.description,
        cost_price: formData.cost_price || 0,
        selling_price: formData.selling_price || 0,
        min_stock: formData.min_stock || 0,
        max_stock: formData.max_stock,
        unit: formData.unit || 'pcs',
        image_url: formData.image_url,
        is_active: formData.is_active ?? true,
        warehouse_id: formData.warehouse_id,
        category_id: formData.category_id,
        supplier_id: formData.supplier_id,
        cost_center_id: formData.cost_center_id,
        tax_id: formData.tax_id,
        fiscal_classification: formData.fiscal_classification || 'Bien',
        iva_rate: 19, // Valor por defecto
        ica_rate: 0,
        retencion_rate: 0,
        excise_tax: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        company_id: '',
      };

      if (product) {
        // Producto actualizado
        onProductUpdated?.(productData);
      } else {
        // Producto creado
        onProductCreated?.(productData);
      }

      onSave?.();
      router.refresh();
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="focus:ring-2 focus:ring-teal-500 focus:ring-offset-2">
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Nuevo Producto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
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
        <form
          onSubmit={handleSubmit}
          role="form"
          aria-label="Formulario de producto"
        >
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
                    className="focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                    aria-describedby="name-help"
                  />
                  <p id="name-help" className="text-xs text-gray-500">
                    Ingrese el nombre completo del producto
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">Código Interno (SKU) *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Ej: COC-350-001"
                    required
                    className="focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                    aria-describedby="sku-help"
                  />
                  <p id="sku-help" className="text-xs text-gray-500">
                    Código único para identificar el producto
                  </p>
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
                  className="focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  aria-describedby="description-help"
                />
                <p id="description-help" className="text-xs text-gray-500">
                  Descripción detallada del producto (opcional)
                </p>
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
                    value={formData.max_stock !== null && formData.max_stock !== undefined ? formData.max_stock : ''}
                    onChange={(e) =>
                      handleInputChange(
                        'max_stock',
                        e.target.value === '' ? undefined : (parseInt(e.target.value) || undefined)
                      )
                    }
                    placeholder="Sin límite"
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
                      <SelectItem value="unidad">Unidad</SelectItem>
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

            {/* Cantidad actual (solo para productos existentes) */}
            {product && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Inventario Actual
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="current_quantity">Cantidad Actual en Inventario</Label>
                  <Input
                    id="current_quantity"
                    type="number"
                    value={formData.initial_quantity || 0}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    La cantidad se gestiona mediante ajustes de inventario. Esta es solo informativa.
                  </p>
                </div>
              </div>
            )}

            {/* Centro de costos */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Centro de Costos
              </h4>
              <div className="space-y-2">
                <Label htmlFor="cost_center_id">Centro de Costos</Label>
                <Select
                  value={formData.cost_center_id || ''}
                  onValueChange={(value: string) =>
                    handleInputChange('cost_center_id', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un centro de costos" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters.map((costCenter) => (
                      <SelectItem key={costCenter.id} value={costCenter.id}>
                        {costCenter.code} - {costCenter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Asigna este producto a un centro de costos para control
                  presupuestario
                </p>
              </div>
            </div>

            {/* Información Fiscal (Colombia) */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Información Fiscal (Colombia)
              </h4>

              {/* Impuesto Principal */}
              <div className="space-y-2">
                <Label htmlFor="tax_id">Impuesto Principal *</Label>
                <Select
                  value={formData.tax_id || ''}
                  onValueChange={(value: string) =>
                    handleInputChange('tax_id', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un impuesto" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxes.map((tax) => (
                      <SelectItem key={tax.id} value={tax.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{tax.name}</span>
                          <span className="text-muted-foreground ml-2">
                            {tax.percentage.toFixed(2)}%
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecciona el impuesto principal que se aplicará a este
                  producto
                </p>
              </div>

              {/* Información adicional del producto */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Información Adicional
                </div>

                {/* Clasificación fiscal */}
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
                  <p className="text-xs text-muted-foreground">
                    Clasificación fiscal del producto para efectos contables
                  </p>
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
              className="focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Cancelar creación de producto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              aria-label={
                isLoading
                  ? 'Guardando producto...'
                  : product
                  ? 'Actualizar producto'
                  : 'Crear nuevo producto'
              }
            >
              {product ? (
                <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
              ) : (
                <Package className="h-4 w-4 mr-2" aria-hidden="true" />
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
