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
import { CategoriesService } from '@/lib/services/categories-service';
import { Customer } from '@/lib/types/customers';
import {
  Sale,
  CreateSaleData,
  CreateSaleItemData,
} from '@/lib/types/sales';
import { Product, Category } from '@/lib/types/products';
import { formatCurrency, calculateSaleTotals } from '@/lib/types/sales';
import { PendingSaleCartItem } from '@/lib/types/multiventas';
import { useMultiVentas } from '@/lib/hooks/use-multiventas';
import { POSProductsGrid } from './pos-products-grid';
import { POSCartPanel } from './pos-cart-panel';
import { POSConfigurationDialog } from './pos-configuration-dialog';
import { POSPaymentDialog } from './pos-payment-dialog';
import { POSSaleCompleteDialog } from './pos-sale-complete-dialog';
import { POSShiftIndicator } from './pos-shift-indicator';
import { POSTerminalSummary } from './pos-terminal-summary';
import { POSMultiVentasTabs } from './pos-multiventas-tabs';
import { POSShiftWarningDialog } from './pos-shift-warning-dialog';
import { POSCategoriesPanel } from './pos-categories-panel';
import { Button } from '@/components/ui/button';
import { Settings, ShoppingCart } from 'lucide-react';
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

// Usar PendingSaleCartItem directamente desde multiventas
type CartItem = PendingSaleCartItem;

// Función auxiliar para convertir productos del tipo products.ts al formato esperado por calculateSaleTotals
const convertProductsForTotals = (products: Product[]): any[] => {
  return products.map(product => ({
    ...product,
    iva_rate: product.iva_rate ?? 0,
    ica_rate: product.ica_rate ?? 0,
    retencion_rate: product.retencion_rate ?? 0,
    fiscal_classification: product.fiscal_classification ?? '',
    excise_tax: product.excise_tax ?? false,
  }));
};

interface POSConfiguration {
  defaultAccountId: string;
  defaultCustomerId: string;
  defaultNumerationId?: string;
  terminalName: string;
  printPaperSize: 'letter' | 'thermal-80mm';
}

