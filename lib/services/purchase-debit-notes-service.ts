import { createClient } from '@/lib/supabase/client';
import {
  PurchaseDebitNote,
  PurchaseDebitNoteItem,
  PurchaseDebitNoteSettlement,
  PurchaseDebitNoteHistory,
  CreatePurchaseDebitNoteInput,
  UpdatePurchaseDebitNoteInput,
  PendingPurchase,
} from '@/lib/types/purchase-debit-notes';
import { NumerationsService } from './numerations-service';

export class PurchaseDebitNotesService {
  private static supabase = createClient();

  /**
   * Obtiene todas las facturas de compra pendientes de un proveedor
   */
  static async getPendingPurchases(
    companyId: string,
    supplierId: string
  ): Promise<PendingPurchase[]> {
    const { data, error } = await this.supabase
      .from('purchases')
      .select(
        `
        id,
        purchase_number,
        supplier_id,
        total_amount,
        status,
        created_at,
        supplier:suppliers!purchases_supplier_id_fkey(
          id,
          name
        )
      `
      )
      .eq('company_id', companyId)
      .eq('supplier_id', supplierId)
      .in('status', ['pending', 'received']); // Facturas pendientes de pago

    if (error) {
      console.error('Error obteniendo facturas pendientes:', error);
      throw error;
    }

    // Calcular montos pagados y pendientes (considerando créditos de notas débito)
    const pendingPurchases: PendingPurchase[] = [];

    for (const purchase of data || []) {
      // Obtener créditos aplicados desde notas débito
      const { data: credits, error: creditsError } = await this.supabase
        .from('purchase_debit_note_settlements')
        .select('credit_amount')
        .eq('purchase_id', purchase.id)
        .eq('settlement_type', 'INVOICE_CREDIT')
        .in('purchase_debit_note_id', [
          // Obtener IDs de notas débito que no estén anuladas
          ...(await this.supabase
            .from('purchase_debit_notes')
            .select('id')
            .eq('company_id', companyId)
            .neq('status', 'cancelled')
            .then(({ data }) => data?.map((n) => n.id) || []))
        ]);

      if (creditsError) {
        console.error('Error obteniendo créditos de factura:', creditsError);
        continue;
      }

      const creditedAmount =
        credits?.reduce((sum, c) => sum + Number(c.credit_amount || 0), 0) || 0;
      const totalAmount = Number(purchase.total_amount);
      const pendingAmount = totalAmount - creditedAmount;

      if (pendingAmount > 0) {
        pendingPurchases.push({
          purchase_id: purchase.id,
          purchase_number: purchase.purchase_number,
          supplier_id: purchase.supplier_id,
          supplier_name: (purchase.supplier as any)?.name || '',
          issue_date: purchase.created_at,
          total_amount: totalAmount,
          paid_amount: creditedAmount,
          pending_amount: pendingAmount,
          status: purchase.status,
        });
      }
    }

    return pendingPurchases;
  }

