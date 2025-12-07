import { createClient } from '@/lib/supabase/client';
import {
  PurchaseInvoice,
  PurchaseInvoiceItem,
  PurchaseInvoiceWithholding,
  PurchaseInvoiceHistory,
  CreatePurchaseInvoiceInput,
  UpdatePurchaseInvoiceInput,
} from '@/lib/types/purchase-invoices';
import { NumerationsService } from './numerations-service';

export class PurchaseInvoicesService {
  private static supabase = createClient();

  /**
   * Obtiene todas las facturas de compra con filtros
   */
  static async getPurchaseInvoices(
    companyId: string,
    options?: {
      supplierId?: string;
      warehouseId?: string;
      costCenterId?: string;
      paymentStatus?: 'pending' | 'partially_paid' | 'paid' | 'cancelled';
      status?: 'active' | 'cancelled';
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ): Promise<{ purchaseInvoices: PurchaseInvoice[]; total: number }> {
    const {
      supplierId,
      warehouseId,
      costCenterId,
      paymentStatus,
      status,
      dateFrom,
      dateTo,
      search,
      sortBy = 'invoice_date',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = options || {};

    let queryBuilder = this.supabase
      .from('purchase_invoices')
      .select(
        `
        *,
        supplier:suppliers(*),
        warehouse:warehouses(*),
        cost_center:cost_centers(*),
        numeration:numerations(*),
        items:purchase_invoice_items(
          *,
          product:products(*),
          account:accounts(*),
          tax:taxes(*)
        ),
        withholdings:purchase_invoice_withholdings(*)
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    // Aplicar filtros
    if (supplierId) {
      queryBuilder = queryBuilder.eq('supplier_id', supplierId);
    }

    if (warehouseId) {
      queryBuilder = queryBuilder.eq('warehouse_id', warehouseId);
    }

    if (costCenterId) {
      queryBuilder = queryBuilder.eq('cost_center_id', costCenterId);
    }

    if (paymentStatus) {
      queryBuilder = queryBuilder.eq('payment_status', paymentStatus);
    }

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    if (dateFrom) {
      queryBuilder = queryBuilder.gte('invoice_date', dateFrom);
    }

    if (dateTo) {
      queryBuilder = queryBuilder.lte('invoice_date', dateTo);
    }

    // Búsqueda por texto
    if (search) {
      queryBuilder = queryBuilder.or(
        `invoice_number.ilike.%${search}%,supplier_invoice_number.ilike.%${search}%,observations.ilike.%${search}%`
      );
    }

    // Ordenamiento
    queryBuilder = queryBuilder.order(sortBy, {
      ascending: sortOrder === 'asc',
    });

    // Paginación
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    queryBuilder = queryBuilder.range(from, to);

    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error('Error obteniendo facturas de compra:', error);
      throw error;
    }

    return {
      purchaseInvoices: (data || []) as PurchaseInvoice[],
      total: count || 0,
    };
  }

  /**
   * Obtiene una factura de compra por ID
   */
  static async getPurchaseInvoiceById(
    id: string,
    companyId: string
  ): Promise<PurchaseInvoice | null> {
    const { data, error } = await this.supabase
      .from('purchase_invoices')
      .select(
        `
        *,
        supplier:suppliers(*),
        warehouse:warehouses(*),
        cost_center:cost_centers(*),
        numeration:numerations(*),
        items:purchase_invoice_items(
          *,
          product:products(*),
          account:accounts(*),
          tax:taxes(*)
        ),
        withholdings:purchase_invoice_withholdings(*),
        history:purchase_invoice_history(*)
      `
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      console.error('Error obteniendo factura de compra:', error);
      throw error;
    }

    return data as PurchaseInvoice;
  }

  /**
   * Crea una nueva factura de compra
   */
  static async createPurchaseInvoice(
    input: CreatePurchaseInvoiceInput
  ): Promise<PurchaseInvoice> {
    const { items, withholdings, numeration_id, ...invoiceData } = input;

    // Generar número de factura si hay numeración
    let invoiceNumber: string | undefined;
    if (numeration_id) {
      try {
        const numeration = await NumerationsService.getNumeration(numeration_id);
        if (numeration) {
          const { data, error: numberError } = await this.supabase.rpc(
            'get_next_number',
            {
              p_company_id: input.company_id,
              p_document_type: 'purchase_invoice',
              p_name: numeration.name,
            }
          );

          if (!numberError && data) {
            invoiceNumber = data;
          }
        }
      } catch (error) {
        console.error('Error generando número de factura de compra:', error);
      }
    }

    // Calcular totales de items y validar
    const itemsToInsert = items.map((item, index) => {
      let totalCost = 0;
      if (item.item_type === 'PRODUCT') {
        if (!item.product_id) {
          throw new Error(`El item ${index + 1} de tipo PRODUCT debe tener un producto seleccionado`);
        }
        if (!item.quantity || item.quantity <= 0) {
          throw new Error(`El item ${index + 1} de tipo PRODUCT debe tener una cantidad mayor a 0`);
        }
        if (item.unit_cost === undefined || item.unit_cost === null || item.unit_cost < 0) {
          throw new Error(`El item ${index + 1} de tipo PRODUCT debe tener un precio unitario válido`);
        }
        const discount = item.discount_percentage
          ? (item.unit_cost * item.quantity * item.discount_percentage) / 100
          : 0;
        totalCost = item.unit_cost * item.quantity - discount;
        if (totalCost < 0) {
          totalCost = 0;
        }
      } else if (item.item_type === 'ACCOUNT') {
        if (!item.account_id) {
          throw new Error(`El item ${index + 1} de tipo ACCOUNT debe tener una cuenta seleccionada`);
        }
        if (!item.account_amount || item.account_amount <= 0) {
          throw new Error(`El item ${index + 1} de tipo ACCOUNT debe tener un monto mayor a 0`);
        }
        totalCost = item.account_amount;
      } else {
        throw new Error(`El item ${index + 1} tiene un tipo inválido: ${(item as any).item_type}`);
      }

      // Preparar el objeto según el tipo de item
      const baseItem: any = {
        item_type: item.item_type,
        discount_percentage: item.discount_percentage || 0,
        discount_amount:
          item.item_type === 'PRODUCT' && item.discount_percentage && item.quantity && item.unit_cost
            ? (item.unit_cost * item.quantity * item.discount_percentage) / 100
            : 0,
        sort_order: item.sort_order ?? index,
      };

      if (item.item_type === 'PRODUCT') {
        baseItem.product_id = item.product_id;
        baseItem.quantity = Number(item.quantity); // Asegurar que es número
        baseItem.unit_cost = Number(item.unit_cost || 0);
        baseItem.total_cost = Number(totalCost.toFixed(2));
        // No incluir campos de ACCOUNT (no enviar null, simplemente no incluirlos)
        delete baseItem.account_id;
        delete baseItem.account_amount;
      } else if (item.item_type === 'ACCOUNT') {
        baseItem.account_id = item.account_id;
        baseItem.account_amount = Number(item.account_amount);
        // No incluir campos de PRODUCT (no enviar null, simplemente no incluirlos)
        delete baseItem.product_id;
        delete baseItem.quantity;
        delete baseItem.unit_cost;
        delete baseItem.total_cost;
      }

      // Agregar campos opcionales solo si tienen valor
      if (item.tax_id) {
        baseItem.tax_id = item.tax_id;
      }
      if (item.description) {
        baseItem.description = item.description;
      }

      return baseItem;
    });

    const subtotal = itemsToInsert.reduce(
      (sum, item) => sum + (item.total_cost || item.account_amount || 0),
      0
    );

    // Crear la factura de compra
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('purchase_invoices')
      .insert({
        ...invoiceData,
        numeration_id,
        invoice_number: invoiceNumber,
        subtotal,
        total_amount: subtotal, // Por ahora sin impuestos
        payment_status: 'pending',
        paid_amount: 0,
        status: 'active',
        is_cancelled: false,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creando factura de compra:', invoiceError);
      throw invoiceError;
    }

    // Crear los items (esto disparará el trigger que actualiza el inventario)
    if (itemsToInsert.length > 0) {
      const itemsWithInvoiceId = itemsToInsert.map((item) => ({
        ...item,
        purchase_invoice_id: invoice.id,
      }));

      console.log('Insertando items de factura de compra:', JSON.stringify(itemsWithInvoiceId, null, 2));

      const { error: itemsError, data: insertedItems } = await this.supabase
        .from('purchase_invoice_items')
        .insert(itemsWithInvoiceId)
        .select();

      if (itemsError) {
        // Intentar eliminar la factura creada
        try {
          await this.supabase
            .from('purchase_invoices')
            .delete()
            .eq('id', invoice.id);
        } catch (deleteError) {
          console.error('Error eliminando factura después de fallo en items:', deleteError);
        }

        const errorDetails = {
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code,
          itemsCount: itemsToInsert.length,
          firstItem: itemsToInsert[0],
        };

        console.error('Error creando items de factura de compra:', errorDetails);

        const errorMessage = itemsError.message || 
                           itemsError.details || 
                           itemsError.hint || 
                           `Error desconocido al crear los items de la factura de compra. Código: ${itemsError.code || 'N/A'}`;
        throw new Error(errorMessage);
      }

      console.log('Items creados exitosamente:', insertedItems?.length || 0);
    }

    // Crear las retenciones
    if (withholdings && withholdings.length > 0) {
      const { error: withholdingsError } = await this.supabase
        .from('purchase_invoice_withholdings')
        .insert(
          withholdings.map((withholding) => ({
            ...withholding,
            purchase_invoice_id: invoice.id,
          }))
        );

      if (withholdingsError) {
        console.error('Error creando retenciones:', withholdingsError);
        // No fallar si solo hay error en retenciones
      }
    }

    // Obtener la factura completa
    return this.getPurchaseInvoiceById(
      invoice.id,
      input.company_id
    ) as Promise<PurchaseInvoice>;
  }

  /**
   * Actualiza una factura de compra
   */
  static async updatePurchaseInvoice(
    id: string,
    companyId: string,
    input: UpdatePurchaseInvoiceInput
  ): Promise<PurchaseInvoice> {
    const { items, withholdings, ...updateData } = input;

    // Verificar que la factura no esté cancelada
    const currentInvoice = await this.getPurchaseInvoiceById(id, companyId);
    if (currentInvoice?.status === 'cancelled') {
      throw new Error('No se puede editar una factura de compra cancelada');
    }

    // Actualizar la factura de compra
    const { error: updateError } = await this.supabase
      .from('purchase_invoices')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error actualizando factura de compra:', updateError);
      throw updateError;
    }

    // Si se proporcionan items, reemplazar los existentes
    if (items !== undefined) {
      // Eliminar items existentes
      await this.supabase
        .from('purchase_invoice_items')
        .delete()
        .eq('purchase_invoice_id', id);

      // Crear nuevos items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => {
          let totalCost = 0;
          if (item.item_type === 'PRODUCT' && item.quantity && item.unit_cost) {
            const discount = item.discount_percentage
              ? (item.unit_cost * item.quantity * item.discount_percentage) / 100
              : 0;
            totalCost = item.unit_cost * item.quantity - discount;
          } else if (item.item_type === 'ACCOUNT' && item.account_amount) {
            totalCost = item.account_amount;
          }

          return {
            ...item,
            purchase_invoice_id: id,
            total_cost: item.item_type === 'PRODUCT' ? totalCost : null,
            account_amount: item.item_type === 'ACCOUNT' ? item.account_amount : null,
            discount_amount:
              item.item_type === 'PRODUCT' && item.discount_percentage && item.quantity && item.unit_cost
                ? (item.unit_cost * item.quantity * item.discount_percentage) / 100
                : 0,
            sort_order: item.sort_order ?? index,
          };
        });

        const { error: itemsError } = await this.supabase
          .from('purchase_invoice_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error creando nuevos items:', itemsError);
          throw itemsError;
        }
      }
    }

    // Si se proporcionan retenciones, reemplazar las existentes
    if (withholdings !== undefined) {
      await this.supabase
        .from('purchase_invoice_withholdings')
        .delete()
        .eq('purchase_invoice_id', id);

      if (withholdings.length > 0) {
        const { error: withholdingsError } = await this.supabase
          .from('purchase_invoice_withholdings')
          .insert(
            withholdings.map((withholding) => ({
              ...withholding,
              purchase_invoice_id: id,
            }))
          );

        if (withholdingsError) {
          console.error('Error creando nuevas retenciones:', withholdingsError);
          throw withholdingsError;
        }
      }
    }

    return this.getPurchaseInvoiceById(id, companyId) as Promise<PurchaseInvoice>;
  }

  /**
   * Elimina una factura de compra
   */
  static async deletePurchaseInvoice(
    id: string,
    companyId: string
  ): Promise<void> {
    const invoice = await this.getPurchaseInvoiceById(id, companyId);
    if (invoice?.status === 'cancelled') {
      throw new Error('No se puede eliminar una factura de compra cancelada');
    }

    const { error } = await this.supabase
      .from('purchase_invoices')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error eliminando factura de compra:', error);
      throw error;
    }
  }

  /**
   * Cancela una factura de compra (revierte inventario)
   */
  static async cancelPurchaseInvoice(
    id: string,
    companyId: string,
    reason?: string
  ): Promise<PurchaseInvoice> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user || !user.user) {
      throw new Error('Usuario no autenticado');
    }

    const { error } = await this.supabase
      .from('purchase_invoices')
      .update({
        status: 'cancelled',
        is_cancelled: true,
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.user.id,
        cancelled_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error cancelando factura de compra:', error);
      throw error;
    }

    // El trigger revertirá automáticamente el inventario
    return this.getPurchaseInvoiceById(id, companyId) as Promise<PurchaseInvoice>;
  }

  /**
   * Restaura una factura de compra cancelada
   */
  static async restorePurchaseInvoice(
    id: string,
    companyId: string
  ): Promise<PurchaseInvoice> {
    // Primero restaurar la factura
    const { error: restoreError } = await this.supabase
      .from('purchase_invoices')
      .update({
        status: 'active',
        is_cancelled: false,
        cancelled_at: null,
        cancelled_by: null,
        cancelled_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (restoreError) {
      console.error('Error restaurando factura de compra:', restoreError);
      throw restoreError;
    }

    // Restaurar el inventario (volver a agregar los productos)
    const invoice = await this.getPurchaseInvoiceById(id, companyId);
    if (invoice?.items) {
      for (const item of invoice.items) {
        if (item.item_type === 'PRODUCT' && item.product_id && item.quantity && invoice.warehouse_id) {
          await this.supabase.rpc('adjust_warehouse_inventory', {
            p_product_id: item.product_id,
            p_movement_type: 'in',
            p_quantity: item.quantity,
            p_warehouse_id: invoice.warehouse_id,
            p_reason: `Restauración de factura de compra: ${invoice.supplier_invoice_number}`,
          });
        }
      }
    }

    return this.getPurchaseInvoiceById(id, companyId) as Promise<PurchaseInvoice>;
  }

  /**
   * Actualiza el monto pagado de una factura de compra
   */
  static async updatePaidAmount(
    id: string,
    companyId: string,
    paidAmount: number
  ): Promise<PurchaseInvoice> {
    const invoice = await this.getPurchaseInvoiceById(id, companyId);
    if (!invoice) {
      throw new Error('Factura de compra no encontrada');
    }

    if (paidAmount < 0 || paidAmount > invoice.total_amount) {
      throw new Error(
        `El monto pagado debe estar entre 0 y ${invoice.total_amount}`
      );
    }

    const { error } = await this.supabase
      .from('purchase_invoices')
      .update({
        paid_amount: paidAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error actualizando monto pagado:', error);
      throw error;
    }

    // El trigger actualizará automáticamente el payment_status e inventario
    return this.getPurchaseInvoiceById(id, companyId) as Promise<PurchaseInvoice>;
  }

  /**
   * Registra un pago en una factura de compra
   * Actualiza el monto pagado, crea la transacción contable y actualiza el inventario
   */
  static async registerPayment(
    id: string,
    companyId: string,
    paymentData: {
      amount: number;
      account_id: string;
      payment_date?: string;
      reference?: string;
      notes?: string;
    }
  ): Promise<PurchaseInvoice> {
    const { AccountsService } = await import('./accounts-service');
    
    const invoice = await this.getPurchaseInvoiceById(id, companyId);
    if (!invoice) {
      throw new Error('Factura de compra no encontrada');
    }

    if (invoice.status === 'cancelled') {
      throw new Error('No se puede registrar un pago en una factura cancelada');
    }

    const currentPaidAmount = invoice.paid_amount || 0;
    const newPaidAmount = currentPaidAmount + paymentData.amount;
    const remainingAmount = invoice.total_amount - currentPaidAmount;

    if (paymentData.amount <= 0) {
      throw new Error('El monto del pago debe ser mayor a 0');
    }

    if (paymentData.amount > remainingAmount) {
      throw new Error(
        `El monto del pago (${paymentData.amount}) excede el monto pendiente (${remainingAmount})`
      );
    }

    // Actualizar el monto pagado (esto disparará el trigger que actualiza inventario)
    const { error: updateError } = await this.supabase
      .from('purchase_invoices')
      .update({
        paid_amount: newPaidAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error actualizando monto pagado:', updateError);
      throw new Error(`Error al actualizar el monto pagado: ${updateError.message}`);
    }

    // Crear transacción contable de egreso
    try {
      await AccountsService.createTransaction({
        account_id: paymentData.account_id,
        transaction_type: 'WITHDRAWAL',
        amount: -paymentData.amount, // Negativo para egreso
        description: `Pago de factura de compra ${invoice.supplier_invoice_number || invoice.invoice_number || id.slice(0, 8)}${paymentData.notes ? ` - ${paymentData.notes}` : ''}`,
        reference_number: paymentData.reference || `PAY-${invoice.supplier_invoice_number || invoice.invoice_number || id.slice(0, 8)}`,
        transaction_date: paymentData.payment_date || new Date().toISOString(),
        related_entity_type: 'purchase_invoice',
        related_entity_id: id,
      });
    } catch (accountError: any) {
      console.error('Error creando transacción contable:', accountError);
      // Si falla la transacción contable, revertir el pago
      await this.supabase
        .from('purchase_invoices')
        .update({
          paid_amount: currentPaidAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('company_id', companyId);
      
      throw new Error(`Error al registrar la transacción contable: ${accountError.message || 'Error desconocido'}`);
    }

    // El trigger actualizará automáticamente el payment_status e inventario
    return this.getPurchaseInvoiceById(id, companyId) as Promise<PurchaseInvoice>;
  }

  /**
   * Clona una factura de compra
   */
  static async clonePurchaseInvoice(
    id: string,
    companyId: string,
    newInvoiceDate?: string
  ): Promise<PurchaseInvoice> {
    const originalInvoice = await this.getPurchaseInvoiceById(id, companyId);
    if (!originalInvoice) {
      throw new Error('Factura de compra no encontrada');
    }

    // Crear nueva factura basada en la original
    const newInvoice: CreatePurchaseInvoiceInput = {
      company_id: companyId,
      numeration_id: originalInvoice.numeration_id,
      supplier_id: originalInvoice.supplier_id,
      supplier_invoice_number: `${originalInvoice.supplier_invoice_number}-COPIA`,
      invoice_date: newInvoiceDate || new Date().toISOString().split('T')[0],
      due_date: originalInvoice.due_date,
      currency: originalInvoice.currency,
      warehouse_id: originalInvoice.warehouse_id,
      cost_center_id: originalInvoice.cost_center_id,
      observations: originalInvoice.observations,
      items:
        originalInvoice.items?.map((item) => ({
          item_type: item.item_type,
          product_id: item.product_id,
          account_id: item.account_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          account_amount: item.account_amount,
          discount_percentage: item.discount_percentage,
          tax_id: item.tax_id,
          description: item.description,
          sort_order: item.sort_order,
        })) || [],
      withholdings:
        originalInvoice.withholdings?.map((w) => ({
          withholding_type: w.withholding_type,
          base_amount: w.base_amount,
          percentage: w.percentage,
          withholding_amount: w.withholding_amount,
          description: w.description,
        })) || [],
    };

    return this.createPurchaseInvoice(newInvoice);
  }
}





