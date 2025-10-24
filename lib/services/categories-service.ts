import { createClient } from '@/lib/supabase/client';

export class CategoriesService {
  private static supabase = createClient();

  // Obtener todas las categorías de una empresa
  static async getCategories(companyId: string): Promise<any[]> {
    try {
      const { data: categories, error } = await this.supabase
        .from('categories')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error obteniendo categorías:', error);
        throw new Error('Error al obtener las categorías');
      }

      return categories || [];
    } catch (error) {
      console.error('Error en getCategories:', error);
      throw error;
    }
  }

  // Crear una nueva categoría
  static async createCategory(categoryData: {
    name: string;
    description?: string;
    company_id: string;
    is_active?: boolean;
  }): Promise<any> {
    try {
      const { data: category, error } = await this.supabase
        .from('categories')
        .insert({
          name: categoryData.name,
          description: categoryData.description || null,
          company_id: categoryData.company_id,
          is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando categoría:', error);
        throw new Error('Error al crear la categoría');
      }

      return category;
    } catch (error) {
      console.error('Error en createCategory:', error);
      throw error;
    }
  }
}