  /**
   * Obtiene todas las notas débito de compra con filtros
   */
  static async getPurchaseDebitNotes(
    companyId: string,
    options?: {
      supplierId?: string;
      warehouseId?: string;
      status?: 'open' | 'cancelled' | 'reconciled';
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ): Promise<{ purchaseDebitNotes: PurchaseDebitNote[]; total: number }> {
    const {
      supplierId,
      warehouseId,
      status,
      dateFrom,
      dateTo,
      search,
      sortBy = 'debit_note_date',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = options || {};

    let queryBuilder = this.supabase
      .from('purchase_debit_notes')
      .select(
        `
        *,
        supplier:suppliers!purchase_debit_notes_supplier_id_fkey(*),
        warehouse:warehouses(*),
        numeration:numerations(*),
        items:purchase_debit_note_items(
          *,
          product:products(*),
          account:accounts(*)
        ),
        settlements:purchase_debit_note_settlements(
          *,
          refund_account:accounts(*),
          purchase:purchases(*)
        )
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

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    if (dateFrom) {
      queryBuilder = queryBuilder.gte('debit_note_date', dateFrom);
    }

    if (dateTo) {
      queryBuilder = queryBuilder.lte('debit_note_date', dateTo);
    }

    // Búsqueda por texto (incluye número y observaciones)
    if (search) {
      queryBuilder = queryBuilder.or(
        `debit_note_number.ilike.%${search}%,observations.ilike.%${search}%`
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
      console.error('Error obteniendo notas débito de compra:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(error.message || 'Error al obtener las notas débito');
    }

    // Procesar datos para asegurar que las relaciones estén correctamente formateadas
    const processedData = (data || []).map((note: any) => {
      // Asegurar que supplier sea un objeto, no un array
      if (Array.isArray(note.supplier)) {
        note.supplier = note.supplier[0] || null;
      }
      
      // Asegurar que warehouse sea un objeto, no un array
      if (Array.isArray(note.warehouse)) {
        note.warehouse = note.warehouse[0] || null;
      }
      
      // Asegurar que numeration sea un objeto, no un array
      if (Array.isArray(note.numeration)) {
        note.numeration = note.numeration[0] || null;
      }

      return note;
    });

    return {
      purchaseDebitNotes: processedData as PurchaseDebitNote[],
      total: count || 0,
    };
  }

  /**
   * Obtiene una nota débito de compra por ID
   */
  static async getPurchaseDebitNoteById(
    id: string,
    companyId: string
  ): Promise<PurchaseDebitNote | null> {
    const { data, error } = await this.supabase
      .from('purchase_debit_notes')
      .select(
        `
        *,
        supplier:suppliers!purchase_debit_notes_supplier_id_fkey(*),
        warehouse:warehouses(*),
        numeration:numerations(*),
        items:purchase_debit_note_items(
          *,
          product:products(*),
          account:accounts(*)
        ),
        settlements:purchase_debit_note_settlements(
          *,
          refund_account:accounts(*),
          purchase:purchases(*)
        ),
        history:purchase_debit_note_history(*)
      `
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      console.error('Error obteniendo nota débito de compra:', error);
      throw error;
    }

    // Procesar datos para asegurar que las relaciones estén correctamente formateadas
    if (data) {
      // Asegurar que supplier sea un objeto, no un array
      if (Array.isArray((data as any).supplier)) {
        (data as any).supplier = (data as any).supplier[0] || null;
      }
      
      // Asegurar que warehouse sea un objeto, no un array
      if (Array.isArray((data as any).warehouse)) {
        (data as any).warehouse = (data as any).warehouse[0] || null;
      }
      
      // Asegurar que numeration sea un objeto, no un array
      if (Array.isArray((data as any).numeration)) {
        (data as any).numeration = (data as any).numeration[0] || null;
      }

      // Procesar items si existen
      if ((data as any).items && Array.isArray((data as any).items)) {
        (data as any).items = (data as any).items.map((item: any) => {
          if (Array.isArray(item.product)) {
            item.product = item.product[0] || null;
          }
          if (Array.isArray(item.account)) {
            item.account = item.account[0] || null;
          }
          return item;
        });
      }

      // Procesar settlements si existen
      if ((data as any).settlements && Array.isArray((data as any).settlements)) {
        (data as any).settlements = (data as any).settlements.map((settlement: any) => {
          if (Array.isArray(settlement.refund_account)) {
            settlement.refund_account = settlement.refund_account[0] || null;
          }
          if (Array.isArray(settlement.purchase)) {
            settlement.purchase = settlement.purchase[0] || null;
          }
          return settlement;
        });
      }
    }

    return data as PurchaseDebitNote;
  }

  /**
   * Crea una nueva nota débito de compra
   */
  static async createPurchaseDebitNote(
    input: CreatePurchaseDebitNoteInput
  ): Promise<PurchaseDebitNote> {
    const { items, settlements, numeration_id, ...debitNoteData } = input;

    // Generar número de nota débito si hay numeración
    let debitNoteNumber: string | undefined;
    if (numeration_id) {
      try {
        const numeration = await NumerationsService.getNumeration(numeration_id);
        if (numeration) {
          const { data, error: numberError } = await this.supabase.rpc(
            'get_next_number',
            {
              p_company_id: input.company_id,
              p_document_type: 'debit_note',
              p_name: numeration.name,
            }
          );

          if (!numberError && data) {
            debitNoteNumber = data;
          }
        }
      } catch (error) {
        console.error('Error generando número de nota débito:', error);
      }
    }

    // Calcular totales de items
    const itemsToInsert = items.map((item, index) => {
      let totalCost = 0;
      if (item.item_type === 'PRODUCT' && item.quantity && item.unit_cost) {
        totalCost = item.quantity * item.unit_cost;
      } else if (item.item_type === 'ACCOUNT' && item.account_amount) {
        totalCost = item.account_amount;
      }

      return {
        ...item,
        total_cost: item.item_type === 'PRODUCT' ? totalCost : null,
        account_amount: item.item_type === 'ACCOUNT' ? item.account_amount : null,
        sort_order: item.sort_order ?? index,
      };
    });

    const subtotal = itemsToInsert.reduce(
      (sum, item) => sum + (item.total_cost || item.account_amount || 0),
      0
    );

    // Crear la nota débito
    const { data: debitNote, error: debitNoteError } = await this.supabase
      .from('purchase_debit_notes')
      .insert({
        ...debitNoteData,
        numeration_id,
        debit_note_number: debitNoteNumber,
        subtotal,
        total_amount: subtotal, // Por ahora sin impuestos
        status: 'open',
        is_reconciled: false,
      })
      .select()
      .single();

    if (debitNoteError) {
      console.error('Error creando nota débito de compra:', debitNoteError);
      throw debitNoteError;
    }

    // Crear los items
    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await this.supabase
        .from('purchase_debit_note_items')
        .insert(
          itemsToInsert.map((item) => ({
            ...item,
            purchase_debit_note_id: debitNote.id,
          }))
        );

      if (itemsError) {
        await this.supabase
          .from('purchase_debit_notes')
          .delete()
          .eq('id', debitNote.id);
        console.error('Error creando items de nota débito:', itemsError);
        throw itemsError;
      }
    }

    // Crear las liquidaciones
    if (settlements && settlements.length > 0) {
      const { error: settlementsError } = await this.supabase
        .from('purchase_debit_note_settlements')
        .insert(
          settlements.map((settlement) => ({
            ...settlement,
            purchase_debit_note_id: debitNote.id,
          }))
        );

      if (settlementsError) {
        await this.supabase
          .from('purchase_debit_notes')
          .delete()
          .eq('id', debitNote.id);
        console.error('Error creando liquidaciones de nota débito:', settlementsError);
        throw settlementsError;
      }
    }

    // Obtener la nota débito completa
    return this.getPurchaseDebitNoteById(
      debitNote.id,
      input.company_id
    ) as Promise<PurchaseDebitNote>;
  }

  /**
   * Actualiza una nota débito de compra
   */
  static async updatePurchaseDebitNote(
    id: string,
    companyId: string,
    input: UpdatePurchaseDebitNoteInput
  ): Promise<PurchaseDebitNote> {
    const { items, settlements, ...updateData } = input;

    // Verificar que la nota no esté conciliada
    const currentNote = await this.getPurchaseDebitNoteById(id, companyId);
    if (currentNote?.is_reconciled && updateData.status !== 'cancelled') {
      throw new Error('No se puede editar una nota débito que ya está conciliada');
    }

    // Actualizar la nota débito
    const { error: updateError } = await this.supabase
      .from('purchase_debit_notes')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error actualizando nota débito de compra:', updateError);
      throw updateError;
    }

    // Si se proporcionan items, reemplazar los existentes
    if (items !== undefined) {
      await this.supabase
        .from('purchase_debit_note_items')
        .delete()
        .eq('purchase_debit_note_id', id);

      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => {
          let totalCost = 0;
          if (item.item_type === 'PRODUCT' && item.quantity && item.unit_cost) {
            totalCost = item.quantity * item.unit_cost;
          } else if (item.item_type === 'ACCOUNT' && item.account_amount) {
            totalCost = item.account_amount;
          }

          return {
            ...item,
            purchase_debit_note_id: id,
            total_cost: item.item_type === 'PRODUCT' ? totalCost : null,
            account_amount: item.item_type === 'ACCOUNT' ? item.account_amount : null,
            sort_order: item.sort_order ?? index,
          };
        });

        const { error: itemsError } = await this.supabase
          .from('purchase_debit_note_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error creando nuevos items:', itemsError);
          throw itemsError;
        }
      }
    }

    // Si se proporcionan settlements, reemplazar los existentes
    if (settlements !== undefined) {
      await this.supabase
        .from('purchase_debit_note_settlements')
        .delete()
        .eq('purchase_debit_note_id', id);

      if (settlements.length > 0) {
        const { error: settlementsError } = await this.supabase
          .from('purchase_debit_note_settlements')
          .insert(
            settlements.map((settlement) => ({
              ...settlement,
              purchase_debit_note_id: id,
            }))
          );

        if (settlementsError) {
          console.error('Error creando nuevas liquidaciones:', settlementsError);
          throw settlementsError;
        }
      }
    }

    return this.getPurchaseDebitNoteById(id, companyId) as Promise<PurchaseDebitNote>;
  }

  /**
   * Elimina una nota débito de compra
   */
  static async deletePurchaseDebitNote(
    id: string,
    companyId: string
  ): Promise<void> {
    const note = await this.getPurchaseDebitNoteById(id, companyId);
    if (note?.is_reconciled) {
      throw new Error('No se puede eliminar una nota débito que está conciliada');
    }

    const { error } = await this.supabase
      .from('purchase_debit_notes')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error eliminando nota débito de compra:', error);
      throw error;
    }
  }

  /**
   * Anula una nota débito de compra
   */
  static async cancelPurchaseDebitNote(
    id: string,
    companyId: string,
    reason?: string
  ): Promise<PurchaseDebitNote> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user || !user.user) {
      throw new Error('Usuario no autenticado');
    }

    const { error } = await this.supabase
      .from('purchase_debit_notes')
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
      console.error('Error anulando nota débito de compra:', error);
      throw error;
    }

    return this.getPurchaseDebitNoteById(id, companyId) as Promise<PurchaseDebitNote>;
  }

  /**
   * Restaura una nota débito de compra anulada
   */
  static async restorePurchaseDebitNote(
    id: string,
    companyId: string
  ): Promise<PurchaseDebitNote> {
    const { error } = await this.supabase
      .from('purchase_debit_notes')
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
      console.error('Error restaurando nota débito de compra:', error);
      throw error;
    }

    return this.getPurchaseDebitNoteById(id, companyId) as Promise<PurchaseDebitNote>;
  }
}

