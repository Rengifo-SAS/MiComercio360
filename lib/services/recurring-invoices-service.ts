import { createClient } from '@/lib/supabase/client';
import {
  RecurringInvoice,
  RecurringInvoiceItem,
  RecurringInvoiceGeneration,
  CreateRecurringInvoiceInput,
  UpdateRecurringInvoiceInput,
} from '@/lib/types/recurring-invoices';

export class RecurringInvoicesService {
  private static supabase = createClient();

  /**
   * Obtiene todas las facturas recurrentes con filtros
   */
  static async getRecurringInvoices(
    companyId: string,
    options?: {
      isActive?: boolean;
      customerId?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ): Promise<{ recurringInvoices: RecurringInvoice[]; total: number }> {
    const {
      isActive,
      customerId,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = options || {};

    let queryBuilder = this.supabase
      .from('recurring_invoices')
      .select(
        `
        *,
        customer:customers(*),
        numeration:numerations(*),
        warehouse:warehouses(*),
        items:recurring_invoice_items(
          *,
          product:products(*),
          tax:taxes(*)
        ),
        generations:recurring_invoice_generations(*)
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    // Aplicar filtros
    if (isActive !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', isActive);
    }

    if (customerId) {
      queryBuilder = queryBuilder.eq('customer_id', customerId);
    }

    // Búsqueda por texto
    if (search) {
      queryBuilder = queryBuilder.or(
        `notes.ilike.%${search}%,observations.ilike.%${search}%`
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
      console.error('Error obteniendo facturas recurrentes:', error);
      throw error;
    }

    return {
      recurringInvoices: (data || []) as RecurringInvoice[],
      total: count || 0,
    };
  }

  /**
   * Obtiene una factura recurrente por ID
   */
  static async getRecurringInvoiceById(
    id: string,
    companyId: string
  ): Promise<RecurringInvoice | null> {
    const { data, error } = await this.supabase
      .from('recurring_invoices')
      .select(
        `
        *,
        customer:customers(*),
        numeration:numerations(*),
        warehouse:warehouses(*),
        items:recurring_invoice_items(
          *,
          product:products(*),
          tax:taxes(*)
        ),
        generations:recurring_invoice_generations(
          *,
          sale:sales(*)
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
      console.error('Error obteniendo factura recurrente:', error);
      throw error;
    }

    return data as RecurringInvoice;
  }

  /**
   * Crea una nueva factura recurrente
   */
  static async createRecurringInvoice(
    input: CreateRecurringInvoiceInput
  ): Promise<RecurringInvoice> {
    const { items, ...invoiceData } = input;

    // Crear la factura recurrente
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('recurring_invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creando factura recurrente:', invoiceError);
      throw invoiceError;
    }

    // Crear los items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        ...item,
        recurring_invoice_id: invoice.id,
        sort_order: item.sort_order ?? index,
        discount_amount:
          item.discount_percentage && item.discount_percentage > 0
            ? (item.unit_price * item.quantity * item.discount_percentage) / 100
            : 0,
        total_price:
          item.unit_price * item.quantity -
          (item.discount_percentage && item.discount_percentage > 0
            ? (item.unit_price * item.quantity * item.discount_percentage) / 100
            : 0),
      }));

