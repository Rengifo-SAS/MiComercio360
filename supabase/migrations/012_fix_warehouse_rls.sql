-- Añadir políticas RLS para tablas de bodegas
-- Habilitar RLS en las tablas de bodegas si no está habilitado
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.warehouse_inventory ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.warehouse_transfers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.warehouse_movements ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view warehouses in their company" ON public.warehouses;

DROP POLICY IF EXISTS "Users can insert warehouses in their company" ON public.warehouses;

DROP POLICY IF EXISTS "Users can update warehouses in their company" ON public.warehouses;

DROP POLICY IF EXISTS "Users can delete warehouses in their company" ON public.warehouses;

DROP POLICY IF EXISTS "Users can view warehouse_inventory in their company" ON public.warehouse_inventory;

DROP POLICY IF EXISTS "Users can insert warehouse_inventory in their company" ON public.warehouse_inventory;

DROP POLICY IF EXISTS "Users can update warehouse_inventory in their company" ON public.warehouse_inventory;

DROP POLICY IF EXISTS "Users can delete warehouse_inventory in their company" ON public.warehouse_inventory;

DROP POLICY IF EXISTS "Users can view warehouse_transfers in their company" ON public.warehouse_transfers;

DROP POLICY IF EXISTS "Users can insert warehouse_transfers in their company" ON public.warehouse_transfers;

DROP POLICY IF EXISTS "Users can update warehouse_transfers in their company" ON public.warehouse_transfers;

DROP POLICY IF EXISTS "Users can delete warehouse_transfers in their company" ON public.warehouse_transfers;

DROP POLICY IF EXISTS "Users can view warehouse_movements in their company" ON public.warehouse_movements;

DROP POLICY IF EXISTS "Users can insert warehouse_movements in their company" ON public.warehouse_movements;

DROP POLICY IF EXISTS "Users can update warehouse_movements in their company" ON public.warehouse_movements;

DROP POLICY IF EXISTS "Users can delete warehouse_movements in their company" ON public.warehouse_movements;

-- Políticas para warehouses
CREATE POLICY "Users can view warehouses in their company" ON public.warehouses FOR
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
CREATE POLICY "Users can view warehouse_inventory in their company" ON public.warehouse_inventory FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert warehouse_inventory in their company" ON public.warehouse_inventory FOR
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

CREATE POLICY "Users can update warehouse_inventory in their company" ON public.warehouse_inventory FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can delete warehouse_inventory in their company" ON public.warehouse_inventory FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Políticas para warehouse_transfers
CREATE POLICY "Users can view warehouse_transfers in their company" ON public.warehouse_transfers FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert warehouse_transfers in their company" ON public.warehouse_transfers FOR
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

CREATE POLICY "Users can update warehouse_transfers in their company" ON public.warehouse_transfers FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can delete warehouse_transfers in their company" ON public.warehouse_transfers FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Políticas para warehouse_movements
CREATE POLICY "Users can view warehouse_movements in their company" ON public.warehouse_movements FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert warehouse_movements in their company" ON public.warehouse_movements FOR
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

CREATE POLICY "Users can update warehouse_movements in their company" ON public.warehouse_movements FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can delete warehouse_movements in their company" ON public.warehouse_movements FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);