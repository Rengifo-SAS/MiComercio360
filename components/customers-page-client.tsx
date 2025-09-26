'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CustomerSearchFilter } from '@/components/customer-search-filter';
import { CustomerActionsBar } from '@/components/customer-actions-bar';
import { CustomerTable } from '@/components/customer-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CustomerFormDialog } from '@/components/customer-form-dialog';
import { CustomerViewDialog } from '@/components/customer-view-dialog';
import { CustomerDeleteDialog } from '@/components/customer-delete-dialog';
import {
  Users,
  UserPlus,
  Building2,
  User,
  Crown,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Calendar,
} from 'lucide-react';

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

interface CustomersPageClientProps {
  companyId: string;
  initialData: Customer[];
  initialStats: CustomerStats;
  departments: Department[];
}

export function CustomersPageClient({
  companyId,
  initialData,
  initialStats,
  departments,
}: CustomersPageClientProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialData);
  const [stats, setStats] = useState<CustomerStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  const supabase = createClient();

  const handleDataChange = (data: Customer[]) => {
    setCustomers(data);

    // Actualizar estadísticas
    const newStats = {
      total_customers: data.length,
      natural_persons: data.filter((c) => c.person_type === 'NATURAL').length,
      juridical_persons: data.filter((c) => c.person_type === 'JURIDICA')
        .length,
      active_customers: data.filter((c) => c.is_active).length,
      vip_customers: data.filter((c) => c.is_vip).length,
    };
    setStats(newStats);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowViewDialog(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDialog(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteDialog(true);
  };

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setShowCustomerDialog(true);
  };

  const handleCustomerSaved = () => {
    setShowCustomerDialog(false);
    // Recargar datos
    loadCustomers();
  };

  const handleCustomerDeleted = () => {
    setShowDeleteDialog(false);
    // Recargar datos
    loadCustomers();
  };

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: customersData, error: customersError } = await supabase.rpc(
        'search_customers',
        {
          p_company_id: companyId,
          p_search_term: '',
          p_person_type: null,
          p_tax_responsibility: null,
          p_department: null,
          p_municipality: null,
          p_is_active: null,
          p_sort_by: 'business_name',
          p_sort_order: 'asc',
          p_limit: 50,
          p_offset: 0,
        }
      );

      if (customersError) {
        throw new Error(customersError.message);
      }

      handleDataChange(customersData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando clientes');
      console.error('Error cargando clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona la información de tus clientes
          </p>
        </div>
        <Button onClick={handleCreateCustomer}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_customers}</div>
            <p className="text-xs text-muted-foreground">Registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Personas Naturales
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.natural_persons}
            </div>
            <p className="text-xs text-muted-foreground">Individuales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Personas Jurídicas
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.juridical_persons}
            </div>
            <p className="text-xs text-muted-foreground">Empresas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.active_customers}
            </div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.vip_customers}
            </div>
            <p className="text-xs text-muted-foreground">Especiales</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <CustomerSearchFilter
          companyId={companyId}
          departments={departments}
          onDataChange={handleDataChange}
          onStatsChange={setStats}
        />

        <CustomerActionsBar customers={customers} onExport={() => {}} />
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Gestiona la información de tus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerTable
            customers={customers}
            loading={loading}
            error={error}
            onView={handleViewCustomer}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      {showCustomerDialog && (
        <CustomerFormDialog
          customer={selectedCustomer}
          departments={departments}
          onSave={handleCustomerSaved}
          onClose={() => setShowCustomerDialog(false)}
        />
      )}

      {showViewDialog && selectedCustomer && (
        <CustomerViewDialog
          customer={selectedCustomer}
          onEdit={() => {
            setShowViewDialog(false);
            handleEditCustomer(selectedCustomer);
          }}
          onClose={() => setShowViewDialog(false)}
        />
      )}

      {showDeleteDialog && selectedCustomer && (
        <CustomerDeleteDialog
          customer={selectedCustomer}
          onDelete={handleCustomerDeleted}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}
