'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  List,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  Building2,
  CreditCard,
  Hash,
  Warehouse,
  Target,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ShiftsService } from '@/lib/services/shifts-service';
import { AccountsService } from '@/lib/services/accounts-service';
import { POSConfigurationService } from '@/lib/services/pos-configuration-service';
import { NumerationsService } from '@/lib/services/numerations-service';
import { Shift } from '@/lib/types/shifts';
import { Account } from '@/lib/types/accounts';
import { Numeration } from '@/lib/types/numerations';

interface POSTerminalSummaryProps {
  companyId: string;
  userId: string;
}

interface TerminalInfo {
  terminalName: string;
  shiftStatus: 'open' | 'closed' | null;
  activeShift: Shift | null;
  accounts: {
    debit: Account | null;
    credit: Account | null;
    transfer: Account | null;
  };
  numeration: Numeration | null;
  warehouse: string;
  costCenter: string | null;
  isOnline: boolean;
}

export function POSTerminalSummary({
  companyId,
  userId,
}: POSTerminalSummaryProps) {
  const [terminalInfo, setTerminalInfo] = useState<TerminalInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (companyId && userId) {
      loadTerminalInfo();
    }
  }, [companyId, userId]);

  const loadTerminalInfo = async () => {
    try {
      setLoading(true);

      // Cargar configuración del POS (con manejo de errores)
      let posConfig = null;
      try {
        posConfig = await POSConfigurationService.getConfiguration(companyId);
      } catch (error) {
        console.warn('No se pudo cargar configuración POS:', error);
      }

      // Cargar turno activo (con manejo de errores)
      let activeShift = null;
      try {
        activeShift = await ShiftsService.getActiveShift(companyId);
      } catch (error) {
        console.warn('No se pudo cargar turno activo:', error);
      }

      // Cargar cuentas bancarias (con manejo de errores)
      let accounts: any[] = [];
      try {
        accounts = await AccountsService.getAccounts(companyId);
      } catch (error) {
        console.warn('No se pudo cargar cuentas:', error);
      }

      // Cargar numeración principal (con manejo de errores)
      let numerations: any[] = [];
      let mainNumeration = null;
      try {
        numerations = await NumerationsService.getNumerations(companyId);
        // Buscar numeración de facturas (invoice) o tomar la primera activa
        mainNumeration =
          numerations.find(
            (n) => n.document_type === 'invoice' && n.is_active
          ) ||
          numerations.find((n) => n.is_active) ||
          numerations[0];
      } catch (error) {
        console.warn('No se pudo cargar numeraciones:', error);
      }

      // Filtrar cuentas por tipo
      const debitAccount = accounts.find(
        (acc) =>
          acc.account_type === 'BANK_ACCOUNT' &&
          acc.account_name.toLowerCase().includes('débito')
      );

      const creditAccount = accounts.find(
        (acc) =>
          acc.account_type === 'BANK_ACCOUNT' &&
          acc.account_name.toLowerCase().includes('crédito')
      );

      const transferAccount = accounts.find(
        (acc) =>
          acc.account_type === 'BANK_ACCOUNT' &&
          acc.account_name.toLowerCase().includes('transferencia')
      );

      // Obtener información de bodega (con manejo de errores)
      let warehouse = null;
      try {
        const { data } = await supabase
          .from('warehouses')
          .select('name')
          .eq('company_id', companyId)
          .eq('is_default', true)
          .single();
        warehouse = data;
      } catch (error) {
        console.warn('No se pudo cargar bodega:', error);
      }

      // Obtener información de centro de costo (con manejo de errores)
      let costCenter = null;
      try {
        const { data } = await supabase
          .from('cost_centers')
          .select('name')
          .eq('company_id', companyId)
          .eq('is_default', true)
          .single();
        costCenter = data;
      } catch (error) {
        console.warn('No se pudo cargar centro de costo:', error);
      }

      setTerminalInfo({
        terminalName: posConfig?.terminal_name || 'Terminal Principal',
        shiftStatus: activeShift ? 'open' : 'closed',
        activeShift,
        accounts: {
          debit: debitAccount || null,
          credit: creditAccount || null,
          transfer: transferAccount || null,
        },
        numeration: mainNumeration || null,
        warehouse: warehouse?.name || 'Principal',
        costCenter: costCenter?.name || null,
        isOnline: navigator.onLine,
      });
    } catch (error) {
      console.error('Error cargando información del terminal:', error);
      // Establecer información básica en caso de error
      setTerminalInfo({
        terminalName: 'Terminal Principal',
        shiftStatus: 'closed',
        activeShift: null,
        accounts: {
          debit: null,
          credit: null,
          transfer: null,
        },
        numeration: null,
        warehouse: 'Principal',
        costCenter: null,
        isOnline: navigator.onLine,
      });
    } finally {
      setLoading(false);
    }
  };

  const getShiftStatusBadge = (status: 'open' | 'closed' | null) => {
    if (status === 'open') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Turno abierto
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <XCircle className="w-3 h-3 mr-1" />
        Turno cerrado
      </Badge>
    );
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'BANK_ACCOUNT':
        return <Building2 className="w-4 h-4" />;
      case 'CASH_BOX':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <List className="w-4 h-4 mr-2" />
        Cargando...
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <List className="w-4 h-4 mr-2" />
          Resumen
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {terminalInfo ? (
            <>
              {/* Header con estado de conexión */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {terminalInfo.isOnline ? (
                    <Wifi className="w-4 h-4 text-green-600" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    {terminalInfo.isOnline ? 'Disponible' : 'Sin conexión'}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Información del terminal */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">
                    {terminalInfo.terminalName}
                  </h3>
                  <div className="mt-2">
                    {getShiftStatusBadge(terminalInfo.shiftStatus)}
                  </div>
                </div>

                {/* Cuentas bancarias */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Cuentas Bancarias
                  </h4>

                  {terminalInfo.accounts.debit && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getAccountIcon(
                          terminalInfo.accounts.debit.account_type
                        )}
                        <span>Banco débito</span>
                      </div>
                      <span className="text-muted-foreground">
                        {terminalInfo.accounts.debit.account_name}
                      </span>
                    </div>
                  )}

                  {terminalInfo.accounts.credit && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getAccountIcon(
                          terminalInfo.accounts.credit.account_type
                        )}
                        <span>Banco crédito</span>
                      </div>
                      <span className="text-muted-foreground">
                        {terminalInfo.accounts.credit.account_name}
                      </span>
                    </div>
                  )}

                  {terminalInfo.accounts.transfer && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getAccountIcon(
                          terminalInfo.accounts.transfer.account_type
                        )}
                        <span>Banco transferencias</span>
                      </div>
                      <span className="text-muted-foreground">
                        {terminalInfo.accounts.transfer.account_name}
                      </span>
                    </div>
                  )}

                  {!terminalInfo.accounts.debit &&
                    !terminalInfo.accounts.credit &&
                    !terminalInfo.accounts.transfer && (
                      <p className="text-sm text-muted-foreground">
                        No hay cuentas configuradas
                      </p>
                    )}
                </div>

                <Separator />

                {/* Configuraciones */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Configuraciones
                  </h4>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      <span>Numeración</span>
                    </div>
                    <span className="text-muted-foreground">
                      {terminalInfo.numeration?.name || 'Principal'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-4 h-4" />
                      <span>Bodega</span>
                    </div>
                    <span className="text-muted-foreground">
                      {terminalInfo.warehouse}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      <span>Centro de costo</span>
                    </div>
                    <span className="text-muted-foreground">
                      {terminalInfo.costCenter || 'No seleccionado'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                No se pudo cargar la información del terminal
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
