'use client';

import { createContext, useContext, ReactNode } from 'react';
import {
  useInventorySearch,
  SearchFilters,
  InventoryItem,
} from '@/lib/hooks/use-inventory-search';

interface InventorySearchContextType {
  inventory: InventoryItem[];
  loading: boolean;
  error: string | null;
  filters: SearchFilters;
  updateFilters: (filters: Partial<SearchFilters>) => void;
  clearFilters: () => void;
  searchInventory: (filters: SearchFilters) => void;
}

const InventorySearchContext = createContext<
  InventorySearchContextType | undefined
>(undefined);

export function InventorySearchProvider({ children }: { children: ReactNode }) {
  const searchData = useInventorySearch();

  return (
    <InventorySearchContext.Provider value={searchData}>
      {children}
    </InventorySearchContext.Provider>
  );
}

export function useInventorySearchContext() {
  const context = useContext(InventorySearchContext);
  if (context === undefined) {
    throw new Error(
      'useInventorySearchContext must be used within an InventorySearchProvider'
    );
  }
  return context;
}
