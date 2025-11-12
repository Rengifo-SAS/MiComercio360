-- Agregar 'completed' como valor válido para el campo status en received_payments
-- 119_add_completed_status_to_received_payments.sql

-- Eliminar el constraint existente
ALTER TABLE public.received_payments
DROP CONSTRAINT IF EXISTS received_payments_status_check;

-- Agregar el nuevo constraint con 'completed' incluido
ALTER TABLE public.received_payments
ADD CONSTRAINT received_payments_status_check 
CHECK (status IN ('open', 'completed', 'cancelled', 'reconciled'));

-- Actualizar el comentario de la columna
COMMENT ON COLUMN public.received_payments.status IS 'Estado del pago: open (abierto), completed (completado), cancelled (anulado), reconciled (conciliado)';

