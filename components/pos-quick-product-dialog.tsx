'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Package, Tag, DollarSign, Hash, AlertCircle } from 'lucide-react';
import { ProductsService } from '@/lib/services/products-service';
import { CategoriesService } from '@/lib/services/categories-service';
import { TaxesService } from '@/lib/services/taxes-service';

interface QuickProductData {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  category_id: string;
  iva_tax_id: string;
  ica_tax_id: string;
  retencion_tax_id: string;
  cost_price: number;
  selling_price: number;
  available_quantity: number;
  iva_rate: number;
  ica_rate: number;
  retencion_rate: number;
}

interface POSQuickProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onProductCreated?: () => void;
}

export function POSQuickProductDialog({
  open,
  onOpenChange,
  companyId,
  onProductCreated,
}: POSQuickProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [formData, setFormData] = useState<QuickProductData>({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    category_id: '',
    iva_tax_id: 'none',
    ica_tax_id: 'none',
    retencion_tax_id: 'none',
    cost_price: 0,
    selling_price: 0,
    available_quantity: 0,
    iva_rate: 0,
    ica_rate: 0,
    retencion_rate: 0,
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open, companyId]);

  const loadInitialData = async () => {
    try {
      const [categoriesData, taxesData] = await Promise.all([
        CategoriesService.getCategories(companyId),
        TaxesService.getTaxes(companyId),
      ]);

      setCategories(categoriesData);
      setTaxes(taxesData);

      // Generar SKU automático
      const randomSku = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      const randomBarcode = Math.random().toString().substring(2, 15);

      setFormData((prev) => ({
        ...prev,
        sku: randomSku,
        barcode: randomBarcode,
        // Configurar impuestos por defecto si existen
        iva_tax_id: taxesData.find((t) => t.tax_type === 'VAT')?.id || 'none',
        ica_tax_id:
          taxesData.find((t) => t.tax_type === 'INDUSTRY')?.id || 'none',
        retencion_tax_id:
          taxesData.find((t) => t.tax_type === 'WITHHOLDING')?.id || 'none',
        iva_rate: taxesData.find((t) => t.tax_type === 'VAT')?.percentage || 19,
        ica_rate:
          taxesData.find((t) => t.tax_type === 'INDUSTRY')?.percentage || 0,
        retencion_rate:
          taxesData.find((t) => t.tax_type === 'WITHHOLDING')?.percentage || 0,
      }));
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      toast.error('Error cargando datos iniciales');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) {
      toast.error('ID de compañía no disponible.');
      return;
    }

    // Validaciones básicas
    if (!formData.name.trim()) {
      toast.error('El nombre del producto es requerido');
      return;
    }

    if (!formData.selling_price || formData.selling_price <= 0) {
      toast.error('El precio de venta debe ser mayor a 0');
      return;
    }

    if (!formData.category_id) {
      toast.error('Debe seleccionar una categoría');
      return;
    }

    if (!formData.sku.trim()) {
      toast.error('El código SKU es requerido');
      return;
    }

    if (!formData.barcode.trim()) {
      toast.error('El código de barras es requerido');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('La descripción es requerida');
      return;
    }

    if (!formData.cost_price || formData.cost_price < 0) {
      toast.error('El precio de costo debe ser válido');
      return;
    }

    if (!formData.available_quantity || formData.available_quantity < 0) {
      toast.error('La cantidad disponible debe ser válida');
      return;
    }

    setLoading(true);

    try {
      // Obtener los porcentajes de los impuestos seleccionados
      const ivaTax = taxes.find((t) => t.id === formData.iva_tax_id);
      const icaTax = taxes.find((t) => t.id === formData.ica_tax_id);
      const retencionTax = taxes.find(
        (t) => t.id === formData.retencion_tax_id
      );

      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim(),
        description: formData.description.trim(),
        category_id: formData.category_id,
        cost_price: formData.cost_price,
        selling_price: formData.selling_price,
        available_quantity: formData.available_quantity,
        iva_rate: ivaTax?.percentage || 0,
        ica_rate: icaTax?.percentage || 0,
        retencion_rate: retencionTax?.percentage || 0,
        company_id: companyId,
        is_active: true,
      };

      const newProduct = await ProductsService.createProduct(productData);

      toast.success('Producto creado exitosamente');
      onOpenChange(false);

      // Limpiar formulario
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        category_id: '',
        iva_tax_id: 'none',
        ica_tax_id: 'none',
        retencion_tax_id: 'none',
        cost_price: 0,
        selling_price: 0,
        available_quantity: 0,
        iva_rate: 0,
        ica_rate: 0,
        retencion_rate: 0,
      });

      // Notificar que se creó un producto
      if (onProductCreated) {
        onProductCreated();
      }
    } catch (error) {
      console.error('Error creando producto:', error);
      toast.error('Error creando el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof QuickProductData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Crear Producto Rápido
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo producto con datos básicos para usar inmediatamente en
            el POS
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="name">Nombre del Producto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ej: Coca Cola 350ml"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="sku">Código SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Código único"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="barcode">Código de Barras *</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) =>
                      handleInputChange('barcode', e.target.value)
                    }
                    placeholder="Código de barras"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Descripción *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange('description', e.target.value)
                    }
                    placeholder="Descripción del producto"
                    rows={2}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) =>
                      handleInputChange('category_id', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="available_quantity">
                    Cantidad en Inventario *
                  </Label>
                  <Input
                    id="available_quantity"
                    type="number"
                    min="0"
                    value={formData.available_quantity}
                    onChange={(e) =>
                      handleInputChange(
                        'available_quantity',
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Precios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Precios y Costos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost_price">Precio de Costo *</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min="0"
                    step="0.01"
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

                <div>
                  <Label htmlFor="selling_price">Precio de Venta *</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    min="0"
                    step="0.01"
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
            </CardContent>
          </Card>

          {/* Impuestos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Impuestos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="iva_tax">IVA *</Label>
                  <Select
                    value={formData.iva_tax_id}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        handleInputChange('iva_tax_id', '');
                        handleInputChange('iva_rate', 0);
                      } else {
                        const selectedTax = taxes.find((t) => t.id === value);
                        handleInputChange('iva_tax_id', value);
                        handleInputChange(
                          'iva_rate',
                          selectedTax?.percentage || 0
                        );
                      }
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar IVA" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin IVA</SelectItem>
                      {taxes
                        .filter((tax) => tax.tax_type === 'VAT')
                        .map((tax) => (
                          <SelectItem key={tax.id} value={tax.id}>
                            {tax.name} ({tax.percentage}%)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ica_tax">ICA *</Label>
                  <Select
                    value={formData.ica_tax_id}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        handleInputChange('ica_tax_id', '');
                        handleInputChange('ica_rate', 0);
                      } else {
                        const selectedTax = taxes.find((t) => t.id === value);
                        handleInputChange('ica_tax_id', value);
                        handleInputChange(
                          'ica_rate',
                          selectedTax?.percentage || 0
                        );
                      }
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ICA" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin ICA</SelectItem>
                      {taxes
                        .filter((tax) => tax.tax_type === 'INDUSTRY')
                        .map((tax) => (
                          <SelectItem key={tax.id} value={tax.id}>
                            {tax.name} ({tax.percentage}%)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="retencion_tax">Retención *</Label>
                  <Select
                    value={formData.retencion_tax_id}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        handleInputChange('retencion_tax_id', '');
                        handleInputChange('retencion_rate', 0);
                      } else {
                        const selectedTax = taxes.find((t) => t.id === value);
                        handleInputChange('retencion_tax_id', value);
                        handleInputChange(
                          'retencion_rate',
                          selectedTax?.percentage || 0
                        );
                      }
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar Retención" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin Retención</SelectItem>
                      {taxes
                        .filter((tax) => tax.tax_type === 'WITHHOLDING')
                        .map((tax) => (
                          <SelectItem key={tax.id} value={tax.id}>
                            {tax.name} ({tax.percentage}%)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
