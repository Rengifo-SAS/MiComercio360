'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface SearchFilters {
  search: string;
  warehouse_id: string;
  category_id: string;
  supplier_id: string;
  stock_status: string;
  sort_by: string;
  sort_order: string;
  page: number;
  limit: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  max_stock: number;
  unit: string;
  image_url: string;
  is_active: boolean;
  warehouse_id: string;
  quantity: number;
  last_updated: string;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  category_name: string;
  category_color: string;
  supplier_name: string;
  warehouse_name: string;
  warehouse_code: string;
  total_count: number;
}

export interface SearchStats {
  total_products: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_value: number;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SearchSuggestions {
  suggestion: string;
  type: 'product' | 'sku' | 'category';
  count: number;
}

export function useInventorySearch(companyId: string) {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [suggestions, setSuggestions] = useState<SearchSuggestions[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    warehouse_id: '',
    category_id: '',
    supplier_id: '',
    stock_status: '',
    sort_by: 'name',
    sort_order: 'asc',
    page: 1,
    limit: 20,
  });

  const supabase = createClient();

  // Función para realizar búsqueda
  const search = useCallback(async (searchFilters: SearchFilters) => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      // Calcular offset basado en la página
      const offset = (searchFilters.page - 1) * searchFilters.limit;

      // Llamar a la función de búsqueda avanzada
      const { data: searchData, error: searchError } = await supabase.rpc(
        'search_products_advanced',
        {
          p_company_id: companyId,
          p_search_term: searchFilters.search || '',
          p_category_id: searchFilters.category_id || null,
          p_supplier_id: searchFilters.supplier_id || null,
          p_warehouse_id: searchFilters.warehouse_id || null,
          p_stock_status: searchFilters.stock_status || '',
          p_sort_by: searchFilters.sort_by || 'name',
          p_sort_order: searchFilters.sort_order || 'asc',
          p_limit: searchFilters.limit,
          p_offset: offset,
        }
      );

      if (searchError) {
        throw new Error(searchError.message);
      }

      setData(searchData || []);

      // Obtener estadísticas para calcular paginación
      const { data: statsData, error: statsError } = await supabase.rpc(
        'get_search_stats',
        {
          p_company_id: companyId,
          p_search_term: searchFilters.search || '',
          p_category_id: searchFilters.category_id || null,
          p_supplier_id: searchFilters.supplier_id || null,
          p_warehouse_id: searchFilters.warehouse_id || null,
          p_stock_status: searchFilters.stock_status || '',
        }
      );

      if (statsError) {
        console.warn('Error obteniendo estadísticas:', statsError);
      } else {
        setStats(statsData?.[0] || null);
        
        // Calcular información de paginación
        const totalItems = statsData?.[0]?.total_products || 0;
        const totalPages = Math.ceil(totalItems / searchFilters.limit);
        
        setPagination({
          currentPage: searchFilters.page,
          totalPages,
          totalItems,
          itemsPerPage: searchFilters.limit,
          hasNextPage: searchFilters.page < totalPages,
          hasPreviousPage: searchFilters.page > 1,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la búsqueda');
      console.error('Error en búsqueda:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, supabase]);

  // Función para obtener sugerencias
  const getSuggestions = useCallback(async (searchTerm: string) => {
    if (!companyId || !searchTerm || searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const { data: suggestionsData, error } = await supabase.rpc(
        'get_search_suggestions',
        {
          p_company_id: companyId,
          p_search_term: searchTerm,
          p_limit: 10,
        }
      );

      if (error) {
        console.warn('Error obteniendo sugerencias:', error);
      } else {
        setSuggestions(suggestionsData || []);
      }
    } catch (err) {
      console.error('Error obteniendo sugerencias:', err);
    }
  }, [companyId, supabase]);

  // Función para actualizar filtros
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    search(updatedFilters);
  }, [filters, search]);

  // Función para limpiar filtros
  const clearFilters = useCallback(() => {
    const clearedFilters: SearchFilters = {
      search: '',
      warehouse_id: '',
      category_id: '',
      supplier_id: '',
      stock_status: '',
      sort_by: 'name',
      sort_order: 'asc',
      page: 1,
      limit: 20,
    };
    setFilters(clearedFilters);
    search(clearedFilters);
  }, [search]);

  // Función para búsqueda rápida
  const quickSearch = useCallback((searchTerm: string) => {
    const newFilters = { ...filters, search: searchTerm, page: 1 };
    setFilters(newFilters);
    search(newFilters);
  }, [filters, search]);

  // Función para cambiar página
  const goToPage = useCallback((page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    search(newFilters);
  }, [filters, search]);

  // Función para cambiar límite de items por página
  const changeItemsPerPage = useCallback((limit: number) => {
    const newFilters = { ...filters, limit, page: 1 };
    setFilters(newFilters);
    search(newFilters);
  }, [filters, search]);

  // Efecto para búsqueda inicial
  useEffect(() => {
    if (companyId) {
      search(filters);
    }
  }, [companyId]); // Solo ejecutar cuando cambie companyId

  // Efecto para obtener sugerencias con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.search) {
        getSuggestions(filters.search);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters.search, getSuggestions]);

  return {
    data,
    stats,
    pagination,
    suggestions,
    loading,
    error,
    filters,
    search,
    updateFilters,
    clearFilters,
    quickSearch,
    getSuggestions,
    goToPage,
    changeItemsPerPage,
  };
}