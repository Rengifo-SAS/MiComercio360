'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ProductsService } from '@/lib/services/products-service';
import { CustomersService } from '@/lib/services/customers-service';
import { SalesService } from '@/lib/services/sales-service';
import { AccountsService } from '@/lib/services/accounts-service';
import { PaymentMethodsService } from '@/lib/services/payment-methods-service';
import { NumerationsService } from '@/lib/services/numerations-service';
import { POSConfigurationService } from '@/lib/services/pos-configuration-service';
import { Customer } from '@/lib/types/customers';
import {
  Product,
  Sale,
  CreateSaleData,
  CreateSaleItemData,
} from '@/lib/types/sales';
import { formatCurrency, calculateSaleTotals } from '@/lib/types/sales';
import { POSProductsGrid } from './pos-products-grid';
import { POSCartPanel } from './pos-cart-panel';
import { POSConfigurationDialog } from './pos-configuration-dialog';
import { POSPaymentDialog } from './pos-payment-dialog';
import { POSSaleCompleteDialog } from './pos-sale-complete-dialog';
import { POSShiftIndicator } from './pos-shift-indicator';
import { POSTerminalSummary } from './pos-terminal-summary';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useSidebar } from '@/contexts/sidebar-context';
import { PaymentMethod } from '@/lib/types/payment-methods';
import { Numeration } from '@/lib/types/numerations';

// Funciones auxiliares para manejo de unidades de medida
const getQuantityStep = (unit: string): number => {
  switch (unit) {
    case 'kg':
    case 'l':
      return 0.1; // Incrementos de 100g o 100ml
    case 'g':
    case 'ml':
      return 1; // Incrementos de 1g o 1ml
    case 'm':
      return 0.1; // Incrementos de 10cm
    case 'cm':
      return 1; // Incrementos de 1cm
    default:
      return 1; // Para piezas (pcs) y otros
  }
};

const getUnitLabel = (unit: string): string => {
  const unitLabels: { [key: string]: string } = {
    pcs: 'pzs',
    kg: 'kg',
    g: 'g',
    l: 'L',
    ml: 'ml',
    m: 'm',
    cm: 'cm',
  };
  return unitLabels[unit] || unit;
};

const formatQuantity = (quantity: number, unit: string): string => {
  if (unit === 'kg' || unit === 'l' || unit === 'm') {
    return quantity.toFixed(1);
  }
  return quantity.toString();
};

interface CartItem {
  product: Product;
  quantity: number;
}

interface POSConfiguration {
  defaultAccountId: string;
  defaultCustomerId: string;
  defaultNumerationId?: string;
  terminalName: string;
  printPaperSize: 'letter' | 'thermal-80mm';
}

