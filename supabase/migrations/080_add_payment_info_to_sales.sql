-- Agregar información de pago a la tabla sales
-- Migración 080: Add payment info to sales

-- Agregar columnas para información de pago
ALTER TABLE public.sales
ADD COLUMN payment_reference TEXT,
ADD COLUMN payment_amount_received DECIMAL(15,2),
ADD COLUMN payment_change DECIMAL(15,2);

-- Agregar comentarios para documentar las nuevas columnas
COMMENT ON COLUMN public.sales.payment_reference IS 'Referencia o número de transacción del pago';
COMMENT ON COLUMN public.sales.payment_amount_received IS 'Monto recibido del cliente (especialmente para pagos en efectivo)';
COMMENT ON COLUMN public.sales.payment_change IS 'Cambio devuelto al cliente (especialmente para pagos en efectivo)';
