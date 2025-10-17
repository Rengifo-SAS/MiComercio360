-- Agregar columna de cuenta bancaria a la tabla de turnos
-- 106_add_account_to_shifts.sql

-- Agregar columna para la cuenta bancaria de origen del efectivo inicial
ALTER TABLE public.shifts 
ADD COLUMN source_account_id uuid REFERENCES public.accounts(id);

-- Agregar comentario para documentar la columna
COMMENT ON COLUMN public.shifts.source_account_id IS 'Cuenta bancaria de la cual se extrajo el efectivo inicial para el turno';

-- Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX idx_shifts_source_account_id ON public.shifts(source_account_id);

-- Actualizar la política RLS para incluir la nueva columna
-- (Las políticas existentes ya cubren el acceso por company_id, por lo que no es necesario modificarlas)
