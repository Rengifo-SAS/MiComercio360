-- Crear módulo de pagos recurrentes (egresos)
-- 117_create_recurring_payments_module.sql

-- Crear tabla de pagos recurrentes
CREATE TABLE IF NOT EXISTS public.recurring_payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Información del documento
    numeration_id uuid REFERENCES public.numerations(id) ON DELETE SET NULL,
    
    -- Proveedor o contacto
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL, -- Proveedor (si aplica)
    contact_name text, -- Nombre del contacto (si no es proveedor registrado)
    
    -- Fechas y programación
    start_date date NOT NULL, -- Fecha de inicio de la recurrencia
    end_date date, -- Fecha de finalización (NULL = sin fecha de fin)
    day_of_month integer NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31), -- Día del mes para generar
    frequency_months integer NOT NULL DEFAULT 1 CHECK (frequency_months > 0), -- Frecuencia en meses (1 = mensual, 2 = bimestral, etc.)
    
    -- Información bancaria y financiera
    account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT, -- Cuenta de donde sale el dinero
    payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL, -- Método de pago
    cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL, -- Centro de costo
    
    -- Moneda
    currency text DEFAULT 'COP' CHECK (currency IN ('COP', 'USD', 'EUR')),
    
    -- Detalles y concepto
    details text, -- Detalles del pago (concepto)
    notes text, -- Notas internas
    
    -- Tipo de transacción
    transaction_type text NOT NULL CHECK (transaction_type IN (
        'INVOICE_PAYMENT', -- Pago asociado a facturas de compra
        'ACCOUNT_PAYMENT'  -- Pago asociado a cuentas contables
    )),
    
    -- Cálculos
    total_amount numeric(15,2) DEFAULT 0 CHECK (total_amount >= 0),
    
    -- Estado
    is_active boolean DEFAULT true,
    last_generated_date date, -- Última fecha en que se generó un pago
    next_generation_date date, -- Próxima fecha programada para generar
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    updated_by uuid REFERENCES public.profiles(id)
);

