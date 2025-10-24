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
  Building2,
  MapPin,
  Phone,
  Mail,
  Package,
  Calendar,
  User,
} from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_main: boolean;
  created_at: string;
  updated_at: string;
  totalValue?: number;
  totalQuantity?: number;
  productCount?: number;
}

interface WarehouseViewDialogProps {
  warehouse: Warehouse;
  trigger?: React.ReactNode;
}

export function WarehouseViewDialog({
  warehouse,
  trigger,
}: WarehouseViewDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" title="Ver detalles">
            <Building2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {warehouse.name}
          </DialogTitle>
          <DialogDescription>Detalles de la bodega</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado:</span>
              <Badge variant={warehouse.is_active ? 'default' : 'secondary'}>
                {warehouse.is_active ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Código:</span>
                <p className="text-sm text-muted-foreground font-mono">
                  {warehouse.code}
                </p>
              </div>
              {warehouse.is_main && (
                <div>
                  <span className="text-sm font-medium">Tipo:</span>
                  <Badge variant="default" className="ml-2">
                    Principal
                  </Badge>
                </div>
              )}
            </div>

            {warehouse.description && (
              <div>
                <span className="text-sm font-medium">Descripción:</span>
                <p className="text-sm text-muted-foreground mt-1 break-words">
                  {warehouse.description}
                </p>
              </div>
            )}
          </div>

          {/* Ubicación */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Ubicación</h4>
            <div className="space-y-2">
              {warehouse.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="break-words">{warehouse.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>
                  {[warehouse.city, warehouse.state, warehouse.country]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">
              Información de Contacto
            </h4>
            <div className="space-y-2">
              {warehouse.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{warehouse.phone}</span>
                </div>
              )}
              {warehouse.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="break-all">{warehouse.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Estadísticas de inventario */}
          {(warehouse.totalValue !== undefined ||
            warehouse.totalQuantity !== undefined ||
            warehouse.productCount !== undefined) && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">
                Estadísticas de Inventario
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Package className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-sm font-medium">Productos</p>
                  <p className="text-lg font-bold">
                    {warehouse.productCount || 0}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Package className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-sm font-medium">Unidades</p>
                  <p className="text-lg font-bold">
                    {warehouse.totalQuantity || 0}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Package className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-sm font-medium">Valor Total</p>
                  <p className="text-lg font-bold">
                    ${(warehouse.totalValue || 0).toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Información Adicional</h4>
            <div className="space-y-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono text-xs break-all">
                  {warehouse.id}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-muted-foreground">Creado:</span>
                <span className="break-words">
                  {new Date(warehouse.created_at).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-muted-foreground">Actualizado:</span>
                <span className="break-words">
                  {new Date(warehouse.updated_at).toLocaleString('es-CO')}
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
