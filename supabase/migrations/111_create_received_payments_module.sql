-- Crear módulo de pagos recibidos
-- 111_create_received_payments_module.sql

-- Crear tabla de pagos recibidos
CREATE TABLE IF NOT EXISTS public.received_payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Información del documento
    numeration_id uuid REFERENCES public.numerations(id) ON DELETE SET NULL,
    payment_number text, -- Número del documento (generado desde numeración)
    
    -- Fecha y contacto
    payment_date date NOT NULL, -- Fecha en que se recibió el pago
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    
    -- Información bancaria y financiera
    account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT, -- Cuenta donde ingresa el dinero
    payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL, -- Método de pago
    cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL, -- Centro de costo
    
    -- Moneda y monto
    currency text DEFAULT 'COP' CHECK (currency IN ('COP', 'USD', 'EUR')),
    total_amount numeric(15,2) NOT NULL CHECK (total_amount > 0), -- Monto total recibido
    
    -- Notas
    notes text, -- Notas del recibo (visibles en impresión)
    
    -- Tipo de transacción
    transaction_type text NOT NULL CHECK (transaction_type IN (
        'INVOICE_PAYMENT', -- Pago asociado a facturas de venta
        'ACCOUNT_PAYMENT'  -- Pago asociado a cuentas contables
    )),
    
    -- Estado
    status text NOT NULL DEFAULT 'open' CHECK (status IN (
        'open',      -- Abierto (activo)
        'cancelled', -- Anulado
        'reconciled' -- Conciliado
    )),
    is_reconciled boolean DEFAULT false, -- Si está conciliado
    
    -- Referencia bancaria
    bank_reference text, -- Referencia bancaria (consignación, transferencia, etc.)
    check_number text, -- Número de cheque (si aplica)
    
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

