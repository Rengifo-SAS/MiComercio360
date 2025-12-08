-- Eliminar temporalmente la restricción de clave foránea para desarrollo
-- supabase/migrations/061_remove_profiles_foreign_key_for_development.sql

-- Eliminar la restricción de clave foránea profiles_id_fkey
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Crear una nueva restricción que permita IDs que no existan en auth.users
-- Esto es solo para desarrollo local
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_check 
CHECK (id IS NOT NULL AND length(id::text) = 36);