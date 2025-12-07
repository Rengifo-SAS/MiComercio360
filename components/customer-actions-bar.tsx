'use client';

import { Button } from '@/components/ui/button';
import { CustomerExportDialog } from '@/components/customer-export-dialog';
import { Download, FileSpreadsheet, FileText, File } from 'lucide-react';

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

interface CustomerActionsBarProps {
  customers: Customer[];
  onExport?: () => void;
}

export function CustomerActionsBar({
  customers,
  onExport,
}: CustomerActionsBarProps) {
  return (
    <div className="flex items-center gap-2">
      <CustomerExportDialog customers={customers} />
    </div>
  );
}