-- Crear tabla de items de pagos recibidos (asociaciones con facturas o cuentas)
CREATE TABLE IF NOT EXISTS public.received_payment_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    received_payment_id uuid NOT NULL REFERENCES public.received_payments(id) ON DELETE CASCADE,
    
    -- Tipo de asociación
    item_type text NOT NULL CHECK (item_type IN (
        'INVOICE', -- Asociado a una factura de venta
        'ACCOUNT'  -- Asociado a una cuenta contable
    )),
    
    -- Si es factura
    sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
    amount_paid numeric(15,2) NOT NULL CHECK (amount_paid > 0), -- Monto pagado de esta factura/cuenta
    
    -- Si es cuenta contable
    account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL, -- Cuenta contable relacionada
    
    -- Descripción
    description text, -- Descripción del item
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de historial de pagos recibidos (para auditoría)
CREATE TABLE IF NOT EXISTS public.received_payment_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    received_payment_id uuid NOT NULL REFERENCES public.received_payments(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_received_payments_company_id ON public.received_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_received_payments_customer_id ON public.received_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_received_payments_account_id ON public.received_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_received_payments_payment_date ON public.received_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_received_payments_status ON public.received_payments(status);
CREATE INDEX IF NOT EXISTS idx_received_payments_is_reconciled ON public.received_payments(is_reconciled);
CREATE INDEX IF NOT EXISTS idx_received_payments_payment_number ON public.received_payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_received_payments_numeration_id ON public.received_payments(numeration_id);

CREATE INDEX IF NOT EXISTS idx_received_payment_items_received_payment_id ON public.received_payment_items(received_payment_id);
CREATE INDEX IF NOT EXISTS idx_received_payment_items_sale_id ON public.received_payment_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_received_payment_items_account_id ON public.received_payment_items(account_id);
CREATE INDEX IF NOT EXISTS idx_received_payment_items_item_type ON public.received_payment_items(item_type);

CREATE INDEX IF NOT EXISTS idx_received_payment_history_received_payment_id ON public.received_payment_history(received_payment_id);
CREATE INDEX IF NOT EXISTS idx_received_payment_history_company_id ON public.received_payment_history(company_id);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_received_payments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_received_payments_updated_at
    BEFORE UPDATE ON public.received_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_received_payments_updated_at();

-- Crear función para calcular total de pagos recibidos desde items
CREATE OR REPLACE FUNCTION public.calculate_received_payment_total(p_received_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_amount numeric(15,2) := 0;
    v_current_total numeric(15,2);
BEGIN
    -- Calcular total desde items
    SELECT COALESCE(SUM(amount_paid), 0)
    INTO v_total_amount
    FROM public.received_payment_items
    WHERE received_payment_id = p_received_payment_id;
    
    -- Asegurar que el total nunca sea NULL
    IF v_total_amount IS NULL THEN
        v_total_amount := 0;
    END IF;
    
    -- Obtener el total actual del pago para comparar
    SELECT total_amount INTO v_current_total
    FROM public.received_payments
    WHERE id = p_received_payment_id;
    
    -- Solo actualizar si hay items o si el total actual es NULL
    -- Si no hay items pero ya hay un total válido, mantenerlo
    IF v_total_amount > 0 OR v_current_total IS NULL THEN
        UPDATE public.received_payments
        SET total_amount = GREATEST(v_total_amount, 0),
            updated_at = now()
        WHERE id = p_received_payment_id;
    END IF;
END;
$$;

-- Crear trigger para recalcular total cuando se modifican items
CREATE OR REPLACE FUNCTION public.trigger_calculate_received_payment_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.calculate_received_payment_total(
        COALESCE(NEW.received_payment_id, OLD.received_payment_id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_recalculate_received_payment_total
    AFTER INSERT OR UPDATE OR DELETE ON public.received_payment_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_received_payment_total();

-- Crear función para generar número de pago desde numeración
CREATE OR REPLACE FUNCTION public.generate_received_payment_number(
    p_company_id uuid,
    p_numeration_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_numeration public.numerations%ROWTYPE;
    v_next_number integer;
    v_formatted_number text;
BEGIN
    -- Obtener la numeración
    SELECT * INTO v_numeration
    FROM public.numerations
    WHERE id = p_numeration_id
      AND company_id = p_company_id
      AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Numeración no encontrada o inactiva';
    END IF;
    
    -- Incrementar el número actual
    v_next_number := v_numeration.current_number + 1;
    
    -- Actualizar el número actual en la numeración
    UPDATE public.numerations
    SET current_number = v_next_number,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_numeration_id;
    
    -- Formatear el número con ceros a la izquierda
    v_formatted_number := lpad(v_next_number::text, v_numeration.number_length, '0');
    
    -- Retornar el número formateado completo
    RETURN v_numeration.prefix || v_formatted_number || v_numeration.suffix;
END;
$$;

-- Crear función para registrar historial de cambios
CREATE OR REPLACE FUNCTION public.log_received_payment_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.received_payment_history (
            received_payment_id,
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
            INSERT INTO public.received_payment_history (
                received_payment_id,
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

CREATE TRIGGER trigger_log_received_payment_changes
    AFTER INSERT OR UPDATE ON public.received_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.log_received_payment_changes();

-- Crear función para actualizar saldo de cuenta al recibir pago
CREATE OR REPLACE FUNCTION public.update_account_balance_on_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'open' THEN
        -- Incrementar saldo de la cuenta
        UPDATE public.accounts
        SET current_balance = current_balance + NEW.total_amount,
            updated_at = now()
        WHERE id = NEW.account_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Si se anula, revertir el saldo
        IF OLD.status = 'open' AND NEW.status = 'cancelled' THEN
            UPDATE public.accounts
            SET current_balance = current_balance - OLD.total_amount,
                updated_at = now()
            WHERE id = NEW.account_id;
        -- Si se restaura, volver a sumar
        ELSIF OLD.status = 'cancelled' AND NEW.status = 'open' THEN
            UPDATE public.accounts
            SET current_balance = current_balance + NEW.total_amount,
                updated_at = now()
            WHERE id = NEW.account_id;
        -- Si cambia el monto y está activo
        ELSIF OLD.status = 'open' AND NEW.status = 'open' AND OLD.total_amount != NEW.total_amount THEN
            UPDATE public.accounts
            SET current_balance = current_balance - OLD.total_amount + NEW.total_amount,
                updated_at = now()
            WHERE id = NEW.account_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'open' THEN
        -- Si se elimina un pago activo, revertir el saldo
        UPDATE public.accounts
        SET current_balance = current_balance - OLD.total_amount,
            updated_at = now()
        WHERE id = OLD.account_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_account_balance_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON public.received_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_account_balance_on_payment();

-- Crear RLS (Row Level Security)
ALTER TABLE public.received_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.received_payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.received_payment_history ENABLE ROW LEVEL SECURITY;

-- Políticas para received_payments
CREATE POLICY "Users can view received payments from their company" ON public.received_payments
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert received payments for their company" ON public.received_payments
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update received payments from their company" ON public.received_payments
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        AND (is_reconciled = false OR status = 'cancelled')
    );

CREATE POLICY "Users can delete received payments from their company" ON public.received_payments
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        AND is_reconciled = false
    );

-- Políticas para received_payment_items
CREATE POLICY "Users can view received payment items from their company" ON public.received_payment_items
    FOR SELECT USING (
        received_payment_id IN (
            SELECT id FROM public.received_payments
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert received payment items for their company" ON public.received_payment_items
    FOR INSERT WITH CHECK (
        received_payment_id IN (
            SELECT id FROM public.received_payments
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update received payment items from their company" ON public.received_payment_items
    FOR UPDATE USING (
        received_payment_id IN (
            SELECT id FROM public.received_payments
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete received payment items from their company" ON public.received_payment_items
    FOR DELETE USING (
        received_payment_id IN (
            SELECT id FROM public.received_payments
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas para received_payment_history
CREATE POLICY "Users can view received payment history from their company" ON public.received_payment_history
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert received payment history for their company" ON public.received_payment_history
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE public.received_payments IS 'Pagos recibidos de clientes (recibos de caja)';
COMMENT ON COLUMN public.received_payments.transaction_type IS 'Tipo de transacción: INVOICE_PAYMENT (pago a facturas) o ACCOUNT_PAYMENT (pago a cuentas contables)';
COMMENT ON COLUMN public.received_payments.status IS 'Estado del pago: open (abierto), cancelled (anulado), reconciled (conciliado)';
COMMENT ON COLUMN public.received_payments.is_reconciled IS 'Indica si el pago está conciliado (no se puede eliminar si está conciliado)';

COMMENT ON TABLE public.received_payment_items IS 'Items de pagos recibidos (asociaciones con facturas o cuentas contables)';
COMMENT ON COLUMN public.received_payment_items.item_type IS 'Tipo de item: INVOICE (factura de venta) o ACCOUNT (cuenta contable)';

COMMENT ON TABLE public.received_payment_history IS 'Historial de cambios en pagos recibidos';

COMMENT ON FUNCTION public.generate_received_payment_number IS 'Genera el número de pago recibido desde la numeración';
COMMENT ON FUNCTION public.calculate_received_payment_total IS 'Recalcula el total de un pago recibido desde sus items';
COMMENT ON FUNCTION public.update_account_balance_on_payment IS 'Actualiza el saldo de la cuenta bancaria cuando se recibe un pago';

