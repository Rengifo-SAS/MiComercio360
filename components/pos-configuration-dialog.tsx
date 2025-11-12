'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  CreditCard,
  User,
  Monitor,
  Save,
  Receipt,
} from 'lucide-react';
import { POSConfigurationService } from '@/lib/services/pos-configuration-service';
import { CustomersService } from '@/lib/services/customers-service';
import { AccountsService } from '@/lib/services/accounts-service';
import { NumerationsService } from '@/lib/services/numerations-service';
import { toast } from 'sonner';

interface POSConfiguration {
  defaultAccountId: string;
  defaultCustomerId: string;
  defaultNumerationId?: string;
  terminalName: string;
  printPaperSize: 'letter' | 'thermal-80mm';
}

interface POSConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configuration: POSConfiguration;
  onConfigurationChange: (config: POSConfiguration) => void;
  accounts: any[];
  customers: any[];
  numerations: any[];
  companyId: string;
}

export function POSConfigurationDialog({
  open,
  onOpenChange,
  configuration,
  onConfigurationChange,
  accounts: propAccounts,
  customers: propCustomers,
  numerations: propNumerations,
  companyId,
}: POSConfigurationDialogProps) {
  const [localConfig, setLocalConfig] =
    useState<POSConfiguration>(configuration);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>(propAccounts || []);
  const [customers, setCustomers] = useState<any[]>(propCustomers || []);
  const [numerations, setNumerations] = useState<any[]>(propNumerations || []);

  // Actualizar configuración local cuando cambie la prop
  useEffect(() => {
    setLocalConfig(configuration);
  }, [configuration]);

  // Actualizar datos locales cuando cambien las props
  useEffect(() => {
    setAccounts(propAccounts || []);
    setCustomers(propCustomers || []);
    setNumerations(propNumerations || []);
  }, [propAccounts, propCustomers, propNumerations]);

  // Cargar datos si no están disponibles cuando se abre el diálogo
  useEffect(() => {
    if (open && companyId && (accounts.length === 0 || customers.length === 0 || numerations.length === 0)) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, companyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersData, accountsData, numerationsData] = await Promise.all([
        CustomersService.getCustomers(companyId, {
          isActive: true,
          limit: 1000,
        }),
        AccountsService.getAccounts(companyId),
        NumerationsService.getNumerations(companyId),
      ]);

      setCustomers(customersData.customers);
      setAccounts(accountsData.filter((a: any) => a.is_active));
      setNumerations(numerationsData.filter((n: any) => n.is_active));
    } catch (error) {
      console.error('Error cargando datos en diálogo de configuración:', error);
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Guardar en la base de datos
      await POSConfigurationService.saveConfiguration(companyId, {
        terminal_name: localConfig.terminalName,
        default_account_id: localConfig.defaultAccountId || null,
        default_customer_id: localConfig.defaultCustomerId || null,
        default_numeration_id: localConfig.defaultNumerationId || null,
        print_paper_size: localConfig.printPaperSize || 'thermal-80mm',
      });

      // Actualizar el estado del componente padre
      onConfigurationChange(localConfig);

      toast.success('Configuración guardada exitosamente');
      onOpenChange(false);
    } catch (error) {
      console.error('Error guardando configuración:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setLocalConfig(configuration);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Configuración del Terminal POS
          </DialogTitle>
          <DialogDescription>
            Configura las cuentas contables y datos de la terminal actual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuración de Terminal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Monitor className="h-4 w-4 mr-2" />
                Información de la Terminal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="terminal-name">Nombre de la Terminal</Label>
                <Input
                  id="terminal-name"
                  value={localConfig.terminalName}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      terminalName: e.target.value,
                    }))
                  }
                  placeholder="Ej: Terminal Principal, Caja 1, etc."
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Configuración de Cuentas Contables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <CreditCard className="h-4 w-4 mr-2" />
                Cuentas Contables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="default-account">
                  Cuenta por Defecto para Ventas
                </Label>
                <Select
                  value={localConfig.defaultAccountId}
                  onValueChange={(value) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      defaultAccountId: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta contable" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts && accounts.length > 0 ? (
                      accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {account.account_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {account.account_type} - {account.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        No hay cuentas disponibles
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Las ventas de este terminal se registrarán en esta cuenta
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Configuración de Numeración */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Receipt className="h-4 w-4 mr-2" />
                Numeración por Defecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="default-numeration">
                  Numeración por Defecto
                </Label>
                <Select
                  value={localConfig.defaultNumerationId || ''}
                  onValueChange={(value) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      defaultNumerationId: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar numeración por defecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {numerations && numerations.length > 0 ? (
                      numerations.map((numeration) => (
                        <SelectItem key={numeration.id} value={numeration.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{numeration.name}</span>
                            <span className="text-xs text-gray-500">
                              {numeration.prefix} - {numeration.current_number}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        No hay numeraciones disponibles
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Esta numeración se seleccionará automáticamente en las nuevas
                  ventas
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Configuración de Impresión */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Receipt className="h-4 w-4 mr-2" />
                Configuración de Impresión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="print-paper-size">
                  Tamaño de Papel para Impresión
                </Label>
                <Select
                  value={localConfig.printPaperSize || 'thermal-80mm'}
                  onValueChange={(value: 'letter' | 'thermal-80mm') =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      printPaperSize: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tamaño de papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thermal-80mm">
                      <div className="flex flex-col">
                        <span className="font-medium">Térmico 80mm</span>
                        <span className="text-xs text-gray-500">
                          Ideal para impresoras térmicas de POS
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="letter">
                      <div className="flex flex-col">
                        <span className="font-medium">Carta (8.5" x 11")</span>
                        <span className="text-xs text-gray-500">
                          Para impresoras láser o de inyección de tinta
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Este tamaño se utilizará para imprimir las facturas de venta
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Configuración de Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <User className="h-4 w-4 mr-2" />
                Cliente por Defecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="default-customer">Cliente por Defecto</Label>
                <Select
                  value={localConfig.defaultCustomerId}
                  onValueChange={(value) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      defaultCustomerId: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente por defecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers && customers.length > 0 ? (
                      customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {customer.business_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {customer.identification_type}{' '}
                              {customer.identification_number}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        No hay clientes disponibles
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Este cliente se seleccionará automáticamente en las nuevas
                  ventas
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Información Adicional */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="text-sm text-blue-700">
                <h4 className="font-medium mb-2">Información Importante:</h4>
                <ul className="space-y-1 text-xs">
                  <li>
                    • Las ventas se registrarán automáticamente en la cuenta
                    contable seleccionada
                  </li>
                  <li>
                    • El cliente por defecto se aplicará a todas las nuevas
                    ventas
                  </li>
                  <li>
                    • Los impuestos se calcularán según la configuración de cada
                    producto
                  </li>
                  <li>
                    • Los cambios se aplicarán inmediatamente después de guardar
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-teal-600 hover:bg-teal-700"
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
