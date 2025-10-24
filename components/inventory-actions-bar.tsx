'use client';

import { useState } from 'react';
import { InventorySearchFilter } from '@/components/inventory-search-filter';
import { InventoryExportDialog } from '@/components/inventory-export-dialog';
import { WarehouseTransferDialog } from '@/components/warehouse-transfer-dialog';
import { InventoryHistoryDialog } from '@/components/inventory-history-dialog';

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
  inventoryData?: any[];
  companyId: string;
  onTransferComplete?: () => void;
}

export function InventoryActionsBar({
  warehouses,
  inventoryData = [],
  companyId,
  onTransferComplete,
}: InventoryActionsBarProps) {
  const handleExport = (options: any) => {
    // TODO: Implementar exportación
    console.log('Export options:', options);
  };

  return (
    <div className="flex items-center gap-2">
      <InventoryExportDialog
        warehouses={warehouses}
        inventoryData={inventoryData}
        companyId={companyId}
        onExport={handleExport}
      />
      <WarehouseTransferDialog />
      <InventoryHistoryDialog onTransferComplete={onTransferComplete} />
    </div>
  );
}
