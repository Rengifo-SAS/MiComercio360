-- Crear módulo de pagos (egresos)
-- 116_create_payments_module.sql

-- Crear tabla de pagos (egresos)
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Información del documento
    numeration_id uuid REFERENCES public.numerations(id) ON DELETE SET NULL,
    payment_number text, -- Número del documento (generado desde numeración)
    
    -- Fecha y contacto
    payment_date date NOT NULL, -- Fecha en que se realizó el pago
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL, -- Proveedor (si aplica)
    contact_name text, -- Nombre del contacto (si no es proveedor registrado)
    
    -- Información bancaria y financiera
    account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT, -- Cuenta de donde sale el dinero
    payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL, -- Método de pago
    cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL, -- Centro de costo
    
    -- Moneda y monto
    currency text DEFAULT 'COP' CHECK (currency IN ('COP', 'USD', 'EUR')),
    total_amount numeric(15,2) NOT NULL CHECK (total_amount > 0), -- Monto total pagado
    
    -- Detalles y concepto
    details text, -- Detalles del pago (concepto)
    notes text, -- Notas internas
    
    -- Tipo de transacción
    transaction_type text NOT NULL CHECK (transaction_type IN (
        'INVOICE_PAYMENT', -- Pago asociado a facturas de compra
        'ACCOUNT_PAYMENT'  -- Pago asociado a cuentas contables
    )),
    
    -- Estado
    status text NOT NULL DEFAULT 'open' CHECK (status IN (
        'open',      -- Abierto (activo)
        'cancelled', -- Anulado
        'reconciled' -- Conciliado
    )),
    is_reconciled boolean DEFAULT false, -- Si está conciliado
    reconciliation_id uuid, -- ID de conciliación (si aplica)
    reconciliation_date timestamp with time zone, -- Fecha de conciliación
    
    -- Referencia bancaria
    bank_reference text, -- Referencia bancaria (consignación, transferencia, etc.)
    check_number text, -- Número de cheque (si aplica)
    cleared_date timestamp with time zone, -- Fecha de compensación
    
    -- Archivos adjuntos
    attachment_url text, -- URL del archivo adjunto
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    updated_by uuid REFERENCES public.profiles(id),
    cancelled_at timestamp with time zone,
    cancelled_by uuid REFERENCES public.profiles(id),
    cancelled_reason text
);

