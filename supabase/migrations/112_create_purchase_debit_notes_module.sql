-- Crear módulo de notas débito de compra
-- 112_create_purchase_debit_notes_module.sql

-- Crear tabla de notas débito de compra
CREATE TABLE IF NOT EXISTS public.purchase_debit_notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Información del documento
    numeration_id uuid REFERENCES public.numerations(id) ON DELETE SET NULL,
    debit_note_number text, -- Número del documento (generado desde numeración)
    
    -- Información básica
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE, -- Proveedor (obligatorio)
    debit_note_date date NOT NULL, -- Fecha de la nota débito
    
    -- Moneda y bodega
    currency text DEFAULT 'COP' CHECK (currency IN ('COP', 'USD', 'EUR')),
    warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL, -- Bodega de donde sale el inventario
    
    -- Totales
    subtotal numeric(15,2) DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount numeric(15,2) DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount numeric(15,2) DEFAULT 0 CHECK (total_amount >= 0), -- Valor total de la nota débito
    
    -- Totales de liquidación
    cash_refund_amount numeric(15,2) DEFAULT 0 CHECK (cash_refund_amount >= 0), -- Total devuelto en dinero
    invoice_credit_amount numeric(15,2) DEFAULT 0 CHECK (invoice_credit_amount >= 0), -- Total aplicado a facturas
    
    -- Estado
    status text NOT NULL DEFAULT 'open' CHECK (status IN (
        'open',      -- Abierta
        'cancelled', -- Anulada
        'reconciled' -- Conciliada
    )),
    is_reconciled boolean DEFAULT false,
    
    -- Observaciones
    observations text, -- Observaciones adicionales
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    updated_by uuid REFERENCES public.profiles(id),
    cancelled_at timestamp with time zone,
    cancelled_by uuid REFERENCES public.profiles(id),
    cancelled_reason text
);

-- Crear tabla de items de notas débito (productos devueltos o cuentas contables)
CREATE TABLE IF NOT EXISTS public.purchase_debit_note_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_debit_note_id uuid NOT NULL REFERENCES public.purchase_debit_notes(id) ON DELETE CASCADE,
    
    -- Tipo de item
    item_type text NOT NULL CHECK (item_type IN (
        'PRODUCT', -- Producto devuelto
        'ACCOUNT'  -- Cuenta contable de egreso
    )),
    
    -- Si es producto
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    quantity numeric(10,2) CHECK (quantity > 0), -- Cantidad devuelta
    unit_cost numeric(15,2) CHECK (unit_cost >= 0), -- Costo unitario de la mercancía devuelta
    total_cost numeric(15,2) CHECK (total_cost >= 0), -- Total del item
    
    -- Si es cuenta contable
    account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL, -- Cuenta contable de egreso
    account_amount numeric(15,2) CHECK (account_amount >= 0), -- Monto de la cuenta
    
    -- Descripción
    description text, -- Descripción del item
    
    -- Orden
    sort_order integer DEFAULT 0,
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de liquidaciones de notas débito (formas de recibir la devolución)
CREATE TABLE IF NOT EXISTS public.purchase_debit_note_settlements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_debit_note_id uuid NOT NULL REFERENCES public.purchase_debit_notes(id) ON DELETE CASCADE,
    
    -- Tipo de liquidación
    settlement_type text NOT NULL CHECK (settlement_type IN (
        'CASH_REFUND',      -- Devolución de dinero
        'INVOICE_CREDIT'    -- Débito a factura de proveedor
    )),
    
    -- Si es devolución de dinero
    refund_date date, -- Fecha en que entró el dinero al banco
    refund_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL, -- Cuenta bancaria donde entró
    refund_amount numeric(15,2) CHECK (refund_amount >= 0), -- Monto recibido
    refund_observations text, -- Observaciones de la devolución
    
    -- Si es débito a factura
    purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL, -- Factura de compra a la que se aplica
    credit_amount numeric(15,2) CHECK (credit_amount >= 0), -- Monto del crédito aplicado
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de historial de notas débito
CREATE TABLE IF NOT EXISTS public.purchase_debit_note_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_debit_note_id uuid NOT NULL REFERENCES public.purchase_debit_notes(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN (
        'CREATED',
        'UPDATED',
        'CANCELLED',
        'RESTORED',
        'RECONCILED',
        'UNRECONCILED'
    )),
    field_name text,
    old_value text,
    new_value text,
    notes text,
    changed_by uuid REFERENCES public.profiles(id),
    changed_at timestamp with time zone DEFAULT now()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_purchase_debit_notes_company_id ON public.purchase_debit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_debit_notes_supplier_id ON public.purchase_debit_notes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_debit_notes_debit_note_date ON public.purchase_debit_notes(debit_note_date);
