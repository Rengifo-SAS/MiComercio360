-- Crear módulo de cotizaciones
-- 113_create_quotes_module.sql

-- Crear tabla de cotizaciones
CREATE TABLE IF NOT EXISTS public.quotes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Información del documento
    numeration_id uuid REFERENCES public.numerations(id) ON DELETE SET NULL,
    quote_number text, -- Número del documento (generado desde numeración)
    
    -- Información básica
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    quote_date date NOT NULL, -- Fecha de creación de la cotización
    expiration_date date, -- Fecha de vencimiento (calculada con base en el plazo)
    payment_terms integer DEFAULT 0 CHECK (payment_terms >= 0), -- Plazo en días (para calcular vencimiento)
    
    -- Personalización
    currency text DEFAULT 'COP' CHECK (currency IN ('COP', 'USD', 'EUR')),
    price_list_id uuid, -- Lista de precios (para futuras implementaciones)
    salesperson_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Vendedor
    
    -- Bodega (para cuando se convierte a venta)
    warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
    
    -- Totales
    subtotal numeric(15,2) DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount numeric(15,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount numeric(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount numeric(15,2) DEFAULT 0 CHECK (total_amount >= 0),
    
    -- Notas y comentarios
    notes text, -- Notas visibles en el PDF y en la impresión
    comments text, -- Comentarios internos (no visibles en impresión)
    
    -- Estado
    status text NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',      -- Borrador
        'sent',       -- Enviada
        'accepted',   -- Aceptada
        'rejected',   -- Rechazada
        'expired',    -- Vencida
        'converted'   -- Convertida a venta
    )),
    is_invoiced boolean DEFAULT false, -- Indica si ya fue facturada
    
    -- Conversión a venta
    converted_to_sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL, -- ID de la venta si fue convertida
    converted_to_delivery_note_id uuid, -- ID de la remisión si fue convertida (para futuras implementaciones)
    converted_at timestamp with time zone, -- Fecha de conversión
    converted_by uuid REFERENCES public.profiles(id), -- Usuario que convirtió
    
    -- Auditoría
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    updated_by uuid REFERENCES public.profiles(id)
);

-- Crear tabla de items de cotizaciones
CREATE TABLE IF NOT EXISTS public.quote_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    
    -- Producto o servicio
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    
    -- Información del producto en la cotización
    product_reference text, -- Referencia/código alfanumérico único (modificable)
    description text, -- Descripción del producto (modificable)
    
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

-- Crear tabla de historial de cotizaciones
CREATE TABLE IF NOT EXISTS public.quote_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN (
        'CREATED',
        'UPDATED',
        'SENT',
        'ACCEPTED',
        'REJECTED',
        'EXPIRED',
        'CONVERTED_TO_SALE',
        'CONVERTED_TO_DELIVERY_NOTE',
        'CLONED'
    )),
    field_name text,
    old_value text,
    new_value text,
    notes text,
    changed_by uuid REFERENCES public.profiles(id),
    changed_at timestamp with time zone DEFAULT now()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_date ON public.quotes(quote_date);