-- Crear tabla de items de pagos (asociaciones con facturas de compra o cuentas)
CREATE TABLE IF NOT EXISTS public.payment_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    
    -- Tipo de asociación
    item_type text NOT NULL CHECK (item_type IN (
        'INVOICE', -- Asociado a una factura de compra
        'ACCOUNT'  -- Asociado a una cuenta contable
    )),
    
    -- Si es factura de compra
    purchase_invoice_id uuid REFERENCES public.purchase_invoices(id) ON DELETE SET NULL,
    amount_paid numeric(15,2) NOT NULL CHECK (amount_paid > 0), -- Monto pagado de esta factura/cuenta
    
    -- Si es cuenta contable
    account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL, -- Cuenta contable relacionada
    
    -- Descripción
    description text, -- Descripción del item
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de historial de pagos (para auditoría)
CREATE TABLE IF NOT EXISTS public.payment_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON public.payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_account_id ON public.payments(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_is_reconciled ON public.payments(is_reconciled);
CREATE INDEX IF NOT EXISTS idx_payments_payment_number ON public.payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_numeration_id ON public.payments(numeration_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id ON public.payments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payments_cost_center_id ON public.payments(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_type ON public.payments(transaction_type);
CREATE INDEX IF NOT EXISTS idx_payments_reconciliation_id ON public.payments(reconciliation_id);

CREATE INDEX IF NOT EXISTS idx_payment_items_payment_id ON public.payment_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_purchase_invoice_id ON public.payment_items(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_account_id ON public.payment_items(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_item_type ON public.payment_items(item_type);

CREATE INDEX IF NOT EXISTS idx_payment_history_payment_id ON public.payment_history(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_company_id ON public.payment_history(company_id);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payments_updated_at();

-- Crear función para calcular total del pago desde items
CREATE OR REPLACE FUNCTION public.calculate_payment_total(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_amount numeric(15,2) := 0;
BEGIN
    -- Calcular total desde items
    SELECT COALESCE(SUM(amount_paid), 0)
    INTO v_total_amount
    FROM public.payment_items
    WHERE payment_id = p_payment_id;
    
    -- Actualizar el pago
    UPDATE public.payments
    SET 
        total_amount = v_total_amount,
        updated_at = now()
    WHERE id = p_payment_id;
END;
$$;

-- Crear trigger para recalcular total cuando se modifican items
CREATE OR REPLACE FUNCTION public.trigger_calculate_payment_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.calculate_payment_total(
        COALESCE(NEW.payment_id, OLD.payment_id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_recalculate_payment_total
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_payment_total();

-- Crear función para actualizar monto pagado en facturas de compra cuando se registra un pago
CREATE OR REPLACE FUNCTION public.update_purchase_invoice_paid_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_invoice_id uuid;
    v_amount_paid numeric(15,2);
BEGIN
    -- Solo procesar si es pago a factura de compra
    IF NEW.item_type = 'INVOICE' AND NEW.purchase_invoice_id IS NOT NULL THEN
        v_invoice_id := NEW.purchase_invoice_id;
        
        -- Calcular monto total pagado de esta factura
        SELECT COALESCE(SUM(amount_paid), 0)
        INTO v_amount_paid
        FROM public.payment_items
        WHERE purchase_invoice_id = v_invoice_id
        AND payment_id IN (
            SELECT id FROM public.payments 
            WHERE status != 'cancelled'
        );
        
        -- Actualizar monto pagado en la factura de compra
        UPDATE public.purchase_invoices
        SET 
            paid_amount = v_amount_paid,
            updated_at = now()
        WHERE id = v_invoice_id;
        
        -- El trigger de purchase_invoices actualizará automáticamente el payment_status
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_purchase_invoice_paid_amount
    AFTER INSERT OR UPDATE ON public.payment_items
    FOR EACH ROW
    WHEN (NEW.item_type = 'INVOICE' AND NEW.purchase_invoice_id IS NOT NULL)
    EXECUTE FUNCTION public.update_purchase_invoice_paid_amount();

-- Crear trigger para revertir monto pagado cuando se cancela un pago
CREATE OR REPLACE FUNCTION public.revert_purchase_invoice_paid_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_item record;
    v_invoice_id uuid;
    v_amount_paid numeric(15,2);
BEGIN
    -- Si se cancela, revertir montos pagados en facturas
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        FOR v_item IN 
            SELECT * FROM public.payment_items
            WHERE payment_id = NEW.id
            AND item_type = 'INVOICE'
            AND purchase_invoice_id IS NOT NULL
        LOOP
            v_invoice_id := v_item.purchase_invoice_id;
            
            -- Recalcular monto total pagado (excluyendo este pago cancelado)
            SELECT COALESCE(SUM(amount_paid), 0)
            INTO v_amount_paid
            FROM public.payment_items
            WHERE purchase_invoice_id = v_invoice_id
            AND payment_id IN (
                SELECT id FROM public.payments 
                WHERE status != 'cancelled'
            );
            
            -- Actualizar monto pagado en la factura de compra
            UPDATE public.purchase_invoices
            SET 
                paid_amount = v_amount_paid,
                updated_at = now()
            WHERE id = v_invoice_id;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_revert_purchase_invoice_paid_amount
    AFTER UPDATE ON public.payments
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
    EXECUTE FUNCTION public.revert_purchase_invoice_paid_amount();

-- Crear función para actualizar saldo de cuenta cuando se registra un pago
CREATE OR REPLACE FUNCTION public.update_account_balance_on_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_account_id uuid;
    v_amount numeric(15,2);
    v_company_id uuid;
BEGIN
    -- Solo procesar si el pago está activo (no cancelado)
    IF NEW.status != 'cancelled' THEN
        v_account_id := NEW.account_id;
        v_amount := NEW.total_amount;
        v_company_id := NEW.company_id;
        
        -- Decrementar saldo de la cuenta (egreso)
        UPDATE public.accounts
        SET 
            current_balance = current_balance - v_amount,
            updated_at = now()
        WHERE id = v_account_id;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_account_balance_on_payment
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    WHEN (NEW.status != 'cancelled')
    EXECUTE FUNCTION public.update_account_balance_on_payment();

-- Crear función para revertir saldo de cuenta cuando se cancela un pago
CREATE OR REPLACE FUNCTION public.revert_account_balance_on_payment_cancellation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_account_id uuid;
    v_amount numeric(15,2);
BEGIN
    -- Si se cancela, revertir (incrementar saldo)
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        v_account_id := OLD.account_id;
        v_amount := OLD.total_amount;
        
        -- Incrementar saldo de la cuenta (revertir egreso)
        UPDATE public.accounts
        SET 
            current_balance = current_balance + v_amount,
            updated_at = now()
        WHERE id = v_account_id;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_revert_account_balance_on_payment_cancellation
    AFTER UPDATE ON public.payments
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
    EXECUTE FUNCTION public.revert_account_balance_on_payment_cancellation();

-- Crear función para registrar historial de cambios
CREATE OR REPLACE FUNCTION public.log_payment_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.payment_history (
            payment_id,
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
            INSERT INTO public.payment_history (
                payment_id,
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
                CASE NEW.status
                    WHEN 'cancelled' THEN 'CANCELLED'
                    WHEN 'reconciled' THEN 'RECONCILED'
                    WHEN 'open' AND OLD.status = 'cancelled' THEN 'RESTORED'
                    WHEN 'open' AND OLD.status = 'reconciled' THEN 'UNRECONCILED'
                    ELSE 'UPDATED'
                END,
                'status',
                OLD.status,
                NEW.status,
                NEW.updated_by
            );
        END IF;
        
        IF OLD.is_reconciled != NEW.is_reconciled THEN
            INSERT INTO public.payment_history (
                payment_id,
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
                    WHEN NEW.is_reconciled THEN 'RECONCILED'
                    ELSE 'UNRECONCILED'
                END,
                'is_reconciled',
                OLD.is_reconciled::text,
                NEW.is_reconciled::text,
                NEW.updated_by
            );
        END IF;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_log_payment_changes
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.log_payment_changes();

-- Crear RLS (Row Level Security)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Políticas para payments
CREATE POLICY "Users can view payments from their company" ON public.payments
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert payments for their company" ON public.payments
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update payments from their company" ON public.payments
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete payments from their company" ON public.payments
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Políticas para payment_items
CREATE POLICY "Users can view payment items from their company" ON public.payment_items
    FOR SELECT USING (
        payment_id IN (
            SELECT id FROM public.payments
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert payment items for their company" ON public.payment_items
    FOR INSERT WITH CHECK (
        payment_id IN (
            SELECT id FROM public.payments
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update payment items from their company" ON public.payment_items
    FOR UPDATE USING (
        payment_id IN (
            SELECT id FROM public.payments
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete payment items from their company" ON public.payment_items
    FOR DELETE USING (
        payment_id IN (
            SELECT id FROM public.payments
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas para payment_history
CREATE POLICY "Users can view payment history from their company" ON public.payment_history
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert payment history for their company" ON public.payment_history
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE public.payments IS 'Pagos (egresos) - Registra comprobantes de egreso y controla las salidas de dinero del negocio';
COMMENT ON COLUMN public.payments.payment_number IS 'Número del documento (generado desde numeración)';
COMMENT ON COLUMN public.payments.payment_date IS 'Fecha en que se realizó el pago';
COMMENT ON COLUMN public.payments.supplier_id IS 'Proveedor (si el pago es a un proveedor registrado)';
COMMENT ON COLUMN public.payments.contact_name IS 'Nombre del contacto (si no es proveedor registrado)';
COMMENT ON COLUMN public.payments.account_id IS 'Cuenta de donde sale el dinero (obligatorio)';
COMMENT ON COLUMN public.payments.transaction_type IS 'Tipo de transacción: INVOICE_PAYMENT (pago a facturas de compra) o ACCOUNT_PAYMENT (pago a cuentas contables)';
COMMENT ON COLUMN public.payments.status IS 'Estado: open (abierto), cancelled (anulado), reconciled (conciliado)';
COMMENT ON COLUMN public.payments.is_reconciled IS 'Si el pago está conciliado con el estado de cuenta bancario';
COMMENT ON COLUMN public.payments.details IS 'Detalles/concepto del pago (visible en listado)';

COMMENT ON TABLE public.payment_items IS 'Items de pagos - Asociaciones con facturas de compra o cuentas contables';
COMMENT ON COLUMN public.payment_items.item_type IS 'Tipo de item: INVOICE (factura de compra) o ACCOUNT (cuenta contable)';
COMMENT ON COLUMN public.payment_items.purchase_invoice_id IS 'ID de la factura de compra a la que se asocia el pago';
COMMENT ON COLUMN public.payment_items.amount_paid IS 'Monto pagado de esta factura/cuenta';

COMMENT ON FUNCTION public.calculate_payment_total IS 'Recalcula el total de un pago desde sus items';
COMMENT ON FUNCTION public.update_purchase_invoice_paid_amount IS 'Actualiza el monto pagado en facturas de compra cuando se registra un pago';
COMMENT ON FUNCTION public.update_account_balance_on_payment IS 'Actualiza el saldo de la cuenta bancaria cuando se registra un pago (decrementa saldo)';
COMMENT ON FUNCTION public.revert_account_balance_on_payment_cancellation IS 'Revierte el saldo de la cuenta cuando se cancela un pago (incrementa saldo)';