CREATE INDEX IF NOT EXISTS idx_purchase_debit_notes_status ON public.purchase_debit_notes(status);
CREATE INDEX IF NOT EXISTS idx_purchase_debit_notes_is_reconciled ON public.purchase_debit_notes(is_reconciled);
CREATE INDEX IF NOT EXISTS idx_purchase_debit_notes_debit_note_number ON public.purchase_debit_notes(debit_note_number);
CREATE INDEX IF NOT EXISTS idx_purchase_debit_notes_numeration_id ON public.purchase_debit_notes(numeration_id);

CREATE INDEX IF NOT EXISTS idx_purchase_debit_note_items_purchase_debit_note_id ON public.purchase_debit_note_items(purchase_debit_note_id);
CREATE INDEX IF NOT EXISTS idx_purchase_debit_note_items_product_id ON public.purchase_debit_note_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_debit_note_items_account_id ON public.purchase_debit_note_items(account_id);
CREATE INDEX IF NOT EXISTS idx_purchase_debit_note_items_item_type ON public.purchase_debit_note_items(item_type);

CREATE INDEX IF NOT EXISTS idx_purchase_debit_note_settlements_purchase_debit_note_id ON public.purchase_debit_note_settlements(purchase_debit_note_id);
CREATE INDEX IF NOT EXISTS idx_purchase_debit_note_settlements_settlement_type ON public.purchase_debit_note_settlements(settlement_type);
CREATE INDEX IF NOT EXISTS idx_purchase_debit_note_settlements_purchase_id ON public.purchase_debit_note_settlements(purchase_id);

CREATE INDEX IF NOT EXISTS idx_purchase_debit_note_history_purchase_debit_note_id ON public.purchase_debit_note_history(purchase_debit_note_id);
CREATE INDEX IF NOT EXISTS idx_purchase_debit_note_history_company_id ON public.purchase_debit_note_history(company_id);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_purchase_debit_notes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_purchase_debit_notes_updated_at
    BEFORE UPDATE ON public.purchase_debit_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_purchase_debit_notes_updated_at();

