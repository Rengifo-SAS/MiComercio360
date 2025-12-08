-- Permitir a usuarios autenticados crear perfiles de otros usuarios
-- supabase/migrations/060_allow_profile_creation_for_authenticated_users.sql

-- Crear política para permitir inserción de perfiles por usuarios autenticados
CREATE POLICY "Authenticated users can create profiles" ON public.profiles FOR
INSERT
    TO authenticated
WITH
    CHECK (true);

-- Crear política para permitir actualización de perfiles por usuarios autenticados
CREATE POLICY "Authenticated users can update profiles" ON public.profiles FOR
UPDATE TO authenticated USING (true)
WITH
    CHECK (true);

-- Crear política para permitir lectura de perfiles por usuarios autenticados
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR
SELECT TO authenticated USING (true);