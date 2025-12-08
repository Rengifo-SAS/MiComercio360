'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';

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

interface CustomerDeleteDialogProps {
  customer: Customer;
  onDelete: () => void;
  onClose: () => void;
}

export function CustomerDeleteDialog({
  customer,
  onDelete,
  onClose,
}: CustomerDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Intentando eliminar cliente:', customer.id);

      // Eliminar el historial del cliente primero
      console.log('Eliminando historial del cliente...');
      const { error: historyError } = await supabase
        .from('customer_history')
        .delete()
        .eq('customer_id', customer.id);

      if (historyError) {
        console.error('Error eliminando historial:', historyError);
        throw new Error(
          historyError.message || 'Error eliminando historial del cliente'
        );
      }

      // Eliminar los contactos del cliente
      console.log('Eliminando contactos del cliente...');
      const { error: contactsError } = await supabase
        .from('customer_contacts')
        .delete()
        .eq('customer_id', customer.id);

      if (contactsError) {
        console.error('Error eliminando contactos:', contactsError);
        throw new Error(
          contactsError.message || 'Error eliminando contactos del cliente'
        );
      }

      // Finalmente eliminar el cliente (ahora sin problemas de trigger)
      console.log('Eliminando cliente...');
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (deleteError) {
        console.error('Error de Supabase:', deleteError);
        throw new Error(deleteError.message || 'Error eliminando cliente');
      }

      console.log('Cliente eliminado exitosamente');
      onDelete();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error eliminando cliente';
      setError(errorMessage);
      console.error('Error eliminando cliente:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md sm:w-[90vw] md:w-[80vw]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle>Eliminar Cliente</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Cliente a eliminar:</h4>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Nombre:</strong> {customer.business_name}
              </p>
              <p>
                <strong>Identificación:</strong> {customer.identification_type}{' '}
                {customer.identification_number}
              </p>
              <p>
                <strong>Tipo:</strong>{' '}
                {customer.person_type === 'NATURAL'
                  ? 'Persona Natural'
                  : 'Persona Jurídica'}
              </p>
              <p>
                <strong>Ubicación:</strong> {customer.municipality},{' '}
                {customer.department}
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Advertencia</p>
                <p className="text-yellow-700 mt-1">
                  Al eliminar este cliente, se eliminarán permanentemente:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-yellow-700">
                  <li>Todos los datos del cliente</li>
                  <li>El historial de cambios</li>
                  <li>Los contactos asociados</li>
                  <li>Las ventas relacionadas (si las hay)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
