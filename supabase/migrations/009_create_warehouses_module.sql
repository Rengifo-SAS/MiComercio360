-- Crear tabla de bodegas
CREATE TABLE IF NOT EXISTS public.warehouses (
    id uuid DEFAULT gen_random_uuid () PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    address text,
    city text,
    state text,
    country text DEFAULT 'Colombia',
    phone text,
    email text,
    is_active boolean DEFAULT true,
    is_main boolean DEFAULT false, -- Solo una bodega principal por empresa
    company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
    created_at timestamp
    with
        time zone DEFAULT now(),
        updated_at timestamp
    with
        time zone DEFAULT now(),
        created_by uuid REFERENCES auth.users (id),
        updated_by uuid REFERENCES auth.users (id),
        UNIQUE (code, company_id),
        UNIQUE (name, company_id)
);

-- Crear tabla de inventario por bodega
CREATE TABLE IF NOT EXISTS public.warehouse_inventory (
    id uuid DEFAULT gen_random_uuid () PRIMARY KEY,
    warehouse_id uuid NOT NULL REFERENCES public.warehouses (id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
    quantity integer NOT NULL DEFAULT 0,
    min_stock integer DEFAULT 0,
    max_stock integer,
    location text, -- Ubicación específica dentro de la bodega (ej: "Estante A-1")
    last_updated timestamp
    with
        time zone DEFAULT now(),
        updated_by uuid REFERENCES auth.users (id),
        company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
        UNIQUE (warehouse_id, product_id)
);

-- Crear tabla de movimientos entre bodegas
CREATE TABLE IF NOT EXISTS public.warehouse_transfers (
    id uuid DEFAULT gen_random_uuid () PRIMARY KEY,
    transfer_number text NOT NULL,
    from_warehouse_id uuid NOT NULL REFERENCES public.warehouses (id),
    to_warehouse_id uuid NOT NULL REFERENCES public.warehouses (id),
    product_id uuid NOT NULL REFERENCES public.products (id),
    quantity integer NOT NULL,
    reason text,
    status text DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'approved',
            'completed',
            'cancelled'
        )
    ),
    notes text,
    company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
    created_by uuid REFERENCES auth.users (id),
    approved_by uuid REFERENCES auth.users (id),
    completed_by uuid REFERENCES auth.users (id),
    created_at timestamp
    with
        time zone DEFAULT now(),
        approved_at timestamp
    with
        time zone,
        completed_at timestamp
    with
        time zone,
        CHECK (
            from_warehouse_id != to_warehouse_id
        )
);

