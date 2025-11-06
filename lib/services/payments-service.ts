import { createClient } from '@/lib/supabase/client';
import {
  Payment,
  PaymentItem,
  PaymentHistory,
  CreatePaymentInput,
  UpdatePaymentInput,
  PendingPurchaseInvoice,
} from '@/lib/types/payments';
import { NumerationsService } from './numerations-service';

export class PaymentsService {
  private static supabase = createClient();

  /**
   * Obtiene todas las facturas de compra pendientes de un proveedor
   */
  static async getPendingPurchaseInvoices(
    companyId: string,
    supplierId?: string
  ): Promise<PendingPurchaseInvoice[]> {
    let queryBuilder = this.supabase
      .from('purchase_invoices')
      .select(
        `
        id,
        invoice_number,
        supplier_invoice_number,
        supplier_id,
        invoice_date,
        due_date,
        total_amount,
        paid_amount,
        payment_status,
        currency,
        supplier:suppliers!purchase_invoices_supplier_id_fkey(
          id,
          name
        )
      `
      )
      .eq('company_id', companyId)
      .eq('status', 'active')
      .in('payment_status', ['pending', 'partially_paid']);

    if (supplierId) {
      queryBuilder = queryBuilder.eq('supplier_id', supplierId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error obteniendo facturas de compra pendientes:', error);
      throw error;
    }

    // Calcular montos pendientes
    const pendingInvoices: PendingPurchaseInvoice[] = [];

    for (const invoice of data || []) {
      const pendingAmount = Number(invoice.total_amount) - Number(invoice.paid_amount || 0);

      if (pendingAmount > 0) {
        pendingInvoices.push({
          id: invoice.id,
          invoice_number: invoice.invoice_number || undefined,
          supplier_invoice_number: invoice.supplier_invoice_number,
          supplier_id: invoice.supplier_id,
          supplier_name: (invoice.supplier as any)?.name || '',
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date || undefined,
          total_amount: Number(invoice.total_amount),
          paid_amount: Number(invoice.paid_amount || 0),
          pending_amount: pendingAmount,
          payment_status: invoice.payment_status,
          currency: invoice.currency,
        });
      }
    }

    return pendingInvoices;
  }

  /**
   * Obtiene todas las pagos (egresos) con filtros
   */
  static async getPayments(
    companyId: string,
    options?: {
      supplierId?: string;
      accountId?: string;
      status?: 'open' | 'cancelled' | 'reconciled';
      transactionType?: 'INVOICE_PAYMENT' | 'ACCOUNT_PAYMENT';
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ): Promise<{ payments: Payment[]; total: number }> {
    const {
      supplierId,
      accountId,
      status,
      transactionType,
      dateFrom,
      dateTo,
      search,
      sortBy = 'payment_date',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = options || {};

    let queryBuilder = this.supabase
      .from('payments')
      .select(
        `
        *,
        supplier:suppliers(*),
        account:accounts(*),
        payment_method:payment_methods(*),
        cost_center:cost_centers(*),
        numeration:numerations(*),
        items:payment_items(
          *,
          purchase_invoice:purchase_invoices(*),
          account:accounts(*)
        )
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    // Aplicar filtros
    if (supplierId) {
      queryBuilder = queryBuilder.eq('supplier_id', supplierId);
    }

    if (accountId) {
      queryBuilder = queryBuilder.eq('account_id', accountId);
    }

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    if (transactionType) {
      queryBuilder = queryBuilder.eq('transaction_type', transactionType);
    }

    if (dateFrom) {
      queryBuilder = queryBuilder.gte('payment_date', dateFrom);
    }

    if (dateTo) {
      queryBuilder = queryBuilder.lte('payment_date', dateTo);
    }

    // Búsqueda por texto
    if (search) {
      queryBuilder = queryBuilder.or(
        `payment_number.ilike.%${search}%,details.ilike.%${search}%,contact_name.ilike.%${search}%,bank_reference.ilike.%${search}%`
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
      console.error('Error obteniendo pagos:', error);
      throw error;
    }

    return {
      payments: (data || []) as Payment[],
      total: count || 0,
    };
  }

  /**
   * Obtiene un pago por ID
   */
  static async getPaymentById(
    id: string,
    companyId: string
  ): Promise<Payment | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .select(
        `
        *,
        supplier:suppliers(*),
        account:accounts(*),
        payment_method:payment_methods(*),
        cost_center:cost_centers(*),
        numeration:numerations(*),
        items:payment_items(
          *,
          purchase_invoice:purchase_invoices(*),
          account:accounts(*)
        ),
        history:payment_history(*)
      `
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      console.error('Error obteniendo pago:', error);
      throw error;
    }

    return data as Payment;
  }

  /**
   * Crea un nuevo pago
   */
  static async createPayment(input: CreatePaymentInput): Promise<Payment> {
    const { items, numeration_id, ...paymentData } = input;

    // Validar campos requeridos
    if (!paymentData.company_id) {
      throw new Error('company_id es requerido');
    }
    if (!paymentData.account_id) {
      throw new Error('account_id es requerido');
    }
    if (!paymentData.payment_date) {
      throw new Error('payment_date es requerido');
    }
    if (!paymentData.transaction_type) {
      throw new Error('transaction_type es requerido');
    }

    // Calcular total_amount desde items
    const totalAmount = items.reduce((sum, item) => sum + (item.amount_paid || 0), 0);
    if (totalAmount <= 0) {
      throw new Error('El total del pago debe ser mayor a 0. Agregue al menos un item.');
    }

    // Generar número de pago si hay numeración
    let paymentNumber: string | undefined;
    if (numeration_id) {
      try {
        const numeration = await NumerationsService.getNumeration(numeration_id);
        if (numeration) {
          const { data, error: numberError } = await this.supabase.rpc(
            'get_next_number',
            {
              p_company_id: input.company_id,
              p_document_type: 'payment',
              p_name: numeration.name,
            }
          );

          if (!numberError && data) {
            paymentNumber = data;
          }
        }
      } catch (error) {
        console.error('Error generando número de pago:', error);
      }
    }

    // Preparar datos para insertar
    const insertData: any = {
      company_id: paymentData.company_id,
      account_id: paymentData.account_id,
      payment_date: paymentData.payment_date,
      transaction_type: paymentData.transaction_type,
      currency: paymentData.currency || 'COP',
      total_amount: totalAmount, // Calcular desde items
      status: 'open',
      is_reconciled: false,
    };

    // Campos opcionales
    if (numeration_id) {
      insertData.numeration_id = numeration_id;
    }
    if (paymentNumber) {
      insertData.payment_number = paymentNumber;
    }
    if (paymentData.supplier_id) {
      insertData.supplier_id = paymentData.supplier_id;
    }
    if (paymentData.contact_name) {
      insertData.contact_name = paymentData.contact_name;
    }
    if (paymentData.payment_method_id) {
      insertData.payment_method_id = paymentData.payment_method_id;
    }
    if (paymentData.cost_center_id) {
      insertData.cost_center_id = paymentData.cost_center_id;
    }
    if (paymentData.details) {
      insertData.details = paymentData.details;
    }
    if (paymentData.notes) {
      insertData.notes = paymentData.notes;
    }
    if (paymentData.bank_reference) {
      insertData.bank_reference = paymentData.bank_reference;
    }
    if (paymentData.check_number) {
      insertData.check_number = paymentData.check_number;
    }

    console.log('Insertando pago con datos:', JSON.stringify(insertData, null, 2));

    // Crear el pago
    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .insert(insertData)
      .select()
      .single();

    if (paymentError) {
      console.error('Error creando pago:', {
        error: paymentError,
        message: paymentError.message,
        details: paymentError.details,
        hint: paymentError.hint,
        code: paymentError.code,
        insertData,
      });
      const errorMessage = paymentError.message || 
                         paymentError.details || 
                         paymentError.hint || 
                         `Error desconocido al crear el pago. Código: ${paymentError.code || 'N/A'}`;
      throw new Error(errorMessage);
    }

    // Crear los items (el trigger calculará el total automáticamente)
    if (items.length > 0) {
      const itemsToInsert = items.map((item) => {
        const itemData: any = {
          payment_id: payment.id,
          item_type: item.item_type,
          amount_paid: item.amount_paid,
        };

        if (item.item_type === 'INVOICE' && item.purchase_invoice_id) {
          itemData.purchase_invoice_id = item.purchase_invoice_id;
        }
        if (item.item_type === 'ACCOUNT' && item.account_id) {
          itemData.account_id = item.account_id;
        }
        if (item.description) {
          itemData.description = item.description;
        }

        return itemData;
      });

      console.log('Insertando items de pago:', JSON.stringify(itemsToInsert, null, 2));

      const { error: itemsError } = await this.supabase
        .from('payment_items')
        .insert(itemsToInsert);

      if (itemsError) {
        // Si falla, eliminar el pago creado
        try {
          await this.supabase.from('payments').delete().eq('id', payment.id);
        } catch (deleteError) {
          console.error('Error eliminando pago después de fallo en items:', deleteError);
        }
        
        console.error('Error creando items de pago:', {
          error: itemsError,
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code,
          itemsToInsert,
        });
        
        const errorMessage = itemsError.message || 
                           itemsError.details || 
                           itemsError.hint || 
                           `Error desconocido al crear los items del pago. Código: ${itemsError.code || 'N/A'}`;
        throw new Error(errorMessage);
      }
    }

    // El trigger actualizará automáticamente:
    // - El total_amount del pago
    // - El paid_amount de las facturas de compra asociadas
    // - El saldo de la cuenta bancaria

    // Obtener el pago completo
    return this.getPaymentById(payment.id, input.company_id) as Promise<Payment>;
  }

  /**
   * Actualiza un pago
   */
  static async updatePayment(
    id: string,
    companyId: string,
    input: UpdatePaymentInput
  ): Promise<Payment> {
    const { items, ...updateData } = input;

    // Verificar que el pago no esté cancelado
    const currentPayment = await this.getPaymentById(id, companyId);
    if (currentPayment?.status === 'cancelled') {
      throw new Error('No se puede editar un pago cancelado');
    }

    // Actualizar el pago
    const { error: updateError } = await this.supabase
      .from('payments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error actualizando pago:', updateError);
      throw updateError;
    }

    // Si se proporcionan items, reemplazar los existentes
    if (items !== undefined) {
      // Eliminar items existentes
      await this.supabase.from('payment_items').delete().eq('payment_id', id);

      // Crear nuevos items
      if (items.length > 0) {
        const { error: itemsError } = await this.supabase
          .from('payment_items')
          .insert(
            items.map((item) => ({
              ...item,
              payment_id: id,
            }))
          );

        if (itemsError) {
          console.error('Error creando nuevos items:', itemsError);
          throw itemsError;
        }
      }
    }

    return this.getPaymentById(id, companyId) as Promise<Payment>;
  }

  /**
   * Elimina un pago
   */
  static async deletePayment(id: string, companyId: string): Promise<void> {
    const payment = await this.getPaymentById(id, companyId);
    if (payment?.status === 'cancelled') {
      throw new Error('No se puede eliminar un pago cancelado');
    }

    const { error } = await this.supabase
      .from('payments')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error eliminando pago:', error);
      throw error;
    }
  }

  /**
   * Cancela un pago (revierte saldo de cuenta y montos pagados en facturas)
   */
  static async cancelPayment(
    id: string,
    companyId: string,
    reason?: string
  ): Promise<Payment> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user || !user.user) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar que el pago existe y no esté ya cancelado
    const currentPayment = await this.getPaymentById(id, companyId);
    if (!currentPayment) {
      throw new Error('Pago no encontrado');
    }
    if (currentPayment.status === 'cancelled') {
      throw new Error('El pago ya está cancelado');
    }

    const { error, data } = await this.supabase
      .from('payments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.user.id,
        cancelled_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error cancelando pago:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        paymentId: id,
        companyId,
      });
      const errorMessage = error.message || 
                         error.details || 
                         error.hint || 
                         `Error desconocido al cancelar el pago. Código: ${error.code || 'N/A'}`;
      throw new Error(errorMessage);
    }

    // Los triggers automáticamente:
    // - Revertirán el saldo de la cuenta
    // - Recalcularán los montos pagados en las facturas de compra

    return this.getPaymentById(id, companyId) as Promise<Payment>;
  }

  /**
   * Restaura un pago cancelado
   */
  static async restorePayment(
    id: string,
    companyId: string
  ): Promise<Payment> {
    // Verificar que el pago existe y esté cancelado
    const currentPayment = await this.getPaymentById(id, companyId);
    if (!currentPayment) {
      throw new Error('Pago no encontrado');
    }
    if (currentPayment.status !== 'cancelled') {
      throw new Error('Solo se pueden restaurar pagos cancelados');
    }

    const { error: restoreError } = await this.supabase
      .from('payments')
      .update({
        status: 'open',
        cancelled_at: null,
        cancelled_by: null,
        cancelled_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (restoreError) {
      console.error('Error restaurando pago:', {
        error: restoreError,
        message: restoreError.message,
        details: restoreError.details,
        hint: restoreError.hint,
        code: restoreError.code,
        paymentId: id,
        companyId,
      });
      const errorMessage = restoreError.message || 
                         restoreError.details || 
                         restoreError.hint || 
                         `Error desconocido al restaurar el pago. Código: ${restoreError.code || 'N/A'}`;
      throw new Error(errorMessage);
    }

    // Los triggers automáticamente:
    // - Actualizarán el saldo de la cuenta
    // - Recalcularán los montos pagados en las facturas de compra

    return this.getPaymentById(id, companyId) as Promise<Payment>;
  }

  /**
   * Marca un pago como conciliado
   */
  static async reconcilePayment(
    id: string,
    companyId: string,
    reconciliationId?: string
  ): Promise<Payment> {
    // Verificar que el pago existe y no esté cancelado
    const currentPayment = await this.getPaymentById(id, companyId);
    if (!currentPayment) {
      throw new Error('Pago no encontrado');
    }
    if (currentPayment.status === 'cancelled') {
      throw new Error('No se puede conciliar un pago cancelado');
    }
    if (currentPayment.is_reconciled || currentPayment.status === 'reconciled') {
      throw new Error('El pago ya está conciliado');
    }

    // Validar reconciliation_id si se proporciona
    let validReconciliationId: string | null = null;
    if (reconciliationId) {
      // Verificar que la conciliación existe y pertenece a la misma empresa
      const { data: reconciliation, error: reconError } = await this.supabase
        .from('account_reconciliations')
        .select('id, company_id')
        .eq('id', reconciliationId)
        .eq('company_id', companyId)
        .single();

      if (reconError || !reconciliation) {
        console.warn('Reconciliation ID proporcionado no válido o no encontrado:', reconciliationId);
        // No lanzar error, simplemente no usar el reconciliation_id
        validReconciliationId = null;
      } else {
        validReconciliationId = reconciliationId;
      }
    }

    // Usar función RPC para conciliar el pago de manera segura
    console.log('Conciliando pago usando función RPC:', JSON.stringify({
      paymentId: id,
      companyId,
      reconciliationId: validReconciliationId,
    }, null, 2));

    // Preparar parámetros para la función RPC
    const rpcParams: {
      p_payment_id: string;
      p_reconciliation_id?: string | null;
    } = {
      p_payment_id: id,
    };
    
    // Solo incluir reconciliation_id si es válido
    if (validReconciliationId) {
      rpcParams.p_reconciliation_id = validReconciliationId;
    }

    console.log('Llamando función RPC reconcile_payment con parámetros:', JSON.stringify(rpcParams, null, 2));

    const { data, error } = await this.supabase
      .rpc('reconcile_payment', rpcParams);

    if (error) {
      // Intentar extraer información detallada del error
      let errorMessage = 'Error desconocido al conciliar el pago';
      let errorCode = 'UNKNOWN';
      let errorDetails = null;
      
      try {
        if (typeof error === 'object' && error !== null) {
          errorMessage = (error as any).message || (error as any).error_description || errorMessage;
          errorCode = (error as any).code || (error as any).error_code || errorCode;
          errorDetails = (error as any).details || (error as any).hint || null;
        }
        
        // Intentar serializar el error completo
        try {
          const errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error));
          console.error('Error conciliando pago usando RPC - Error completo:', errorStr);
        } catch (e) {
          console.error('Error conciliando pago usando RPC - Objeto error:', error);
        }
      } catch (e) {
        console.error('Error al procesar información del error:', e);
      }
      
      console.error('Error conciliando pago usando RPC - Información extraída:', {
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
      });
      
      console.error('Error conciliando pago usando RPC - Contexto:', {
        paymentId: id,
        companyId,
        reconciliationId: validReconciliationId,
      });
      
      // Usar el mensaje más descriptivo disponible
      const finalMessage = errorDetails || errorMessage || 
                          `Error al conciliar el pago. Código: ${errorCode}`;
      throw new Error(finalMessage);
    }

    // La función RPC retorna un JSON con success: true
    // Obtener el pago actualizado
    const updatedPayment = await this.getPaymentById(id, companyId);
    if (!updatedPayment) {
      throw new Error('No se pudo obtener el pago actualizado después de la conciliación');
    }

    return updatedPayment;
  }

  /**
   * Desmarca un pago como conciliado
   */
  static async unreconcilePayment(
    id: string,
    companyId: string
  ): Promise<Payment> {
    // Verificar que el pago existe y esté conciliado
    const currentPayment = await this.getPaymentById(id, companyId);
    if (!currentPayment) {
      throw new Error('Pago no encontrado');
    }
    if (!currentPayment.is_reconciled && currentPayment.status !== 'reconciled') {
      throw new Error('El pago no está conciliado');
    }

    const { error } = await this.supabase
      .from('payments')
      .update({
        status: 'open',
        is_reconciled: false,
        reconciliation_id: null,
        reconciliation_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error desconciliando pago:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        paymentId: id,
        companyId,
      });
      const errorMessage = error.message || 
                         error.details || 
                         error.hint || 
                         `Error desconocido al desconciliar el pago. Código: ${error.code || 'N/A'}`;
      throw new Error(errorMessage);
    }

    return this.getPaymentById(id, companyId) as Promise<Payment>;
  }
}