export function POSPageClient() {
  // Hook de multiventas
  const {
    pendingSales,
    activeSaleId,
    activeSale,
    addNewSale,
    setActiveSale,
    renameSale,
    deleteSale,
    updateSaleCart,
    updateSaleCustomer,
    updateSaleNumeration,
    clearSaleCart,
  } = useMultiVentas();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [numerations, setNumerations] = useState<Numeration[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
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

  // Aplicar configuración por defecto cuando activeSale esté disponible
  useEffect(() => {
    if (activeSale && customers.length > 0 && numerations.length > 0) {
      // Verificar si la venta activa ya tiene cliente y numeración asignados
      if (!activeSale.selectedCustomer || !activeSale.selectedNumeration) {
        // Debug: comentado para producción
        // console.log(
        //   'Aplicando configuración por defecto a venta activa:',
        //   activeSale.id
        // );

        // Aplicar numeración por defecto si no tiene
        if (!activeSale.selectedNumeration && numerations.length > 0) {
          updateSaleNumeration(activeSale.id, numerations[0]);
        }

        // Aplicar cliente por defecto si no tiene
        if (!activeSale.selectedCustomer) {
          const defaultCustomer = customers.find(
            (c: Customer) =>
              c.identification_number === '22222222-2' &&
              c.business_name === 'Consumidor Final'
          );

          if (defaultCustomer) {
            // Debug: comentado para producción
            // console.log('Asignando cliente por defecto:', defaultCustomer);
            updateSaleCustomer(activeSale.id, defaultCustomer);
          }
        }
      }
    }
  }, [activeSale, customers, numerations]);

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
        categoriesData,
      ] = await Promise.all([
        ProductsService.getProducts(profile.company_id),
        CustomersService.getCustomers(profile.company_id),
        AccountsService.getAccounts(profile.company_id),
        PaymentMethodsService.getPaymentMethods(profile.company_id),
        NumerationsService.getActiveNumerationsByType(
          profile.company_id,
          'invoice'
        ),
        CategoriesService.getCategories(profile.company_id),
      ]);

      setProducts(productsData.products);
      setCustomers(customersData.customers);
      setAccounts(accountsData);
      setPaymentMethods(
        paymentMethodsData.filter((method: PaymentMethod) => method.is_active)
      );
      setNumerations(numerationsData);
      setCategories(categoriesData);

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
            if (savedCustomer && activeSale) {
              updateSaleCustomer(activeSale.id, savedCustomer);
            }
          }

          // Configurar numeración seleccionada
          if (savedConfig.default_numeration_id) {
            const savedNumeration = numerationsData.find(
              (n) => n.id === savedConfig.default_numeration_id
            );
            if (savedNumeration && activeSale) {
              updateSaleNumeration(activeSale.id, savedNumeration);
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
    if (numerations.length > 0 && activeSale) {
      updateSaleNumeration(activeSale.id, numerations[0]);
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

    // Debug: comentado para producción
    // console.log(
    //   'Debug loadDefaultConfiguration:',
    //   {
    //     customers: customers.length,
    //     defaultCustomer,
    //     activeSale: activeSale?.id,
    //     activeSaleCustomer: activeSale?.selectedCustomer,
    //   }
    // );

    if (defaultCustomer && activeSale) {
      updateSaleCustomer(activeSale.id, defaultCustomer);
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
    if (!activeSale) return;

    // Validar que el producto tenga inventario disponible
    const availableQuantity = product.available_quantity || 0;
    if (availableQuantity <= 0) {
      toast.error('Producto sin inventario disponible');
      return;
    }

    const currentCart = activeSale.cart;
    const existingItem = currentCart.find(
      (item) => item.product.id === product.id
    );

    let newCart: CartItem[];

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
        return;
      }
      newCart = currentCart.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: newQuantity }
          : item
      );
    } else {
      newCart = [
        ...currentCart,
        { product, quantity: getQuantityStep(product.unit) },
      ];
    }

    updateSaleCart(activeSale.id, newCart);
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (!activeSale) return;

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

        const newCart = activeSale.cart.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        );
        updateSaleCart(activeSale.id, newCart);
      }
    }
  };

  const removeFromCart = (productId: string) => {
    if (!activeSale) return;

    const newCart = activeSale.cart.filter(
      (item) => item.product.id !== productId
    );
    updateSaleCart(activeSale.id, newCart);
  };

  const clearCart = () => {
    if (!activeSale) return;
    clearSaleCart(activeSale.id);
  };

  const processSale = async () => {
    if (!activeSale) return;

    if (!activeSale.selectedCustomer) {
      toast.error('Debe seleccionar un cliente');
      return;
    }

    if (activeSale.cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    // Validar inventario disponible
    const inventoryErrors = [];
    for (const item of activeSale.cart) {
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
    if (!activeSale) return;

    try {
      setLoading(true);

      // Crear items de venta con impuestos específicos del producto
      const saleItems: CreateSaleItemData[] = activeSale.cart.map((item) => ({
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
        convertProductsForTotals(activeSale.cart.map((item) => item.product))
      );

      // Crear datos de venta
      const saleData: CreateSaleData = {
        customer_id: activeSale.selectedCustomer!.id,
        total_amount: totals.total_amount,
        payment_method: paymentData.method.payment_type,
        notes: `Venta POS - ${configuration.terminalName} - ${activeSale.name}`,
        account_id: configuration.defaultAccountId,
        numeration_id: activeSale.selectedNumeration?.id,
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
      clearSaleCart(activeSale.id);
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

  // Funciones para manejar cambios en la venta activa
  const handleCustomerChange = (customer: Customer | null) => {
    if (!activeSale) return;
    updateSaleCustomer(activeSale.id, customer);
  };

  const handleNumerationChange = (numeration: Numeration | null) => {
    if (!activeSale) return;
    updateSaleNumeration(activeSale.id, numeration);
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
      className="h-full flex flex-col bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative"
      role="main"
      aria-label="Sistema de punto de venta"
    >

      {/* Pestañas de Multiventas */}
      {pendingSales.length > 0 && (
        <POSMultiVentasTabs
          pendingSales={pendingSales}
          activeSaleId={activeSaleId}
          onAddNewSale={addNewSale}
          onSetActiveSale={setActiveSale}
          onRenameSale={renameSale}
          onDeleteSale={deleteSale}
        />
      )}

      {/* Layout Principal - Responsivo sin scroll global */}
      {pendingSales.length > 0 && activeSale && (
        <div
          className="flex-1 flex flex-col xl:flex-row min-h-0 relative"
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
                cart={activeSale?.cart || []}
                loading={loading}
                companyId={companyId}
                onProductsReload={loadProducts}
                selectedCategoryId={selectedCategoryId}
              />
            </section>

            {/* Carrito en móvil/tablet - Altura fija optimizada */}
            <aside
              className="h-96 sm:h-[28rem] border-t dark:border-gray-700 flex-shrink-0"
              aria-label="Carrito de compras"
            >
              <POSCartPanel
                cart={activeSale?.cart || []}
                customers={customers}
                selectedCustomer={activeSale?.selectedCustomer || null}
                onCustomerChange={handleCustomerChange}
                onUpdateQuantity={updateCartItemQuantity}
                onRemoveItem={removeFromCart}
                onClearCart={clearCart}
                onProcessSale={processSale}
                loading={loading}
                numerations={numerations}
                selectedNumeration={activeSale?.selectedNumeration || null}
                onNumerationChange={handleNumerationChange}
              />
            </aside>
          </div>

          {/* En desktop: Tres columnas - Sin scroll global */}
          <div className="hidden xl:flex flex-1 min-h-0 relative">
            {/* Panel de Categorías - Lateral Izquierdo */}
            {categories.length > 0 && (
              <aside
                className="flex-shrink-0 relative z-50"
                aria-label="Panel de categorías"
              >
                <POSCategoriesPanel
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={setSelectedCategoryId}
                />
              </aside>
            )}

            {/* Panel Central - Grid de Productos */}
            <section
              className="flex-1 min-h-0"
              aria-label="Catálogo de productos"
            >
              <POSProductsGrid
                products={products}
                onAddToCart={addToCart}
                cart={activeSale?.cart || []}
                loading={loading}
                companyId={companyId}
                onProductsReload={loadProducts}
                selectedCategoryId={selectedCategoryId}
              />
            </section>

            {/* Panel Derecho - Carrito (30%) */}
            <aside
              className="w-[30%] min-h-0 border-l dark:border-gray-700"
              aria-label="Carrito de compras"
            >
              <POSCartPanel
                cart={activeSale?.cart || []}
                customers={customers}
                selectedCustomer={activeSale?.selectedCustomer || null}
                onCustomerChange={handleCustomerChange}
                onUpdateQuantity={updateCartItemQuantity}
                onRemoveItem={removeFromCart}
                onClearCart={clearCart}
                onProcessSale={processSale}
                loading={loading}
                numerations={numerations}
                selectedNumeration={activeSale?.selectedNumeration || null}
                onNumerationChange={handleNumerationChange}
              />
            </aside>
          </div>
        </div>
      )}

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
          if (!activeSale) return 0;
          const saleItems = activeSale.cart.map((item) => ({
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
            convertProductsForTotals(activeSale.cart.map((item) => item.product))
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

      {/* Diálogo de Advertencia de Turno Largo */}
      {companyId && userId && (
        <POSShiftWarningDialog companyId={companyId} userId={userId} />
      )}
    </div>
  );
}
