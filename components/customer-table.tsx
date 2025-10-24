'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Crown,
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

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

const IDENTIFICATION_TYPES = {
  CC: 'C.C.',
  CE: 'C.E.',
  NIT: 'NIT',
  PP: 'P.P.',
  TI: 'T.I.',
  RC: 'R.C.',
  PA: 'P.A.',
};

const TAX_RESPONSIBILITY_LABELS = {
  RESPONSIBLE_DE_IVA: 'Responsable IVA',
  NO_RESPONSIBLE_DE_IVA: 'No Responsable IVA',
  RESPONSIBLE_DE_IVA_REINCORPORADO: 'Responsable IVA Reinc.',
  NO_RESPONSIBLE_DE_IVA_POR_ARTICULO_23: 'No Responsable Art. 23',
  REGIMEN_SIMPLIFICADO: 'Régimen Simplificado',
  REGIMEN_COMUN: 'Régimen Común',
  REGIMEN_ESPECIAL: 'Régimen Especial',
  AUTORRETENEDOR: 'Autoretenedor',
  AGENTE_RETENCION_IVA: 'Agente Ret. IVA',
  AGENTE_RETENCION_ICA: 'Agente Ret. ICA',
  AGENTE_RETENCION_FUENTE: 'Agente Ret. Fuente',
  GRAN_CONTRIBUYENTE: 'Gran Contribuyente',
  AUTORRETENEDOR_ICA: 'Autoretenedor ICA',
  AUTORRETENEDOR_IVA: 'Autoretenedor IVA',
  AUTORRETENEDOR_FUENTE: 'Autoretenedor Fuente',
  NO_OBLIGADO_A_FACTURAR: 'No Obligado Facturar',
};

export function CustomerTable({
  customers,
  loading,
  error,
  onView,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (customerToDelete) {
      onDelete(customerToDelete);
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Error cargando clientes</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">
            No hay clientes registrados
          </p>
          <p className="text-sm text-muted-foreground">
            Los clientes aparecerán aquí cuando los agregues
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Identificación</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Responsabilidad</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Límite Crédito</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {customer.business_name}
                        {customer.is_vip && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {customer.person_type === 'NATURAL'
                          ? 'Persona Natural'
                          : 'Persona Jurídica'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {
                        IDENTIFICATION_TYPES[
                          customer.identification_type as keyof typeof IDENTIFICATION_TYPES
                        ]
                      }{' '}
                      {customer.identification_number}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      customer.person_type === 'NATURAL'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {customer.person_type === 'NATURAL'
                      ? 'Natural'
                      : 'Jurídica'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {TAX_RESPONSIBILITY_LABELS[
                      customer.tax_responsibility as keyof typeof TAX_RESPONSIBILITY_LABELS
                    ] || customer.tax_responsibility}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {customer.municipality}, {customer.department}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {customer.email && (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">
                          {customer.email}
                        </span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">
                      {formatCurrency(customer.credit_limit)}
                    </span>
                  </div>
                  {customer.payment_terms > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {customer.payment_terms} días
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                    {customer.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(customer)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(customer)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(customer)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              cliente <strong>{customerToDelete?.business_name}</strong> y todos
              sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
