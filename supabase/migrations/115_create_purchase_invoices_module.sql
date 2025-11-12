-- Crear módulo de facturas de compra a proveedores
-- 115_create_purchase_invoices_module.sql

-- Crear tabla de facturas de compra
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Información del documento
    numeration_id uuid REFERENCES public.numerations(id) ON DELETE SET NULL,
    invoice_number text, -- Número interno de la factura (generado desde numeración)
    supplier_invoice_number text NOT NULL, -- Número de factura del proveedor (obligatorio)
    
    -- Información básica
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE, -- Proveedor (obligatorio)
    invoice_date date NOT NULL, -- Fecha de emisión de la factura
    due_date date, -- Fecha de vencimiento (fecha tope para pagar)
    
    -- Personalización
    currency text DEFAULT 'COP' CHECK (currency IN ('COP', 'USD', 'EUR')),
    warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL, -- Bodega (para productos)
    cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL, -- Centro de costos
    
    -- Totales
    subtotal numeric(15,2) DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount numeric(15,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount numeric(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
    withholding_amount numeric(15,2) DEFAULT 0 CHECK (withholding_amount >= 0), -- Total de retenciones
    total_amount numeric(15,2) DEFAULT 0 CHECK (total_amount >= 0),
    
    -- Estado de pago (cuenta por pagar)
    payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
        'pending',      -- Pendiente por pagar
        'partially_paid', -- Parcialmente pagada
        'paid',         -- Pagada completamente
        'cancelled'     -- Cancelada/Anulada
    )),
    paid_amount numeric(15,2) DEFAULT 0 CHECK (paid_amount >= 0), -- Monto pagado
    pending_amount numeric(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED, -- Monto pendiente (calculado)
    
    -- Observaciones
    observations text, -- Observaciones adicionales
    
    -- Estado general
    status text NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',    -- Activa
        'cancelled'  -- Cancelada/Anulada
    )),
    is_cancelled boolean DEFAULT false,
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    updated_by uuid REFERENCES public.profiles(id),
    cancelled_at timestamp with time zone,
    cancelled_by uuid REFERENCES public.profiles(id),
    cancelled_reason text
);