-- Crear tabla de movimientos de inventario por bodega
CREATE TABLE IF NOT EXISTS public.warehouse_movements (
    id uuid DEFAULT gen_random_uuid () PRIMARY KEY,
    warehouse_id uuid NOT NULL REFERENCES public.warehouses (id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
    movement_type text NOT NULL CHECK (
        movement_type IN (
            'in',
            'out',
            'adjustment',
            'transfer_in',
            'transfer_out'
        )
    ),
    quantity integer NOT NULL,
    previous_quantity integer NOT NULL,
    new_quantity integer NOT NULL,
    reason text,
    transfer_id uuid REFERENCES public.warehouse_transfers (id),
    company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
    created_by uuid REFERENCES auth.users (id),
    created_at timestamp
    with
        time zone DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON public.warehouses (company_id);

CREATE INDEX IF NOT EXISTS idx_warehouses_is_main ON public.warehouses (company_id, is_main)
WHERE
    is_main = true;

CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_warehouse_id ON public.warehouse_inventory (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_product_id ON public.warehouse_inventory (product_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_company_id ON public.warehouse_inventory (company_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_company_id ON public.warehouse_transfers (company_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_status ON public.warehouse_transfers (status);

CREATE INDEX IF NOT EXISTS idx_warehouse_movements_warehouse_id ON public.warehouse_movements (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_movements_product_id ON public.warehouse_movements (product_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_movements_company_id ON public.warehouse_movements (company_id);

-- Comentarios
COMMENT ON TABLE public.warehouses IS 'Bodegas de la empresa';

COMMENT ON
TABLE public.warehouse_inventory IS 'Inventario por bodega';

COMMENT ON
TABLE public.warehouse_transfers IS 'Transferencias entre bodegas';

COMMENT ON
TABLE public.warehouse_movements IS 'Movimientos de inventario por bodega';

-- RLS Policies para warehouses
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.warehouse_inventory ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.warehouse_transfers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.warehouse_movements ENABLE ROW LEVEL SECURITY;

-- Políticas para warehouses
CREATE POLICY "Users can view warehouses from their company" ON public.warehouses FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert warehouses in their company" ON public.warehouses FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can update warehouses in their company" ON public.warehouses FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can delete warehouses in their company" ON public.warehouses FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Políticas para warehouse_inventory
CREATE POLICY "Users can view warehouse inventory from their company" ON public.warehouse_inventory FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert warehouse inventory in their company" ON public.warehouse_inventory FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can update warehouse inventory in their company" ON public.warehouse_inventory FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can delete warehouse inventory in their company" ON public.warehouse_inventory FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Políticas para warehouse_transfers
CREATE POLICY "Users can view warehouse transfers from their company" ON public.warehouse_transfers FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert warehouse transfers in their company" ON public.warehouse_transfers FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can update warehouse transfers in their company" ON public.warehouse_transfers FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can delete warehouse transfers in their company" ON public.warehouse_transfers FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Políticas para warehouse_movements
CREATE POLICY "Users can view warehouse movements from their company" ON public.warehouse_movements FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert warehouse movements in their company" ON public.warehouse_movements FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

-- Función para crear bodega principal automáticamente
CREATE OR REPLACE FUNCTION public.create_main_warehouse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
BEGIN
    -- Usar el company_id de la compañía que se acaba de crear
    v_company_id := NEW.id;
    
    -- Verificar si ya existe una bodega principal
    IF NOT EXISTS (
        SELECT 1 FROM public.warehouses 
        WHERE company_id = v_company_id AND is_main = true
    ) THEN
        -- Crear bodega principal
        INSERT INTO public.warehouses (
            name, code, description, is_main, company_id, created_by
        ) VALUES (
            'Bodega Principal', 'MAIN', 'Bodega principal de la empresa', true, v_company_id, auth.uid()
        );
    END IF;
    
    RETURN NULL;
END;
$$;

-- Trigger para crear bodega principal cuando se crea una empresa
CREATE TRIGGER trigger_create_main_warehouse
    AFTER INSERT ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.create_main_warehouse();

-- Función para generar número de transferencia
CREATE OR REPLACE FUNCTION public.generate_transfer_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_count integer;
    v_transfer_number text;
BEGIN
    -- Obtener el company_id del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no asociado con una compañía';
    END IF;
    
    -- Contar transferencias existentes para esta empresa
    SELECT COUNT(*) + 1 INTO v_count 
    FROM public.warehouse_transfers 
    WHERE company_id = v_company_id;
    
    -- Generar número de transferencia
    v_transfer_number := 'TRF-' || LPAD(v_count::text, 6, '0');
    
    RETURN v_transfer_number;
END;
$$;

-- Función para crear transferencia entre bodegas
CREATE OR REPLACE FUNCTION public.create_warehouse_transfer(
    p_from_warehouse_id uuid,
    p_to_warehouse_id uuid,
    p_product_id uuid,
    p_quantity integer,
    p_reason text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_transfer_id uuid;
    v_transfer_number text;
    v_from_warehouse_name text;
    v_to_warehouse_name text;
    v_product_name text;
    v_current_quantity integer;
BEGIN
    -- Obtener el company_id del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();
    
    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;
    
    -- Verificar que las bodegas pertenecen a la empresa
    IF NOT EXISTS (
        SELECT 1 FROM public.warehouses 
        WHERE id = p_from_warehouse_id AND company_id = v_company_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Bodega origen no encontrada');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM public.warehouses 
        WHERE id = p_to_warehouse_id AND company_id = v_company_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Bodega destino no encontrada');
    END IF;
    
    -- Verificar que el producto pertenece a la empresa
    IF NOT EXISTS (
        SELECT 1 FROM public.products 
        WHERE id = p_product_id AND company_id = v_company_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Producto no encontrado');
    END IF;
    
    -- Verificar stock disponible en bodega origen
    SELECT COALESCE(quantity, 0) INTO v_current_quantity
    FROM public.warehouse_inventory
    WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;
    
    IF v_current_quantity < p_quantity THEN
        RETURN json_build_object('success', false, 'error', 'Stock insuficiente en bodega origen');
    END IF;
    
    -- Generar número de transferencia
    v_transfer_number := public.generate_transfer_number();
    
    -- Crear la transferencia
    INSERT INTO public.warehouse_transfers (
        transfer_number, from_warehouse_id, to_warehouse_id, product_id,
        quantity, reason, notes, company_id, created_by
    ) VALUES (
        v_transfer_number, p_from_warehouse_id, p_to_warehouse_id, p_product_id,
        p_quantity, p_reason, p_notes, v_company_id, auth.uid()
    ) RETURNING id INTO v_transfer_id;
    
    -- Obtener nombres para respuesta
    SELECT name INTO v_from_warehouse_name FROM public.warehouses WHERE id = p_from_warehouse_id;
    SELECT name INTO v_to_warehouse_name FROM public.warehouses WHERE id = p_to_warehouse_id;
    SELECT name INTO v_product_name FROM public.products WHERE id = p_product_id;
    
    RETURN json_build_object(
        'success', true,
        'transfer_id', v_transfer_id,
        'transfer_number', v_transfer_number,
        'from_warehouse', v_from_warehouse_name,
        'to_warehouse', v_to_warehouse_name,
        'product', v_product_name,
        'quantity', p_quantity
    );
END;
$$;

-- Función para completar transferencia
CREATE OR REPLACE FUNCTION public.complete_warehouse_transfer(
    p_transfer_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_transfer record;
    v_from_quantity integer;
    v_to_quantity integer;
    v_from_new_quantity integer;
    v_to_new_quantity integer;
BEGIN
    -- Obtener el company_id del usuario
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();
    
    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;
    
    -- Obtener datos de la transferencia
    SELECT * INTO v_transfer
    FROM public.warehouse_transfers
    WHERE id = p_transfer_id AND company_id = v_company_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Transferencia no encontrada');
    END IF;
    
    IF v_transfer.status != 'approved' THEN
        RETURN json_build_object('success', false, 'error', 'La transferencia debe estar aprobada');
    END IF;
    
    -- Obtener cantidades actuales
    SELECT COALESCE(quantity, 0) INTO v_from_quantity
    FROM public.warehouse_inventory
    WHERE warehouse_id = v_transfer.from_warehouse_id AND product_id = v_transfer.product_id;
    
    SELECT COALESCE(quantity, 0) INTO v_to_quantity
    FROM public.warehouse_inventory
    WHERE warehouse_id = v_transfer.to_warehouse_id AND product_id = v_transfer.product_id;
    
    -- Calcular nuevas cantidades
    v_from_new_quantity := v_from_quantity - v_transfer.quantity;
    v_to_new_quantity := v_to_quantity + v_transfer.quantity;
    
    -- Actualizar inventario de bodega origen
    UPDATE public.warehouse_inventory
    SET quantity = v_from_new_quantity,
        last_updated = now(),
        updated_by = auth.uid()
    WHERE warehouse_id = v_transfer.from_warehouse_id AND product_id = v_transfer.product_id;
    
    -- Si no existe registro en bodega destino, crearlo
    IF NOT EXISTS (
        SELECT 1 FROM public.warehouse_inventory
        WHERE warehouse_id = v_transfer.to_warehouse_id AND product_id = v_transfer.product_id
    ) THEN
        INSERT INTO public.warehouse_inventory (
            warehouse_id, product_id, quantity, company_id, updated_by
        ) VALUES (
            v_transfer.to_warehouse_id, v_transfer.product_id, v_transfer.quantity, v_company_id, auth.uid()
        );
    ELSE
        -- Actualizar inventario de bodega destino
        UPDATE public.warehouse_inventory
        SET quantity = v_to_new_quantity,
            last_updated = now(),
            updated_by = auth.uid()
        WHERE warehouse_id = v_transfer.to_warehouse_id AND product_id = v_transfer.product_id;
    END IF;
    
    -- Registrar movimientos
    INSERT INTO public.warehouse_movements (
        warehouse_id, product_id, movement_type, quantity,
        previous_quantity, new_quantity, reason, transfer_id, company_id, created_by
    ) VALUES (
        v_transfer.from_warehouse_id, v_transfer.product_id, 'transfer_out', v_transfer.quantity,
        v_from_quantity, v_from_new_quantity, v_transfer.reason, p_transfer_id, v_company_id, auth.uid()
    );
    
    INSERT INTO public.warehouse_movements (
        warehouse_id, product_id, movement_type, quantity,
        previous_quantity, new_quantity, reason, transfer_id, company_id, created_by
    ) VALUES (
        v_transfer.to_warehouse_id, v_transfer.product_id, 'transfer_in', v_transfer.quantity,
        v_to_quantity, v_to_new_quantity, v_transfer.reason, p_transfer_id, v_company_id, auth.uid()
    );
    
    -- Marcar transferencia como completada
    UPDATE public.warehouse_transfers
    SET status = 'completed',
        completed_by = auth.uid(),
        completed_at = now()
    WHERE id = p_transfer_id;
    
    RETURN json_build_object('success', true, 'message', 'Transferencia completada exitosamente');
END;
$$;