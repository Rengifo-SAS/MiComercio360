'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Filter, X, Loader2 } from 'lucide-react';
import {
  useInventorySearch,
  SearchFilters,
} from '@/lib/hooks/use-inventory-search';

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface InventorySearchFilterProps {
  warehouses: Warehouse[];
  categories: Category[];
  companyId: string;
  onDataChange?: (data: any[]) => void;
  onStatsChange?: (stats: any) => void;
}

export function InventorySearchFilter({
  warehouses,
  categories,
  companyId,
  onDataChange,
  onStatsChange,
}: InventorySearchFilterProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data,
    stats,
    suggestions,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    quickSearch,
  } = useInventorySearch(companyId);

  // Notificar cambios de datos a los componentes padre
  useEffect(() => {
    if (onDataChange) {
      onDataChange(data);
    }
  }, [data, onDataChange]);

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange(stats);
    }
  }, [stats, onStatsChange]);

  const handleSearch = () => {
    quickSearch(searchTerm);
  };

  const handleFilterChange = (field: keyof SearchFilters, value: string) => {
    updateFilters({ [field]: value });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    clearFilters();
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== '' && value !== 'name' && value !== 'asc'
  );

  return (
    <div className="flex items-center gap-2">
      {/* Búsqueda rápida */}
      <div className="flex items-center gap-2 relative">
        <Input
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="w-64"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>

        {/* Sugerencias */}
        {suggestions.length > 0 && searchTerm && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                onClick={() => {
                  setSearchTerm(suggestion.suggestion);
                  quickSearch(suggestion.suggestion);
                }}
              >
                <span className="font-medium">{suggestion.suggestion}</span>
                <span className="text-gray-500 ml-2">
                  (
                  {suggestion.type === 'product'
                    ? 'Producto'
                    : suggestion.type === 'sku'
                    ? 'SKU'
                    : 'Categoría'}
                  )
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filtros avanzados */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full h-5 w-5 text-xs flex items-center justify-center">
                !
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Filtros de Inventario</DialogTitle>
            <DialogDescription>
              Aplica filtros para encontrar productos específicos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Bodega */}
            <div className="space-y-2">
              <Label htmlFor="warehouse">Bodega</Label>
              <Select
                value={filters.warehouse_id || 'all'}
                onValueChange={(value) =>
                  handleFilterChange(
                    'warehouse_id',
                    value === 'all' ? '' : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las bodegas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las bodegas</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={filters.category_id || 'all'}
                onValueChange={(value) =>
                  handleFilterChange(
                    'category_id',
                    value === 'all' ? '' : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estado de stock */}
            <div className="space-y-2">
              <Label htmlFor="stock_status">Estado de Stock</Label>
              <Select
                value={filters.stock_status || 'all'}
                onValueChange={(value) =>
                  handleFilterChange(
                    'stock_status',
                    value === 'all' ? '' : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="in_stock">En Stock</SelectItem>
                  <SelectItem value="low_stock">Bajo Stock</SelectItem>
                  <SelectItem value="out_of_stock">Sin Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ordenamiento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sort_by">Ordenar por</Label>
                <Select
                  value={filters.sort_by}
                  onValueChange={(value) =>
                    handleFilterChange('sort_by', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nombre</SelectItem>
                    <SelectItem value="sku">SKU</SelectItem>
                    <SelectItem value="quantity">Cantidad</SelectItem>
                    <SelectItem value="cost_price">Precio de Costo</SelectItem>
                    <SelectItem value="selling_price">
                      Precio de Venta
                    </SelectItem>
                    <SelectItem value="last_updated">
                      Última Actualización
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Orden</Label>
                <Select
                  value={filters.sort_order}
                  onValueChange={(value) =>
                    handleFilterChange('sort_order', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar orden" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascendente</SelectItem>
                    <SelectItem value="desc">Descendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar Filtros
            </Button>
            <Button onClick={() => setFilterOpen(false)}>
              Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
