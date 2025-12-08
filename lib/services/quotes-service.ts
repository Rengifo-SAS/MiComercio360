import { createClient } from '@/lib/supabase/client';
import {
  Quote,
  QuoteItem,
  QuoteHistory,
  CreateQuoteInput,
  UpdateQuoteInput,
  ConvertQuoteToSaleInput,
} from '@/lib/types/quotes';
import { NumerationsService } from './numerations-service';
import { SalesService } from './sales-service';
import { CreateSaleData } from '@/lib/types/sales';

export class QuotesService {
  private static supabase = createClient();

  /**
   * Obtiene todas las cotizaciones con filtros
   */
  static async getQuotes(
    companyId: string,
    options?: {
      customerId?: string;
      status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
      salespersonId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ): Promise<{ quotes: Quote[]; total: number }> {
    const {
      customerId,
      status,
      salespersonId,
      dateFrom,
      dateTo,
      search,
      sortBy = 'quote_date',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = options || {};

    let queryBuilder = this.supabase
      .from('quotes')
      .select(
        `
        *,
        customer:customers(*),
        salesperson:profiles!quotes_salesperson_id_fkey(*),
        warehouse:warehouses(*),
        numeration:numerations(*),
        converted_to_sale:sales!quotes_converted_to_sale_id_fkey(*),
        items:quote_items(
          *,
          product:products(*),
          tax:taxes(*)
        )
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    // Aplicar filtros
    if (customerId) {
      queryBuilder = queryBuilder.eq('customer_id', customerId);
    }

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    if (salespersonId) {
      queryBuilder = queryBuilder.eq('salesperson_id', salespersonId);
    }

    if (dateFrom) {
      queryBuilder = queryBuilder.gte('quote_date', dateFrom);
    }

    if (dateTo) {
      queryBuilder = queryBuilder.lte('quote_date', dateTo);
    }

    // Búsqueda por texto
    if (search) {
      queryBuilder = queryBuilder.or(
        `quote_number.ilike.%${search}%,notes.ilike.%${search}%,comments.ilike.%${search}%`
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
      console.error('Error obteniendo cotizaciones:', error);
      throw error;
    }

    return {
      quotes: (data || []) as Quote[],
      total: count || 0,
    };
  }

  /**
   * Obtiene una cotización por ID
   */
  static async getQuoteById(
    id: string,
    companyId: string
  ): Promise<Quote | null> {
    const { data, error } = await this.supabase
      .from('quotes')
      .select(
        `
        *,
        customer:customers(*),
        salesperson:profiles!quotes_salesperson_id_fkey(*),
        warehouse:warehouses(*),
        numeration:numerations(*),
        converted_to_sale:sales!quotes_converted_to_sale_id_fkey(*),
        items:quote_items(
          *,
          product:products(*),
          tax:taxes(*)
        ),
        history:quote_history(*)
      `
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      console.error('Error obteniendo cotización:', error);
      throw error;
    }

    return data as Quote;
  }

  /**
   * Crea una nueva cotización
   */
  static async createQuote(input: CreateQuoteInput): Promise<Quote> {
    const { items, numeration_id, ...quoteData } = input;

    // Generar número de cotización si hay numeración
    let quoteNumber: string | undefined;
    if (numeration_id) {
      try {
        const numeration = await NumerationsService.getNumeration(numeration_id);
        if (numeration) {
          const { data, error: numberError } = await this.supabase.rpc(
            'get_next_number',
            {
              p_company_id: input.company_id,
              p_document_type: 'quotation',
              p_name: numeration.name,
            }
          );

          if (!numberError && data) {
            quoteNumber = data;
          }
        }
      } catch (error) {
        console.error('Error generando número de cotización:', error);
      }
    }

    // Crear la cotización
    const { data: quote, error: quoteError } = await this.supabase
      .from('quotes')
      .insert({
        ...quoteData,
        numeration_id,
        quote_number: quoteNumber,
        status: 'draft',
        is_invoiced: false,
      })
      .select()
      .single();

    if (quoteError) {
      console.error('Error creando cotización:', quoteError);
      throw quoteError;
    }

    // Crear los items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        ...item,
        quote_id: quote.id,
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
        .from('quote_items')
        .insert(itemsToInsert);

      if (itemsError) {
        await this.supabase.from('quotes').delete().eq('id', quote.id);
        console.error('Error creando items de cotización:', itemsError);
        throw itemsError;
      }
    }

    // Obtener la cotización completa
    return this.getQuoteById(quote.id, input.company_id) as Promise<Quote>;
  }

  /**
   * Actualiza una cotización
   */
  static async updateQuote(
    id: string,
    companyId: string,
    input: UpdateQuoteInput
  ): Promise<Quote> {
    const { items, ...updateData } = input;

    // Verificar que la cotización no esté convertida
    const currentQuote = await this.getQuoteById(id, companyId);
    if (currentQuote?.status === 'converted') {
      throw new Error('No se puede editar una cotización que ya fue convertida');
    }

    // Actualizar la cotización
    const { error: updateError } = await this.supabase
      .from('quotes')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error actualizando cotización:', updateError);
      throw updateError;
    }

    // Si se proporcionan items, reemplazar los existentes
    if (items !== undefined) {
      await this.supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', id);

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          ...item,
          quote_id: id,
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
          .from('quote_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error creando nuevos items:', itemsError);
          throw itemsError;
        }
      }
    }

    return this.getQuoteById(id, companyId) as Promise<Quote>;
  }

  /**
   * Elimina una cotización
   */
  static async deleteQuote(id: string, companyId: string): Promise<void> {
    const quote = await this.getQuoteById(id, companyId);
    if (quote?.status === 'converted') {
      throw new Error('No se puede eliminar una cotización que fue convertida');
    }

    const { error } = await this.supabase
      .from('quotes')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error eliminando cotización:', error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de una cotización
   */
  static async updateQuoteStatus(
    id: string,
    companyId: string,
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  ): Promise<Quote> {
    const { error } = await this.supabase
      .from('quotes')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error actualizando estado de cotización:', error);
      throw error;
    }

    return this.getQuoteById(id, companyId) as Promise<Quote>;
  }

  /**
   * Convierte una cotización a venta (factura o remisión)
   */
  static async convertQuoteToSale(
    input: ConvertQuoteToSaleInput
  ): Promise<{ quote: Quote; sale?: any }> {
    const { quote_id, company_id, conversion_type, sale_date, payment_method, account_id, notes } = input;

    // Obtener la cotización
    const quote = await this.getQuoteById(quote_id, company_id);
    if (!quote) {
      throw new Error('Cotización no encontrada');
    }

    if (quote.status === 'converted') {
      throw new Error('La cotización ya fue convertida');
    }

    if (!quote.items || quote.items.length === 0) {
      throw new Error('La cotización no tiene items para convertir');
    }

    // Si es conversión a factura
    if (conversion_type === 'INVOICE') {
      // Crear la venta desde la cotización
      const saleData: CreateSaleData = {
        customer_id: quote.customer_id,
        items: quote.items
          .filter((item) => item.product_id) // Filtrar items sin product_id
          .map((item) => ({
            product_id: item.product_id!,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage || 0,
          })),
        payment_method: payment_method || 'cash',
        notes: notes || quote.notes || '',
        discount_amount: quote.discount_amount,
        total_amount: quote.total_amount,
        account_id: account_id,
      };

      const sale = await SalesService.createSale(company_id, saleData);

      // Actualizar la cotización
      const { data: user } = await this.supabase.auth.getUser();
      
      // Verificar que tenemos el usuario antes de actualizar
      if (!user?.user?.id) {
        throw new Error('Usuario no autenticado. No se puede convertir la cotización.');
      }

      const { error: updateError, data: updatedQuote } = await this.supabase
        .from('quotes')
        .update({
          status: 'converted',
          is_invoiced: true,
          converted_to_sale_id: sale.id,
          converted_at: new Date().toISOString(),
          converted_by: user.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quote_id)
        .eq('company_id', company_id) // Asegurar que pertenece a la empresa
        .select()
        .single();

      if (updateError) {
        console.error('Error actualizando cotización:', {
          error: updateError,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
        });
        
        // Mejorar el mensaje de error
        const errorMessage = updateError.message || 
                           updateError.details || 
                           updateError.hint || 
                           'Error desconocido al actualizar la cotización';
        throw new Error(`Error al actualizar la cotización: ${errorMessage}`);
      }

      return {
        quote: (await this.getQuoteById(quote_id, company_id)) as Quote,
        sale,
      };
    }

    // Si es conversión a remisión (para futuras implementaciones)
    // Por ahora solo retornamos la cotización actualizada
    throw new Error('Conversión a remisión aún no implementada');
  }

  /**
   * Clona una cotización
   */
  static async cloneQuote(
    id: string,
    companyId: string,
    newQuoteDate?: string
  ): Promise<Quote> {
    const originalQuote = await this.getQuoteById(id, companyId);
    if (!originalQuote) {
      throw new Error('Cotización no encontrada');
    }

    // Crear nueva cotización basada en la original
    const newQuote: CreateQuoteInput = {
      company_id: companyId,
      numeration_id: originalQuote.numeration_id,
      customer_id: originalQuote.customer_id,
      quote_date: newQuoteDate || new Date().toISOString().split('T')[0],
      payment_terms: originalQuote.payment_terms,
      currency: originalQuote.currency,
      price_list_id: originalQuote.price_list_id,
      salesperson_id: originalQuote.salesperson_id,
      warehouse_id: originalQuote.warehouse_id,
      notes: originalQuote.notes,
      comments: originalQuote.comments,
      items:
        originalQuote.items?.map((item) => ({
          product_id: item.product_id,
          product_reference: item.product_reference,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage,
          tax_id: item.tax_id,
          sort_order: item.sort_order,
        })) || [],
    };

    const clonedQuote = await this.createQuote(newQuote);

    // Registrar en historial
    const { data: user } = await this.supabase.auth.getUser();
    await this.supabase.from('quote_history').insert({
      quote_id: originalQuote.id,
      company_id: companyId,
      action: 'CLONED',
      notes: `Clonada como cotización ${clonedQuote.quote_number}`,
      changed_by: user?.user?.id,
    });

    return clonedQuote;
  }

  /**
   * Actualiza cotizaciones vencidas automáticamente
   */
  static async updateExpiredQuotes(companyId: string): Promise<number> {
    const { error } = await this.supabase.rpc('update_expired_quotes');

    if (error) {
      console.error('Error actualizando cotizaciones vencidas:', error);
      throw error;
    }

    // Obtener el número de cotizaciones actualizadas
    const { count } = await this.supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'expired')
      .gte('updated_at', new Date(Date.now() - 60000).toISOString()); // Último minuto

    return count || 0;
  }
}

