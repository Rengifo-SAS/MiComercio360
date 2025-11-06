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
import { QuotesService } from '@/lib/services/quotes-service';
import { Quote, CreateQuoteInput, CreateQuoteItemInput } from '@/lib/types/quotes';
import { CustomersService } from '@/lib/services/customers-service';
import { ProductsService } from '@/lib/services/products-service';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Tipo extendido para items del formulario con campos calculados
interface QuoteFormItem extends CreateQuoteItemInput {
  discount_amount?: number;
  total_price?: number;
}

interface QuoteFormData extends Omit<CreateQuoteInput, 'items'> {
  items: QuoteFormItem[];
}

interface QuoteFormDialogProps {
  companyId: string;
  quote?: Quote | null;
  customers: any[];
  numerations: any[];
  warehouses: any[];
  products: any[];
  taxes: any[];
  salespeople: any[];
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function QuoteFormDialog({
  companyId,
  quote,
  customers: initialCustomers,
  numerations: initialNumerations,
  warehouses: initialWarehouses,
  products: initialProducts,
  taxes: initialTaxes,
  salespeople: initialSalespeople,
  onSave,
  trigger,
}: QuoteFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState(initialCustomers);
  const [numerations, setNumerations] = useState(initialNumerations);
  const [warehouses, setWarehouses] = useState(initialWarehouses);
  const [products, setProducts] = useState(initialProducts);
  const [taxes, setTaxes] = useState(initialTaxes);
  const [salespeople, setSalespeople] = useState(initialSalespeople);
  const [loadingData, setLoadingData] = useState(false);
  
  const supabase = createClient();
  
  const [formData, setFormData] = useState<QuoteFormData>({
    company_id: companyId,
    customer_id: '',
    quote_date: new Date().toISOString().split('T')[0],
    payment_terms: 30,
    currency: 'COP',
    items: [],
  });

  useEffect(() => {
    if (open) {
      loadData();
      
      if (quote) {
        setFormData({
          company_id: companyId,
          customer_id: quote.customer_id,
          numeration_id: quote.numeration_id || undefined,
          quote_date: quote.quote_date,
          payment_terms: quote.payment_terms,
          currency: quote.currency,
          price_list_id: quote.price_list_id || undefined,
          salesperson_id: quote.salesperson_id || undefined,
          warehouse_id: quote.warehouse_id || undefined,
          notes: quote.notes || undefined,
          comments: quote.comments || undefined,
          items: quote.items?.map((item) => ({
            product_id: item.product_id,
            product_reference: item.product_reference,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage,
            tax_id: item.tax_id,
            sort_order: item.sort_order,
          })) || [],
        });
      } else {
        setFormData({
          company_id: companyId,
          customer_id: '',
          quote_date: new Date().toISOString().split('T')[0],
          payment_terms: 30,
          currency: 'COP',
          items: [],
        });
      }
    }
  }, [open, quote, companyId]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [
        customersResult,
        productsResult,
        numerationsResult,
        warehousesResult,
        taxesResult,
        salespeopleResult,
      ] = await Promise.all([
        CustomersService.getCustomers(companyId, {
          isActive: true,
          sortBy: 'business_name',
          sortOrder: 'asc',
          limit: 1000,
        }),
        ProductsService.getProducts(companyId, {
          isActive: true,
          sortBy: 'name',
          sortOrder: 'asc',
          limit: 1000,
        }),
        supabase
          .from('numerations')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .in('document_type', ['quotation', 'quote'])
          .order('name'),
        supabase
          .from('warehouses')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('is_main', { ascending: false }),
        supabase
          .from('taxes')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('full_name'),
      ]);

      setCustomers(customersResult.customers);
      setProducts(productsResult.products);
      setNumerations(numerationsResult.data || []);
      setWarehouses(warehousesResult.data || []);
      setTaxes(taxesResult.data || []);
      setSalespeople(salespeopleResult.data || []);
      
      // Debug: verificar numeraciones cargadas
      if (numerationsResult.error) {
        console.error('Error cargando numeraciones:', numerationsResult.error);
      }
      console.log('Numeraciones cargadas:', numerationsResult.data?.length || 0);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar los datos',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Preparar datos para enviar al servidor (sin campos calculados)
      const submitData: CreateQuoteInput = {
        ...formData,
        items: formData.items.map((item) => ({
          product_id: item.product_id,
          product_reference: item.product_reference,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage,
          tax_id: item.tax_id,
          sort_order: item.sort_order,
        })),
      };

      if (quote) {
        await QuotesService.updateQuote(quote.id, companyId, submitData);
        toast.success('Éxito', {
          description: 'Cotización actualizada',
        });
      } else {
        await QuotesService.createQuote(submitData);
        toast.success('Éxito', {
          description: 'Cotización creada',
        });
      }
      setOpen(false);
      onSave?.();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo guardar',
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_id: '',
          quantity: 1,
          unit_price: 0,
          discount_percentage: 0,
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const currentItem = { ...newItems[index] };

    // Si se selecciona un producto, cargar sus datos
    if (field === 'product_id' && value) {
      const selectedProduct = products.find((p) => p.id === value);
      if (selectedProduct) {
        currentItem.product_id = value;
        currentItem.unit_price = selectedProduct.selling_price || 0;
        currentItem.product_reference = selectedProduct.reference || selectedProduct.sku || undefined;
        currentItem.tax_id = selectedProduct.tax_id || undefined;
        if (!currentItem.description && selectedProduct.name) {
          currentItem.description = selectedProduct.name;
        }
      }
    } else {
      // Asignación segura por campo
      switch (field) {
        case 'product_id':
          currentItem.product_id = value;
          break;
        case 'product_reference':
          currentItem.product_reference = value;
          break;
        case 'description':
          currentItem.description = value;
          break;
        case 'quantity':
          currentItem.quantity = value;
          break;
        case 'unit_price':
          currentItem.unit_price = value;
          break;
        case 'discount_percentage':
          currentItem.discount_percentage = value;
          break;
        case 'tax_id':
          currentItem.tax_id = value;
          break;
        case 'sort_order':
          currentItem.sort_order = value;
          break;
      }
    }

    // Calcular total
    if (field === 'unit_price' || field === 'quantity' || field === 'discount_percentage' || field === 'product_id') {
      const subtotal = (currentItem.unit_price || 0) * (currentItem.quantity || 0);
      const discount = subtotal * ((currentItem.discount_percentage || 0) / 100);
      currentItem.discount_amount = discount;
      currentItem.total_price = subtotal - discount;
    }

    newItems[index] = currentItem;
    setFormData({ ...formData, items: newItems });
  };

  const formatDocumentNumber = (numeration: any) => {
    const nextNumber = numeration.current_number + 1;
    const formattedNumber = nextNumber
      .toString()
      .padStart(numeration.number_length, '0');
    return `${numeration.prefix}${formattedNumber}${numeration.suffix || ''}`;
  };

  const subtotal = formData.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const totalDiscount = formData.items.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
  const totalTax = 0; // Se calcularía desde los impuestos
  const totalAmount = subtotal - totalDiscount + totalTax;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {quote ? 'Editar Cotización' : 'Nueva Cotización'}
          </DialogTitle>
          <DialogDescription>
            Cree una cotización para un cliente
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {loadingData && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Cargando datos...</div>
            </div>
          )}
          <div className={`grid gap-4 py-4 ${loadingData ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  required
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.quote_date}
                  onChange={(e) => setFormData({ ...formData, quote_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Plazo de Pago (días)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.payment_terms || 30}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 30 })
                  }
                />
              </div>
              <div>
                <Label>Moneda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value: 'COP' | 'USD' | 'EUR') =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COP">COP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendedor</Label>
                <Select
                  value={formData.salesperson_id || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, salesperson_id: value || undefined })
                  }
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {salespeople.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.full_name || person.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bodega</Label>
                <Select
                  value={formData.warehouse_id || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, warehouse_id: value || undefined })
                  }
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar bodega" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Numeración</Label>
                <Select
                  value={formData.numeration_id || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, numeration_id: value || undefined })
                  }
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar numeración" />
                  </SelectTrigger>
                  <SelectContent>
                    {numerations.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay numeraciones disponibles
                      </div>
                    ) : (
                      numerations.map((num) => (
                        <SelectItem key={num.id} value={num.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{num.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {num.prefix} - Próximo: {formatDocumentNumber(num)}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notas (visibles en PDF)</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || undefined })}
                rows={2}
              />
            </div>

            <div>
              <Label>Comentarios (internos)</Label>
              <Textarea
                value={formData.comments || ''}
                onChange={(e) =>
                  setFormData({ ...formData, comments: e.target.value || undefined })
                }
                rows={2}
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button type="button" onClick={addItem} variant="outline" size="sm" disabled={loadingData}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item
                </Button>
              </div>
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border rounded">
                    <div className="col-span-4">
                      <Label>Producto</Label>
                      <Select
                        value={item.product_id || ''}
                        onValueChange={(value) => updateItem(index, 'product_id', value)}
                        disabled={loadingData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Precio Unit.</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Desc. %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discount_percentage || 0}
                        onChange={(e) =>
                          updateItem(index, 'discount_percentage', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="col-span-12 mt-2">
                      <Label>Descripción</Label>
                      <Input
                        value={item.description || ''}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Descripción del producto"
                      />
                    </div>
                    {item.product_reference && (
                      <div className="col-span-12 text-sm text-muted-foreground">
                        Ref: {item.product_reference}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totales */}
            {formData.items.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Descuentos:</span>
                    <span>-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || loadingData || formData.items.length === 0}>
              {loading ? 'Guardando...' : quote ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}





