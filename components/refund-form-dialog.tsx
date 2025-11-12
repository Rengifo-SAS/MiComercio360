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
import { Checkbox } from '@/components/ui/checkbox';
import { RefundsService } from '@/lib/services/refunds-service';
import { SalesService } from '@/lib/services/sales-service';
import { CreateRefundRequestData, CreateRefundItemData, REFUND_REASONS, REFUND_METHODS, REFUND_REQUEST_TYPES, PRODUCT_CONDITIONS } from '@/lib/types/refunds';
import { Sale } from '@/lib/types/sales';
import { toast } from 'sonner';
import { Plus, X, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RefundFormItem extends CreateRefundItemData {
  product_name?: string;
  sku?: string;
}

interface RefundFormDialogProps {
  companyId: string;
  sales: any[];
  customers: any[];
  products: any[];
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function RefundFormDialog({
  companyId,
  sales: initialSales,
  customers,
  products,
  onSave,
  trigger,
}: RefundFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [loadingSale, setLoadingSale] = useState(false);
  
  const [formData, setFormData] = useState<Omit<CreateRefundRequestData, 'items'> & { items: RefundFormItem[] }>({
    sale_id: '',
    company_id: companyId,
    request_type: 'REFUND',
    reason: 'CONSUMER_RETRACT',
    requested_amount: 0,
    refund_method: 'CASH',
    description: '',
    items: [],
  });

  useEffect(() => {
    if (open && !selectedSaleId) {
      setFormData({
        sale_id: '',
        company_id: companyId,
        request_type: 'REFUND',
        reason: 'CONSUMER_RETRACT',
        requested_amount: 0,
        refund_method: 'CASH',
        description: '',
        items: [],
      });
      setSelectedSale(null);
    }
  }, [open, companyId]);

  const handleSaleChange = async (saleId: string) => {
    setSelectedSaleId(saleId);
    if (!saleId) {
      setSelectedSale(null);
      setFormData((prev) => ({ ...prev, items: [], requested_amount: 0 }));
      return;
    }

    setLoadingSale(true);
    try {
      // Buscar la venta en la lista de ventas disponibles primero
      const saleFromList = initialSales.find((s: any) => s.id === saleId);
      if (!saleFromList) {
        toast.error('Error', {
          description: 'Venta no encontrada en la lista disponible',
        });
        setSelectedSaleId('');
        return;
      }

      // Cargar detalles completos de la venta con items
      const sale = await SalesService.getSaleById(saleId);
      if (!sale) {
        toast.error('Error', {
          description: 'Venta no encontrada',
        });
        return;
      }

      if (sale.status === 'cancelled') {
        toast.error('Error', {
          description: 'No se puede procesar devolución de una venta ya cancelada',
        });
        setSelectedSaleId('');
        return;
      }

      setSelectedSale(sale);
      setFormData((prev) => ({
        ...prev,
        sale_id: saleId,
        items: sale.items?.map((item) => ({
          sale_item_id: item.id,
          product_id: item.product_id,
          quantity: 0,
          unit_price: item.unit_price,
          total_amount: 0,
          condition: 'NEW',
          product_name: (item as any).product?.name || '',
          sku: (item as any).product?.sku || '',
        })) || [],
      }));
    } catch (error) {
      console.error('Error cargando venta:', error);
      toast.error('Error', {
        description: 'No se pudo cargar la venta',
      });
    } finally {
      setLoadingSale(false);
    }
  };

  const handleItemChange = (index: number, field: keyof RefundFormItem, value: any) => {
    const updatedItems = [...formData.items];
    const item = updatedItems[index];

    if (field === 'quantity') {
      const maxQuantity = selectedSale?.items?.find((si) => si.id === item.sale_item_id)?.quantity || 0;
      if (value > maxQuantity) {
        toast.error('Error', {
          description: `La cantidad no puede exceder ${maxQuantity} (cantidad vendida)`,
        });
        return;
      }
      if (value < 0) value = 0;
      
      item.quantity = value;
      item.total_amount = value * item.unit_price;
    } else if (field === 'condition') {
      item.condition = value;
    } else if (field === 'notes') {
      item.notes = value;
    }

    updatedItems[index] = item;
    
    const requestedAmount = updatedItems.reduce((sum, i) => sum + i.total_amount, 0);
    
    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
      requested_amount: requestedAmount,
    }));
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    const requestedAmount = updatedItems.reduce((sum, i) => sum + i.total_amount, 0);
    
    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
      requested_amount: requestedAmount,
    }));
  };

  const handleSave = async () => {
    if (!formData.sale_id) {
      toast.error('Error', {
        description: 'Debe seleccionar una venta',
      });
      return;
    }

    const validItems = formData.items.filter((item) => item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Error', {
        description: 'Debe agregar al menos un item con cantidad mayor a 0',
      });
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Error', {
        description: 'Debe proporcionar una descripción',
      });
      return;
    }

    setLoading(true);
    try {
      await RefundsService.createRefundRequest({
        ...formData,
        items: validItems,
      });
      
      toast.success('Éxito', {
        description: 'Devolución creada exitosamente',
      });
      
      setOpen(false);
      onSave?.();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo crear la devolución',
      });
    } finally {
      setLoading(false);
    }
  };

  const availableSales = initialSales.filter((sale: any) => sale.status === 'completed');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Devolución</DialogTitle>
          <DialogDescription>
            Crear una nueva solicitud de devolución o reembolso
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selección de Venta */}
          <div className="space-y-2">
            <Label htmlFor="sale_id">Venta *</Label>
            <Select
              value={selectedSaleId}
              onValueChange={handleSaleChange}
              disabled={loadingSale}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar venta" />
              </SelectTrigger>
              <SelectContent>
                {availableSales.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No hay ventas disponibles
                  </div>
                ) : (
                  availableSales.map((sale: any) => (
                    <SelectItem key={sale.id} value={sale.id}>
                      {sale.sale_number} - {formatCurrency(sale.total_amount)} - {sale.customer?.business_name || 'Sin cliente'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedSale && (
            <>
              {/* Información de la Venta */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Información de la Venta</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Número:</span> {selectedSale.sale_number}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cliente:</span> {selectedSale.customer?.business_name || 'N/A'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total:</span> {formatCurrency(selectedSale.total_amount)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha:</span> {new Date(selectedSale.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Tipo y Razón */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="request_type">Tipo *</Label>
                  <Select
                    value={formData.request_type}
                    onValueChange={(value: 'REFUND' | 'CANCELLATION') =>
                      setFormData((prev) => ({ ...prev, request_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REFUND_REQUEST_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Razón *</Label>
                  <Select
                    value={formData.reason}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, reason: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REFUND_REASONS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items de la Venta */}
              <div className="space-y-2">
                <Label>Items a Devolver *</Label>
                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Producto</th>
                          <th className="p-2 text-left">Cant. Vendida</th>
                          <th className="p-2 text-left">Cant. Devolver</th>
                          <th className="p-2 text-left">Precio Unit.</th>
                          <th className="p-2 text-left">Condición</th>
                          <th className="p-2 text-left">Total</th>
                          <th className="p-2 text-left">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, index) => {
                          const saleItem = selectedSale.items?.find((si) => si.id === item.sale_item_id);
                          const maxQuantity = saleItem?.quantity || 0;
                          
                          return (
                            <tr key={index} className="border-t">
                              <td className="p-2">
                                <div>
                                  <div className="font-medium">{item.product_name || 'N/A'}</div>
                                  {item.sku && <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>}
                                </div>
                              </td>
                              <td className="p-2">{maxQuantity}</td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={maxQuantity}
                                  value={item.quantity || 0}
                                  onChange={(e) =>
                                    handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-20"
                                />
                              </td>
                              <td className="p-2">{formatCurrency(item.unit_price)}</td>
                              <td className="p-2">
                                <Select
                                  value={item.condition}
                                  onValueChange={(value: any) =>
                                    handleItemChange(index, 'condition', value)
                                  }
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(PRODUCT_CONDITIONS).map(([key, label]) => (
                                      <SelectItem key={key} value={key}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2 font-medium">
                                {formatCurrency(item.total_amount)}
                              </td>
                              <td className="p-2">
                                {item.quantity > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveItem(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Método de Reembolso y Descripción */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="refund_method">Método de Reembolso *</Label>
                  <Select
                    value={formData.refund_method}
                    onValueChange={(value: any) =>
                      setFormData((prev) => ({ ...prev, refund_method: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REFUND_METHODS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requested_amount">Monto Solicitado</Label>
                  <Input
                    id="requested_amount"
                    value={formatCurrency(formData.requested_amount)}
                    disabled
                    className="font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Descripción detallada de la devolución..."
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || loadingSale || !selectedSale}>
            {loading ? 'Guardando...' : 'Crear Devolución'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

