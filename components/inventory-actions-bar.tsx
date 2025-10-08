'use client';

import { useState } from 'react';
import { InventorySearchFilter } from '@/components/inventory-search-filter';
import { InventoryExportDialog } from '@/components/inventory-export-dialog';
import { WarehouseTransferDialog } from '@/components/warehouse-transfer-dialog';
import { WarehouseHistoryDialog } from '@/components/warehouse-history-dialog';

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

interface InventoryActionsBarProps {
  warehouses: Warehouse[];
  categories: Category[];
  inventoryData?: any[];
  companyId: string;
  onDataChange?: (data: any[]) => void;
  onStatsChange?: (stats: any) => void;
}

export function InventoryActionsBar({
  warehouses,
  categories,
  inventoryData = [],
  companyId,
  onDataChange,
  onStatsChange,
}: InventoryActionsBarProps) {
  const [filters, setFilters] = useState({
    search: '',
    warehouse_id: '',
    category_id: '',
    stock_status: '',
    sort_by: 'name',
    sort_order: 'asc',
  });

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    // TODO: Implementar filtros en el backend
    console.log('Filters changed:', newFilters);
  };

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    // TODO: Implementar búsqueda en el backend
    console.log('Search:', search);
  };

  const handleExport = (options: any) => {
    // TODO: Implementar exportación
    console.log('Export options:', options);
  };

  return (
    <div className="flex items-center justify-between">
      <InventorySearchFilter
        warehouses={warehouses}
        categories={categories}
        companyId={companyId}
        onDataChange={onDataChange}
        onStatsChange={onStatsChange}
      />
      <div className="flex items-center gap-2">
        <InventoryExportDialog
          warehouses={warehouses}
          inventoryData={inventoryData}
          companyId={companyId}
          onExport={handleExport}
        />
        <WarehouseTransferDialog />
        <WarehouseHistoryDialog />
      </div>
    </div>
  );
}
