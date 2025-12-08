-- Crear tabla de movimientos de efectivo para turnos
CREATE TABLE public.cash_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL,
  movement_type text NOT NULL CHECK (movement_type = ANY (ARRAY['income'::text, 'expense'::text])),
  amount numeric NOT NULL,
  description text NOT NULL,
  reference text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,
  company_id uuid NOT NULL,
  CONSTRAINT cash_movements_pkey PRIMARY KEY (id),
  CONSTRAINT cash_movements_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE,
  CONSTRAINT cash_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT cash_movements_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_cash_movements_shift_id ON public.cash_movements (shift_id);
CREATE INDEX idx_cash_movements_company_id ON public.cash_movements (company_id);
CREATE INDEX idx_cash_movements_created_at ON public.cash_movements (created_at);
CREATE INDEX idx_cash_movements_movement_type ON public.cash_movements (movement_type);

-- Habilitar RLS
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Users can access cash movements in their company" ON public.cash_movements FOR ALL USING (
  company_id IN (
    SELECT company_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- Crear función para actualizar automáticamente company_id
CREATE OR REPLACE FUNCTION public.set_cash_movement_company_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Obtener company_id del turno
  SELECT company_id INTO NEW.company_id
  FROM public.shifts
  WHERE id = NEW.shift_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para establecer company_id automáticamente
CREATE TRIGGER set_cash_movement_company_id_trigger
  BEFORE INSERT ON public.cash_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_cash_movement_company_id();

-- Agregar permisos para movimientos de efectivo
INSERT INTO public.permissions (name, description, module, action, resource, created_at, updated_at)
VALUES 
  ('cash_movements.read', 'Ver movimientos de efectivo', 'shifts', 'read', 'cash_movement', now(), now()),
  ('cash_movements.create', 'Crear movimientos de efectivo', 'shifts', 'create', 'cash_movement', now(), now()),
  ('cash_movements.update', 'Actualizar movimientos de efectivo', 'shifts', 'update', 'cash_movement', now(), now()),
  ('cash_movements.delete', 'Eliminar movimientos de efectivo', 'shifts', 'delete', 'cash_movement', now(), now())
ON CONFLICT (name) DO NOTHING;

-- Asignar permisos al rol de Administrador
INSERT INTO public.role_permissions (role_id, permission_id, granted_at, granted_by)
SELECT 
  r.id,
  p.id,
  now(),
  auth.uid()
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Administrador' 
  AND p.name IN (
    'cash_movements.read',
    'cash_movements.create', 
    'cash_movements.update',
    'cash_movements.delete'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