-- Crear tabla de items de facturas de compra (productos o cuentas contables)
CREATE TABLE IF NOT EXISTS public.purchase_invoice_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_invoice_id uuid NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
    
    -- Tipo de item
    item_type text NOT NULL CHECK (item_type IN (
        'PRODUCT', -- Producto (para inventario)
        'ACCOUNT'  -- Cuenta contable (para gastos)
    )),
    
    -- Si es producto
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    quantity numeric(10,2) CHECK (quantity > 0), -- Cantidad comprada
    unit_cost numeric(15,2) CHECK (unit_cost >= 0), -- Precio/costo unitario
    total_cost numeric(15,2) CHECK (total_cost >= 0), -- Total del item
    
    -- Si es cuenta contable
    account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL, -- Cuenta contable de gasto
    account_amount numeric(15,2) CHECK (account_amount >= 0), -- Monto de la cuenta
    
    -- Descuentos e impuestos
    discount_percentage numeric(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    discount_amount numeric(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
    tax_id uuid REFERENCES public.taxes(id) ON DELETE SET NULL, -- Impuesto asociado
    
    -- Descripción
    description text, -- Descripción del item (modificable)
    
    -- Orden
    sort_order integer DEFAULT 0,
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de retenciones de impuestos en facturas de compra
CREATE TABLE IF NOT EXISTS public.purchase_invoice_withholdings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_invoice_id uuid NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
    
    -- Tipo de retención
    withholding_type text NOT NULL CHECK (withholding_type IN (
        'IVA',           -- Retención de IVA
        'RENTA',         -- Retención en la fuente (renta)
        'ICA',           -- Retención de ICA
        'CREE',          -- Retención CREE
        'OTHER'          -- Otros tipos
    )),
    
    -- Monto base y porcentaje
    base_amount numeric(15,2) NOT NULL CHECK (base_amount >= 0), -- Monto base sobre el cual se calcula
    percentage numeric(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100), -- Porcentaje de retención
    withholding_amount numeric(15,2) NOT NULL CHECK (withholding_amount >= 0), -- Monto de la retención
    
    -- Descripción
    description text, -- Descripción de la retención
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de historial de facturas de compra
CREATE TABLE IF NOT EXISTS public.purchase_invoice_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_invoice_id uuid NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN (
        'CREATED',
        'UPDATED',
        'CANCELLED',
        'RESTORED',
        'PAYMENT_RECEIVED',
        'PARTIALLY_PAID',
        'FULLY_PAID'
    )),
    field_name text,
    old_value text,
    new_value text,
    notes text,
    changed_by uuid REFERENCES public.profiles(id),
    changed_at timestamp with time zone DEFAULT now()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_company_id ON public.purchase_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier_id ON public.purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_invoice_date ON public.purchase_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_due_date ON public.purchase_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_payment_status ON public.purchase_invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON public.purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_is_cancelled ON public.purchase_invoices(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier_invoice_number ON public.purchase_invoices(supplier_invoice_number);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_invoice_number ON public.purchase_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_numeration_id ON public.purchase_invoices(numeration_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_warehouse_id ON public.purchase_invoices(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_cost_center_id ON public.purchase_invoices(cost_center_id);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_purchase_invoice_id ON public.purchase_invoice_items(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_product_id ON public.purchase_invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_account_id ON public.purchase_invoice_items(account_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_item_type ON public.purchase_invoice_items(item_type);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_withholdings_purchase_invoice_id ON public.purchase_invoice_withholdings(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_withholdings_withholding_type ON public.purchase_invoice_withholdings(withholding_type);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_history_purchase_invoice_id ON public.purchase_invoice_history(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_history_company_id ON public.purchase_invoice_history(company_id);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_purchase_invoices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_purchase_invoices_updated_at
    BEFORE UPDATE ON public.purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_purchase_invoices_updated_at();

CREATE OR REPLACE FUNCTION public.update_purchase_invoice_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_purchase_invoice_items_updated_at
    BEFORE UPDATE ON public.purchase_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_purchase_invoice_items_updated_at();

-- Crear función para calcular totales de factura de compra desde items
CREATE OR REPLACE FUNCTION public.calculate_purchase_invoice_totals(p_purchase_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_subtotal numeric(15,2) := 0;
    v_tax_amount numeric(15,2) := 0;
    v_discount_amount numeric(15,2) := 0;
    v_withholding_amount numeric(15,2) := 0;
    v_total_amount numeric(15,2) := 0;
BEGIN
    -- Calcular subtotal y descuentos desde items
    SELECT 
        COALESCE(SUM(COALESCE(total_cost, 0) + COALESCE(account_amount, 0)), 0),
        COALESCE(SUM(discount_amount), 0)
    INTO v_subtotal, v_discount_amount
    FROM public.purchase_invoice_items
    WHERE purchase_invoice_id = p_purchase_invoice_id;
    
    -- Calcular total de retenciones
    SELECT COALESCE(SUM(withholding_amount), 0)
    INTO v_withholding_amount
    FROM public.purchase_invoice_withholdings
    WHERE purchase_invoice_id = p_purchase_invoice_id;
    
    -- Por ahora, el tax_amount se calcula aparte (se puede mejorar)
    v_total_amount := v_subtotal - v_discount_amount + v_tax_amount - v_withholding_amount;
    
    -- Actualizar la factura de compra
    UPDATE public.purchase_invoices
    SET 
        subtotal = v_subtotal,
        discount_amount = v_discount_amount,
        tax_amount = v_tax_amount,
        withholding_amount = v_withholding_amount,
        total_amount = v_total_amount,
        updated_at = now()
    WHERE id = p_purchase_invoice_id;
END;
$$;

-- Crear trigger para recalcular totales cuando se modifican items
CREATE OR REPLACE FUNCTION public.trigger_calculate_purchase_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.calculate_purchase_invoice_totals(
        COALESCE(NEW.purchase_invoice_id, OLD.purchase_invoice_id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_recalculate_purchase_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_purchase_invoice_totals();

-- Crear trigger para recalcular totales cuando se modifican retenciones
CREATE TRIGGER trigger_recalculate_purchase_invoice_totals_withholdings
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_invoice_withholdings
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_purchase_invoice_totals();

-- Crear función para actualizar estado de pago basado en monto pagado
CREATE OR REPLACE FUNCTION public.update_purchase_invoice_payment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_amount numeric(15,2);
    v_paid_amount numeric(15,2);
    v_new_status text;
BEGIN
    v_total_amount := NEW.total_amount;
    v_paid_amount := NEW.paid_amount;
    
    -- Determinar nuevo estado de pago
    IF v_paid_amount = 0 THEN
        v_new_status := 'pending';
    ELSIF v_paid_amount >= v_total_amount THEN
        v_new_status := 'paid';
    ELSE
        v_new_status := 'partially_paid';
    END IF;
    
    -- Actualizar estado si cambió
    IF NEW.payment_status != v_new_status THEN
        NEW.payment_status := v_new_status;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_purchase_invoice_payment_status
    BEFORE INSERT OR UPDATE ON public.purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_purchase_invoice_payment_status();

-- Crear función para actualizar inventario cuando se crea factura de compra con productos
CREATE OR REPLACE FUNCTION public.update_inventory_on_purchase_invoice()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_item record;
    v_warehouse_id uuid;
    v_company_id uuid;
BEGIN
    -- Solo procesar si es producto (no cuenta contable)
    IF NEW.item_type = 'PRODUCT' AND NEW.product_id IS NOT NULL AND NEW.quantity > 0 THEN
        -- Obtener warehouse_id y company_id de la factura
        SELECT warehouse_id, company_id INTO v_warehouse_id, v_company_id
        FROM public.purchase_invoices
        WHERE id = NEW.purchase_invoice_id;
        
        -- Solo actualizar inventario si la factura está activa (no cancelada)
        IF EXISTS (
            SELECT 1 FROM public.purchase_invoices 
            WHERE id = NEW.purchase_invoice_id 
            AND status = 'active' 
            AND is_cancelled = false
        ) THEN
            -- Incrementar inventario del producto usando adjust_warehouse_inventory
            PERFORM public.adjust_warehouse_inventory(
                NEW.product_id,
                'in',
                NEW.quantity::integer,
                v_warehouse_id,
                'Factura de compra: ' || (SELECT supplier_invoice_number FROM public.purchase_invoices WHERE id = NEW.purchase_invoice_id)
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_inventory_on_purchase_invoice
    AFTER INSERT ON public.purchase_invoice_items
    FOR EACH ROW
    WHEN (NEW.item_type = 'PRODUCT')
    EXECUTE FUNCTION public.update_inventory_on_purchase_invoice();

-- Crear función para revertir inventario cuando se cancela factura de compra
CREATE OR REPLACE FUNCTION public.revert_inventory_on_purchase_invoice_cancellation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_item record;
    v_warehouse_id uuid;
    v_company_id uuid;
BEGIN
    -- Si se cancela, revertir inventario
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        FOR v_item IN 
            SELECT * FROM public.purchase_invoice_items
            WHERE purchase_invoice_id = NEW.id
            AND item_type = 'PRODUCT'
            AND product_id IS NOT NULL
        LOOP
            SELECT warehouse_id, company_id INTO v_warehouse_id, v_company_id
            FROM public.purchase_invoices
            WHERE id = NEW.id;
            
            -- Revertir inventario (restar cantidad)
            PERFORM public.adjust_warehouse_inventory(
                v_item.product_id,
                'out',
                v_item.quantity::integer,
                v_warehouse_id,
                'Cancelación de factura de compra: ' || NEW.supplier_invoice_number
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_revert_inventory_on_purchase_invoice_cancellation
    AFTER UPDATE ON public.purchase_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
    EXECUTE FUNCTION public.revert_inventory_on_purchase_invoice_cancellation();

-- Crear función para registrar historial de cambios
CREATE OR REPLACE FUNCTION public.log_purchase_invoice_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.purchase_invoice_history (
            purchase_invoice_id,
            company_id,
            action,
            changed_by
        )
        VALUES (
            NEW.id,
            NEW.company_id,
            'CREATED',
            NEW.created_by
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Registrar cambios en campos importantes
        IF OLD.payment_status != NEW.payment_status THEN
            INSERT INTO public.purchase_invoice_history (
                purchase_invoice_id,
                company_id,
                action,
                field_name,
                old_value,
                new_value,
                changed_by
            )
            VALUES (
                NEW.id,
                NEW.company_id,
                CASE NEW.payment_status
                    WHEN 'paid' THEN 'FULLY_PAID'
                    WHEN 'partially_paid' THEN 'PARTIALLY_PAID'
                    WHEN 'pending' THEN 'CREATED'
                    ELSE 'UPDATED'
                END,
                'payment_status',
                OLD.payment_status,
                NEW.payment_status,
                NEW.updated_by
            );
        END IF;
        
        IF OLD.status != NEW.status AND NEW.status = 'cancelled' THEN
            INSERT INTO public.purchase_invoice_history (
                purchase_invoice_id,
                company_id,
                action,
                field_name,
                old_value,
                new_value,
                changed_by
            )
            VALUES (
                NEW.id,
                NEW.company_id,
                'CANCELLED',
                'status',
                OLD.status,
                NEW.status,
                NEW.updated_by
            );
        END IF;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_log_purchase_invoice_changes
    AFTER INSERT OR UPDATE ON public.purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.log_purchase_invoice_changes();

-- Crear RLS (Row Level Security)
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoice_withholdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoice_history ENABLE ROW LEVEL SECURITY;

-- Políticas para purchase_invoices
CREATE POLICY "Users can view purchase invoices from their company" ON public.purchase_invoices
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert purchase invoices for their company" ON public.purchase_invoices
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update purchase invoices from their company" ON public.purchase_invoices
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        AND status != 'cancelled'
    );

CREATE POLICY "Users can delete purchase invoices from their company" ON public.purchase_invoices
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        AND status != 'cancelled'
    );

-- Políticas para purchase_invoice_items
CREATE POLICY "Users can view purchase invoice items from their company" ON public.purchase_invoice_items
    FOR SELECT USING (
        purchase_invoice_id IN (
            SELECT id FROM public.purchase_invoices
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert purchase invoice items for their company" ON public.purchase_invoice_items
    FOR INSERT WITH CHECK (
        purchase_invoice_id IN (
            SELECT id FROM public.purchase_invoices
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update purchase invoice items from their company" ON public.purchase_invoice_items
    FOR UPDATE USING (
        purchase_invoice_id IN (
            SELECT id FROM public.purchase_invoices
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete purchase invoice items from their company" ON public.purchase_invoice_items
    FOR DELETE USING (
        purchase_invoice_id IN (
            SELECT id FROM public.purchase_invoices
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas para purchase_invoice_withholdings
CREATE POLICY "Users can view purchase invoice withholdings from their company" ON public.purchase_invoice_withholdings
    FOR SELECT USING (
        purchase_invoice_id IN (
            SELECT id FROM public.purchase_invoices
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert purchase invoice withholdings for their company" ON public.purchase_invoice_withholdings
    FOR INSERT WITH CHECK (
        purchase_invoice_id IN (
            SELECT id FROM public.purchase_invoices
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update purchase invoice withholdings from their company" ON public.purchase_invoice_withholdings
    FOR UPDATE USING (
        purchase_invoice_id IN (
            SELECT id FROM public.purchase_invoices
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete purchase invoice withholdings from their company" ON public.purchase_invoice_withholdings
    FOR DELETE USING (
        purchase_invoice_id IN (
            SELECT id FROM public.purchase_invoices
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas para purchase_invoice_history
CREATE POLICY "Users can view purchase invoice history from their company" ON public.purchase_invoice_history
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert purchase invoice history for their company" ON public.purchase_invoice_history
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE public.purchase_invoices IS 'Facturas de compra a proveedores (registran compras y actualizan inventario automáticamente)';
COMMENT ON COLUMN public.purchase_invoices.supplier_invoice_number IS 'Número de factura del proveedor (obligatorio)';
COMMENT ON COLUMN public.purchase_invoices.invoice_number IS 'Número interno de la factura (generado desde numeración)';
COMMENT ON COLUMN public.purchase_invoices.invoice_date IS 'Fecha de emisión de la factura';
COMMENT ON COLUMN public.purchase_invoices.due_date IS 'Fecha de vencimiento (fecha tope para pagar)';
COMMENT ON COLUMN public.purchase_invoices.payment_status IS 'Estado de pago: pending (pendiente), partially_paid (parcialmente pagada), paid (pagada), cancelled (cancelada)';
COMMENT ON COLUMN public.purchase_invoices.paid_amount IS 'Monto pagado de la factura';
COMMENT ON COLUMN public.purchase_invoices.pending_amount IS 'Monto pendiente por pagar (calculado automáticamente)';
COMMENT ON COLUMN public.purchase_invoices.withholding_amount IS 'Total de retenciones de impuestos aplicadas';

COMMENT ON TABLE public.purchase_invoice_items IS 'Items de facturas de compra (productos para inventario o cuentas contables para gastos)';
COMMENT ON COLUMN public.purchase_invoice_items.item_type IS 'Tipo de item: PRODUCT (producto para inventario) o ACCOUNT (cuenta contable para gastos)';

COMMENT ON TABLE public.purchase_invoice_withholdings IS 'Retenciones de impuestos aplicadas a facturas de compra';
COMMENT ON COLUMN public.purchase_invoice_withholdings.withholding_type IS 'Tipo de retención: IVA, RENTA, ICA, CREE, OTHER';

COMMENT ON FUNCTION public.calculate_purchase_invoice_totals IS 'Recalcula los totales de una factura de compra desde sus items y retenciones';
COMMENT ON FUNCTION public.update_inventory_on_purchase_invoice IS 'Actualiza el inventario automáticamente cuando se crea una factura de compra con productos';
COMMENT ON FUNCTION public.revert_inventory_on_purchase_invoice_cancellation IS 'Revierte el inventario cuando se cancela una factura de compra';

