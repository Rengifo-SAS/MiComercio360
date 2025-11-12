import { createClient } from '@/lib/supabase/client';
import {
  ReceivedPayment,
  ReceivedPaymentItem,
  ReceivedPaymentHistory,
  CreateReceivedPaymentInput,
  UpdateReceivedPaymentInput,
  PendingInvoice,
} from '@/lib/types/received-payments';
import { NumerationsService } from './numerations-service';

export class ReceivedPaymentsService {
  private static supabase = createClient();

  /**
   * Obtiene todas las facturas pendientes de un cliente
   */
  static async getPendingInvoices(
    companyId: string,
    customerId: string
  ): Promise<PendingInvoice[]> {
    const { data, error } = await this.supabase
      .from('sales')
      .select(
        `
        id,
        sale_number,
        customer_id,
        total_amount,
        payment_status,
        created_at,
        customer:customers!sales_customer_id_fkey(
          id,
          business_name
        )
      `
      )
      .eq('company_id', companyId)
      .eq('customer_id', customerId)
      .in('payment_status', ['pending', 'partially_refunded']);

    if (error) {
      console.error('Error obteniendo facturas pendientes:', error);
      throw error;
    }

    // Calcular montos pagados y pendientes
    const pendingInvoices: PendingInvoice[] = [];

    for (const sale of data || []) {
      // Obtener pagos recibidos asociados a esta factura
      const { data: payments, error: paymentsError } = await this.supabase
        .from('received_payment_items')
        .select('amount_paid')
        .eq('sale_id', sale.id)
        .eq('item_type', 'INVOICE')
        .in('received_payment_id', [
          // Obtener IDs de pagos que no estén anulados
          ...(await this.supabase
            .from('received_payments')
            .select('id')
            .eq('company_id', companyId)
            .neq('status', 'cancelled')
            .then(({ data }) => data?.map((p) => p.id) || []))
        ]);

      if (paymentsError) {
        console.error('Error obteniendo pagos de factura:', paymentsError);
        continue;
      }

      const paidAmount =
        payments?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
      const pendingAmount = Number(sale.total_amount) - paidAmount;

      if (pendingAmount > 0) {
        pendingInvoices.push({
          sale_id: sale.id,
          sale_number: sale.sale_number,
          customer_id: sale.customer_id,
          customer_name: (sale.customer as any)?.business_name || '',
          issue_date: sale.created_at,
          total_amount: Number(sale.total_amount),
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
          payment_status: sale.payment_status,
        });
      }
    }

    return pendingInvoices;
  }

