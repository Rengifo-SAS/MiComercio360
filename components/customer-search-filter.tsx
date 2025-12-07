'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  identification_type: string;
  identification_number: string;
  business_name: string;
  person_type: 'NATURAL' | 'JURIDICA';
  tax_responsibility: string;
  department: string;
  municipality: string;
  address: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  credit_limit: number;
  payment_terms: number;
  discount_percentage: number;
  is_active: boolean;
  is_vip: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomerStats {
  total_customers: number;
  natural_persons: number;
  juridical_persons: number;
  active_customers: number;
  vip_customers: number;
}

interface Department {
  code: string;
  name: string;
}

interface CustomerSearchFilterProps {
  companyId: string;
  departments: Department[];
  onDataChange: (customers: Customer[]) => void;
  onStatsChange: (stats: CustomerStats) => void;
}

interface SearchFilters {
  search: string;
  person_type: string;
  tax_responsibility: string;
  department: string;
  municipality: string;
  is_active: string;
  sort_by: string;
  sort_order: string;
}

const TAX_RESPONSIBILITIES = [
  { value: 'RESPONSABLE_DE_IVA', label: 'Responsable de IVA' },
  { value: 'NO_RESPONSABLE_DE_IVA', label: 'No Responsable de IVA' },
  {
    value: 'RESPONSABLE_DE_IVA_REINCORPORADO',
    label: 'Responsable de IVA Reincorporado',
  },
  {
    value: 'NO_RESPONSABLE_DE_IVA_POR_ARTICULO_23',
    label: 'No Responsable de IVA por Artículo 23',
  },
  { value: 'REGIMEN_SIMPLIFICADO', label: 'Régimen Simplificado' },
  { value: 'REGIMEN_COMUN', label: 'Régimen Común' },
  { value: 'REGIMEN_ESPECIAL', label: 'Régimen Especial' },
  { value: 'AUTORRETENEDOR', label: 'Autoretenedor' },
  { value: 'AGENTE_RETENCION_IVA', label: 'Agente Retención IVA' },
  { value: 'AGENTE_RETENCION_ICA', label: 'Agente Retención ICA' },
  { value: 'AGENTE_RETENCION_FUENTE', label: 'Agente Retención Fuente' },
  { value: 'GRAN_CONTRIBUYENTE', label: 'Gran Contribuyente' },
  { value: 'AUTORRETENEDOR_ICA', label: 'Autoretenedor ICA' },
  { value: 'AUTORRETENEDOR_IVA', label: 'Autoretenedor IVA' },
  { value: 'AUTORRETENEDOR_FUENTE', label: 'Autoretenedor Fuente' },
  { value: 'NO_OBLIGADO_A_FACTURAR', label: 'No Obligado a Facturar' },
];

const SORT_OPTIONS = [
  { value: 'business_name', label: 'Nombre/Razón Social' },
  { value: 'identification_number', label: 'Número de Identificación' },
  { value: 'email', label: 'Correo Electrónico' },
  { value: 'created_at', label: 'Fecha de Creación' },
];