      const { error: itemsError } = await this.supabase
        .from('recurring_invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        // Si falla la inserción de items, eliminar la factura recurrente
        await this.supabase
          .from('recurring_invoices')
          .delete()
          .eq('id', invoice.id);
        console.error('Error creando items de factura recurrente:', itemsError);
        throw itemsError;
      }
    }

    // Obtener la factura completa con relaciones
    return this.getRecurringInvoiceById(invoice.id, input.company_id) as Promise<RecurringInvoice>;
  }

  /**
   * Actualiza una factura recurrente
   */
  static async updateRecurringInvoice(
    id: string,
    companyId: string,
    input: UpdateRecurringInvoiceInput
  ): Promise<RecurringInvoice> {
    const { items, ...updateData } = input;

    // Actualizar la factura recurrente
    const { error: updateError } = await this.supabase
      .from('recurring_invoices')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error actualizando factura recurrente:', updateError);
      throw updateError;
    }

    // Si se proporcionan items, reemplazar los existentes
    if (items !== undefined) {
      // Eliminar items existentes
      const { error: deleteError } = await this.supabase
        .from('recurring_invoice_items')
        .delete()
        .eq('recurring_invoice_id', id);

      if (deleteError) {
        console.error('Error eliminando items existentes:', deleteError);
        throw deleteError;
      }

      // Crear nuevos items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          ...item,
          recurring_invoice_id: id,
          sort_order: item.sort_order ?? index,
          discount_amount:
            item.discount_percentage && item.discount_percentage > 0
              ? (item.unit_price * item.quantity * item.discount_percentage) / 100
              : 0,
          total_price:
            item.unit_price * item.quantity -
            (item.discount_percentage && item.discount_percentage > 0
              ? (item.unit_price * item.quantity * item.discount_percentage) / 100
              : 0),
        }));

        const { error: itemsError } = await this.supabase
          .from('recurring_invoice_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error creando nuevos items:', itemsError);
          throw itemsError;
        }
      }
    }

    // Obtener la factura actualizada
    return this.getRecurringInvoiceById(id, companyId) as Promise<RecurringInvoice>;
  }

  /**
   * Elimina una factura recurrente
   */
  static async deleteRecurringInvoice(
    id: string,
    companyId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('recurring_invoices')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error eliminando factura recurrente:', error);
      throw error;
    }
  }

  /**
   * Activa o desactiva una factura recurrente
   */
  static async toggleRecurringInvoice(
    id: string,
    companyId: string,
    isActive: boolean
  ): Promise<RecurringInvoice> {
    const { error } = await this.supabase
      .from('recurring_invoices')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error actualizando estado de factura recurrente:', error);
      throw error;
    }

    return this.getRecurringInvoiceById(id, companyId) as Promise<RecurringInvoice>;
  }

  /**
   * Obtiene las facturas recurrentes que deben generarse hoy o en una fecha específica
   */
  static async getRecurringInvoicesToGenerate(
    companyId: string,
    date?: string
  ): Promise<RecurringInvoice[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('recurring_invoices')
      .select(
        `
        *,
        customer:customers(*),
        numeration:numerations(*),
        warehouse:warehouses(*),
        items:recurring_invoice_items(
          *,
          product:products(*),
          tax:taxes(*)
        )
      `
      )
      .eq('company_id', companyId)
      .eq('is_active', true)
      .eq('next_generation_date', targetDate)
      .or(`end_date.is.null,end_date.gte.${targetDate}`)
      .lte('start_date', targetDate);

    if (error) {
      console.error('Error obteniendo facturas recurrentes a generar:', error);
      throw error;
    }

    return (data || []) as RecurringInvoice[];
  }

  /**
   * Obtiene el historial de generaciones de una factura recurrente
   */
  static async getGenerationHistory(
    recurringInvoiceId: string,
    companyId: string
  ): Promise<RecurringInvoiceGeneration[]> {
    const { data, error } = await this.supabase
      .from('recurring_invoice_generations')
      .select(
        `
        *,
        sale:sales(*)
      `
      )
      .eq('recurring_invoice_id', recurringInvoiceId)
      .eq('company_id', companyId)
      .order('scheduled_date', { ascending: false });

    if (error) {
      console.error('Error obteniendo historial de generaciones:', error);
      throw error;
    }

    return (data || []) as RecurringInvoiceGeneration[];
  }

  /**
   * Genera una factura de venta desde una factura recurrente
   */
  static async generateInvoiceFromRecurring(
    recurringInvoiceId: string,
    companyId: string
  ): Promise<{ saleId: string; sale: any }> {
    // Obtener la factura recurrente completa con items
    const recurringInvoice = await this.getRecurringInvoiceById(recurringInvoiceId, companyId);
    
    if (!recurringInvoice) {
      throw new Error('Factura recurrente no encontrada');
    }

    if (!recurringInvoice.is_active) {
      throw new Error('La factura recurrente no está activa');
    }

    if (!recurringInvoice.items || recurringInvoice.items.length === 0) {
      throw new Error('La factura recurrente no tiene items');
    }

    // Obtener el usuario actual para registrar quién generó la factura
    const { data: user } = await this.supabase.auth.getUser();
    const userId = user?.user?.id;

    // Importar SalesService dinámicamente para evitar dependencias circulares
    const { SalesService } = await import('./sales-service');

    // Convertir items de la factura recurrente al formato de CreateSaleItemData
    const saleItems = recurringInvoice.items
      .filter((item) => item.product_id) // Solo items con producto
      .map((item) => ({
        product_id: item.product_id!,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage || 0,
      }));

    if (saleItems.length === 0) {
      throw new Error('No hay items válidos para generar la factura');
    }

    // Crear la venta usando SalesService
    const saleData = {
      customer_id: recurringInvoice.customer_id,
      numeration_id: recurringInvoice.numeration_id,
      items: saleItems,
      payment_method: 'credit' as const, // Por defecto crédito ya que tiene payment_terms
      notes: recurringInvoice.notes || '',
      discount_amount: recurringInvoice.discount_amount,
      total_amount: recurringInvoice.total_amount,
    };

    const sale = await SalesService.createSale(companyId, saleData);

    // Registrar la generación
    const scheduledDate = new Date().toISOString().split('T')[0];
    const { error: generationError } = await this.supabase
      .from('recurring_invoice_generations')
      .insert({
        recurring_invoice_id: recurringInvoiceId,
        sale_id: sale.id,
        company_id: companyId,
        scheduled_date: scheduledDate,
        generated_date: new Date().toISOString(),
        status: 'generated',
        generated_by: userId,
      });

    if (generationError) {
      console.error('Error registrando generación:', generationError);
      // No fallar si solo hay error en el registro, la venta ya se creó
    }

    // Actualizar fechas de la factura recurrente
    // El trigger en la base de datos calculará automáticamente next_generation_date
    const lastGeneratedDate = new Date().toISOString().split('T')[0];
    
    const { error: updateError } = await this.supabase
      .from('recurring_invoices')
      .update({
        last_generated_date: lastGeneratedDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recurringInvoiceId)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error actualizando fechas de factura recurrente:', updateError);
      // No fallar si solo hay error en la actualización de fechas
    }

    return {
      saleId: sale.id,
      sale,
    };
  }

}