  /**
   * Obtiene todas las pagos recibidos con filtros
   */
  static async getReceivedPayments(
    companyId: string,
    options?: {
      customerId?: string;
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
  ): Promise<{ receivedPayments: ReceivedPayment[]; total: number }> {
    const {
      customerId,
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
      .from('received_payments')
      .select(
        `
        *,
        customer:customers(*),
        account:accounts(*),
        payment_method:payment_methods(*),
        cost_center:cost_centers(*),
        numeration:numerations(*),
        items:received_payment_items(
          *,
          sale:sales(*),
          account:accounts(*)
        )
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    // Aplicar filtros
    if (customerId) {
      queryBuilder = queryBuilder.eq('customer_id', customerId);
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
        `payment_number.ilike.%${search}%,notes.ilike.%${search}%,bank_reference.ilike.%${search}%`
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
      console.error('Error obteniendo pagos recibidos:', error);
      throw error;
    }

    return {
      receivedPayments: (data || []) as ReceivedPayment[],
      total: count || 0,
    };
  }

  /**
   * Obtiene un pago recibido por ID
   */
  static async getReceivedPaymentById(
    id: string,
    companyId: string
  ): Promise<ReceivedPayment | null> {
    const { data, error } = await this.supabase
      .from('received_payments')
      .select(
        `
        *,
        customer:customers(*),
        account:accounts(*),
        payment_method:payment_methods(*),
        cost_center:cost_centers(*),
        numeration:numerations(*),
        items:received_payment_items(
          *,
          sale:sales(*),
          account:accounts(*)
        ),
        history:received_payment_history(*)
      `
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      console.error('Error obteniendo pago recibido:', error);
      throw error;
    }

    return data as ReceivedPayment;
  }

  /**
   * Crea un nuevo pago recibido
   */
  static async createReceivedPayment(
    input: CreateReceivedPaymentInput
  ): Promise<ReceivedPayment> {
    const { items, numeration_id, ...paymentData } = input;

    // Validar que items exista y tenga elementos
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Debe incluir al menos un item en el pago');
    }

    // Calcular total_amount sumando los amount_paid de los items
    const totalAmount = items.reduce((sum, item) => {
      const amount = typeof item.amount_paid === 'number' ? item.amount_paid : parseFloat(String(item.amount_paid || 0));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Convertir a número y validar que sea un número válido
    const finalTotalAmount = Number(totalAmount);
    if (isNaN(finalTotalAmount) || finalTotalAmount <= 0) {
      throw new Error('El monto total del pago debe ser mayor a 0');
    }

    // Buscar numeración si no se proporciona o generar número de pago
    let numerationIdToUse = numeration_id;
    let paymentNumber: string | undefined;
    
    // Si no se proporciona numeration_id, buscar numeración por defecto para recibos
    if (!numerationIdToUse) {
      try {
        // Buscar numeración de tipo 'receipt' o 'payment_voucher' para pagos recibidos
        const { data: defaultNumeration } = await this.supabase
          .from('numerations')
          .select('id')
          .eq('company_id', input.company_id)
          .eq('is_active', true)
          .in('document_type', ['receipt', 'payment_voucher'])
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (defaultNumeration?.id) {
          numerationIdToUse = defaultNumeration.id;
        }
      } catch (err) {
        console.error('Error buscando numeración por defecto para pago recibido:', err);
      }
    }

    // Generar número de pago si hay numeración
    if (numerationIdToUse) {
      try {
        // Obtener la numeración
        const numeration = await NumerationsService.getNumeration(numerationIdToUse);
        if (numeration) {
          // Generar el número usando la función get_next_number con el document_type de la numeración
          const { data, error: numberError } = await this.supabase.rpc(
            'get_next_number',
            {
              p_company_id: input.company_id,
              p_document_type: numeration.document_type, // Usar el document_type de la numeración
              p_name: numeration.name,
            }
          );

          if (!numberError && data) {
            paymentNumber = data;
          } else if (numberError) {
            console.error('Error generando número de pago:', numberError);
          }
        }
      } catch (error) {
        console.error('Error generando número de pago:', error);
        // Continuar sin número si falla
      }
    }

    // Preparar datos para insertar, asegurándose de que total_amount esté correctamente calculado
    // Eliminar total_amount de paymentData si existe para evitar sobrescribir el valor calculado
    const { total_amount: _, ...cleanPaymentData } = paymentData as any;

    // Crear el pago recibido
    const { data: payment, error: paymentError } = await this.supabase
      .from('received_payments')
      .insert({
        ...cleanPaymentData,
        total_amount: finalTotalAmount, // Siempre usar el valor calculado
        numeration_id: numerationIdToUse,
        payment_number: paymentNumber,
        status: 'completed', // Crear como completado directamente
        is_reconciled: false,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creando pago recibido:', paymentError);
      throw paymentError;
    }

    // Registrar transacción contable (ingreso de dinero) como en ventas del POS
    if (input.account_id) {
      try {
        // Obtener el saldo actual de la cuenta
        const { data: account } = await this.supabase
          .from('accounts')
          .select('current_balance')
          .eq('id', input.account_id)
          .single();

        const currentBalance = account?.current_balance || 0;
        const newBalance = currentBalance + finalTotalAmount;

        // Insertar la transacción con el balance_after calculado
        const { error: txError } = await this.supabase
          .from('account_transactions')
          .insert({
            account_id: input.account_id,
            company_id: input.company_id,
            transaction_type: 'RECEIPT',
            amount: finalTotalAmount,
            balance_after: newBalance,
            description: paymentNumber ? `Pago Recibido ${paymentNumber}` : `Pago Recibido ${payment.id.substring(0, 8)}`,
            related_entity_type: 'received_payment',
            related_entity_id: payment.id,
          });

        if (txError) {
          console.error('Error insertando transacción de cuenta:', txError);
          // No hacer rollback del pago, pero registrar el error
        }
      } catch (txError) {
        console.error('Error registrando transacción de cuenta para el pago recibido:', txError);
        // No hacer rollback del pago; se puede registrar manualmente luego
      }
    }

    // Crear los items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        ...item,
        received_payment_id: payment.id,
      }));

      const { error: itemsError } = await this.supabase
        .from('received_payment_items')
        .insert(itemsToInsert);

      if (itemsError) {
        // Si falla la inserción de items, eliminar el pago
        await this.supabase
          .from('received_payments')
          .delete()
          .eq('id', payment.id);
        console.error('Error creando items de pago recibido:', itemsError);
        throw itemsError;
      }
    }

    // Si hay facturas asociadas, actualizar su estado de pago y estado general
    if (input.transaction_type === 'INVOICE_PAYMENT') {
      for (const item of items) {
        if (item.item_type === 'INVOICE' && item.sale_id) {
          // Obtener la factura completa
          const { data: sale } = await this.supabase
            .from('sales')
            .select('id, total_amount, payment_status, status, sale_number, account_id')
            .eq('id', item.sale_id)
            .single();

          if (sale) {
            // Obtener total pagado de esta factura (incluyendo el pago que acabamos de crear)
            // Incluir el pago actual en la lista de IDs
            const { data: paymentRecords } = await this.supabase
              .from('received_payments')
              .select('id')
              .eq('company_id', input.company_id)
              .neq('status', 'cancelled');

            const paymentIds = paymentRecords?.map((p) => p.id) || [];
            
            // Asegurar que el pago actual esté incluido
            if (!paymentIds.includes(payment.id)) {
              paymentIds.push(payment.id);
            }

            // Si hay pagos, calcular el total pagado
            if (paymentIds.length > 0) {
              const { data: allPayments } = await this.supabase
                .from('received_payment_items')
                .select('amount_paid')
                .eq('sale_id', item.sale_id)
                .eq('item_type', 'INVOICE')
                .in('received_payment_id', paymentIds);

              const totalPaid =
                allPayments?.reduce(
                  (sum, p) => sum + Number(p.amount_paid || 0),
                  0
                ) || 0;
              const totalAmount = Number(sale.total_amount || 0);

              // Determinar nuevos estados
              let newPaymentStatus = sale.payment_status || 'pending';
              let newStatus = sale.status || 'pending';

              if (totalPaid >= totalAmount) {
                // Pago completo - marcar factura como completada
                newPaymentStatus = 'completed';
                // Si la venta estaba pendiente, cambiar a completada
                if (sale.status === 'pending') {
                  newStatus = 'completed';
                }
                
                // Si la factura estaba pendiente y ahora está completada, registrar transacción contable
                // Solo si la factura no tenía account_id o necesitamos registrar el ingreso
                if (sale.status === 'pending' && input.account_id) {
                  try {
                    // Si la factura tiene account_id, usar esa cuenta, sino usar la del pago
                    const saleAccountId = sale.account_id || input.account_id;
                    
                    if (saleAccountId) {
                      const { data: saleAccount } = await this.supabase
                        .from('accounts')
                        .select('current_balance')
                        .eq('id', saleAccountId)
                        .single();

                      const saleCurrentBalance = saleAccount?.current_balance || 0;
                      const saleNewBalance = saleCurrentBalance + totalAmount;

                      // Registrar la transacción contable por la venta completada
                      // Solo si la cuenta de la venta es diferente a la del pago, o si la venta no tenía cuenta
                      if (!sale.account_id || saleAccountId !== input.account_id) {
                        await this.supabase
                          .from('account_transactions')
                          .insert({
                            account_id: saleAccountId,
                            company_id: input.company_id,
                            transaction_type: 'RECEIPT',
                            amount: totalAmount,
                            balance_after: saleNewBalance,
                            description: `Pago de factura ${sale.sale_number || item.sale_id}`,
                            related_entity_type: 'sale',
                            related_entity_id: item.sale_id,
                          });
                      }
                    }
                  } catch (saleTxError) {
                    console.error('Error registrando transacción contable para factura completada:', saleTxError);
                    // No hacer rollback, solo registrar el error
                  }
                }
              } else if (totalPaid > 0) {
                // Pago parcial - mantener como pendiente hasta completar
                newPaymentStatus = 'pending';
              }

              // Actualizar estado de pago y estado general de la factura
              const updateData: any = {
                payment_status: newPaymentStatus,
                updated_at: new Date().toISOString(),
              };

              // Solo actualizar status si cambió
              if (newStatus !== sale.status) {
                updateData.status = newStatus;
              }

              const { error: updateError } = await this.supabase
                .from('sales')
                .update(updateData)
                .eq('id', item.sale_id);

              if (updateError) {
                console.error('Error actualizando estado de factura:', updateError);
              }
            }
          }
        }
      }
    }

    // Obtener el pago completo con relaciones
    return this.getReceivedPaymentById(
      payment.id,
      input.company_id
    ) as Promise<ReceivedPayment>;
  }

  /**
   * Actualiza un pago recibido
   */
  static async updateReceivedPayment(
    id: string,
    companyId: string,
    input: UpdateReceivedPaymentInput
  ): Promise<ReceivedPayment> {
    const { items, ...updateData } = input;

    // Verificar que el pago no esté conciliado
    const currentPayment = await this.getReceivedPaymentById(id, companyId);
    if (currentPayment?.is_reconciled && updateData.status !== 'cancelled') {
      throw new Error(
        'No se puede editar un pago que ya está conciliado'
      );
    }

    // Actualizar el pago recibido
    const { error: updateError } = await this.supabase
      .from('received_payments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error actualizando pago recibido:', updateError);
      throw updateError;
    }

    // Si se proporcionan items, reemplazar los existentes
    if (items !== undefined) {
      // Eliminar items existentes
      const { error: deleteError } = await this.supabase
        .from('received_payment_items')
        .delete()
        .eq('received_payment_id', id);

      if (deleteError) {
        console.error('Error eliminando items existentes:', deleteError);
        throw deleteError;
      }

      // Crear nuevos items
      if (items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          ...item,
          received_payment_id: id,
        }));

        const { error: itemsError } = await this.supabase
          .from('received_payment_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error creando nuevos items:', itemsError);
          throw itemsError;
        }
      }
    }

    // Obtener el pago actualizado
    return this.getReceivedPaymentById(id, companyId) as Promise<ReceivedPayment>;
  }

  /**
   * Elimina un pago recibido
   */
  static async deleteReceivedPayment(
    id: string,
    companyId: string
  ): Promise<void> {
    // Verificar que el pago no esté conciliado
    const payment = await this.getReceivedPaymentById(id, companyId);
    if (payment?.is_reconciled) {
      throw new Error(
        'No se puede eliminar un pago que está conciliado'
      );
    }

    const { error } = await this.supabase
      .from('received_payments')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error eliminando pago recibido:', error);
      throw error;
    }
  }

  /**
   * Anula un pago recibido
   */
  static async cancelReceivedPayment(
    id: string,
    companyId: string,
    reason?: string
  ): Promise<ReceivedPayment> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user || !user.user) {
      throw new Error('Usuario no autenticado');
    }

    const { error } = await this.supabase
      .from('received_payments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.user.id,
        cancelled_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error anulando pago recibido:', error);
      throw error;
    }

    return this.getReceivedPaymentById(id, companyId) as Promise<ReceivedPayment>;
  }

  /**
   * Restaura un pago recibido anulado
   */
  static async restoreReceivedPayment(
    id: string,
    companyId: string
  ): Promise<ReceivedPayment> {
    const { error } = await this.supabase
      .from('received_payments')
      .update({
        status: 'open',
        cancelled_at: null,
        cancelled_by: null,
        cancelled_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error restaurando pago recibido:', error);
      throw error;
    }

    return this.getReceivedPaymentById(id, companyId) as Promise<ReceivedPayment>;
  }
}