export function CustomerSearchFilter({
  companyId,
  departments,
  onDataChange,
  onStatsChange,
}: CustomerSearchFilterProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    person_type: '',
    tax_responsibility: '',
    department: '',
    municipality: '',
    is_active: '',
    sort_by: 'business_name',
    sort_order: 'asc',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [municipalities, setMunicipalities] = useState<
    { code: string; name: string; department_code: string }[]
  >([]);

  const supabase = createClient();

  // Handle hydration to prevent conflicts with browser extensions
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== '' && value !== 'business_name' && value !== 'asc'
  );

  const searchCustomers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: customersData, error: customersError } = await supabase.rpc(
        'search_customers',
        {
          p_company_id: companyId,
          p_search_term: filters.search,
          p_person_type: filters.person_type || null,
          p_tax_responsibility: filters.tax_responsibility || null,
          p_department: filters.department || null,
          p_municipality: filters.municipality || null,
          p_is_active: filters.is_active ? filters.is_active === 'true' : null,
          p_sort_by: filters.sort_by,
          p_sort_order: filters.sort_order,
          p_limit: 100,
          p_offset: 0,
        }
      );

      if (customersError) {
        throw new Error(customersError.message);
      }

      onDataChange(customersData || []);

      // Actualizar estadísticas
      const newStats = {
        total_customers: customersData?.length || 0,
        natural_persons:
          customersData?.filter((c: any) => c.person_type === 'NATURAL')
            .length || 0,
        juridical_persons:
          customersData?.filter((c: any) => c.person_type === 'JURIDICA')
            .length || 0,
        active_customers:
          customersData?.filter((c: any) => c.is_active).length || 0,
        vip_customers: customersData?.filter((c: any) => c.is_vip).length || 0,
      };
      onStatsChange(newStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error buscando clientes');
      console.error('Error buscando clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchTerm }));
    searchCustomers();
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      search: '',
      person_type: '',
      tax_responsibility: '',
      department: '',
      municipality: '',
      is_active: '',
      sort_by: 'business_name',
      sort_order: 'asc',
    });
    setMunicipalities([]);
  };

  const loadMunicipalities = async (departmentCode: string) => {
    if (!departmentCode) {
      setMunicipalities([]);
      return;
    }

    try {
      const { data: municipalitiesData, error } = await supabase.rpc(
        'get_colombian_municipalities',
        { p_department_code: departmentCode }
      );

      if (error) {
        console.error('Error cargando municipios:', error);
        return;
      }

      setMunicipalities(municipalitiesData || []);
    } catch (err) {
      console.error('Error cargando municipios:', err);
    }
  };

  useEffect(() => {
    if (filters.department) {
      const department = departments.find((d) => d.name === filters.department);
      if (department) {
        loadMunicipalities(department.code);
      }
    } else {
      setMunicipalities([]);
    }
  }, [filters.department, departments]);

  useEffect(() => {
    searchCustomers();
  }, [
    filters.person_type,
    filters.tax_responsibility,
    filters.department,
    filters.municipality,
    filters.is_active,
    filters.sort_by,
    filters.sort_order,
  ]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="flex items-center gap-4 w-full">
        <div className="flex-1 relative">
          <div className="h-10 bg-gray-100 rounded-md animate-pulse"></div>
        </div>
        <div className="h-10 w-24 bg-gray-100 rounded-md animate-pulse"></div>
        <div className="h-10 w-24 bg-gray-100 rounded-md animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 w-full">
      {/* Search Input */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar por nombre, identificación, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="pl-10"
        />
      </div>

      {/* Filters Button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                !
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtros de Búsqueda</h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 px-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {/* Tipo de Persona */}
              <div>
                <label className="text-sm font-medium">Tipo de Persona</label>
                <Select
                  value={filters.person_type}
                  onValueChange={(value) =>
                    handleFilterChange('person_type', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los tipos</SelectItem>
                    <SelectItem value="NATURAL">Persona Natural</SelectItem>
                    <SelectItem value="JURIDICA">Persona Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Responsabilidad Tributaria */}
              <div>
                <label className="text-sm font-medium">
                  Responsabilidad Tributaria
                </label>
                <Select
                  value={filters.tax_responsibility}
                  onValueChange={(value) =>
                    handleFilterChange('tax_responsibility', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las responsabilidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      Todas las responsabilidades
                    </SelectItem>
                    {TAX_RESPONSIBILITIES.map((resp) => (
                      <SelectItem key={resp.value} value={resp.value}>
                        {resp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Departamento */}
              <div>
                <label className="text-sm font-medium">Departamento</label>
                <Select
                  value={filters.department}
                  onValueChange={(value) => {
                    handleFilterChange('department', value);
                    handleFilterChange('municipality', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los departamentos</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.code} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Municipio */}
              <div>
                <label className="text-sm font-medium">Municipio</label>
                <Select
                  value={filters.municipality}
                  onValueChange={(value) =>
                    handleFilterChange('municipality', value)
                  }
                  disabled={!filters.department}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los municipios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los municipios</SelectItem>
                    {municipalities.map((mun) => (
                      <SelectItem key={mun.code} value={mun.name}>
                        {mun.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select
                  value={filters.is_active}
                  onValueChange={(value) =>
                    handleFilterChange('is_active', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los estados</SelectItem>
                    <SelectItem value="true">Activos</SelectItem>
                    <SelectItem value="false">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ordenar por */}
              <div>
                <label className="text-sm font-medium">Ordenar por</label>
                <div className="flex gap-2">
                  <Select
                    value={filters.sort_by}
                    onValueChange={(value) =>
                      handleFilterChange('sort_by', value)
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.sort_order}
                    onValueChange={(value) =>
                      handleFilterChange('sort_order', value)
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">A-Z</SelectItem>
                      <SelectItem value="desc">Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={clearFilters}>
                Limpiar
              </Button>
              <Button onClick={handleSearch} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Buscar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Search Button */}
      <Button onClick={handleSearch} disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Buscar
      </Button>
    </div>
  );
}