-- Crear función para calcular totales de nota débito desde items
CREATE OR REPLACE FUNCTION public.calculate_purchase_debit_note_totals(p_purchase_debit_note_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_subtotal numeric(15,2) := 0;
    v_tax_amount numeric(15,2) := 0;
    v_total_amount numeric(15,2) := 0;
BEGIN
    -- Calcular subtotal desde items
    SELECT COALESCE(SUM(COALESCE(total_cost, 0) + COALESCE(account_amount, 0)), 0)
    INTO v_subtotal
    FROM public.purchase_debit_note_items
    WHERE purchase_debit_note_id = p_purchase_debit_note_id;
    
    -- Por ahora, el tax_amount se calcula aparte (se puede mejorar)
    v_total_amount := v_subtotal + v_tax_amount;
    
    -- Actualizar la nota débito
    UPDATE public.purchase_debit_notes
    SET 
        subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total_amount = v_total_amount,
        updated_at = now()
    WHERE id = p_purchase_debit_note_id;
END;
$$;

-- Crear trigger para recalcular totales cuando se modifican items
CREATE OR REPLACE FUNCTION public.trigger_calculate_purchase_debit_note_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.calculate_purchase_debit_note_totals(
        COALESCE(NEW.purchase_debit_note_id, OLD.purchase_debit_note_id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_recalculate_purchase_debit_note_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_debit_note_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_purchase_debit_note_totals();

-- Crear función para calcular totales de liquidación desde settlements
CREATE OR REPLACE FUNCTION public.calculate_purchase_debit_note_settlements(p_purchase_debit_note_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_cash_refund numeric(15,2) := 0;
    v_invoice_credit numeric(15,2) := 0;
BEGIN
    -- Calcular total de devoluciones en dinero
    SELECT COALESCE(SUM(refund_amount), 0)
    INTO v_cash_refund
    FROM public.purchase_debit_note_settlements
    WHERE purchase_debit_note_id = p_purchase_debit_note_id
      AND settlement_type = 'CASH_REFUND';
    
    -- Calcular total de créditos a facturas
    SELECT COALESCE(SUM(credit_amount), 0)
    INTO v_invoice_credit
    FROM public.purchase_debit_note_settlements
    WHERE purchase_debit_note_id = p_purchase_debit_note_id
      AND settlement_type = 'INVOICE_CREDIT';
    
    -- Actualizar la nota débito
    UPDATE public.purchase_debit_notes
    SET 
        cash_refund_amount = v_cash_refund,
        invoice_credit_amount = v_invoice_credit,
        updated_at = now()
    WHERE id = p_purchase_debit_note_id;
END;
$$;

-- Crear trigger para recalcular liquidaciones cuando se modifican settlements
CREATE OR REPLACE FUNCTION public.trigger_calculate_purchase_debit_note_settlements()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.calculate_purchase_debit_note_settlements(
        COALESCE(NEW.purchase_debit_note_id, OLD.purchase_debit_note_id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_recalculate_purchase_debit_note_settlements
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_debit_note_settlements
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_purchase_debit_note_settlements();

-- Crear función para validar que las liquidaciones no excedan el total
CREATE OR REPLACE FUNCTION public.validate_purchase_debit_note_settlements()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_amount numeric(15,2);
    v_total_settlements numeric(15,2);
BEGIN
    -- Obtener el total de la nota débito
    SELECT total_amount INTO v_total_amount
    FROM public.purchase_debit_notes
    WHERE id = COALESCE(NEW.purchase_debit_note_id, OLD.purchase_debit_note_id);
    
    -- Calcular el total de liquidaciones
    SELECT COALESCE(SUM(
        CASE 
            WHEN settlement_type = 'CASH_REFUND' THEN refund_amount
            WHEN settlement_type = 'INVOICE_CREDIT' THEN credit_amount
            ELSE 0
        END
    ), 0)
    INTO v_total_settlements
    FROM public.purchase_debit_note_settlements
    WHERE purchase_debit_note_id = COALESCE(NEW.purchase_debit_note_id, OLD.purchase_debit_note_id);
    
    -- Validar que no exceda el total
    IF v_total_settlements > v_total_amount THEN
        RAISE EXCEPTION 'El total de las liquidaciones (%.2f) no puede exceder el valor total de la nota débito (%.2f)', 
            v_total_settlements, v_total_amount;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_validate_purchase_debit_note_settlements
    AFTER INSERT OR UPDATE ON public.purchase_debit_note_settlements
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_purchase_debit_note_settlements();

-- Crear función para actualizar saldo de cuenta en devoluciones de dinero
CREATE OR REPLACE FUNCTION public.update_account_balance_on_debit_note_refund()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.settlement_type = 'CASH_REFUND' AND NEW.refund_amount > 0 THEN
        -- Incrementar saldo de la cuenta cuando se recibe devolución
        UPDATE public.accounts
        SET current_balance = current_balance + NEW.refund_amount,
            updated_at = now()
        WHERE id = NEW.refund_account_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.settlement_type = 'CASH_REFUND' THEN
        -- Si cambia el monto, ajustar el saldo
        IF OLD.refund_amount != NEW.refund_amount THEN
            UPDATE public.accounts
            SET current_balance = current_balance - OLD.refund_amount + NEW.refund_amount,
                updated_at = now()
            WHERE id = NEW.refund_account_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.settlement_type = 'CASH_REFUND' AND OLD.refund_amount > 0 THEN
        -- Revertir el saldo si se elimina la liquidación
        UPDATE public.accounts
        SET current_balance = current_balance - OLD.refund_amount,
            updated_at = now()
        WHERE id = OLD.refund_account_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_account_balance_on_debit_note_refund
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_debit_note_settlements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_account_balance_on_debit_note_refund();

-- Crear función para registrar historial de cambios
CREATE OR REPLACE FUNCTION public.log_purchase_debit_note_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.purchase_debit_note_history (
            purchase_debit_note_id,
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
        IF OLD.status != NEW.status THEN
            INSERT INTO public.purchase_debit_note_history (
                purchase_debit_note_id,
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
                CASE 
                    WHEN NEW.status = 'cancelled' THEN 'CANCELLED'
                    WHEN NEW.status = 'open' AND OLD.status = 'cancelled' THEN 'RESTORED'
                    WHEN NEW.is_reconciled = true AND OLD.is_reconciled = false THEN 'RECONCILED'
                    WHEN NEW.is_reconciled = false AND OLD.is_reconciled = true THEN 'UNRECONCILED'
                    ELSE 'UPDATED'
                END,
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

CREATE TRIGGER trigger_log_purchase_debit_note_changes
    AFTER INSERT OR UPDATE ON public.purchase_debit_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.log_purchase_debit_note_changes();

-- Crear RLS (Row Level Security)
ALTER TABLE public.purchase_debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_debit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_debit_note_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_debit_note_history ENABLE ROW LEVEL SECURITY;

-- Políticas para purchase_debit_notes
CREATE POLICY "Users can view purchase debit notes from their company" ON public.purchase_debit_notes
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert purchase debit notes for their company" ON public.purchase_debit_notes
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update purchase debit notes from their company" ON public.purchase_debit_notes
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        AND (is_reconciled = false OR status = 'cancelled')
    );

CREATE POLICY "Users can delete purchase debit notes from their company" ON public.purchase_debit_notes
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        AND is_reconciled = false
    );

-- Políticas para purchase_debit_note_items
CREATE POLICY "Users can view purchase debit note items from their company" ON public.purchase_debit_note_items
    FOR SELECT USING (
        purchase_debit_note_id IN (
            SELECT id FROM public.purchase_debit_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert purchase debit note items for their company" ON public.purchase_debit_note_items
    FOR INSERT WITH CHECK (
        purchase_debit_note_id IN (
            SELECT id FROM public.purchase_debit_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update purchase debit note items from their company" ON public.purchase_debit_note_items
    FOR UPDATE USING (
        purchase_debit_note_id IN (
            SELECT id FROM public.purchase_debit_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete purchase debit note items from their company" ON public.purchase_debit_note_items
    FOR DELETE USING (
        purchase_debit_note_id IN (
            SELECT id FROM public.purchase_debit_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas para purchase_debit_note_settlements
CREATE POLICY "Users can view purchase debit note settlements from their company" ON public.purchase_debit_note_settlements
    FOR SELECT USING (
        purchase_debit_note_id IN (
            SELECT id FROM public.purchase_debit_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert purchase debit note settlements for their company" ON public.purchase_debit_note_settlements
    FOR INSERT WITH CHECK (
        purchase_debit_note_id IN (
            SELECT id FROM public.purchase_debit_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update purchase debit note settlements from their company" ON public.purchase_debit_note_settlements
    FOR UPDATE USING (
        purchase_debit_note_id IN (
            SELECT id FROM public.purchase_debit_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete purchase debit note settlements from their company" ON public.purchase_debit_note_settlements
    FOR DELETE USING (
        purchase_debit_note_id IN (
            SELECT id FROM public.purchase_debit_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas para purchase_debit_note_history
CREATE POLICY "Users can view purchase debit note history from their company" ON public.purchase_debit_note_history
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert purchase debit note history for their company" ON public.purchase_debit_note_history
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE public.purchase_debit_notes IS 'Notas débito de compra para disminuir el valor de facturas de proveedores';
COMMENT ON COLUMN public.purchase_debit_notes.supplier_id IS 'Proveedor a nombre de quien está hecha la nota débito (obligatorio)';
COMMENT ON COLUMN public.purchase_debit_notes.warehouse_id IS 'Bodega de donde sale el inventario devuelto';
COMMENT ON COLUMN public.purchase_debit_notes.cash_refund_amount IS 'Total devuelto en dinero al proveedor';
COMMENT ON COLUMN public.purchase_debit_notes.invoice_credit_amount IS 'Total aplicado como crédito a facturas de proveedor';

COMMENT ON TABLE public.purchase_debit_note_items IS 'Items de notas débito (productos devueltos o cuentas contables de egreso)';
COMMENT ON COLUMN public.purchase_debit_note_items.item_type IS 'Tipo de item: PRODUCT (producto devuelto) o ACCOUNT (cuenta contable de egreso)';
COMMENT ON COLUMN public.purchase_debit_note_items.unit_cost IS 'Costo unitario de la mercancía devuelta';

COMMENT ON TABLE public.purchase_debit_note_settlements IS 'Liquidaciones de notas débito (devolución de dinero o débito a factura)';
COMMENT ON COLUMN public.purchase_debit_note_settlements.settlement_type IS 'Tipo de liquidación: CASH_REFUND (devolución de dinero) o INVOICE_CREDIT (débito a factura)';

COMMENT ON FUNCTION public.validate_purchase_debit_note_settlements IS 'Valida que el total de liquidaciones no exceda el valor total de la nota débito';

