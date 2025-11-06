-- Crear módulo de remisiones (delivery notes)
-- 114_create_delivery_notes_module.sql

-- Crear tabla de remisiones
CREATE TABLE IF NOT EXISTS public.delivery_notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Información del documento
    numeration_id uuid REFERENCES public.numerations(id) ON DELETE SET NULL,
    delivery_note_number text, -- Número del documento (generado desde numeración)
    
    -- Información básica
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    delivery_date date NOT NULL, -- Fecha de creación de la remisión
    expiration_date date, -- Fecha de vencimiento
    
    -- Tipo de documento
    document_type text NOT NULL DEFAULT 'DELIVERY_NOTE' CHECK (document_type IN (
        'DELIVERY_NOTE', -- Remisión (entrega de mercancía)
        'SERVICE_ORDER'  -- Orden de servicio (prestación de servicio)
    )),
    
    -- Personalización
    warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL, -- Bodega (obligatorio para remisiones)
    currency text DEFAULT 'COP' CHECK (currency IN ('COP', 'USD', 'EUR')),
    price_list_id uuid, -- Lista de precios (para futuras implementaciones)
    salesperson_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Vendedor
    
    -- Totales
    subtotal numeric(15,2) DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount numeric(15,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount numeric(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount numeric(15,2) DEFAULT 0 CHECK (total_amount >= 0),
    
    -- Notas y comentarios
    notes text, -- Notas visibles en el documento
    observations text, -- Observaciones/comentarios internos (no visibles)
    
    -- Estado
    status text NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',    -- Pendiente por facturar
        'partially_invoiced', -- Parcialmente facturada
        'invoiced',   -- Facturada completamente
        'cancelled'   -- Anulada
    )),
    is_cancelled boolean DEFAULT false,
    
    -- Conversión a factura
    converted_to_sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL, -- ID de la venta si fue convertida
    converted_at timestamp with time zone, -- Fecha de conversión
    converted_by uuid REFERENCES public.profiles(id), -- Usuario que convirtió
    
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

-- Crear tabla de items de remisiones
CREATE TABLE IF NOT EXISTS public.delivery_note_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_note_id uuid NOT NULL REFERENCES public.delivery_notes(id) ON DELETE CASCADE,
    
    -- Producto o servicio
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    
    -- Información del producto en la remisión
    product_reference text, -- Referencia/código alfanumérico único
    description text, -- Descripción del producto
    
    -- Cantidades
    quantity numeric(10,2) NOT NULL CHECK (quantity > 0), -- Cantidad remitida
    quantity_invoiced numeric(10,2) DEFAULT 0 CHECK (quantity_invoiced >= 0), -- Cantidad ya facturada
    quantity_pending numeric(10,2) GENERATED ALWAYS AS (quantity - quantity_invoiced) STORED, -- Cantidad pendiente por facturar
    
    -- Precios y descuentos
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

-- Crear tabla de conversiones de remisiones a facturas (para múltiples remisiones)
CREATE TABLE IF NOT EXISTS public.delivery_note_sale_conversions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_note_id uuid NOT NULL REFERENCES public.delivery_notes(id) ON DELETE CASCADE,
    sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    converted_at timestamp with time zone DEFAULT now(),
    converted_by uuid REFERENCES public.profiles(id),
    UNIQUE(delivery_note_id, sale_id)
);

