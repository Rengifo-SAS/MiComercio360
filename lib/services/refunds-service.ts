import { createClient } from '@/lib/supabase/client';
import { 
  RefundRequest, 
  CreateRefundRequestData, 
  UpdateRefundRequestData,
  RefundItem,
  CreateRefundItemData 
} from '@/lib/types/refunds';
import { AccountsService } from './accounts-service';

export class RefundsService {
  private static supabase = createClient();

  // Obtener todas las solicitudes de reembolso
  static async getRefundRequests(companyId: string, filters?: {
    status?: string[];
    request_type?: string[];
    reason?: string[];
    date_from?: string;
    date_to?: string;
  }) {
    try {
      let query = this.supabase
        .from('refund_requests')
        .select(`
          *,
          sale:sales!inner(
            id,
            sale_number,
            total_amount,
            customer:customers(
              id,
              business_name,
              identification_number
            )
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }

      if (filters?.request_type?.length) {
        query = query.in('request_type', filters.request_type);
      }

      if (filters?.reason?.length) {
        query = query.in('reason', filters.reason);
      }

      if (filters?.date_from) {
        query = query.gte('request_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('request_date', filters.date_to);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error obteniendo solicitudes de reembolso:', error);
        throw new Error('Error al obtener las solicitudes de reembolso');
      }

      return {
        refundRequests: data || [],
        total: data?.length || 0
      };
    } catch (error) {
      console.error('Error en RefundsService.getRefundRequests:', error);
      throw error;
    }
  }

  // Obtener una solicitud de reembolso específica
  static async getRefundRequest(id: string) {
    try {
      const { data, error } = await this.supabase
        .from('refund_requests')
        .select(`
          *,
          sale:sales!inner(
            id,
            sale_number,
            total_amount,
            created_at,
            payment_method,
            status,
            account_id,
            customer:customers(
              id,
              business_name,
              identification_number,
              identification_type,
              phone,
              email
            )
          ),
          refund_items:refund_items(
            id,
            sale_item_id,
            product_id,
            quantity,
            unit_price,
            total_amount,
            condition,
            notes,
            product:products(
              id,
              name,
              sku
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error obteniendo solicitud de reembolso:', error);
        throw new Error('Error al obtener la solicitud de reembolso');
      }

      return data;
    } catch (error) {
      console.error('Error en RefundsService.getRefundRequest:', error);
      throw error;
    }
  }

  // Crear una nueva solicitud de reembolso
  static async createRefundRequest(refundData: CreateRefundRequestData) {
    try {
      // Verificar que la venta existe y pertenece a la empresa
      const { data: sale, error: saleError } = await this.supabase
        .from('sales')
        .select('id, status, total_amount')
        .eq('id', refundData.sale_id)
        .eq('company_id', refundData.company_id)
        .single();

      if (saleError || !sale) {
        throw new Error('La venta no existe o no pertenece a esta empresa');
      }

      // Verificar que la venta no esté ya anulada
      if (sale.status === 'cancelled') {
        throw new Error('No se puede procesar reembolso de una venta ya anulada');
      }

      // Verificar que el monto solicitado no exceda el total de la venta
      if (refundData.requested_amount > sale.total_amount) {
        throw new Error('El monto solicitado no puede exceder el total de la venta');
      }

      // Verificar si ya existe una solicitud pendiente o procesada para esta venta
      const { data: existingRequest } = await this.supabase
        .from('refund_requests')
        .select('id, status, request_type')
        .eq('sale_id', refundData.sale_id)
        .eq('company_id', refundData.company_id)
        .in('status', ['PENDING', 'APPROVED', 'PROCESSED'])
        .single();

      if (existingRequest) {
        if (existingRequest.status === 'PROCESSED') {
          throw new Error('Esta venta ya ha sido reembolsada');
        } else {
          throw new Error('Ya existe una solicitud pendiente para esta venta');
        }
      }

      // Crear la solicitud de reembolso
      const { data: refundRequest, error: refundError } = await this.supabase
        .from('refund_requests')
        .insert({
          sale_id: refundData.sale_id,
          company_id: refundData.company_id,
          request_type: refundData.request_type,
          reason: refundData.reason,
          status: 'PENDING',
          requested_amount: refundData.requested_amount,
          refund_method: refundData.refund_method,
          description: refundData.description,
          supporting_documents: refundData.supporting_documents,
          request_date: new Date().toISOString(),
          customer_signature: refundData.customer_signature,
          created_by: (await this.supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (refundError) {
        console.error('Error creando solicitud de reembolso:', refundError);
        throw new Error('Error al crear la solicitud de reembolso');
      }

      // Crear los items del reembolso
      if (refundData.items && refundData.items.length > 0) {
        const refundItems = refundData.items.map(item => ({
          refund_request_id: refundRequest.id,
          sale_item_id: item.sale_item_id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          condition: item.condition,
          notes: item.notes
        }));

        const { error: itemsError } = await this.supabase
          .from('refund_items')
          .insert(refundItems);

        if (itemsError) {
          console.error('Error creando items de reembolso:', itemsError);
          // Si falla la creación de items, eliminar la solicitud
          await this.supabase
            .from('refund_requests')
            .delete()
            .eq('id', refundRequest.id);
          throw new Error('Error al crear los items del reembolso');
        }
      }

      return refundRequest;
    } catch (error) {
      console.error('Error en RefundsService.createRefundRequest:', error);
      throw error;
    }
  }

  // Actualizar una solicitud de reembolso
  static async updateRefundRequest(id: string, updateData: UpdateRefundRequestData) {
    try {
      const { data, error } = await this.supabase
        .from('refund_requests')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: (await this.supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando solicitud de reembolso:', error);
        throw new Error('Error al actualizar la solicitud de reembolso');
      }

      return data;
    } catch (error) {
      console.error('Error en RefundsService.updateRefundRequest:', error);
      throw error;
    }
  }

  // Aprobar una solicitud de reembolso
  static async approveRefundRequest(id: string, approvedAmount?: number) {
    try {
      const refundRequest = await this.getRefundRequest(id);
      
      if (!refundRequest) {
        throw new Error('Solicitud de reembolso no encontrada');
      }

      if (refundRequest.status !== 'PENDING') {
        throw new Error('Solo se pueden aprobar solicitudes pendientes');
      }

      const finalAmount = approvedAmount || refundRequest.requested_amount;

      const { data, error } = await this.supabase
        .from('refund_requests')
        .update({
          status: 'APPROVED',
          approved_amount: finalAmount,
          updated_at: new Date().toISOString(),
          updated_by: (await this.supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error aprobando solicitud de reembolso:', error);
        throw new Error('Error al aprobar la solicitud de reembolso');
      }

      return data;
    } catch (error) {
      console.error('Error en RefundsService.approveRefundRequest:', error);
      throw error;
    }
  }

  // Procesar una solicitud de reembolso (ejecutar el reembolso)
  static async processRefundRequest(id: string) {
    try {
      const refundRequest = await this.getRefundRequest(id);
      
      if (!refundRequest) {
        throw new Error('Solicitud de reembolso no encontrada');
      }

      if (refundRequest.status !== 'APPROVED') {
        throw new Error('Solo se pueden procesar solicitudes aprobadas');
      }

      // Actualizar el estado de la solicitud
      const { data, error } = await this.supabase
        .from('refund_requests')
        .update({
          status: 'PROCESSED',
          processed_date: new Date().toISOString(),
          processed_by: (await this.supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString(),
          updated_by: (await this.supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error procesando solicitud de reembolso:', error);
        throw new Error('Error al procesar la solicitud de reembolso');
      }

      // Marcar la venta como cancelada (tanto para anulaciones como reembolsos)
      // El constraint de la tabla sales solo permite: 'pending', 'completed', 'cancelled'
      const saleStatus = 'cancelled';
      console.log('Actualizando estado de venta:', refundRequest.sale_id, 'a', saleStatus);
      
      const { error: saleUpdateError } = await this.supabase
        .from('sales')
        .update({
          status: saleStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', refundRequest.sale_id);

      if (saleUpdateError) {
        console.error('Error actualizando estado de venta:', saleUpdateError);
      } else {
        console.log('Estado de venta actualizado exitosamente');
      }

      // Actualizar inventario para los productos devueltos
      if (refundRequest.refund_items && refundRequest.refund_items.length > 0) {
        for (const item of refundRequest.refund_items) {
          // Obtener cantidad actual del inventario
          const { data: currentInventory } = await this.supabase
            .from('inventory')
            .select('quantity')
            .eq('product_id', item.product_id)
            .eq('company_id', refundRequest.company_id)
            .maybeSingle();

          if (currentInventory) {
            const newQuantity = currentInventory.quantity + item.quantity;
            await this.supabase
              .from('inventory')
              .update({ quantity: newQuantity })
              .eq('product_id', item.product_id)
              .eq('company_id', refundRequest.company_id);
          } else {
            // Si no existe inventario, crearlo
            await this.supabase
              .from('inventory')
              .insert({
                product_id: item.product_id,
                company_id: refundRequest.company_id,
                quantity: item.quantity,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
          }
        }
      }

      // Crear transacciones contables para el reembolso
      try {
        // Usar la misma cuenta que se usó en la venta original
        let accountId: string | undefined = undefined;
        
        // Primero intentar obtener account_id de la venta en el objeto refundRequest
        const saleAccountId = (refundRequest as any).sale?.account_id;
        console.log('🔍 Buscando cuenta para reembolso. account_id de venta en refundRequest:', saleAccountId);
        
        if (saleAccountId) {
          accountId = saleAccountId;
          console.log('✅ Cuenta encontrada en refundRequest.sale:', accountId);
        }
        
        // Si no tiene account_id, obtener la venta directamente de la base de datos
        if (!accountId) {
          console.log('📋 Consultando tabla sales directamente para obtener account_id...');
          const { data: saleData, error: saleError } = await this.supabase
            .from('sales')
            .select('account_id, company_id')
            .eq('id', refundRequest.sale_id)
            .single();
          
          if (saleError) {
            console.error('❌ Error obteniendo venta:', saleError);
          } else {
            accountId = saleData?.account_id || undefined;
            console.log('📋 account_id obtenido de tabla sales:', accountId);
            if (saleData?.company_id) {
              console.log('📋 company_id de la venta:', saleData.company_id);
            }
          }
        }
        
        // Si aún no hay cuenta, buscar la cuenta de efectivo POS como fallback
        if (!accountId) {
          console.log('💰 Buscando cuenta de efectivo POS como fallback...');
          const { data: cashAccount, error: cashError } = await this.supabase
            .from('accounts')
            .select('id, account_name, account_type')
            .eq('company_id', refundRequest.company_id)
            .eq('account_name', 'Efectivo POS')
            .eq('is_active', true)
            .maybeSingle();
          
          if (cashError) {
            console.error('❌ Error buscando cuenta Efectivo POS:', cashError);
          } else if (cashAccount) {
            accountId = cashAccount.id;
            console.log('✅ Cuenta Efectivo POS encontrada:', accountId, cashAccount.account_name);
          } else {
            console.log('⚠️ No se encontró cuenta "Efectivo POS"');
          }
        }
        
        // Si aún no hay cuenta, buscar cualquier cuenta de efectivo activa
        if (!accountId) {
          console.log('💰 Buscando cualquier cuenta CASH_BOX activa...');
          const { data: cashAccountAlt, error: cashAltError } = await this.supabase
            .from('accounts')
            .select('id, account_name, account_type')
            .eq('company_id', refundRequest.company_id)
            .eq('account_type', 'CASH_BOX')
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          
          if (cashAltError) {
            console.error('❌ Error buscando cuenta CASH_BOX:', cashAltError);
          } else if (cashAccountAlt) {
            accountId = cashAccountAlt.id;
            console.log('✅ Cuenta CASH_BOX encontrada:', accountId, cashAccountAlt.account_name);
          } else {
            console.log('⚠️ No se encontró ninguna cuenta CASH_BOX activa');
          }
        }
        
        // Si aún no hay cuenta, buscar CUALQUIER cuenta activa como último recurso
        if (!accountId) {
          console.log('🔍 Buscando cualquier cuenta activa como último recurso...');
          const { data: anyAccount, error: anyAccountError } = await this.supabase
            .from('accounts')
            .select('id, account_name, account_type')
            .eq('company_id', refundRequest.company_id)
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          
          if (anyAccountError) {
            console.error('❌ Error buscando cualquier cuenta activa:', anyAccountError);
          } else if (anyAccount) {
            accountId = anyAccount.id;
            console.log('⚠️ Cuenta activa encontrada (último recurso):', accountId, anyAccount.account_name, anyAccount.account_type);
          }
        }

        // Verificar que finalmente tenemos una cuenta
        if (!accountId) {
          // Listar todas las cuentas para debugging
          const { data: allAccounts, error: listError } = await this.supabase
            .from('accounts')
            .select('id, account_name, account_type, is_active, company_id')
            .eq('company_id', refundRequest.company_id);
          
          console.error('❌ NO SE ENCONTRÓ CUENTA. Cuentas disponibles en la empresa:', {
            companyId: refundRequest.company_id,
            accountsCount: allAccounts?.length || 0,
            accounts: allAccounts || [],
            listError,
          });
          
          const errorMsg = `No se encontró cuenta para crear transacción de reembolso. Venta ID: ${refundRequest.sale_id}, Company ID: ${refundRequest.company_id}. Por favor, verifica que exista al menos una cuenta activa en la empresa.`;
          throw new Error(errorMsg);
        }

        // Crear transacción de reembolso (salida de efectivo)
        const amount = refundRequest.approved_amount || refundRequest.requested_amount;
        
        console.log('💳 Creando transacción de reembolso:', {
          accountId,
          amount: -amount,
          transaction_type: 'REFUND',
          description: `Reembolso de venta ${(refundRequest as any).sale?.sale_number || refundRequest.sale_id}`,
        });
        
        const transactionResult = await AccountsService.createTransaction({
          account_id: accountId,
          transaction_type: 'REFUND', // Usar tipo REFUND específico
          amount: -amount, // NEGATIVO para salida de efectivo
          description: `Reembolso de venta ${(refundRequest as any).sale?.sale_number || refundRequest.sale_id}`,
          reference_number: `REFUND-${refundRequest.id}`,
          transaction_date: new Date().toISOString(),
          related_entity_type: 'refund',
          related_entity_id: refundRequest.id,
        });
        
        console.log('✅ Transacción contable de reembolso creada exitosamente:', {
          transactionId: transactionResult?.id,
          accountId,
          amount: -amount,
          balanceAfter: transactionResult?.balance_after,
        });
      } catch (accountError: any) {
        console.error('❌ Error creando transacción contable del reembolso:', accountError);
        // Lanzar error para que el usuario sepa que falló la creación de la transacción
        throw new Error(`Error al crear transacción contable: ${accountError.message || 'Error desconocido'}`);
      }

      return data;
    } catch (error) {
      console.error('Error en RefundsService.processRefundRequest:', error);
      throw error;
    }
  }

  // Rechazar una solicitud de reembolso
  static async rejectRefundRequest(id: string, reason?: string) {
    try {
      // Obtener la solicitud actual para mantener la descripción existente
      const { data: currentRequest } = await this.supabase
        .from('refund_requests')
        .select('description')
        .eq('id', id)
        .single();

      const updatedDescription = reason 
        ? `${currentRequest?.description || ''}\n\nRazón del rechazo: ${reason}` 
        : currentRequest?.description;

      const { data, error } = await this.supabase
        .from('refund_requests')
        .update({
          status: 'REJECTED',
          description: updatedDescription,
          updated_at: new Date().toISOString(),
          updated_by: (await this.supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error rechazando solicitud de reembolso:', error);
        throw new Error('Error al rechazar la solicitud de reembolso');
      }

      return data;
    } catch (error) {
      console.error('Error en RefundsService.rejectRefundRequest:', error);
      throw error;
    }
  }

  // Obtener estadísticas de reembolsos
  static async getRefundStats(companyId: string) {
    try {
      const { data, error } = await this.supabase
        .from('refund_requests')
        .select('status, request_type, requested_amount, approved_amount')
        .eq('company_id', companyId);

      if (error) {
        console.error('Error obteniendo estadísticas de reembolsos:', error);
        throw new Error('Error al obtener las estadísticas de reembolsos');
      }

      const stats = {
        total_requests: data?.length || 0,
        pending_requests: data?.filter(r => r.status === 'PENDING').length || 0,
        approved_requests: data?.filter(r => r.status === 'APPROVED').length || 0,
        processed_requests: data?.filter(r => r.status === 'PROCESSED').length || 0,
        rejected_requests: data?.filter(r => r.status === 'REJECTED').length || 0,
        total_requested_amount: data?.reduce((sum, r) => sum + (r.requested_amount || 0), 0) || 0,
        total_approved_amount: data?.reduce((sum, r) => sum + (r.approved_amount || 0), 0) || 0,
        refunds_count: data?.filter(r => r.request_type === 'REFUND').length || 0,
        cancellations_count: data?.filter(r => r.request_type === 'CANCELLATION').length || 0
      };

      return stats;
    } catch (error) {
      console.error('Error en RefundsService.getRefundStats:', error);
      throw error;
    }
  }
}
