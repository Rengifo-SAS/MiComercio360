// Servicio para gestión de métodos de pago
// lib/services/payment-methods-service.ts

import { createClient } from '@/lib/supabase/client';
import {
  PaymentMethod,
  PaymentMethodHistory,
  PaymentGateway,
  PaymentTransaction,
  CreatePaymentMethodData,
  UpdatePaymentMethodData,
  CreatePaymentGatewayData,
  UpdatePaymentGatewayData,
  PaymentMethodStats,
} from '@/lib/types/payment-methods';

const supabase = createClient();

export class PaymentMethodsService {
  // ===== MÉTODOS DE PAGO =====

  static async getPaymentMethods(companyId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo métodos de pago:', error);
      return [];
    }
  }

  static async getPaymentMethod(id: string): Promise<PaymentMethod | null> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo método de pago:', error);
      return null;
    }
  }

  static async createPaymentMethod(
    companyId: string,
    data: CreatePaymentMethodData
  ): Promise<PaymentMethod | null> {
    try {
      const { data: result, error } = await supabase
        .from('payment_methods')
        .insert({
          company_id: companyId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error creando método de pago:', error);
      return null;
    }
  }

  static async updatePaymentMethod(
    id: string,
    data: UpdatePaymentMethodData
  ): Promise<PaymentMethod | null> {
    try {
      const { data: result, error } = await supabase
        .from('payment_methods')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error actualizando método de pago:', error);
      return null;
    }
  }

  static async deletePaymentMethod(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando método de pago:', error);
      return false;
    }
  }

  static async togglePaymentMethodStatus(id: string): Promise<boolean> {
    try {
      const { data: current, error: fetchError } = await supabase
        .from('payment_methods')
        .select('is_active')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: !current.is_active })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cambiando estado del método de pago:', error);
      return false;
    }
  }

  static async setAsDefault(id: string): Promise<boolean> {
    try {
      // Primero obtener el company_id del método de pago
      const { data: paymentMethod, error: fetchError } = await supabase
        .from('payment_methods')
        .select('company_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Quitar el estado de predeterminado de todos los métodos de la empresa
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('company_id', paymentMethod.company_id);

      // Establecer este método como predeterminado
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error estableciendo método como predeterminado:', error);
      return false;
    }
  }

  static async duplicatePaymentMethod(
    id: string,
    newName: string
  ): Promise<PaymentMethod | null> {
    try {
      const { data: original, error: fetchError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data: result, error } = await supabase
        .from('payment_methods')
        .insert({
          ...original,
          id: undefined,
          name: newName,
          is_default: false,
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error duplicando método de pago:', error);
      return null;
    }
  }

  // ===== PASARELAS DE PAGO =====

  static async getPaymentGateways(companyId: string): Promise<PaymentGateway[]> {
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo pasarelas de pago:', error);
      return [];
    }
  }

  static async getPaymentGateway(id: string): Promise<PaymentGateway | null> {
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo pasarela de pago:', error);
      return null;
    }
  }

  static async createPaymentGateway(
    companyId: string,
    data: CreatePaymentGatewayData
  ): Promise<PaymentGateway | null> {
    try {
      const { data: result, error } = await supabase
        .from('payment_gateways')
        .insert({
          company_id: companyId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error creando pasarela de pago:', error);
      return null;
    }
  }

  static async updatePaymentGateway(
    id: string,
    data: UpdatePaymentGatewayData
  ): Promise<PaymentGateway | null> {
    try {
      const { data: result, error } = await supabase
        .from('payment_gateways')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error actualizando pasarela de pago:', error);
      return null;
    }
  }

  static async deletePaymentGateway(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payment_gateways')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando pasarela de pago:', error);
      return false;
    }
  }

  static async togglePaymentGatewayStatus(id: string): Promise<boolean> {
    try {
      const { data: current, error: fetchError } = await supabase
        .from('payment_gateways')
        .select('is_active')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('payment_gateways')
        .update({ is_active: !current.is_active })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cambiando estado de la pasarela:', error);
      return false;
    }
  }

  // ===== TRANSACCIONES DE PAGO =====

  static async getPaymentTransactions(
    companyId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaymentTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          payment_methods!inner(name, payment_type),
          payment_gateways(name, gateway_type)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo transacciones de pago:', error);
      return [];
    }
  }

  static async getPaymentTransaction(id: string): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          payment_methods!inner(name, payment_type),
          payment_gateways(name, gateway_type)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo transacción de pago:', error);
      return null;
    }
  }

  // ===== HISTORIAL =====

  static async getPaymentMethodHistory(
    paymentMethodId: string
  ): Promise<PaymentMethodHistory[]> {
    try {
      const { data, error } = await supabase
        .from('payment_method_history')
        .select('*')
        .eq('payment_method_id', paymentMethodId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo historial del método de pago:', error);
      return [];
    }
  }

  // ===== ESTADÍSTICAS =====

  static async getPaymentMethodStats(companyId: string): Promise<PaymentMethodStats> {
    try {
      // Obtener estadísticas de métodos de pago
      const { data: methods, error: methodsError } = await supabase
        .from('payment_methods')
        .select('payment_type, is_active, is_default')
        .eq('company_id', companyId);

      if (methodsError) throw methodsError;

      // Obtener estadísticas de transacciones
      const { data: transactions, error: transactionsError } = await supabase
        .from('payment_transactions')
        .select('amount, fee_amount')
        .eq('company_id', companyId)
        .eq('status', 'COMPLETED');

      if (transactionsError) throw transactionsError;

      const totalMethods = methods?.length || 0;
      const activeMethods = methods?.filter(m => m.is_active).length || 0;
      const defaultMethods = methods?.filter(m => m.is_default).length || 0;

      const methodsByType = methods?.reduce((acc, method) => {
        acc[method.payment_type] = (acc[method.payment_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const totalTransactions = transactions?.length || 0;
      const totalAmount = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      const totalFees = transactions?.reduce((sum, t) => sum + (t.fee_amount || 0), 0) || 0;
      const averageFee = totalAmount > 0 ? (totalFees / totalAmount) * 100 : 0;

      return {
        total_methods: totalMethods,
        active_methods: activeMethods,
        default_methods: defaultMethods,
        methods_by_type: methodsByType,
        total_transactions: totalTransactions,
        total_amount: totalAmount,
        average_fee: averageFee,
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de métodos de pago:', error);
      return {
        total_methods: 0,
        active_methods: 0,
        default_methods: 0,
        methods_by_type: {
          CASH: 0,
          CARD: 0,
          TRANSFER: 0,
          CHECK: 0,
          DIGITAL_WALLET: 0,
          CRYPTOCURRENCY: 0,
          GATEWAY: 0,
          OTHER: 0,
        },
        total_transactions: 0,
        total_amount: 0,
        average_fee: 0,
      };
    }
  }

  // ===== BÚSQUEDA =====

  static async searchPaymentMethods(
    companyId: string,
    searchTerm: string
  ): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('company_id', companyId)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error buscando métodos de pago:', error);
      return [];
    }
  }
}
