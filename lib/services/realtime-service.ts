/**
 * Servicio de suscripción a cambios en tiempo real de Supabase
 * Actualiza el estado local cuando hay cambios en el servidor
 */

import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

type EntityType = 'sales' | 'products' | 'inventory' | 'customers' | 'shifts';

interface RealtimeConfig {
  companyId: string;
  onSaleCreated?: (sale: any) => void;
  onSaleUpdated?: (sale: any) => void;
  onProductUpdated?: (product: any) => void;
  onInventoryUpdated?: (inventory: any) => void;
  onCustomerCreated?: (customer: any) => void;
  onShiftUpdated?: (shift: any) => void;
}

class RealtimeService {
  private supabase = createClient();
  private channels: Map<string, RealtimeChannel> = new Map();
  private isOnline: boolean = true;

  /**
   * Suscribe a cambios en tiempo real para una entidad
   */
  subscribe(entity: EntityType, companyId: string, callback: (payload: any) => void): RealtimeChannel {
    const channelName = `${entity}_${companyId}`;

    // Si ya existe un canal, removerlo primero
    if (this.channels.has(channelName)) {
      this.unsubscribe(entity, companyId);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: entity,
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {

        } else if (status === 'CLOSED') {

        } else if (status === 'CHANNEL_ERROR') {
          console.error(`✗ Error subscribing to ${entity}`);
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Cancela suscripción a una entidad
   */
  unsubscribe(entity: EntityType, companyId: string): void {
    const channelName = `${entity}_${companyId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * Inicializa todas las suscripciones necesarias para el POS
   */
  initializePOSSubscriptions(config: RealtimeConfig): void {
    const { companyId, onSaleCreated, onSaleUpdated, onProductUpdated, onInventoryUpdated, onShiftUpdated } = config;

    // Suscribirse a ventas
    if (onSaleCreated || onSaleUpdated) {
      this.subscribe('sales', companyId, (payload) => {
        if (payload.eventType === 'INSERT' && onSaleCreated) {
          onSaleCreated(payload.new);
          toast.info('Nueva venta registrada', {
            description: `Venta ${payload.new.sale_number} creada`,
            duration: 4000,
          });
        } else if (payload.eventType === 'UPDATE' && onSaleUpdated) {
          onSaleUpdated(payload.new);
        }
      });
    }

    // Suscribirse a productos
    if (onProductUpdated) {
      this.subscribe('products', companyId, (payload) => {
        if (payload.eventType === 'UPDATE') {
          onProductUpdated(payload.new);
          toast.info('Producto actualizado', {
            description: `${payload.new.name} ha sido actualizado`,
            duration: 3000,
          });
        }
      });
    }

    // Suscribirse a inventario
    if (onInventoryUpdated) {
      this.subscribe('inventory', companyId, (payload) => {
        if (payload.eventType === 'UPDATE') {
          onInventoryUpdated(payload.new);
        }
      });
    }

    // Suscribirse a turnos
    if (onShiftUpdated) {
      this.subscribe('shifts', companyId, (payload) => {
        if (payload.eventType === 'UPDATE') {
          onShiftUpdated(payload.new);
          if (payload.new.status === 'closed') {
            toast.warning('Turno cerrado', {
              description: 'El turno actual ha sido cerrado',
              duration: 5000,
            });
          }
        }
      });
    }
  }

  /**
   * Cancela todas las suscripciones
   */
  unsubscribeAll(): void {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });
    this.channels.clear();

  }

  /**
   * Pausa todas las suscripciones (útil para modo offline)
   */
  pauseSubscriptions(): void {
    this.isOnline = false;
  }

  /**
   * Reanuda todas las suscripciones
   */
  resumeSubscriptions(): void {
    this.isOnline = true;
  }

  /**
   * Verifica el estado de conexión
   */
  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    // Supabase Realtime no expone directamente el estado
    // Usamos nuestra bandera isOnline
    return this.isOnline ? 'connected' : 'disconnected';
  }
}

// Exportar instancia singleton
export const realtimeService = new RealtimeService();
