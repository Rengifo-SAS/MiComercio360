'use client';

import { createContext, useContext, ReactNode } from 'react';
import {
  useInventorySearch,
  SearchFilters,
  InventoryItem,
} from '@/lib/hooks/use-inventory-search';

interface InventorySearchContextType {
  data: InventoryItem[];
  stats: any;
  suggestions: any[];
  loading: boolean;
  error: string | null;
  filters: SearchFilters;
  search: (filters: SearchFilters) => void;
  updateFilters: (filters: Partial<SearchFilters>) => void;
  clearFilters: () => void;
  quickSearch: (searchTerm: string) => void;
  getSuggestions: (searchTerm: string) => Promise<void>;
}

const InventorySearchContext = createContext<
  InventorySearchContextType | undefined
>(undefined);

interface InventorySearchProviderProps {
  children: ReactNode;
  companyId: string;
}

export function InventorySearchProvider({
  children,
  companyId,
}: InventorySearchProviderProps) {
  const searchData = useInventorySearch(companyId);

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
