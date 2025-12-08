-- Crear módulo de facturas recurrentes
-- 110_create_recurring_invoices_module.sql

-- Crear tabla de facturas recurrentes
CREATE TABLE IF NOT EXISTS public.recurring_invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Información del documento
    numeration_id uuid REFERENCES public.numerations(id) ON DELETE SET NULL,
    
    -- Cliente
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    
    -- Fechas y programación
    start_date date NOT NULL, -- Fecha de inicio de la recurrencia
    end_date date, -- Fecha de finalización (NULL = sin fecha de fin)
    day_of_month integer NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31), -- Día del mes para generar
    frequency_months integer NOT NULL DEFAULT 1 CHECK (frequency_months > 0), -- Frecuencia en meses (1 = mensual, 2 = bimestral, etc.)
    
    -- Plazo y términos
    payment_terms integer DEFAULT 0 CHECK (payment_terms >= 0), -- Días de plazo de pago
    
    -- Moneda y bodega
    currency text DEFAULT 'COP' CHECK (currency IN ('COP', 'USD', 'EUR')),
    warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
    
    -- Notas
    notes text, -- Notas visibles en el PDF
    observations text, -- Notas internas (no visibles en PDF)
    
    -- Lista de precios (opcional, para futuras implementaciones)
    price_list_id uuid, -- Para futuras implementaciones
    
    -- Cálculos
    subtotal numeric(15,2) DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount numeric(15,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount numeric(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount numeric(15,2) DEFAULT 0 CHECK (total_amount >= 0),
    
    -- Estado
    is_active boolean DEFAULT true,
    last_generated_date date, -- Última fecha en que se generó una factura
    next_generation_date date, -- Próxima fecha programada para generar
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    updated_by uuid REFERENCES public.profiles(id)
);

-- Crear tabla de items de facturas recurrentes
CREATE TABLE IF NOT EXISTS public.recurring_invoice_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recurring_invoice_id uuid NOT NULL REFERENCES public.recurring_invoices(id) ON DELETE CASCADE,
    
    -- Producto
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    
    -- Información del producto en la factura
    product_reference text, -- Referencia/código alfanumérico único
    description text, -- Descripción del producto (puede diferir del producto base)
    
    -- Precios y cantidades
    quantity numeric(10,2) NOT NULL CHECK (quantity > 0),
    unit_price numeric(15,2) NOT NULL CHECK (unit_price >= 0),
    discount_percentage numeric(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    discount_amount numeric(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
    
    -- Impuestos
    tax_id uuid REFERENCES public.taxes(id) ON DELETE SET NULL,
    
    -- Total
    total_price numeric(15,2) NOT NULL CHECK (total_price >= 0),
    
    -- Orden de visualización
    sort_order integer DEFAULT 0,
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de historial de generación de facturas
CREATE TABLE IF NOT EXISTS public.recurring_invoice_generations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recurring_invoice_id uuid NOT NULL REFERENCES public.recurring_invoices(id) ON DELETE CASCADE,
    sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL, -- Factura generada
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    scheduled_date date NOT NULL, -- Fecha programada
    generated_date timestamp with time zone DEFAULT now(), -- Fecha real de generación
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'failed', 'skipped')),
    error_message text,
    generated_by uuid REFERENCES public.profiles(id)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_company_id ON public.recurring_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_customer_id ON public.recurring_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_is_active ON public.recurring_invoices(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_generation_date ON public.recurring_invoices(next_generation_date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_start_date ON public.recurring_invoices(start_date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_end_date ON public.recurring_invoices(end_date);

CREATE INDEX IF NOT EXISTS idx_recurring_invoice_items_recurring_invoice_id ON public.recurring_invoice_items(recurring_invoice_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoice_items_product_id ON public.recurring_invoice_items(product_id);

CREATE INDEX IF NOT EXISTS idx_recurring_invoice_generations_recurring_invoice_id ON public.recurring_invoice_generations(recurring_invoice_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoice_generations_company_id ON public.recurring_invoice_generations(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoice_generations_scheduled_date ON public.recurring_invoice_generations(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoice_generations_status ON public.recurring_invoice_generations(status);
CREATE INDEX IF NOT EXISTS idx_recurring_invoice_generations_sale_id ON public.recurring_invoice_generations(sale_id);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_recurring_invoices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_recurring_invoices_updated_at
    BEFORE UPDATE ON public.recurring_invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_recurring_invoices_updated_at();

CREATE OR REPLACE FUNCTION public.update_recurring_invoice_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_recurring_invoice_items_updated_at
    BEFORE UPDATE ON public.recurring_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_recurring_invoice_items_updated_at();

-- Crear función para calcular totales de factura recurrente
CREATE OR REPLACE FUNCTION public.calculate_recurring_invoice_totals(p_recurring_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_subtotal numeric(15,2) := 0;
    v_tax_amount numeric(15,2) := 0;
    v_discount_amount numeric(15,2) := 0;
    v_total_amount numeric(15,2) := 0;
BEGIN
    -- Calcular subtotal, descuentos y totales de items
    SELECT 
        COALESCE(SUM(total_price), 0),
        COALESCE(SUM(discount_amount), 0)
    INTO v_subtotal, v_discount_amount
    FROM public.recurring_invoice_items
    WHERE recurring_invoice_id = p_recurring_invoice_id;
    
    -- Calcular impuestos (esto se puede mejorar con la tabla de taxes)
    -- Por ahora, asumimos que los impuestos están incluidos en el precio o se calculan después
    
    v_total_amount := v_subtotal - v_discount_amount + v_tax_amount;
    
    -- Actualizar la factura recurrente
    UPDATE public.recurring_invoices
    SET 
        subtotal = v_subtotal,
        discount_amount = v_discount_amount,
        tax_amount = v_tax_amount,
        total_amount = v_total_amount,
        updated_at = now()
    WHERE id = p_recurring_invoice_id;
END;
$$;

-- Crear trigger para recalcular totales cuando se modifican items
CREATE OR REPLACE FUNCTION public.trigger_calculate_recurring_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.calculate_recurring_invoice_totals(
        COALESCE(NEW.recurring_invoice_id, OLD.recurring_invoice_id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_recalculate_recurring_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.recurring_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_recurring_invoice_totals();

-- Crear función para calcular la próxima fecha de generación
CREATE OR REPLACE FUNCTION public.calculate_next_generation_date(
    p_start_date date,
    p_end_date date,
    p_day_of_month integer,
    p_frequency_months integer,
    p_last_generated_date date
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_next_date date;
    v_current_date date := CURRENT_DATE;
    v_year integer;
    v_month integer;
    v_day integer;
    v_last_day_of_month integer;
BEGIN
    -- Si hay una fecha de fin y ya pasó, retornar NULL
    IF p_end_date IS NOT NULL AND p_end_date < v_current_date THEN
        RETURN NULL;
    END IF;
    
    -- Si no hay fecha de inicio válida, retornar NULL
    IF p_start_date IS NULL OR p_start_date > v_current_date THEN
        RETURN p_start_date;
    END IF;
    
    -- Calcular desde la última fecha generada o desde la fecha de inicio
    IF p_last_generated_date IS NOT NULL THEN
        v_next_date := p_last_generated_date;
    ELSE
        v_next_date := p_start_date;
    END IF;
    
    -- Calcular la próxima fecha
    v_next_date := v_next_date + (p_frequency_months || ' months')::interval;
    
    -- Extraer año, mes y día
    v_year := EXTRACT(YEAR FROM v_next_date);
    v_month := EXTRACT(MONTH FROM v_next_date);
    v_day := p_day_of_month;
    
    -- Obtener el último día del mes
    v_last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day'));
    
    -- Si el día solicitado es mayor al último día del mes, usar el último día
    IF v_day > v_last_day_of_month THEN
        v_day := v_last_day_of_month;
    END IF;
    
    -- Construir la fecha
    v_next_date := make_date(v_year, v_month, v_day);
    
    -- Si la fecha calculada es anterior a hoy, calcular la siguiente
    WHILE v_next_date < v_current_date LOOP
        v_next_date := v_next_date + (p_frequency_months || ' months')::interval;
        v_year := EXTRACT(YEAR FROM v_next_date);
        v_month := EXTRACT(MONTH FROM v_next_date);
        v_last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day'));
        
        IF p_day_of_month > v_last_day_of_month THEN
            v_day := v_last_day_of_month;
        ELSE
            v_day := p_day_of_month;
        END IF;
        
        v_next_date := make_date(v_year, v_month, v_day);
    END LOOP;
    
    -- Verificar si excede la fecha de fin
    IF p_end_date IS NOT NULL AND v_next_date > p_end_date THEN
        RETURN NULL;
    END IF;
    
    RETURN v_next_date;
END;
$$;

-- Crear función para actualizar next_generation_date automáticamente
CREATE OR REPLACE FUNCTION public.update_next_generation_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.next_generation_date := public.calculate_next_generation_date(
        NEW.start_date,
        NEW.end_date,
        NEW.day_of_month,
        NEW.frequency_months,
        NEW.last_generated_date
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_next_generation_date
    BEFORE INSERT OR UPDATE ON public.recurring_invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_next_generation_date();

-- Crear RLS (Row Level Security)
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_invoice_generations ENABLE ROW LEVEL SECURITY;

-- Políticas para recurring_invoices
CREATE POLICY "Users can view recurring invoices from their company" ON public.recurring_invoices
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert recurring invoices for their company" ON public.recurring_invoices
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update recurring invoices from their company" ON public.recurring_invoices
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete recurring invoices from their company" ON public.recurring_invoices
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Políticas para recurring_invoice_items
CREATE POLICY "Users can view recurring invoice items from their company" ON public.recurring_invoice_items
    FOR SELECT USING (
        recurring_invoice_id IN (
            SELECT id FROM public.recurring_invoices
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert recurring invoice items for their company" ON public.recurring_invoice_items
    FOR INSERT WITH CHECK (
        recurring_invoice_id IN (
            SELECT id FROM public.recurring_invoices
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update recurring invoice items from their company" ON public.recurring_invoice_items
    FOR UPDATE USING (
        recurring_invoice_id IN (
            SELECT id FROM public.recurring_invoices
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete recurring invoice items from their company" ON public.recurring_invoice_items
    FOR DELETE USING (
        recurring_invoice_id IN (
            SELECT id FROM public.recurring_invoices
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas para recurring_invoice_generations
CREATE POLICY "Users can view recurring invoice generations from their company" ON public.recurring_invoice_generations
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert recurring invoice generations for their company" ON public.recurring_invoice_generations
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update recurring invoice generations from their company" ON public.recurring_invoice_generations
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE public.recurring_invoices IS 'Facturas recurrentes que se generan automáticamente';
COMMENT ON COLUMN public.recurring_invoices.day_of_month IS 'Día del mes en que se genera la factura (1-31)';
COMMENT ON COLUMN public.recurring_invoices.frequency_months IS 'Cada cuántos meses se genera la factura (1 = mensual, 2 = bimestral, etc.)';
COMMENT ON COLUMN public.recurring_invoices.next_generation_date IS 'Próxima fecha programada para generar la factura';
COMMENT ON COLUMN public.recurring_invoices.notes IS 'Notas visibles en el PDF de la factura';
COMMENT ON COLUMN public.recurring_invoices.observations IS 'Notas internas no visibles en el PDF';

COMMENT ON TABLE public.recurring_invoice_items IS 'Items/productos de facturas recurrentes';
COMMENT ON TABLE public.recurring_invoice_generations IS 'Historial de generación de facturas desde facturas recurrentes';

COMMENT ON FUNCTION public.calculate_next_generation_date IS 'Calcula la próxima fecha de generación basada en la programación';
COMMENT ON FUNCTION public.calculate_recurring_invoice_totals IS 'Recalcula los totales de una factura recurrente';
-- TODO: Implementar función generate_recurring_invoice en el futuro

