'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Edit,
  X,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  Building2,
  User,
  Crown,
  Globe,
  FileText,
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

interface CustomerViewDialogProps {
  customer: Customer;
  onEdit: () => void;
  onClose: () => void;
}

const IDENTIFICATION_TYPES = {
  CC: 'Cédula de Ciudadanía',
  CE: 'Cédula de Extranjería',
  NIT: 'NIT',
  PP: 'Pasaporte',
  TI: 'Tarjeta de Identidad',
  RC: 'Registro Civil',
  PA: 'Permiso por Nacimiento',
};

const TAX_RESPONSIBILITY_LABELS = {
  RESPONSIBLE_DE_IVA: 'Responsable de IVA',
  NO_RESPONSIBLE_DE_IVA: 'No Responsable de IVA',
  RESPONSIBLE_DE_IVA_REINCORPORADO: 'Responsable de IVA Reincorporado',
  NO_RESPONSIBLE_DE_IVA_POR_ARTICULO_23:
    'No Responsable de IVA por Artículo 23',
  REGIMEN_SIMPLIFICADO: 'Régimen Simplificado',
  REGIMEN_COMUN: 'Régimen Común',
  REGIMEN_ESPECIAL: 'Régimen Especial',
  AUTORRETENEDOR: 'Autoretenedor',
  AGENTE_RETENCION_IVA: 'Agente Retención IVA',
  AGENTE_RETENCION_ICA: 'Agente Retención ICA',
  AGENTE_RETENCION_FUENTE: 'Agente Retención Fuente',
  GRAN_CONTRIBUYENTE: 'Gran Contribuyente',
  AUTORRETENEDOR_ICA: 'Autoretenedor ICA',
  AUTORRETENEDOR_IVA: 'Autoretenedor IVA',
  AUTORRETENEDOR_FUENTE: 'Autoretenedor Fuente',
  NO_OBLIGADO_A_FACTURAR: 'No Obligado a Facturar',
};

export function CustomerViewDialog({
  customer,
  onEdit,
  onClose,
}: CustomerViewDialogProps) {
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
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {customer.person_type === 'NATURAL' ? (
                  <User className="h-6 w-6 text-primary" />
                ) : (
                  <Building2 className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {customer.business_name}
                  {customer.is_vip && (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  )}
                </DialogTitle>
                <DialogDescription>
                  {customer.person_type === 'NATURAL'
                    ? 'Persona Natural'
                    : 'Persona Jurídica'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estado */}
          <div className="flex items-center gap-2">
            <Badge variant={customer.is_active ? 'default' : 'secondary'}>
              {customer.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
            {customer.is_vip && (
              <Badge
                variant="outline"
                className="text-yellow-600 border-yellow-600"
              >
                <Crown className="h-3 w-3 mr-1" />
                VIP
              </Badge>
            )}
          </div>

          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información Básica
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Tipo de Identificación
                </label>
                <p className="text-sm">
                  {IDENTIFICATION_TYPES[
                    customer.identification_type as keyof typeof IDENTIFICATION_TYPES
                  ] || customer.identification_type}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Número de Identificación
                </label>
                <p className="text-sm font-mono">
                  {customer.identification_number}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Razón Social / Nombre
                </label>
                <p className="text-sm font-medium">{customer.business_name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Responsabilidad Tributaria
                </label>
                <p className="text-sm">
                  {TAX_RESPONSIBILITY_LABELS[
                    customer.tax_responsibility as keyof typeof TAX_RESPONSIBILITY_LABELS
                  ] || customer.tax_responsibility}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ubicación */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Ubicación
            </h3>

            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Departamento
                </label>
                <p className="text-sm">{customer.department}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Municipio
                </label>
                <p className="text-sm">{customer.municipality}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Dirección
                </label>
                <p className="text-sm">{customer.address}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Información de Contacto */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Información de Contacto
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Correo Electrónico
                    </label>
                    <p className="text-sm">{customer.email}</p>
                  </div>
                </div>
              )}

              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Teléfono Fijo
                    </label>
                    <p className="text-sm">{customer.phone}</p>
                  </div>
                </div>
              )}

              {customer.mobile_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Teléfono Móvil
                    </label>
                    <p className="text-sm">{customer.mobile_phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Información Comercial */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Información Comercial
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Límite de Crédito
                </label>
                <p className="text-sm font-medium">
                  {formatCurrency(customer.credit_limit)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Términos de Pago
                </label>
                <p className="text-sm">
                  {customer.payment_terms > 0
                    ? `${customer.payment_terms} días`
                    : 'No definido'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Descuento
                </label>
                <p className="text-sm">
                  {customer.discount_percentage > 0
                    ? `${customer.discount_percentage}%`
                    : 'Sin descuento'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Información del Sistema */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Información del Sistema
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Fecha de Creación
                </label>
                <p className="text-sm">{formatDate(customer.created_at)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Última Actualización
                </label>
                <p className="text-sm">{formatDate(customer.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
