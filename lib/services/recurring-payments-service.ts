import { createClient } from '@/lib/supabase/client';
import {
  RecurringPayment,
  RecurringPaymentItem,
  RecurringPaymentGeneration,
  CreateRecurringPaymentInput,
  UpdateRecurringPaymentInput,
} from '@/lib/types/recurring-payments';
import { PaymentsService } from './payments-service';
import { NumerationsService } from './numerations-service';

export class RecurringPaymentsService {
  private static supabase = createClient();

  /**
   * Obtiene todas las pagos recurrentes con filtros
   */
  static async getRecurringPayments(
    companyId: string,
    options?: {
      supplierId?: string;
      accountId?: string;
      isActive?: boolean;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ): Promise<{ recurringPayments: RecurringPayment[]; total: number }> {
    const {
      supplierId,
      accountId,
      isActive,
      dateFrom,
      dateTo,
      search,
      sortBy = 'start_date',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = options || {};

    let queryBuilder = this.supabase
      .from('recurring_payments')
      .select(
        `
        *,
        supplier:suppliers(*),
        account:accounts(*),
        payment_method:payment_methods(*),
        cost_center:cost_centers(*),
        numeration:numerations(*),
        items:recurring_payment_items(
          *,
          account:accounts(*)
        ),
        generations:recurring_payment_generations(
          *,
          payment:payments(*)
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

    if (isActive !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', isActive);
    }

    if (dateFrom) {
      queryBuilder = queryBuilder.gte('start_date', dateFrom);
    }

    if (dateTo) {
      queryBuilder = queryBuilder.lte('start_date', dateTo);
    }

    // Búsqueda por texto
    if (search) {
      queryBuilder = queryBuilder.or(
        `details.ilike.%${search}%,contact_name.ilike.%${search}%,notes.ilike.%${search}%`
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
      console.error('Error obteniendo pagos recurrentes:', error);
      throw error;
    }

    return {
      recurringPayments: (data || []) as RecurringPayment[],
      total: count || 0,
    };
  }

  /**
   * Obtiene un pago recurrente por ID
   */
  static async getRecurringPaymentById(
    id: string,
    companyId: string
  ): Promise<RecurringPayment | null> {
    const { data, error } = await this.supabase
      .from('recurring_payments')
      .select(
        `
        *,
        supplier:suppliers(*),
        account:accounts(*),
        payment_method:payment_methods(*),
        cost_center:cost_centers(*),
        numeration:numerations(*),
        items:recurring_payment_items(
          *,
          account:accounts(*)
        ),
        generations:recurring_payment_generations(
          *,
          payment:payments(*)
        )
      `
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      console.error('Error obteniendo pago recurrente:', error);
      throw error;
    }

    return data as RecurringPayment;
  }

  /**
   * Crea un nuevo pago recurrente
   */
  static async createRecurringPayment(
    input: CreateRecurringPaymentInput
  ): Promise<RecurringPayment> {
    const { items = [], ...paymentData } = input;

    // Validar que haya items
    if (!items || items.length === 0) {
      throw new Error('Debe agregar al menos un item de cuenta contable');
    }

    // Calcular totales de items
    const itemsToInsert = items.map((item, index) => {
      const cleanedItem: any = {
        item_type: item.item_type,
        amount: item.amount,
        description: item.description || null,
        sort_order: item.sort_order ?? index,
      };

      // Solo incluir account_id si tiene un valor válido
      if (item.account_id && typeof item.account_id === 'string' && item.account_id.trim() !== '') {
        cleanedItem.account_id = item.account_id;
      } else {
        cleanedItem.account_id = null;
      }

      // Solo incluir purchase_invoice_id si tiene un valor válido
      if (item.purchase_invoice_id && typeof item.purchase_invoice_id === 'string' && item.purchase_invoice_id.trim() !== '') {
        cleanedItem.purchase_invoice_id = item.purchase_invoice_id;
      } else {
        cleanedItem.purchase_invoice_id = null;
      }

      return cleanedItem;
    });

    const totalAmount = itemsToInsert.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    // Limpiar datos del pago recurrente
    const cleanedPaymentData: any = {
      ...paymentData,
      total_amount: totalAmount,
      is_active: true,
    };

    // Validar y limpiar account_id (campo requerido)
    if (!cleanedPaymentData.account_id || 
        (typeof cleanedPaymentData.account_id === 'string' && cleanedPaymentData.account_id.trim() === '') ||
        cleanedPaymentData.account_id === null ||
        cleanedPaymentData.account_id === undefined) {
      throw new Error('La cuenta bancaria es requerida');
    }

    // Limpiar campos opcionales que pueden ser cadenas vacías
    const optionalFields = [
      'supplier_id',
      'contact_name',
      'numeration_id',
      'payment_method_id',
      'cost_center_id',
      'end_date',
      'details',
      'notes',
    ];

    optionalFields.forEach((field) => {
      const value = cleanedPaymentData[field];
      if (value === '' || value === null || value === undefined) {
        cleanedPaymentData[field] = null;
      }
    });

    // Crear el pago recurrente
    const { data: recurringPayment, error: paymentError } = await this.supabase
      .from('recurring_payments')
      .insert(cleanedPaymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('Error creando pago recurrente:', paymentError);
      const errorMessage = paymentError.message || paymentError.details || JSON.stringify(paymentError) || 'Error al crear el pago recurrente';
      throw new Error(errorMessage);
    }

    // Crear los items (el trigger calculará el total automáticamente)
    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await this.supabase
        .from('recurring_payment_items')
        .insert(
          itemsToInsert.map((item) => ({
            ...item,
            recurring_payment_id: recurringPayment.id,
          }))
        );

      if (itemsError) {
        // Si falla, eliminar el pago recurrente creado
        await this.supabase
          .from('recurring_payments')
          .delete()
          .eq('id', recurringPayment.id);
        console.error('Error creando items de pago recurrente:', itemsError);
        const errorMessage = itemsError.message || itemsError.details || JSON.stringify(itemsError) || 'Error al crear los items del pago recurrente';
        throw new Error(errorMessage);
      }
    }

    // El trigger calculará automáticamente next_generation_date

    // Obtener el pago recurrente completo
    return this.getRecurringPaymentById(
      recurringPayment.id,
      input.company_id
    ) as Promise<RecurringPayment>;
  }

  /**
   * Actualiza un pago recurrente
   */
  static async updateRecurringPayment(
    id: string,
    companyId: string,
    input: UpdateRecurringPaymentInput
  ): Promise<RecurringPayment> {
    const { items, ...updateData } = input;

    // Actualizar el pago recurrente
    const { error: updateError } = await this.supabase
      .from('recurring_payments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error actualizando pago recurrente:', updateError);
      throw updateError;
    }

    // Si se proporcionan items, reemplazar los existentes
    if (items !== undefined) {
      // Eliminar items existentes
      await this.supabase
        .from('recurring_payment_items')
        .delete()
        .eq('recurring_payment_id', id);

      // Crear nuevos items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => {
          const cleanedItem: any = {
            item_type: item.item_type,
            amount: item.amount,
            description: item.description || null,
            sort_order: item.sort_order ?? index,
            recurring_payment_id: id,
          };

          // Solo incluir account_id si tiene un valor válido
          if (item.account_id && typeof item.account_id === 'string' && item.account_id.trim() !== '') {
            cleanedItem.account_id = item.account_id;
          } else {
            cleanedItem.account_id = null;
          }

          // Solo incluir purchase_invoice_id si tiene un valor válido
          if (item.purchase_invoice_id && typeof item.purchase_invoice_id === 'string' && item.purchase_invoice_id.trim() !== '') {
            cleanedItem.purchase_invoice_id = item.purchase_invoice_id;
          } else {
            cleanedItem.purchase_invoice_id = null;
          }

          return cleanedItem;
        });

        const { error: itemsError } = await this.supabase
          .from('recurring_payment_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error creando nuevos items:', itemsError);
          throw itemsError;
        }
      }
    }

    // El trigger recalculará automáticamente next_generation_date

    return this.getRecurringPaymentById(
      id,
      companyId
    ) as Promise<RecurringPayment>;
  }

  /**
   * Elimina un pago recurrente
   */
  static async deleteRecurringPayment(
    id: string,
    companyId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('recurring_payments')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error eliminando pago recurrente:', error);
      throw error;
    }
  }

  /**
   * Actualiza el estado activo/inactivo de un pago recurrente
   */
  static async updateRecurringPaymentStatus(
    id: string,
    companyId: string,
    isActive: boolean
  ): Promise<RecurringPayment> {
    const { error } = await this.supabase
      .from('recurring_payments')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error actualizando estado de pago recurrente:', error);
      throw error;
    }

    return this.getRecurringPaymentById(
      id,
      companyId
    ) as Promise<RecurringPayment>;
  }

  /**
   * Genera un pago desde un pago recurrente
   */
  static async generatePaymentFromRecurring(
    id: string,
    companyId: string,
    generationDate?: string
  ): Promise<{ paymentId: string; payment: any }> {
    const recurringPayment = await this.getRecurringPaymentById(id, companyId);
    if (!recurringPayment) {
      throw new Error('Pago recurrente no encontrado');
    }

    if (!recurringPayment.is_active) {
      throw new Error('El pago recurrente no está activo');
    }

    // Generar número de pago si hay numeración
    let paymentNumber: string | undefined;
    if (recurringPayment.numeration_id) {
      try {
        const numeration = await NumerationsService.getNumeration(
          recurringPayment.numeration_id
        );
        if (numeration) {
          const { data, error: numberError } = await this.supabase.rpc(
            'get_next_number',
            {
              p_company_id: companyId,
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

    // Crear el pago usando el servicio de pagos
    const paymentDate = generationDate || new Date().toISOString().split('T')[0];
    const paymentItems = recurringPayment.items?.map((item) => ({
      item_type: item.item_type,
      purchase_invoice_id: item.purchase_invoice_id,
      account_id: item.account_id,
      amount_paid: item.amount,
      description: item.description,
    })) || [];

    const payment = await PaymentsService.createPayment({
      company_id: companyId,
      numeration_id: recurringPayment.numeration_id,
      payment_date: paymentDate,
      supplier_id: recurringPayment.supplier_id,
      contact_name: recurringPayment.contact_name,
      account_id: recurringPayment.account_id,
      payment_method_id: recurringPayment.payment_method_id,
      cost_center_id: recurringPayment.cost_center_id,
      currency: recurringPayment.currency,
      details: recurringPayment.details,
      notes: recurringPayment.notes,
      transaction_type: recurringPayment.transaction_type,
      items: paymentItems,
    });

    // Actualizar última fecha de generación y próxima fecha
    // Usar la función SQL para calcular la próxima fecha
    const { data: nextDate, error: nextDateError } = await this.supabase.rpc(
      'calculate_next_recurring_payment_date',
      {
        p_start_date: recurringPayment.start_date,
        p_day_of_month: recurringPayment.day_of_month,
        p_frequency_months: recurringPayment.frequency_months,
        p_last_generated_date: paymentDate,
        p_end_date: recurringPayment.end_date || null,
      }
    );

    const { error: updateError } = await this.supabase
      .from('recurring_payments')
      .update({
        last_generated_date: paymentDate,
        next_generation_date: nextDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error actualizando fechas de pago recurrente:', updateError);
      // No fallar si solo hay error en la actualización de fechas
    }

    // Registrar la generación
    const { data: user } = await this.supabase.auth.getUser();
    await this.supabase.from('recurring_payment_generations').insert({
      recurring_payment_id: id,
      payment_id: payment.id,
      company_id: companyId,
      scheduled_date: paymentDate,
      generated_date: new Date().toISOString(),
      status: 'generated',
      generated_by: user?.user?.id,
    });

    return {
      paymentId: payment.id,
      payment,
    };
  }

  /**
   * Obtiene el historial de generaciones de un pago recurrente
   */
  static async getRecurringPaymentGenerations(
    id: string,
    companyId: string
  ): Promise<RecurringPaymentGeneration[]> {
    const { data, error } = await this.supabase
      .from('recurring_payment_generations')
      .select(
        `
        *,
        payment:payments(*)
      `
      )
      .eq('recurring_payment_id', id)
      .eq('company_id', companyId)
      .order('scheduled_date', { ascending: false });

    if (error) {
      console.error('Error obteniendo generaciones de pago recurrente:', error);
      throw error;
    }

    return (data || []) as RecurringPaymentGeneration[];
  }
}





