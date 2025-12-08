-- Corregir políticas RLS para warehouses de manera definitiva
-- Primero eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can manage warehouses in their company" ON public.warehouses;

DROP POLICY IF EXISTS "Users can view warehouses in their company" ON public.warehouses;

DROP POLICY IF EXISTS "Users can insert warehouses in their company" ON public.warehouses;

DROP POLICY IF EXISTS "Users can update warehouses in their company" ON public.warehouses;

DROP POLICY IF EXISTS "Users can delete warehouses in their company" ON public.warehouses;

-- Deshabilitar RLS temporalmente para recrear las políticas
ALTER TABLE public.warehouses DISABLE ROW LEVEL SECURITY;

-- Rehabilitar RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Crear función para verificar si el usuario pertenece a la compañía
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND company_id = p_company_id
    );
END;
$$;

-- Crear políticas RLS más específicas
CREATE POLICY "Users can view warehouses in their company" ON public.warehouses FOR
SELECT USING (
        user_belongs_to_company (company_id)
    );

CREATE POLICY "Users can insert warehouses in their company" ON public.warehouses FOR
INSERT
WITH
    CHECK (
        user_belongs_to_company (company_id)
    );

CREATE POLICY "Users can update warehouses in their company" ON public.warehouses FOR
UPDATE USING (
    user_belongs_to_company (company_id)
)
WITH
    CHECK (
        user_belongs_to_company (company_id)
    );

CREATE POLICY "Users can delete warehouses in their company" ON public.warehouses FOR DELETE USING (
    user_belongs_to_company (company_id)
);

-- Crear función RPC para crear bodegas con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_warehouse(
    p_name text,
    p_code text,
    p_description text DEFAULT NULL,
    p_is_main boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_warehouse_id uuid;
BEGIN
    -- Obtener company_id del perfil del usuario
    SELECT company_id INTO v_company_id 
    FROM public.profiles 
    WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no asociado con una compañía');
    END IF;

    -- Insertar la nueva bodega
    INSERT INTO public.warehouses (
        name, code, description, is_main, company_id, created_by
    ) VALUES (
        p_name, p_code, p_description, p_is_main, v_company_id, auth.uid()
    )
    RETURNING id INTO v_warehouse_id;

    RETURN json_build_object('success', true, 'warehouse_id', v_warehouse_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;