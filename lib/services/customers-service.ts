import { createClient } from '@/lib/supabase/client';
import { Customer } from '@/lib/types/customers';

export class CustomersService {
  private static supabase = createClient();

  // Crear cliente Consumidor Final por defecto
  static async createDefaultConsumidorFinal(companyId: string): Promise<Customer | null> {
    try {
      // Verificar si ya existe
      const { data: existingCustomer } = await this.supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .eq('identification_number', '22222222-2')
        .eq('identification_type', 'NIT')
        .eq('business_name', 'Consumidor Final')
        .single();

      if (existingCustomer) {
        return existingCustomer;
      }

      // Crear el cliente Consumidor Final
      const consumidorFinalData = {
        company_id: companyId,
        identification_type: 'NIT',
        identification_number: '22222222-2',
        business_name: 'Consumidor Final',
        person_type: 'JURIDICA',
        tax_responsibility: 'NO_OBLIGADO_A_FACTURAR',
        department: 'Cundinamarca',
        municipality: 'Bogotá D.C.',
        address: 'Dirección no especificada',
        postal_code: '110111',
        email: 'consumidor.final@empresa.com',
        phone: null,
        mobile_phone: null,
        website: null,
        tax_id: '22222222-2',
        tax_regime: 'NO_OBLIGADO_A_FACTURAR',
        economic_activity_code: null,
        economic_activity_description: 'Consumidor final - No obligado a facturar',
        bank_name: null,
        account_type: null,
        account_number: null,
        credit_limit: 0,
        payment_terms: 0,
        discount_percentage: 0,
        is_active: true,
        is_vip: false,
        notes: 'Cliente por defecto para consumidores finales según estándares colombianos',
        created_by: null,
        updated_by: null,
      };

      const { data: newCustomer, error } = await this.supabase
        .from('customers')
        .insert([consumidorFinalData])
        .select()
        .single();

      if (error) {
        console.error('Error creando Consumidor Final:', error);
        return null;
      }

      return newCustomer;
    } catch (error) {
      console.error('Error en createDefaultConsumidorFinal:', error);
      return null;
    }
  }

  // Obtener todos los clientes de una empresa
  static async getCustomers(companyId: string, options?: {
    search?: string;
    personType?: string;
    taxResponsibility?: string;
    department?: string;
    municipality?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ customers: Customer[]; total: number }> {
    try {
      const {
        search = '',
        personType = null,
        taxResponsibility = null,
        department = null,
        municipality = null,
        isActive = null,
        sortBy = 'business_name',
        sortOrder = 'asc',
        limit = 50,
        offset = 0
      } = options || {};

      let query = this.supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      // Solo aplicar filtro de búsqueda si hay un término de búsqueda
      if (search && search.trim() !== '') {
        query = query.ilike('business_name', `%${search}%`);
      }

      const { data: customers, error, count } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error obteniendo clientes:', error);
        throw new Error('Error al obtener los clientes');
      }

      // Aplicar filtros adicionales
      let filteredCustomers = customers || [];

      if (personType) {
        filteredCustomers = filteredCustomers.filter(c => c.person_type === personType);
      }

      if (taxResponsibility) {
        filteredCustomers = filteredCustomers.filter(c => c.tax_responsibility === taxResponsibility);
      }

      if (department) {
        filteredCustomers = filteredCustomers.filter(c => c.department === department);
      }

      if (municipality) {
        filteredCustomers = filteredCustomers.filter(c => c.municipality === municipality);
      }

      if (isActive !== null) {
        filteredCustomers = filteredCustomers.filter(c => c.is_active === isActive);
      }

      return {
        customers: filteredCustomers,
        total: count || 0
      };
    } catch (error) {
      console.error('Error en getCustomers:', error);
      throw error;
    }
  }

  // Crear un nuevo cliente
  static async createCustomer(customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    try {
      const { data: newCustomer, error } = await this.supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (error) {
        console.error('Error creando cliente:', error);
        throw new Error('Error al crear el cliente');
      }

      return newCustomer;
    } catch (error) {
      console.error('Error en createCustomer:', error);
      throw error;
    }
  }

  // Actualizar un cliente
  static async updateCustomer(id: string, customerData: Partial<Customer>): Promise<Customer> {
    try {
      const { data: updatedCustomer, error } = await this.supabase
        .from('customers')
        .update(customerData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando cliente:', error);
        throw new Error('Error al actualizar el cliente');
      }

      return updatedCustomer;
    } catch (error) {
      console.error('Error en updateCustomer:', error);
      throw error;
    }
  }

  // Eliminar un cliente
  static async deleteCustomer(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error eliminando cliente:', error);
        throw new Error('Error al eliminar el cliente');
      }
    } catch (error) {
      console.error('Error en deleteCustomer:', error);
      throw error;
    }
  }

  // Obtener estadísticas de clientes
  static async getCustomerStats(companyId: string): Promise<{
    total_customers: number;
    natural_persons: number;
    juridical_persons: number;
    active_customers: number;
    vip_customers: number;
  }> {
    try {
      const { data: customers, error } = await this.supabase
        .from('customers')
        .select('person_type, is_active, is_vip')
        .eq('company_id', companyId);

      if (error) {
        console.error('Error obteniendo estadísticas de clientes:', error);
        throw new Error('Error al obtener las estadísticas');
      }

      const stats = {
        total_customers: customers?.length || 0,
        natural_persons: customers?.filter(c => c.person_type === 'NATURAL').length || 0,
        juridical_persons: customers?.filter(c => c.person_type === 'JURIDICA').length || 0,
        active_customers: customers?.filter(c => c.is_active).length || 0,
        vip_customers: customers?.filter(c => c.is_vip).length || 0,
      };

      return stats;
    } catch (error) {
      console.error('Error en getCustomerStats:', error);
      throw error;
    }
  }
}
