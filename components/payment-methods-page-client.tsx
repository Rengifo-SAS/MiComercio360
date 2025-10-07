'use client';

import { useState, useEffect, useRef } from 'react';
import { PaymentMethodsService } from '@/lib/services/payment-methods-service';
import {
  PaymentMethod,
  PaymentGateway,
  PaymentType,
  PaymentTypeValues,
  getPaymentTypeInfo,
} from '@/lib/types/payment-methods';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Copy,
  Settings,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  FileText,
  Smartphone,
  Coins,
  Globe,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  Zap,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { PaymentMethodFormDialog } from './payment-method-form-dialog';
import { PaymentMethodViewDialog } from './payment-method-view-dialog';
import { PaymentMethodDeleteDialog } from './payment-method-delete-dialog';
import { PaymentGatewayFormDialog } from './payment-gateway-form-dialog';
import { PaymentGatewayViewDialog } from './payment-gateway-view-dialog';
import { PaymentGatewayDeleteDialog } from './payment-gateway-delete-dialog';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentMethodsPageClientProps {
  companyId: string;
  initialPaymentMethods?: PaymentMethod[];
  initialPaymentGateways?: PaymentGateway[];
}

export function PaymentMethodsPageClient({
  companyId,
  initialPaymentMethods = [],
  initialPaymentGateways = [],
}: PaymentMethodsPageClientProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(
    initialPaymentMethods
  );
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>(
    initialPaymentGateways
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<PaymentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [activeTab, setActiveTab] = useState<'methods' | 'gateways'>('methods');
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isGatewayFormDialogOpen, setIsGatewayFormDialogOpen] = useState(false);
  const [isGatewayViewDialogOpen, setIsGatewayViewDialogOpen] = useState(false);
  const [isGatewayDeleteDialogOpen, setIsGatewayDeleteDialogOpen] =
    useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [selectedPaymentGateway, setSelectedPaymentGateway] =
    useState<PaymentGateway | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const loadPaymentMethods = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedMethods = await PaymentMethodsService.getPaymentMethods(
        companyId
      );
      setPaymentMethods(fetchedMethods);
    } catch (err) {
      console.error('Error al cargar métodos de pago:', err);
      setError((err as Error).message || 'Error al cargar métodos de pago');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentGateways = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedGateways = await PaymentMethodsService.getPaymentGateways(
        companyId
      );
      setPaymentGateways(fetchedGateways);
    } catch (err) {
      console.error('Error al cargar pasarelas de pago:', err);
      setError((err as Error).message || 'Error al cargar pasarelas de pago');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsHydrated(true);
    // Solo cargar si no tenemos datos iniciales
    if (initialPaymentMethods.length === 0) {
      loadPaymentMethods();
    }
    if (initialPaymentGateways.length === 0) {
      loadPaymentGateways();
    }
  }, []);

  // Efecto para limpiar atributos de extensiones del navegador
  useEffect(() => {
    if (!isHydrated || !searchContainerRef.current) return;

    const cleanupExtensions = () => {
      if (searchContainerRef.current) {
        const elements = searchContainerRef.current.querySelectorAll(
          '[data-protonpass-form]'
        );
        elements.forEach((el) => {
          el.removeAttribute('data-protonpass-form');
        });
      }
    };

    cleanupExtensions();
    const interval = setInterval(cleanupExtensions, 1000);
    return () => clearInterval(interval);
  }, [isHydrated]);

  const filteredPaymentMethods = paymentMethods.filter((method) => {
    const matchesSearch =
      method.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (method.description &&
        method.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      filterType === 'all' || method.payment_type === filterType;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && method.is_active) ||
      (filterStatus === 'inactive' && !method.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleNewPaymentMethod = () => {
    setSelectedPaymentMethod(null);
    setIsFormDialogOpen(true);
  };

  const handleEditPaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setIsFormDialogOpen(true);
  };

  const handleViewPaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setIsViewDialogOpen(true);
  };

  const handleDeletePaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setIsDeleteDialogOpen(true);
  };

  const handleDuplicatePaymentMethod = async (method: PaymentMethod) => {
    try {
      const newName = `${method.name} (Copia)`;
      await PaymentMethodsService.duplicatePaymentMethod(method.id, newName);
      loadPaymentMethods();
    } catch (error) {
      console.error('Error duplicando método de pago:', error);
      setError('Error al duplicar el método de pago');
    }
  };

  const handleTogglePaymentMethodStatus = async (method: PaymentMethod) => {
    try {
      await PaymentMethodsService.togglePaymentMethodStatus(method.id);
      loadPaymentMethods();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      setError('Error al cambiar el estado del método de pago');
    }
  };

  const handleSetAsDefault = async (method: PaymentMethod) => {
    try {
      await PaymentMethodsService.setAsDefault(method.id);
      loadPaymentMethods();
    } catch (error) {
      console.error('Error estableciendo como predeterminado:', error);
      setError('Error al establecer como método predeterminado');
    }
  };

  // Handlers para pasarelas de pago
  const handleNewPaymentGateway = () => {
    setSelectedPaymentGateway(null);
    setIsGatewayFormDialogOpen(true);
  };

  const handleEditPaymentGateway = (gateway: PaymentGateway) => {
    setSelectedPaymentGateway(gateway);
    setIsGatewayFormDialogOpen(true);
  };

  const handleViewPaymentGateway = (gateway: PaymentGateway) => {
    setSelectedPaymentGateway(gateway);
    setIsGatewayViewDialogOpen(true);
  };

  const handleDeletePaymentGateway = (gateway: PaymentGateway) => {
    setSelectedPaymentGateway(gateway);
    setIsGatewayDeleteDialogOpen(true);
  };

  const handleTogglePaymentGatewayStatus = async (gateway: PaymentGateway) => {
    try {
      await PaymentMethodsService.togglePaymentGatewayStatus(gateway.id);
      loadPaymentGateways();
    } catch (error) {
      console.error('Error cambiando estado de la pasarela:', error);
      setError('Error al cambiar el estado de la pasarela');
    }
  };

  const getPaymentTypeIcon = (type: PaymentType) => {
    const typeInfo = getPaymentTypeInfo(type);
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      Banknote,
      CreditCard,
      ArrowRightLeft,
      FileText,
      Smartphone,
      Coins,
      Globe,
      MoreHorizontal,
    };
    return iconMap[typeInfo.icon] || CreditCard;
  };

  // No renderizar hasta que esté hidratado
  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Métodos de Pago</h2>
          <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="h-6 w-96 bg-muted animate-pulse rounded"></div>
        <div className="h-12 w-full bg-muted animate-pulse rounded"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Métodos de Pago</h2>
        <div className="flex gap-2">
          <Button onClick={handleNewPaymentMethod}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Método
          </Button>
          <Button variant="outline" onClick={handleNewPaymentGateway}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Pasarela
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground">
        Gestiona los métodos de pago y pasarelas de pago para tu empresa.
      </p>

      {/* Tabs */}
      <div className="flex space-x-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('methods')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'methods'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Métodos de Pago ({paymentMethods.length})
        </button>
        <button
          onClick={() => setActiveTab('gateways')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'gateways'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pasarelas ({paymentGateways.length})
        </button>
      </div>

      {/* Filtros */}
      <div
        ref={searchContainerRef}
        className="flex flex-wrap items-center gap-4"
        suppressHydrationWarning
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {activeTab === 'methods' && (
          <>
            <Select
              value={filterType}
              onValueChange={(value: PaymentType | 'all') =>
                setFilterType(value)
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {PaymentTypeValues.map((type) => {
                  const typeInfo = getPaymentTypeInfo(type);
                  const Icon = getPaymentTypeIcon(type);
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {typeInfo.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(value: 'all' | 'active' | 'inactive') =>
                setFilterStatus(value)
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-lg text-muted-foreground">
            Cargando...
          </span>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Contenido de Métodos de Pago */}
      {activeTab === 'methods' && (
        <>
          {!loading && filteredPaymentMethods.length === 0 && (
            <div className="text-center p-8 border rounded-lg">
              <p className="text-lg text-muted-foreground">
                No se encontraron métodos de pago que coincidan con los
                criterios.
              </p>
              <Button onClick={handleNewPaymentMethod} className="mt-4">
                Crear Nuevo Método
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPaymentMethods.map((method) => {
              const typeInfo = getPaymentTypeInfo(method.payment_type);
              const Icon = getPaymentTypeIcon(method.payment_type);

              return (
                <Card key={method.id} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg text-white"
                        style={{ backgroundColor: method.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{method.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {typeInfo.label}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleViewPaymentMethod(method)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEditPaymentMethod(method)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicatePaymentMethod(method)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            handleTogglePaymentMethodStatus(method)
                          }
                        >
                          {method.is_active ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Activar
                            </>
                          )}
                        </DropdownMenuItem>
                        {!method.is_default && (
                          <DropdownMenuItem
                            onClick={() => handleSetAsDefault(method)}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Establecer como Predeterminado
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeletePaymentMethod(method)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {method.description || 'Sin descripción.'}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Comisión:</span>
                        <span className="font-medium">
                          {method.fee_percentage}% + $
                          {method.fee_fixed.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Monto mínimo:
                        </span>
                        <span className="font-medium">
                          ${method.min_amount.toLocaleString()}
                        </span>
                      </div>
                      {method.max_amount && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Monto máximo:
                          </span>
                          <span className="font-medium">
                            ${method.max_amount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={method.is_active ? 'default' : 'secondary'}
                      >
                        {method.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                      {method.is_default && (
                        <Badge variant="outline">Predeterminado</Badge>
                      )}
                      {method.requires_authorization && (
                        <Badge variant="outline">Requiere Autorización</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Contenido de Pasarelas de Pago */}
      {activeTab === 'gateways' && (
        <>
          {!loading && paymentGateways.length === 0 && (
            <div className="text-center p-8 border rounded-lg">
              <p className="text-lg text-muted-foreground">
                No se encontraron pasarelas de pago configuradas.
              </p>
              <Button onClick={handleNewPaymentGateway} className="mt-4">
                Configurar Pasarela
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paymentGateways.map((gateway) => (
              <Card key={gateway.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500 text-white">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{gateway.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {gateway.gateway_type}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => handleViewPaymentGateway(gateway)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEditPaymentGateway(gateway)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          handleTogglePaymentGatewayStatus(gateway)
                        }
                      >
                        {gateway.is_active ? (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Activar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeletePaymentGateway(gateway)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Entorno:</span>
                      <span className="font-medium">
                        {gateway.environment === 'production'
                          ? 'Producción'
                          : 'Pruebas'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Monedas:</span>
                      <span className="font-medium">
                        {gateway.supported_currencies.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={gateway.is_active ? 'default' : 'secondary'}
                    >
                      {gateway.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <Badge variant="outline">
                      {gateway.is_test_mode ? 'Pruebas' : 'Producción'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Diálogos */}
      <PaymentMethodFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        paymentMethod={selectedPaymentMethod}
        companyId={companyId}
        onSaved={() => {
          setIsFormDialogOpen(false);
          loadPaymentMethods();
        }}
      />
      <PaymentMethodViewDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        paymentMethod={selectedPaymentMethod}
        onEdit={handleEditPaymentMethod}
        onDelete={handleDeletePaymentMethod}
        onDuplicate={handleDuplicatePaymentMethod}
        onToggleStatus={handleTogglePaymentMethodStatus}
        onSetAsDefault={handleSetAsDefault}
      />
      <PaymentMethodDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        paymentMethod={selectedPaymentMethod}
        onDelete={() => {
          setIsDeleteDialogOpen(false);
          loadPaymentMethods();
        }}
      />

      <PaymentGatewayFormDialog
        open={isGatewayFormDialogOpen}
        onOpenChange={setIsGatewayFormDialogOpen}
        paymentGateway={selectedPaymentGateway}
        companyId={companyId}
        onSaved={() => {
          setIsGatewayFormDialogOpen(false);
          loadPaymentGateways();
        }}
      />
      <PaymentGatewayViewDialog
        open={isGatewayViewDialogOpen}
        onOpenChange={setIsGatewayViewDialogOpen}
        paymentGateway={selectedPaymentGateway}
        onEdit={handleEditPaymentGateway}
        onDelete={handleDeletePaymentGateway}
        onToggleStatus={handleTogglePaymentGatewayStatus}
      />
      <PaymentGatewayDeleteDialog
        open={isGatewayDeleteDialogOpen}
        onOpenChange={setIsGatewayDeleteDialogOpen}
        paymentGateway={selectedPaymentGateway}
        onDelete={() => {
          setIsGatewayDeleteDialogOpen(false);
          loadPaymentGateways();
        }}
      />
    </div>
  );
}