-- Crear tabla de historial de remisiones
CREATE TABLE IF NOT EXISTS public.delivery_note_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_note_id uuid NOT NULL REFERENCES public.delivery_notes(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN (
        'CREATED',
        'UPDATED',
        'CANCELLED',
        'RESTORED',
        'CONVERTED_TO_SALE',
        'PARTIALLY_INVOICED',
        'FULLY_INVOICED'
    )),
    field_name text,
    old_value text,
    new_value text,
    notes text,
    changed_by uuid REFERENCES public.profiles(id),
    changed_at timestamp with time zone DEFAULT now()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_delivery_notes_company_id ON public.delivery_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_customer_id ON public.delivery_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_delivery_date ON public.delivery_notes(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_expiration_date ON public.delivery_notes(expiration_date);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON public.delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_is_cancelled ON public.delivery_notes(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_delivery_note_number ON public.delivery_notes(delivery_note_number);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_numeration_id ON public.delivery_notes(numeration_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_converted_to_sale_id ON public.delivery_notes(converted_to_sale_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_salesperson_id ON public.delivery_notes(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_warehouse_id ON public.delivery_notes(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_document_type ON public.delivery_notes(document_type);

CREATE INDEX IF NOT EXISTS idx_delivery_note_items_delivery_note_id ON public.delivery_note_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_product_id ON public.delivery_note_items(product_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_tax_id ON public.delivery_note_items(tax_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_quantity_pending ON public.delivery_note_items(quantity_pending);

CREATE INDEX IF NOT EXISTS idx_delivery_note_sale_conversions_delivery_note_id ON public.delivery_note_sale_conversions(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_sale_conversions_sale_id ON public.delivery_note_sale_conversions(sale_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_sale_conversions_company_id ON public.delivery_note_sale_conversions(company_id);

CREATE INDEX IF NOT EXISTS idx_delivery_note_history_delivery_note_id ON public.delivery_note_history(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_history_company_id ON public.delivery_note_history(company_id);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_delivery_notes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_delivery_notes_updated_at
    BEFORE UPDATE ON public.delivery_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_delivery_notes_updated_at();

CREATE OR REPLACE FUNCTION public.update_delivery_note_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_delivery_note_items_updated_at
    BEFORE UPDATE ON public.delivery_note_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_delivery_note_items_updated_at();

-- Crear función para calcular totales de remisión desde items
CREATE OR REPLACE FUNCTION public.calculate_delivery_note_totals(p_delivery_note_id uuid)
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
    FROM public.delivery_note_items
    WHERE delivery_note_id = p_delivery_note_id;
    
    -- Calcular impuestos (esto se puede mejorar con la tabla de taxes)
    v_total_amount := v_subtotal - v_discount_amount + v_tax_amount;
    
    -- Actualizar la remisión
    UPDATE public.delivery_notes
    SET 
        subtotal = v_subtotal,
        discount_amount = v_discount_amount,
        tax_amount = v_tax_amount,
        total_amount = v_total_amount,
        updated_at = now()
    WHERE id = p_delivery_note_id;
END;
$$;

-- Crear trigger para recalcular totales cuando se modifican items
CREATE OR REPLACE FUNCTION public.trigger_calculate_delivery_note_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.calculate_delivery_note_totals(
        COALESCE(NEW.delivery_note_id, OLD.delivery_note_id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_recalculate_delivery_note_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.delivery_note_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_calculate_delivery_note_totals();

-- Crear función para actualizar estado de remisión basado en cantidades facturadas
CREATE OR REPLACE FUNCTION public.update_delivery_note_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_quantity numeric;
    v_total_invoiced numeric;
    v_new_status text;
BEGIN
    -- Calcular totales de cantidad
    SELECT 
        COALESCE(SUM(quantity), 0),
        COALESCE(SUM(quantity_invoiced), 0)
    INTO v_total_quantity, v_total_invoiced
    FROM public.delivery_note_items
    WHERE delivery_note_id = COALESCE(NEW.delivery_note_id, OLD.delivery_note_id);
    
    -- Determinar nuevo estado
    IF v_total_invoiced = 0 THEN
        v_new_status := 'pending';
    ELSIF v_total_invoiced >= v_total_quantity THEN
        v_new_status := 'invoiced';
    ELSE
        v_new_status := 'partially_invoiced';
    END IF;
    
    -- Actualizar estado de la remisión
    UPDATE public.delivery_notes
    SET 
        status = v_new_status,
        updated_at = now()
    WHERE id = COALESCE(NEW.delivery_note_id, OLD.delivery_note_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_delivery_note_status
    AFTER INSERT OR UPDATE OR DELETE ON public.delivery_note_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_delivery_note_status();

-- Crear función para registrar historial de cambios
CREATE OR REPLACE FUNCTION public.log_delivery_note_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.delivery_note_history (
            delivery_note_id,
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
            INSERT INTO public.delivery_note_history (
                delivery_note_id,
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
                    WHEN 'partially_invoiced' THEN 'PARTIALLY_INVOICED'
                    WHEN 'invoiced' THEN 'FULLY_INVOICED'
                    WHEN 'cancelled' THEN 'CANCELLED'
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
            INSERT INTO public.delivery_note_history (
                delivery_note_id,
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

CREATE TRIGGER trigger_log_delivery_note_changes
    AFTER INSERT OR UPDATE ON public.delivery_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.log_delivery_note_changes();

-- Crear RLS (Row Level Security)
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_note_sale_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_note_history ENABLE ROW LEVEL SECURITY;

-- Políticas para delivery_notes
CREATE POLICY "Users can view delivery notes from their company" ON public.delivery_notes
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert delivery notes for their company" ON public.delivery_notes
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update delivery notes from their company" ON public.delivery_notes
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        AND status != 'invoiced' -- No se puede editar si está completamente facturada
        AND is_cancelled = false
    );

CREATE POLICY "Users can delete delivery notes from their company" ON public.delivery_notes
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        AND status != 'invoiced' -- No se puede eliminar si está completamente facturada
        AND is_cancelled = false
    );

-- Políticas para delivery_note_items
CREATE POLICY "Users can view delivery note items from their company" ON public.delivery_note_items
    FOR SELECT USING (
        delivery_note_id IN (
            SELECT id FROM public.delivery_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert delivery note items for their company" ON public.delivery_note_items
    FOR INSERT WITH CHECK (
        delivery_note_id IN (
            SELECT id FROM public.delivery_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update delivery note items from their company" ON public.delivery_note_items
    FOR UPDATE USING (
        delivery_note_id IN (
            SELECT id FROM public.delivery_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete delivery note items from their company" ON public.delivery_note_items
    FOR DELETE USING (
        delivery_note_id IN (
            SELECT id FROM public.delivery_notes
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas para delivery_note_sale_conversions
CREATE POLICY "Users can view delivery note sale conversions from their company" ON public.delivery_note_sale_conversions
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert delivery note sale conversions for their company" ON public.delivery_note_sale_conversions
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Políticas para delivery_note_history
CREATE POLICY "Users can view delivery note history from their company" ON public.delivery_note_history
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert delivery note history for their company" ON public.delivery_note_history
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE public.delivery_notes IS 'Remisiones u órdenes de servicio (documentos provisionales antes de facturar, no generan movimientos de inventario ni cuentas por cobrar)';
COMMENT ON COLUMN public.delivery_notes.document_type IS 'Tipo de documento: DELIVERY_NOTE (remisión) o SERVICE_ORDER (orden de servicio)';
COMMENT ON COLUMN public.delivery_notes.warehouse_id IS 'Bodega de donde sale la mercancía (obligatorio para remisiones)';
COMMENT ON COLUMN public.delivery_notes.status IS 'Estado: pending (pendiente), partially_invoiced (parcialmente facturada), invoiced (facturada completamente), cancelled (anulada)';
COMMENT ON COLUMN public.delivery_notes.notes IS 'Notas visibles en el documento';
COMMENT ON COLUMN public.delivery_notes.observations IS 'Observaciones/comentarios internos (no visibles en impresión)';

COMMENT ON TABLE public.delivery_note_items IS 'Items/productos de remisiones';
COMMENT ON COLUMN public.delivery_note_items.quantity IS 'Cantidad total remitida';
COMMENT ON COLUMN public.delivery_note_items.quantity_invoiced IS 'Cantidad ya facturada de este item';
COMMENT ON COLUMN public.delivery_note_items.quantity_pending IS 'Cantidad pendiente por facturar (calculada automáticamente)';

COMMENT ON TABLE public.delivery_note_sale_conversions IS 'Registro de conversiones de remisiones a facturas (permite múltiples remisiones en una factura)';
COMMENT ON TABLE public.delivery_note_history IS 'Historial de cambios en remisiones';

COMMENT ON FUNCTION public.calculate_delivery_note_totals IS 'Recalcula los totales de una remisión desde sus items';
COMMENT ON FUNCTION public.update_delivery_note_status IS 'Actualiza el estado de la remisión basado en las cantidades facturadas';

