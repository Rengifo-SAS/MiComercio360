'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  FileText,
  Calendar,
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  tax_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SupplierViewDialogProps {
  supplier: Supplier;
  trigger?: React.ReactNode;
}

export function SupplierViewDialog({
  supplier,
  trigger,
}: SupplierViewDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" title="Ver detalles">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {supplier.name}
          </DialogTitle>
          <DialogDescription>Detalles del proveedor</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado:</span>
              <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                {supplier.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            {supplier.contact_person && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Contacto:</span>
                  <p className="text-sm text-muted-foreground">
                    {supplier.contact_person}
                  </p>
                </div>
              </div>
            )}

            {supplier.tax_id && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">NIT/RUT:</span>
                  <p className="text-sm text-muted-foreground">
                    {supplier.tax_id}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Información de contacto */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">
              Información de Contacto
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supplier.email && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-xs text-muted-foreground">
                      {supplier.email}
                    </p>
                  </div>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Teléfono</p>
                    <p className="text-xs text-muted-foreground">
                      {supplier.phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dirección */}
          {(supplier.address || supplier.city || supplier.state) && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Dirección</h4>
              <div className="space-y-2">
                {supplier.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Dirección:</p>
                      <p className="text-sm text-muted-foreground">
                        {supplier.address}
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 ml-6">
                  {supplier.city && (
                    <div>
                      <p className="text-sm font-medium">Ciudad:</p>
                      <p className="text-sm text-muted-foreground">
                        {supplier.city}
                      </p>
                    </div>
                  )}
                  {supplier.state && (
                    <div>
                      <p className="text-sm font-medium">Departamento:</p>
                      <p className="text-sm text-muted-foreground">
                        {supplier.state}
                      </p>
                    </div>
                  )}
                  {supplier.postal_code && (
                    <div>
                      <p className="text-sm font-medium">Código Postal:</p>
                      <p className="text-sm text-muted-foreground">
                        {supplier.postal_code}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">País:</p>
                    <p className="text-sm text-muted-foreground">
                      {supplier.country}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Información Adicional</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono text-xs">{supplier.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creado:</span>
                <span>
                  {new Date(supplier.created_at).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actualizado:</span>
                <span>
                  {new Date(supplier.updated_at).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