CREATE INDEX IF NOT EXISTS idx_quotes_expiration_date ON public.quotes(expiration_date);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_is_invoiced ON public.quotes(is_invoiced);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON public.quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_numeration_id ON public.quotes(numeration_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_to_sale_id ON public.quotes(converted_to_sale_id);
CREATE INDEX IF NOT EXISTS idx_quotes_salesperson_id ON public.quotes(salesperson_id);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product_id ON public.quote_items(product_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_tax_id ON public.quote_items(tax_id);

CREATE INDEX IF NOT EXISTS idx_quote_history_quote_id ON public.quote_history(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_history_company_id ON public.quote_history(company_id);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_quotes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_quotes_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_quotes_updated_at();

CREATE OR REPLACE FUNCTION public.update_quote_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_quote_items_updated_at
    BEFORE UPDATE ON public.quote_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_quote_items_updated_at();

-- Crear función para calcular fecha de vencimiento
CREATE OR REPLACE FUNCTION public.calculate_quote_expiration_date(
    p_quote_date date,
    p_payment_terms integer
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Si no hay plazo, retornar NULL
    IF p_payment_terms IS NULL OR p_payment_terms = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Calcular fecha de vencimiento sumando los días del plazo
    RETURN p_quote_date + (p_payment_terms || ' days')::interval;
END;
$$;

-- Crear trigger para calcular fecha de vencimiento automáticamente
CREATE OR REPLACE FUNCTION public.trigger_calculate_quote_expiration_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.expiration_date := public.calculate_quote_expiration_date(
        NEW.quote_date,
        NEW.payment_terms
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_quote_expiration_date
    BEFORE INSERT OR UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_quote_expiration_date();

-- Crear función para calcular totales de cotización desde items
CREATE OR REPLACE FUNCTION public.calculate_quote_totals(p_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_subtotal numeric(15,2) := 0;
    v_tax_amount numeric(15,2) := 0;
    v_discount_amount numeric(15,2) := 0;
    v_total_amount numeric(15,2) := 0;
BEGIN
    -- Calcular subtotal y descuentos desde items
    SELECT 
        COALESCE(SUM(total_price), 0),
        COALESCE(SUM(discount_amount), 0)
    INTO v_subtotal, v_discount_amount
    FROM public.quote_items
    WHERE quote_id = p_quote_id;
    
    -- Calcular impuestos (esto se puede mejorar con la tabla de taxes)
    -- Por ahora, asumimos que los impuestos están incluidos en el precio o se calculan después
    
    v_total_amount := v_subtotal - v_discount_amount + v_tax_amount;
    
    -- Actualizar la cotización
    UPDATE public.quotes
    SET 
        subtotal = v_subtotal,
        discount_amount = v_discount_amount,
        tax_amount = v_tax_amount,
        total_amount = v_total_amount,
        updated_at = now()
    WHERE id = p_quote_id;
END;
$$;

-- Crear trigger para recalcular totales cuando se modifican items
CREATE OR REPLACE FUNCTION public.trigger_calculate_quote_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.calculate_quote_totals(
        COALESCE(NEW.quote_id, OLD.quote_id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_recalculate_quote_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_quote_totals();

-- Crear función para actualizar estado de cotizaciones vencidas
CREATE OR REPLACE FUNCTION public.update_expired_quotes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.quotes
    SET 
        status = 'expired',
        updated_at = now()
    WHERE status NOT IN ('expired', 'converted', 'rejected')
      AND expiration_date IS NOT NULL
      AND expiration_date < CURRENT_DATE
      AND is_invoiced = false;
END;
$$;

-- Crear función para registrar historial de cambios
CREATE OR REPLACE FUNCTION public.log_quote_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.quote_history (
            quote_id,
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
            INSERT INTO public.quote_history (
                quote_id,
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
                    WHEN 'sent' THEN 'SENT'
                    WHEN 'accepted' THEN 'ACCEPTED'
                    WHEN 'rejected' THEN 'REJECTED'
                    WHEN 'expired' THEN 'EXPIRED'
                    WHEN 'converted' THEN 'CONVERTED_TO_SALE'
                    ELSE 'UPDATED'
                END,
                'status',
                OLD.status,
                NEW.status,
                NEW.updated_by
            );
        END IF;
        
        -- Registrar conversión a venta
        IF OLD.converted_to_sale_id IS NULL AND NEW.converted_to_sale_id IS NOT NULL THEN
            INSERT INTO public.quote_history (
                quote_id,
                company_id,
                action,
                field_name,
                new_value,
                changed_by
            )
            VALUES (
                NEW.id,
                NEW.company_id,
                'CONVERTED_TO_SALE',
                'converted_to_sale_id',
                NEW.converted_to_sale_id::text,
                NEW.converted_by
            );
        END IF;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_log_quote_changes
    AFTER INSERT OR UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.log_quote_changes();

-- Crear RLS (Row Level Security)
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_history ENABLE ROW LEVEL SECURITY;

-- Políticas para quotes
CREATE POLICY "Users can view quotes from their company" ON public.quotes
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert quotes for their company" ON public.quotes
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update quotes from their company" ON public.quotes
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        AND status != 'converted' -- No se puede editar una cotización convertida
    );

CREATE POLICY "Users can delete quotes from their company" ON public.quotes
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        AND status != 'converted' -- No se puede eliminar una cotización convertida
    );

-- Políticas para quote_items
CREATE POLICY "Users can view quote items from their company" ON public.quote_items
    FOR SELECT USING (
        quote_id IN (
            SELECT id FROM public.quotes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert quote items for their company" ON public.quote_items
    FOR INSERT WITH CHECK (
        quote_id IN (
            SELECT id FROM public.quotes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update quote items from their company" ON public.quote_items
    FOR UPDATE USING (
        quote_id IN (
            SELECT id FROM public.quotes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete quote items from their company" ON public.quote_items
    FOR DELETE USING (
        quote_id IN (
            SELECT id FROM public.quotes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas para quote_history
CREATE POLICY "Users can view quote history from their company" ON public.quote_history
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert quote history for their company" ON public.quote_history
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE public.quotes IS 'Cotizaciones de productos o servicios (no generan movimientos de inventario ni cuentas por cobrar)';
COMMENT ON COLUMN public.quotes.quote_date IS 'Fecha de creación de la cotización';
COMMENT ON COLUMN public.quotes.expiration_date IS 'Fecha de vencimiento (calculada automáticamente con base en el plazo)';
COMMENT ON COLUMN public.quotes.payment_terms IS 'Plazo en días para calcular la fecha de vencimiento';
COMMENT ON COLUMN public.quotes.notes IS 'Notas visibles en el PDF y en la impresión';
COMMENT ON COLUMN public.quotes.comments IS 'Comentarios internos (no visibles en impresión)';
COMMENT ON COLUMN public.quotes.is_invoiced IS 'Indica si la cotización ya fue convertida a factura de venta';
COMMENT ON COLUMN public.quotes.status IS 'Estado: draft (borrador), sent (enviada), accepted (aceptada), rejected (rechazada), expired (vencida), converted (convertida)';

COMMENT ON TABLE public.quote_items IS 'Items/productos de cotizaciones';
COMMENT ON COLUMN public.quote_items.product_reference IS 'Referencia del producto (modificable en la cotización)';
COMMENT ON COLUMN public.quote_items.description IS 'Descripción del producto (modificable en la cotización)';

COMMENT ON TABLE public.quote_history IS 'Historial de cambios en cotizaciones';

COMMENT ON FUNCTION public.calculate_quote_expiration_date IS 'Calcula la fecha de vencimiento de una cotización con base en el plazo';
COMMENT ON FUNCTION public.calculate_quote_totals IS 'Recalcula los totales de una cotización desde sus items';
COMMENT ON FUNCTION public.update_expired_quotes IS 'Actualiza el estado de cotizaciones vencidas';

