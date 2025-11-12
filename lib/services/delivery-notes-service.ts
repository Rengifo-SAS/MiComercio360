import { createClient } from '@/lib/supabase/client';
import {
  DeliveryNote,
  DeliveryNoteItem,
  DeliveryNoteSaleConversion,
  DeliveryNoteHistory,
  CreateDeliveryNoteInput,
  UpdateDeliveryNoteInput,
  ConvertDeliveryNoteToSaleInput,
} from '@/lib/types/delivery-notes';
import { NumerationsService } from './numerations-service';
import { SalesService } from './sales-service';
import { CreateSaleData } from '@/lib/types/sales';

export class DeliveryNotesService {
  private static supabase = createClient();

  /**
   * Obtiene todas las remisiones con filtros
   */
  static async getDeliveryNotes(
    companyId: string,
    options?: {
      customerId?: string;
      status?: 'pending' | 'partially_invoiced' | 'invoiced' | 'cancelled';
      documentType?: 'DELIVERY_NOTE' | 'SERVICE_ORDER';
      warehouseId?: string;
      salespersonId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ): Promise<{ deliveryNotes: DeliveryNote[]; total: number }> {
    const {
      customerId,
      status,
      documentType,
      warehouseId,
      salespersonId,
      dateFrom,
      dateTo,
      search,
      sortBy = 'delivery_date',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = options || {};

    let queryBuilder = this.supabase
      .from('delivery_notes')
      .select(
        `
        *,
        customer:customers(*),
        salesperson:profiles!delivery_notes_salesperson_id_fkey(*),
        warehouse:warehouses(*),
        numeration:numerations(*),
        converted_to_sale:sales!delivery_notes_converted_to_sale_id_fkey(*),
        items:delivery_note_items(
          *,
          product:products(*),
          tax:taxes(*)
        ),
        conversions:delivery_note_sale_conversions(
          *,
          sale:sales(*)
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

    if (documentType) {
      queryBuilder = queryBuilder.eq('document_type', documentType);
    }

    if (warehouseId) {
      queryBuilder = queryBuilder.eq('warehouse_id', warehouseId);
    }

    if (salespersonId) {
      queryBuilder = queryBuilder.eq('salesperson_id', salespersonId);
    }

    if (dateFrom) {
      queryBuilder = queryBuilder.gte('delivery_date', dateFrom);
    }

    if (dateTo) {
      queryBuilder = queryBuilder.lte('delivery_date', dateTo);
    }

    // Búsqueda por texto
    if (search) {
      queryBuilder = queryBuilder.or(
        `delivery_note_number.ilike.%${search}%,notes.ilike.%${search}%,observations.ilike.%${search}%`
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
      console.error('Error obteniendo remisiones:', error);
      throw error;
    }

    return {
      deliveryNotes: (data || []) as DeliveryNote[],
      total: count || 0,
    };
  }

  /**
   * Obtiene remisiones pendientes de un cliente (para facturar varias juntas)
   */
  static async getPendingDeliveryNotes(
    companyId: string,
    customerId: string
  ): Promise<DeliveryNote[]> {
    const { data, error } = await this.supabase
      .from('delivery_notes')
      .select(
        `
        *,
        customer:customers(*),
        items:delivery_note_items(
          *,
          product:products(*)
        )
      `
      )
      .eq('company_id', companyId)
      .eq('customer_id', customerId)
      .in('status', ['pending', 'partially_invoiced'])
      .eq('is_cancelled', false)
      .order('delivery_date', { ascending: true });

    if (error) {
      console.error('Error obteniendo remisiones pendientes:', error);
      throw error;
    }

    return (data || []) as DeliveryNote[];
  }

  /**
   * Obtiene una remisión por ID
   */
  static async getDeliveryNoteById(
    id: string,
    companyId: string
  ): Promise<DeliveryNote | null> {
    const { data, error } = await this.supabase
      .from('delivery_notes')
      .select(
        `
        *,
        customer:customers(*),
        salesperson:profiles!delivery_notes_salesperson_id_fkey(*),
        warehouse:warehouses(*),
        numeration:numerations(*),
        converted_to_sale:sales!delivery_notes_converted_to_sale_id_fkey(*),
        items:delivery_note_items(
          *,
          product:products(*),
          tax:taxes(*)
        ),
        conversions:delivery_note_sale_conversions(
          *,
          sale:sales(*)
        ),
        history:delivery_note_history(*)
      `
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      console.error('Error obteniendo remisión:', error);
      throw error;
    }

    return data as DeliveryNote;
  }

  /**
   * Crea una nueva remisión
   */
  static async createDeliveryNote(
    input: CreateDeliveryNoteInput
  ): Promise<DeliveryNote> {
    const { items, numeration_id, ...deliveryNoteData } = input;

    // Generar número de remisión si hay numeración
    let deliveryNoteNumber: string | undefined;
    if (numeration_id) {
      try {
        const numeration = await NumerationsService.getNumeration(numeration_id);
        if (numeration) {
          const { data, error: numberError } = await this.supabase.rpc(
            'get_next_number',
            {
              p_company_id: input.company_id,
              p_document_type: 'delivery_note',
              p_name: numeration.name,
            }
          );

          if (!numberError && data) {
            deliveryNoteNumber = data;
          }
        }
      } catch (error) {
        console.error('Error generando número de remisión:', error);
      }
    }

    // Crear la remisión
    const { data: deliveryNote, error: deliveryNoteError } = await this.supabase
      .from('delivery_notes')
      .insert({
        ...deliveryNoteData,
        numeration_id,
        delivery_note_number: deliveryNoteNumber,
        document_type: deliveryNoteData.document_type || 'DELIVERY_NOTE',
        status: 'pending',
        is_cancelled: false,
      })
      .select()
      .single();

    if (deliveryNoteError) {
      console.error('Error creando remisión:', deliveryNoteError);
      throw deliveryNoteError;
    }

    // Crear los items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        ...item,
        delivery_note_id: deliveryNote.id,
        sort_order: item.sort_order ?? index,
        quantity_invoiced: 0, // Inicialmente nada facturado
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
        .from('delivery_note_items')
        .insert(itemsToInsert);

      if (itemsError) {
        await this.supabase
          .from('delivery_notes')
          .delete()
          .eq('id', deliveryNote.id);
        console.error('Error creando items de remisión:', itemsError);
        throw itemsError;
      }
    }

    // Obtener la remisión completa
    return this.getDeliveryNoteById(
      deliveryNote.id,
      input.company_id
    ) as Promise<DeliveryNote>;
  }

  /**
   * Actualiza una remisión
   */
  static async updateDeliveryNote(
    id: string,
    companyId: string,
    input: UpdateDeliveryNoteInput
  ): Promise<DeliveryNote> {
    const { items, ...updateData } = input;

    // Verificar que la remisión no esté completamente facturada
    const currentNote = await this.getDeliveryNoteById(id, companyId);
    if (currentNote?.status === 'invoiced') {
      throw new Error('No se puede editar una remisión que está completamente facturada');
    }

    if (currentNote?.is_cancelled) {
      throw new Error('No se puede editar una remisión anulada');
    }

    // Actualizar la remisión
    const { error: updateError } = await this.supabase
      .from('delivery_notes')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error actualizando remisión:', updateError);
      throw updateError;
    }

    // Si se proporcionan items, reemplazar los existentes (solo si no están facturados)
    if (items !== undefined) {
      // Eliminar items que no tienen cantidad facturada
      await this.supabase
        .from('delivery_note_items')
        .delete()
        .eq('delivery_note_id', id)
        .eq('quantity_invoiced', 0);

      // Crear nuevos items o actualizar existentes
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          ...item,
          delivery_note_id: id,
          sort_order: item.sort_order ?? index,
          quantity_invoiced: 0, // Nuevos items no tienen cantidad facturada
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
          .from('delivery_note_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error creando nuevos items:', itemsError);
          throw itemsError;
        }
      }
    }

    return this.getDeliveryNoteById(id, companyId) as Promise<DeliveryNote>;
  }

  /**
   * Elimina una remisión
   */
  static async deleteDeliveryNote(
    id: string,
    companyId: string
  ): Promise<void> {
    const note = await this.getDeliveryNoteById(id, companyId);
    if (note?.status === 'invoiced') {
      throw new Error('No se puede eliminar una remisión que está completamente facturada');
    }

    if (note?.is_cancelled) {
      throw new Error('No se puede eliminar una remisión anulada');
    }

    const { error } = await this.supabase
      .from('delivery_notes')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error eliminando remisión:', error);
      throw error;
    }
  }

  /**
   * Anula una remisión
   */
  static async cancelDeliveryNote(
    id: string,
    companyId: string,
    reason?: string
  ): Promise<DeliveryNote> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user || !user.user) {
      throw new Error('Usuario no autenticado');
    }

    const { error } = await this.supabase
      .from('delivery_notes')
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
      console.error('Error anulando remisión:', error);
      throw error;
    }

    return this.getDeliveryNoteById(id, companyId) as Promise<DeliveryNote>;
  }

  /**
   * Restaura una remisión anulada
   */
  static async restoreDeliveryNote(
    id: string,
    companyId: string
  ): Promise<DeliveryNote> {
    const { error } = await this.supabase
      .from('delivery_notes')
      .update({
        status: 'pending',
        is_cancelled: false,
        cancelled_at: null,
        cancelled_by: null,
        cancelled_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error restaurando remisión:', error);
      throw error;
    }

    return this.getDeliveryNoteById(id, companyId) as Promise<DeliveryNote>;
  }

  /**
   * Convierte una o varias remisiones a factura de venta
   */
  static async convertDeliveryNotesToSale(
    input: ConvertDeliveryNoteToSaleInput
  ): Promise<{ sale: any; deliveryNotes: DeliveryNote[] }> {
    const {
      delivery_note_ids,
      company_id,
      sale_date,
      payment_method,
      account_id,
      notes,
      items_to_invoice,
    } = input;

    if (!delivery_note_ids || delivery_note_ids.length === 0) {
      throw new Error('Debe seleccionar al menos una remisión');
    }

    // Validar que todas las remisiones sean del mismo cliente
    const deliveryNotes = await Promise.all(
      delivery_note_ids.map((id) =>
        this.getDeliveryNoteById(id, company_id)
      )
    );

    const validNotes = deliveryNotes.filter((n) => n !== null) as DeliveryNote[];

    if (validNotes.length === 0) {
      throw new Error('No se encontraron remisiones válidas');
    }

    // Verificar que todas sean del mismo cliente
    const customerId = validNotes[0].customer_id;
    if (!validNotes.every((n) => n.customer_id === customerId)) {
      throw new Error('Todas las remisiones deben ser del mismo cliente');
    }

    // Verificar que todas estén pendientes y no anuladas
    const invalidNotes = validNotes.filter(
      (n) => n.status === 'invoiced' || n.is_cancelled
    );
    if (invalidNotes.length > 0) {
      throw new Error(
        'No se pueden facturar remisiones que están completamente facturadas o anuladas'
      );
    }

    // Recopilar todos los items pendientes de las remisiones
    const saleItems: any[] = [];
    const itemsToUpdate: Array<{
      delivery_note_id: string;
      item_id: string;
      quantity_invoiced: number;
    }> = [];

    for (const note of validNotes) {
      if (!note.items) continue;

      for (const item of note.items) {
        const quantityToInvoice = items_to_invoice?.find(
          (i) =>
            i.delivery_note_id === note.id && i.item_id === item.id
        )?.quantity_to_invoice;

        // Si no se especifica cantidad, facturar toda la pendiente
        const quantity =
          quantityToInvoice !== undefined
            ? quantityToInvoice
            : item.quantity_pending;

        if (quantity > 0 && quantity <= item.quantity_pending) {
          saleItems.push({
            product_id: item.product_id,
            quantity: quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage,
          });

          itemsToUpdate.push({
            delivery_note_id: note.id,
            item_id: item.id,
            quantity_invoiced: item.quantity_invoiced + quantity,
          });
        }
      }
    }

    if (saleItems.length === 0) {
      throw new Error('No hay items pendientes para facturar');
    }

    // Calcular totales
    const subtotal = saleItems.reduce(
      (sum, item) =>
        sum +
        item.unit_price * item.quantity * (1 - (item.discount_percentage || 0) / 100),
      0
    );

    // Crear la venta con la fecha especificada
    const saleData: CreateSaleData = {
      customer_id: customerId,
      items: saleItems,
      payment_method: payment_method || 'cash',
      notes: notes || '',
      discount_amount: 0,
      total_amount: subtotal,
      account_id: account_id,
      // Si se proporciona sale_date, convertirla a ISO string para created_at
      created_at: sale_date ? new Date(sale_date + 'T12:00:00').toISOString() : undefined,
    };

    const sale = await SalesService.createSale(company_id, saleData);

    // Actualizar cantidades facturadas en los items de remisión
    const { data: user } = await this.supabase.auth.getUser();
    
    // Actualizar items uno por uno para mejor control de errores
    for (const update of itemsToUpdate) {
      const { error: updateError } = await this.supabase
        .from('delivery_note_items')
        .update({
          quantity_invoiced: update.quantity_invoiced,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.item_id)
        .eq('delivery_note_id', update.delivery_note_id);
      
      if (updateError) {
        console.error('Error al actualizar item de remisión:', {
          error: updateError,
          item_id: update.item_id,
          delivery_note_id: update.delivery_note_id,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
        });
        
        // Intentar hacer rollback de la venta
        try {
          // Primero eliminar transacciones de cuenta relacionadas si existen
          await this.supabase
            .from('account_transactions')
            .delete()
            .eq('related_entity_type', 'sale')
            .eq('related_entity_id', sale.id);
          
          // Eliminar items de venta
          await this.supabase
            .from('sale_items')
            .delete()
            .eq('sale_id', sale.id);
          
          // Finalmente eliminar la venta
          await this.supabase
            .from('sales')
            .delete()
            .eq('id', sale.id);
        } catch (rollbackError: any) {
          console.error('Error haciendo rollback:', rollbackError);
          // Continuar con el error original aunque falle el rollback
        }
        
        const errorMessage = updateError.message || updateError.hint || updateError.details || 'Error desconocido';
        throw new Error(`No se pudieron actualizar las cantidades facturadas: ${errorMessage}`);
      }
    }

    // Registrar conversiones en delivery_note_sale_conversions
    const conversions = delivery_note_ids.map((noteId) => ({
      delivery_note_id: noteId,
      sale_id: sale.id,
      company_id: company_id,
      converted_by: user?.user?.id,
    }));

    const { error: conversionError } = await this.supabase
      .from('delivery_note_sale_conversions')
      .insert(conversions);

    if (conversionError) {
      console.error('Error registrando conversiones:', conversionError);
      // No hacer rollback aquí, la venta ya está creada y los items actualizados
      // Es un error menor que no afecta la funcionalidad principal
    }

    // Actualizar estado de las remisiones
    const updatedNotes = await Promise.all(
      delivery_note_ids.map(async (noteId) => {
        const note = await this.getDeliveryNoteById(noteId, company_id);
        // El estado se actualiza automáticamente por el trigger
        return note;
      })
    );

    return {
      sale,
      deliveryNotes: updatedNotes.filter((n) => n !== null) as DeliveryNote[],
    };
  }
}