-- Crear tabla de items de pagos recurrentes
CREATE TABLE IF NOT EXISTS public.recurring_payment_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recurring_payment_id uuid NOT NULL REFERENCES public.recurring_payments(id) ON DELETE CASCADE,
    
    -- Tipo de item
    item_type text NOT NULL CHECK (item_type IN (
        'INVOICE', -- Asociado a una factura de compra (para futuras implementaciones)
        'ACCOUNT'  -- Asociado a una cuenta contable
    )),
    
    -- Si es factura de compra (para futuras implementaciones)
    purchase_invoice_id uuid REFERENCES public.purchase_invoices(id) ON DELETE SET NULL,
    
    -- Si es cuenta contable
    account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL, -- Cuenta contable relacionada
    
    -- Monto
    amount numeric(15,2) NOT NULL CHECK (amount > 0), -- Monto del item
    
    -- Descripción
    description text, -- Descripción del item
    
    -- Orden de visualización
    sort_order integer DEFAULT 0,
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de historial de generación de pagos
CREATE TABLE IF NOT EXISTS public.recurring_payment_generations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recurring_payment_id uuid NOT NULL REFERENCES public.recurring_payments(id) ON DELETE CASCADE,
    payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL, -- Pago generado
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    scheduled_date date NOT NULL, -- Fecha programada
    generated_date timestamp with time zone DEFAULT now(), -- Fecha real de generación
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'failed', 'skipped')),
    error_message text,
    generated_by uuid REFERENCES public.profiles(id)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_recurring_payments_company_id ON public.recurring_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_supplier_id ON public.recurring_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_is_active ON public.recurring_payments(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_next_generation_date ON public.recurring_payments(next_generation_date);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_start_date ON public.recurring_payments(start_date);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_end_date ON public.recurring_payments(end_date);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_account_id ON public.recurring_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_payment_method_id ON public.recurring_payments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_cost_center_id ON public.recurring_payments(cost_center_id);

CREATE INDEX IF NOT EXISTS idx_recurring_payment_items_recurring_payment_id ON public.recurring_payment_items(recurring_payment_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_items_account_id ON public.recurring_payment_items(account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_items_item_type ON public.recurring_payment_items(item_type);

CREATE INDEX IF NOT EXISTS idx_recurring_payment_generations_recurring_payment_id ON public.recurring_payment_generations(recurring_payment_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_generations_company_id ON public.recurring_payment_generations(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_generations_scheduled_date ON public.recurring_payment_generations(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_generations_status ON public.recurring_payment_generations(status);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_generations_payment_id ON public.recurring_payment_generations(payment_id);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_recurring_payments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_recurring_payments_updated_at
    BEFORE UPDATE ON public.recurring_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_recurring_payments_updated_at();

CREATE OR REPLACE FUNCTION public.update_recurring_payment_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_recurring_payment_items_updated_at
    BEFORE UPDATE ON public.recurring_payment_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_recurring_payment_items_updated_at();

-- Crear función para calcular totales de pago recurrente
CREATE OR REPLACE FUNCTION public.calculate_recurring_payment_totals(p_recurring_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_amount numeric(15,2) := 0;
BEGIN
    -- Calcular total desde items
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_amount
    FROM public.recurring_payment_items
    WHERE recurring_payment_id = p_recurring_payment_id;
    
    -- Actualizar el pago recurrente
    UPDATE public.recurring_payments
    SET 
        total_amount = v_total_amount,
        updated_at = now()
    WHERE id = p_recurring_payment_id;
END;
$$;

-- Crear trigger para recalcular totales cuando se modifican items
CREATE OR REPLACE FUNCTION public.trigger_calculate_recurring_payment_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.calculate_recurring_payment_totals(
        COALESCE(NEW.recurring_payment_id, OLD.recurring_payment_id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_recalculate_recurring_payment_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.recurring_payment_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_recurring_payment_totals();

-- Crear función para calcular próxima fecha de generación
CREATE OR REPLACE FUNCTION public.calculate_next_recurring_payment_date(
    p_start_date date,
    p_day_of_month integer,
    p_frequency_months integer,
    p_last_generated_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL
)
RETURNS date
LANGUAGE plpgsql
AS $$
DECLARE
    v_next_date date;
    v_current_date date;
    v_year integer;
    v_month integer;
    v_day integer;
    v_last_day_of_month integer;
BEGIN
    -- Usar fecha actual como referencia
    v_current_date := COALESCE(p_last_generated_date, CURRENT_DATE);
    
    -- Si la fecha actual es anterior a la fecha de inicio, usar fecha de inicio
    IF v_current_date < p_start_date THEN
        v_current_date := p_start_date;
    END IF;
    
    -- Extraer año y mes de la fecha actual
    v_year := EXTRACT(YEAR FROM v_current_date);
    v_month := EXTRACT(MONTH FROM v_current_date);
    v_day := EXTRACT(DAY FROM v_current_date);
    
    -- Si no hay última generación, calcular desde el mes actual
    IF p_last_generated_date IS NULL THEN
        -- Calcular próxima fecha basada en el día del mes
        v_next_date := make_date(v_year, v_month, p_day_of_month);
        
        -- Si la fecha calculada ya pasó este mes, ir al siguiente período
        IF v_next_date < v_current_date THEN
            v_month := v_month + p_frequency_months;
            IF v_month > 12 THEN
                v_month := v_month - 12;
                v_year := v_year + 1;
            END IF;
            v_next_date := make_date(v_year, v_month, p_day_of_month);
        END IF;
    ELSE
        -- Si ya hubo una generación, calcular la próxima sumando la frecuencia
        v_month := v_month + p_frequency_months;
        IF v_month > 12 THEN
            v_month := v_month - 12;
            v_year := v_year + 1;
        END IF;
        v_next_date := make_date(v_year, v_month, p_day_of_month);
    END IF;
    
    -- Ajustar si el día del mes no existe en el mes calculado (ej: día 31 en febrero)
    v_last_day_of_month := EXTRACT(DAY FROM (make_date(v_year, v_month, 1) + INTERVAL '1 month' - INTERVAL '1 day'));
    IF p_day_of_month > v_last_day_of_month THEN
        v_next_date := make_date(v_year, v_month, v_last_day_of_month);
    END IF;
    
    -- Verificar que no exceda la fecha de fin
    IF p_end_date IS NOT NULL AND v_next_date > p_end_date THEN
        RETURN NULL; -- No hay próxima fecha
    END IF;
    
    RETURN v_next_date;
END;
$$;

-- Crear función para establecer próxima fecha de generación
CREATE OR REPLACE FUNCTION public.set_next_recurring_payment_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_next_date date;
BEGIN
    -- Solo calcular si está activo
    IF NEW.is_active = true THEN
        v_next_date := public.calculate_next_recurring_payment_date(
            NEW.start_date,
            NEW.day_of_month,
            NEW.frequency_months,
            NEW.last_generated_date,
            NEW.end_date
        );
        NEW.next_generation_date := v_next_date;
    ELSE
        NEW.next_generation_date := NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_next_recurring_payment_date
    BEFORE INSERT OR UPDATE ON public.recurring_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_next_recurring_payment_date();

-- Crear función para generar pago desde pago recurrente
CREATE OR REPLACE FUNCTION public.generate_payment_from_recurring(
    p_recurring_payment_id uuid,
    p_generation_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_recurring_payment record;
    v_payment_id uuid;
    v_payment_number text;
    v_generation_date date;
    v_items record;
    v_user_id uuid;
    v_company_id uuid;
BEGIN
    -- Obtener usuario actual
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;
    
    -- Obtener información del pago recurrente
    SELECT * INTO v_recurring_payment
    FROM public.recurring_payments
    WHERE id = p_recurring_payment_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pago recurrente no encontrado';
    END IF;
    
    IF v_recurring_payment.is_active = false THEN
        RAISE EXCEPTION 'El pago recurrente no está activo';
    END IF;
    
    v_company_id := v_recurring_payment.company_id;
    v_generation_date := COALESCE(p_generation_date, CURRENT_DATE);
    
    -- Generar número de pago si hay numeración
    IF v_recurring_payment.numeration_id IS NOT NULL THEN
        SELECT name INTO v_payment_number
        FROM public.numerations 
        WHERE id = v_recurring_payment.numeration_id;
        
        -- Llamar a la función RPC para obtener el siguiente número
        -- Esto se debe hacer desde el cliente (TypeScript), no desde la función SQL
        -- Por ahora, dejamos el número vacío y se generará desde el servicio
        v_payment_number := NULL;
    END IF;
    
    -- Crear el pago
    INSERT INTO public.payments (
        company_id,
        numeration_id,
        payment_number,
        payment_date,
        supplier_id,
        contact_name,
        account_id,
        payment_method_id,
        cost_center_id,
        currency,
        details,
        notes,
        transaction_type,
        total_amount,
        status,
        is_reconciled,
        created_by
    )
    VALUES (
        v_company_id,
        v_recurring_payment.numeration_id,
        v_payment_number,
        v_generation_date,
        v_recurring_payment.supplier_id,
        v_recurring_payment.contact_name,
        v_recurring_payment.account_id,
        v_recurring_payment.payment_method_id,
        v_recurring_payment.cost_center_id,
        v_recurring_payment.currency,
        v_recurring_payment.details,
        v_recurring_payment.notes,
        v_recurring_payment.transaction_type,
        v_recurring_payment.total_amount,
        'open',
        false,
        v_user_id
    )
    RETURNING id INTO v_payment_id;
    
    -- Crear los items del pago
    FOR v_items IN 
        SELECT * FROM public.recurring_payment_items
        WHERE recurring_payment_id = p_recurring_payment_id
        ORDER BY sort_order
    LOOP
        INSERT INTO public.payment_items (
            payment_id,
            item_type,
            purchase_invoice_id,
            account_id,
            amount_paid,
            description
        )
        VALUES (
            v_payment_id,
            v_items.item_type,
            v_items.purchase_invoice_id,
            v_items.account_id,
            v_items.amount,
            v_items.description
        );
    END LOOP;
    
    -- Actualizar última fecha de generación y próxima fecha
    UPDATE public.recurring_payments
    SET 
        last_generated_date = v_generation_date,
        next_generation_date = public.calculate_next_recurring_payment_date(
            start_date,
            day_of_month,
            frequency_months,
            v_generation_date,
            end_date
        ),
        updated_at = now()
    WHERE id = p_recurring_payment_id;
    
    -- Registrar la generación
    INSERT INTO public.recurring_payment_generations (
        recurring_payment_id,
        payment_id,
        company_id,
        scheduled_date,
        generated_date,
        status,
        generated_by
    )
    VALUES (
        p_recurring_payment_id,
        v_payment_id,
        v_company_id,
        v_generation_date,
        now(),
        'generated',
        v_user_id
    );
    
    RETURN v_payment_id;
END;
$$;

-- Crear RLS (Row Level Security)
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payment_generations ENABLE ROW LEVEL SECURITY;

-- Políticas para recurring_payments
CREATE POLICY "Users can view recurring payments from their company" ON public.recurring_payments
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert recurring payments for their company" ON public.recurring_payments
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update recurring payments from their company" ON public.recurring_payments
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete recurring payments from their company" ON public.recurring_payments
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Políticas para recurring_payment_items
CREATE POLICY "Users can view recurring payment items from their company" ON public.recurring_payment_items
    FOR SELECT USING (
        recurring_payment_id IN (
            SELECT id FROM public.recurring_payments
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert recurring payment items for their company" ON public.recurring_payment_items
    FOR INSERT WITH CHECK (
        recurring_payment_id IN (
            SELECT id FROM public.recurring_payments
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update recurring payment items from their company" ON public.recurring_payment_items
    FOR UPDATE USING (
        recurring_payment_id IN (
            SELECT id FROM public.recurring_payments
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete recurring payment items from their company" ON public.recurring_payment_items
    FOR DELETE USING (
        recurring_payment_id IN (
            SELECT id FROM public.recurring_payments
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas para recurring_payment_generations
CREATE POLICY "Users can view recurring payment generations from their company" ON public.recurring_payment_generations
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert recurring payment generations for their company" ON public.recurring_payment_generations
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE public.recurring_payments IS 'Pagos recurrentes (egresos) - Programa gastos que se repiten periódicamente';
COMMENT ON COLUMN public.recurring_payments.start_date IS 'Fecha de inicio de la recurrencia';
COMMENT ON COLUMN public.recurring_payments.end_date IS 'Fecha de finalización (NULL = sin fecha de fin)';
COMMENT ON COLUMN public.recurring_payments.day_of_month IS 'Día del mes para generar el pago (1-31)';
COMMENT ON COLUMN public.recurring_payments.frequency_months IS 'Frecuencia en meses (1 = mensual, 2 = bimestral, etc.)';
COMMENT ON COLUMN public.recurring_payments.account_id IS 'Cuenta de donde sale el dinero (obligatorio)';
COMMENT ON COLUMN public.recurring_payments.supplier_id IS 'Proveedor (si el pago es a un proveedor registrado)';
COMMENT ON COLUMN public.recurring_payments.contact_name IS 'Nombre del contacto (si no es proveedor registrado)';
COMMENT ON COLUMN public.recurring_payments.details IS 'Detalles/concepto del pago';
COMMENT ON COLUMN public.recurring_payments.next_generation_date IS 'Próxima fecha programada para generar el pago (calculada automáticamente)';
COMMENT ON COLUMN public.recurring_payments.last_generated_date IS 'Última fecha en que se generó un pago';

COMMENT ON TABLE public.recurring_payment_items IS 'Items de pagos recurrentes - Asociaciones con cuentas contables';
COMMENT ON COLUMN public.recurring_payment_items.item_type IS 'Tipo de item: INVOICE (factura de compra) o ACCOUNT (cuenta contable)';
COMMENT ON COLUMN public.recurring_payment_items.amount IS 'Monto del item';

COMMENT ON TABLE public.recurring_payment_generations IS 'Historial de generación de pagos desde pagos recurrentes';
COMMENT ON COLUMN public.recurring_payment_generations.scheduled_date IS 'Fecha programada para generar';
COMMENT ON COLUMN public.recurring_payment_generations.generated_date IS 'Fecha real de generación';
COMMENT ON COLUMN public.recurring_payment_generations.status IS 'Estado: pending, generated, failed, skipped';

COMMENT ON FUNCTION public.calculate_recurring_payment_totals IS 'Recalcula los totales de un pago recurrente desde sus items';
COMMENT ON FUNCTION public.calculate_next_recurring_payment_date IS 'Calcula la próxima fecha de generación de un pago recurrente';
COMMENT ON FUNCTION public.generate_payment_from_recurring IS 'Genera un pago automáticamente desde un pago recurrente';

