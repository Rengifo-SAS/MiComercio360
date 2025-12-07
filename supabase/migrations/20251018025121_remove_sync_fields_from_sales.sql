-- Eliminar campos de sincronización de la tabla sales
-- 20251018025121_remove_sync_fields_from_sales.sql

-- Eliminar índices relacionados con sincronización
DROP INDEX IF EXISTS public.idx_sales_sync_status;
DROP INDEX IF EXISTS public.idx_sales_sync_pending;
DROP INDEX IF EXISTS public.idx_sales_offline_created;

-- Eliminar funciones relacionadas con sincronización
DROP FUNCTION IF EXISTS public.mark_sales_as_pending_sync();
DROP FUNCTION IF EXISTS public.update_sales_sync_status(uuid, text, text);
DROP FUNCTION IF EXISTS public.get_pending_sync_sales(uuid);
DROP FUNCTION IF EXISTS public.get_sync_stats(uuid);

-- Eliminar columnas de sincronización de la tabla sales
ALTER TABLE public.sales 
DROP COLUMN IF EXISTS sync_status,
DROP COLUMN IF EXISTS sync_attempts,
DROP COLUMN IF EXISTS last_sync_attempt,
DROP COLUMN IF EXISTS sync_error_message,
DROP COLUMN IF EXISTS is_offline_created;

-- Eliminar constraint de sync_status si existe
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_sync_status_check;