export function POSPageClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [numerations, setNumerations] = useState<Numeration[]>([]);
  const [selectedNumeration, setSelectedNumeration] =
    useState<Numeration | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSaleCompleteDialog, setShowSaleCompleteDialog] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [lastChangeAmount, setLastChangeAmount] = useState<number>(0);
  const [configuration, setConfiguration] = useState<POSConfiguration>({
    defaultAccountId: '',
    defaultCustomerId: '',
    terminalName: 'Terminal Principal',
    printPaperSize: 'thermal-80mm',
  });
  const [companyId, setCompanyId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  const supabase = createClient();
  const { setIsCollapsed } = useSidebar();

  useEffect(() => {
    loadInitialData();
    // Contraer la barra lateral solo en el módulo POS
    setIsCollapsed(true);

    // Restaurar el estado cuando se desmonte el componente
    return () => {
      setIsCollapsed(false);
    };
  }, [setIsCollapsed]);

  // Función para cargar productos
  const loadProducts = async () => {
    if (!companyId) return;
    try {
      const productsData = await ProductsService.getProducts(companyId);
      setProducts(productsData.products);
    } catch (error) {
      console.error('Error cargando productos:', error);
      toast.error('Error cargando productos');
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Obtener usuario y empresa
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      setCompanyId(profile.company_id);
      setUserId(user.id);

      // Cargar datos en paralelo
      const [
        productsData,
        customersData,
        accountsData,
        paymentMethodsData,
        numerationsData,
      ] = await Promise.all([
        ProductsService.getProducts(profile.company_id),
        CustomersService.getCustomers(profile.company_id),
        AccountsService.getAccounts(profile.company_id),
        PaymentMethodsService.getPaymentMethods(profile.company_id),
        NumerationsService.getActiveNumerationsByType(
          profile.company_id,
          'invoice'
        ),
      ]);

      setProducts(productsData.products);
      setCustomers(customersData.customers);
      setAccounts(accountsData);
      setPaymentMethods(
        paymentMethodsData.filter((method: PaymentMethod) => method.is_active)
      );
      setNumerations(numerationsData);

      // Cargar configuración guardada del POS
      try {
        const savedConfig = await POSConfigurationService.getConfiguration(
          profile.company_id
        );

        if (savedConfig) {
          // Usar configuración guardada
          setConfiguration({
            defaultAccountId: savedConfig.default_account_id || '',
            defaultCustomerId: savedConfig.default_customer_id || '',
            defaultNumerationId: savedConfig.default_numeration_id || '',
            terminalName: savedConfig.terminal_name || 'Terminal Principal',
            printPaperSize: savedConfig.print_paper_size || 'thermal-80mm',
          });

          // Configurar cliente seleccionado
          if (savedConfig.default_customer_id) {
            const savedCustomer = customersData.customers.find(
              (c: Customer) => c.id === savedConfig.default_customer_id
            );
            if (savedCustomer) {
              setSelectedCustomer(savedCustomer);
            }
          }

          // Configurar numeración seleccionada
          if (savedConfig.default_numeration_id) {
            const savedNumeration = numerationsData.find(
              (n) => n.id === savedConfig.default_numeration_id
            );
            if (savedNumeration) {
              setSelectedNumeration(savedNumeration);
            }
          }
        } else {
          // Configuración por defecto si no hay configuración guardada
          await loadDefaultConfiguration(
            customersData.customers,
            accountsData,
            numerationsData
          );
        }
      } catch (error) {
        console.error('Error cargando configuración POS:', error);
        // Cargar configuración por defecto en caso de error
        await loadDefaultConfiguration(
          customersData.customers,
          accountsData,
          numerationsData
        );
      }
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      toast.error('Error cargando datos del POS');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultConfiguration = async (
    customers: Customer[],
    accounts: any[],
    numerations: any[]
  ) => {
    // Configurar numeración por defecto (primera numeración activa)
    if (numerations.length > 0) {
      setSelectedNumeration(numerations[0]);
      setConfiguration((prev) => ({
        ...prev,
        defaultNumerationId: numerations[0].id,
      }));
    }

    // Configurar cliente por defecto (Consumidor Final)
    const defaultCustomer = customers.find(
      (c: Customer) =>
        c.identification_number === '22222222-2' &&
        c.business_name === 'Consumidor Final'
    );

    if (defaultCustomer) {
      setSelectedCustomer(defaultCustomer);
      setConfiguration((prev) => ({
        ...prev,
        defaultCustomerId: defaultCustomer.id,
      }));
    }

    // Configurar cuenta por defecto (Efectivo POS)
    const defaultAccount = accounts.find(
      (a) => a.account_name === 'Efectivo POS'
    );
    if (defaultAccount) {
      setConfiguration((prev) => ({
        ...prev,
        defaultAccountId: defaultAccount.id,
      }));
    }
  };

  const addToCart = (product: Product) => {
    // Validar que el producto tenga inventario disponible
    const availableQuantity = product.available_quantity || 0;
    if (availableQuantity <= 0) {
      toast.error('Producto sin inventario disponible');
      return;
    }

    setCart((prev) => {
      const existingItem = prev.find((item) => item.product.id === product.id);
      if (existingItem) {
        // Validar que no se exceda la cantidad disponible al incrementar
        const step = getQuantityStep(product.unit);
        const newQuantity = existingItem.quantity + step;
        if (newQuantity > availableQuantity) {
          const unitLabel = getUnitLabel(product.unit);
          toast.error(
            `No hay suficiente inventario. Disponible: ${formatQuantity(
              availableQuantity,
              product.unit
            )} ${unitLabel}`
          );
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        return [...prev, { product, quantity: getQuantityStep(product.unit) }];
      }
    });
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      // Buscar el producto para obtener la cantidad disponible
      const product = products.find((p) => p.id === productId);
      if (product) {
        const availableQuantity = product.available_quantity || 0;

        // Validar que no se exceda la cantidad disponible
        if (quantity > availableQuantity) {
          const unitLabel = getUnitLabel(product.unit);
          toast.error(
            `No hay suficiente inventario. Disponible: ${formatQuantity(
              availableQuantity,
              product.unit
            )} ${unitLabel}`
          );
          return;
        }

        setCart((prev) =>
          prev.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          )
        );
      }
    }
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const processSale = async () => {
    if (!selectedCustomer) {
      toast.error('Debe seleccionar un cliente');
      return;
    }

    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    // Validar inventario disponible
    const inventoryErrors = [];
    for (const item of cart) {
      const product = products.find((p) => p.id === item.product.id);
      if (product && item.quantity > (product.available_quantity || 0)) {
        inventoryErrors.push(
          `${product.name}: Stock disponible ${
            product.available_quantity || 0
          }, solicitado ${item.quantity}`
        );
      }
    }

    if (inventoryErrors.length > 0) {
      toast.error('Stock insuficiente: ' + inventoryErrors.join(', '));
      return;
    }

    // Mostrar diálogo de pago
    setShowPaymentDialog(true);
  };

  const handlePaymentProcess = async (paymentData: any) => {
    try {
      setLoading(true);

      // Crear items de venta con impuestos específicos del producto
      const saleItems: CreateSaleItemData[] = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: parseFloat(item.product.selling_price.toString()),
        discount_percentage: 0,
        discount_amount: 0,
        total_price:
          parseFloat(item.product.selling_price.toString()) * item.quantity,
        iva_rate: parseFloat(item.product.iva_rate?.toString() || '0'),
        ica_rate: parseFloat(item.product.ica_rate?.toString() || '0'),
        retencion_rate: parseFloat(
          item.product.retencion_rate?.toString() || '0'
        ),
      }));

      // Validar datos de pago
      if (!paymentData.method) {
        throw new Error('Método de pago no seleccionado');
      }

      if (!paymentData.method.payment_type) {
        throw new Error('Tipo de pago no definido en el método seleccionado');
      }

      // Calcular total de la venta
      const totals = calculateSaleTotals(
        saleItems,
        0,
        cart.map((item) => item.product)
      );

      // Crear datos de venta
      const saleData: CreateSaleData = {
        customer_id: selectedCustomer!.id,
        total_amount: totals.total_amount,
        payment_method: paymentData.method.payment_type,
        notes: `Venta POS - ${configuration.terminalName}`,
        account_id: configuration.defaultAccountId,
        numeration_id: selectedNumeration?.id,
        items: saleItems,
        // Incluir información de pago
        payment_reference: paymentData.reference,
        payment_amount_received: paymentData.amount,
        payment_change: paymentData.change,
      };

      // Crear la venta
      const createdSale = await SalesService.createSale(companyId, saleData);

      setLastSale(createdSale);
      setLastChangeAmount(paymentData.change || 0);
      setShowPaymentDialog(false);
      setShowSaleCompleteDialog(true);

      toast.success('Venta procesada exitosamente');
      clearCart();
    } catch (error) {
      console.error('Error procesando venta:', error);
      toast.error('Error procesando la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleNewSale = () => {
    setLastSale(null);
    setLastChangeAmount(0);
    setShowSaleCompleteDialog(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p>Cargando POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900"
      role="main"
      aria-label="Sistema de punto de venta"
    >
      {/* Header Ultra Compacto */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-1">
            <h1 className="text-xs font-bold text-gray-900 dark:text-white">
              POS
            </h1>
            <div className="hidden xl:flex items-center gap-1">
              <span className="text-xs text-gray-500">Terminal:</span>
              <span
                className="text-xs font-medium text-teal-600"
                aria-label={`Terminal ${configuration.terminalName}`}
              >
                {configuration.terminalName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {companyId && userId && (
              <POSShiftIndicator companyId={companyId} userId={userId} />
            )}
            {companyId && userId && (
              <POSTerminalSummary companyId={companyId} userId={userId} />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfiguration(true)}
              className="text-xs h-6 px-1 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              aria-label="Abrir configuración del POS"
            >
              <Settings className="h-3 w-3" aria-hidden="true" />
              <span className="hidden xl:inline ml-1">Config</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Layout Principal - Responsivo sin scroll global */}
      <div
        className="flex-1 flex flex-col xl:flex-row min-h-0"
        role="region"
        aria-label="Área principal del POS"
      >
        {/* En móvil/tablet: Una columna */}
        <div className="xl:hidden flex-1 flex flex-col min-h-0">
          {/* Grid de Productos en móvil/tablet - Con scroll propio */}
          <section
            className="flex-1 min-h-0"
            aria-label="Catálogo de productos"
          >
            <POSProductsGrid
              products={products}
              onAddToCart={addToCart}
              cart={cart}
              loading={loading}
              companyId={companyId}
              onProductsReload={loadProducts}
            />
          </section>

          {/* Carrito en móvil/tablet - Altura fija optimizada */}
          <aside
            className="h-96 sm:h-[28rem] border-t dark:border-gray-700 flex-shrink-0"
            aria-label="Carrito de compras"
          >
            <POSCartPanel
              cart={cart}
              customers={customers}
              selectedCustomer={selectedCustomer}
              onCustomerChange={setSelectedCustomer}
              onUpdateQuantity={updateCartItemQuantity}
              onRemoveItem={removeFromCart}
              onClearCart={clearCart}
              onProcessSale={processSale}
              loading={loading}
              numerations={numerations}
              selectedNumeration={selectedNumeration}
              onNumerationChange={setSelectedNumeration}
            />
          </aside>
        </div>

        {/* En desktop: Dos columnas - Sin scroll global */}
        <div className="hidden xl:flex flex-1 min-h-0">
          {/* Panel Izquierdo - Grid de Productos (70%) */}
          <section
            className="w-[70%] min-h-0"
            aria-label="Catálogo de productos"
          >
            <POSProductsGrid
              products={products}
              onAddToCart={addToCart}
              cart={cart}
              loading={loading}
              companyId={companyId}
              onProductsReload={loadProducts}
            />
          </section>

          {/* Panel Derecho - Carrito (30%) */}
          <aside
            className="w-[30%] min-h-0 border-l dark:border-gray-700"
            aria-label="Carrito de compras"
          >
            <POSCartPanel
              cart={cart}
              customers={customers}
              selectedCustomer={selectedCustomer}
              onCustomerChange={setSelectedCustomer}
              onUpdateQuantity={updateCartItemQuantity}
              onRemoveItem={removeFromCart}
              onClearCart={clearCart}
              onProcessSale={processSale}
              loading={loading}
              numerations={numerations}
              selectedNumeration={selectedNumeration}
              onNumerationChange={setSelectedNumeration}
            />
          </aside>
        </div>
      </div>

      {/* Diálogo de Configuración */}
      <POSConfigurationDialog
        open={showConfiguration}
        onOpenChange={setShowConfiguration}
        configuration={configuration}
        onConfigurationChange={setConfiguration}
        accounts={accounts}
        customers={customers}
        numerations={numerations}
        companyId={companyId}
      />

      {/* Diálogo de Pago */}
      <POSPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        totalAmount={(() => {
          const saleItems = cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: parseFloat(item.product.selling_price.toString()),
            discount_percentage: 0,
            discount_amount: 0,
            total_price:
              parseFloat(item.product.selling_price.toString()) * item.quantity,
            iva_rate: parseFloat(item.product.iva_rate?.toString() || '0'),
            ica_rate: parseFloat(item.product.ica_rate?.toString() || '0'),
            retencion_rate: parseFloat(
              item.product.retencion_rate?.toString() || '0'
            ),
          }));
          return calculateSaleTotals(
            saleItems,
            0,
            cart.map((item) => item.product)
          ).total_amount;
        })()}
        paymentMethods={paymentMethods}
        onProcessPayment={handlePaymentProcess}
        loading={loading}
      />

      {/* Diálogo de Finalización de Venta */}
      <POSSaleCompleteDialog
        open={showSaleCompleteDialog}
        onOpenChange={setShowSaleCompleteDialog}
        sale={lastSale}
        companyId={companyId}
        onNewSale={handleNewSale}
        totalAmount={lastSale?.total_amount || 0}
        changeAmount={lastChangeAmount}
        printPaperSize={configuration.printPaperSize}
      />
    </div>
  );
}
