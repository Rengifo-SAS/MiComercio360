-- Script para crear buckets de Storage en Supabase
-- Ejecutar este script en la consola SQL de Supabase

-- Crear bucket para assets de empresa (logos, documentos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
);

-- Crear bucket para productos (imágenes de productos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Crear bucket para documentos (facturas, recibos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  104857600, -- 100MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Crear políticas RLS para company-assets
CREATE POLICY "Users can view company assets" ON storage.objects FOR
SELECT USING (bucket_id = 'company-assets');

CREATE POLICY "Users can upload company assets" ON storage.objects FOR
INSERT
WITH
    CHECK (
        bucket_id = 'company-assets'
        AND auth.uid () IS NOT NULL
    );

CREATE POLICY "Users can update company assets" ON storage.objects FOR
UPDATE USING (
    bucket_id = 'company-assets'
    AND auth.uid () IS NOT NULL
);

CREATE POLICY "Users can delete company assets" ON storage.objects FOR DELETE USING (
    bucket_id = 'company-assets'
    AND auth.uid () IS NOT NULL
);

-- Crear políticas RLS para product-images
CREATE POLICY "Users can view product images" ON storage.objects FOR
SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Users can upload product images" ON storage.objects FOR
INSERT
WITH
    CHECK (
        bucket_id = 'product-images'
        AND auth.uid () IS NOT NULL
    );

CREATE POLICY "Users can update product images" ON storage.objects FOR
UPDATE USING (
    bucket_id = 'product-images'
    AND auth.uid () IS NOT NULL
);

CREATE POLICY "Users can delete product images" ON storage.objects FOR DELETE USING (
    bucket_id = 'product-images'
    AND auth.uid () IS NOT NULL
);

-- Crear políticas RLS para documents
CREATE POLICY "Users can view documents" ON storage.objects FOR
SELECT USING (bucket_id = 'documents');

CREATE POLICY "Users can upload documents" ON storage.objects FOR
INSERT
WITH
    CHECK (
        bucket_id = 'documents'
        AND auth.uid () IS NOT NULL
    );

CREATE POLICY "Users can update documents" ON storage.objects FOR
UPDATE USING (
    bucket_id = 'documents'
    AND auth.uid () IS NOT NULL
);

CREATE POLICY "Users can delete documents" ON storage.objects FOR DELETE USING (
    bucket_id = 'documents'
    AND auth.uid () IS NOT NULL
);