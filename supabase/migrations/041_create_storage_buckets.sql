-- Crear buckets de Storage para la aplicación
-- 041_create_storage_buckets.sql

-- Crear bucket para assets de empresa (logos, documentos, etc.)
INSERT INTO storage.buckets (id, name)
VALUES ('company-assets', 'company-assets');

-- Crear bucket para productos (imágenes de productos)
INSERT INTO storage.buckets (id, name)
VALUES ('product-images', 'product-images');

-- Crear bucket para documentos (facturas, recibos, etc.)
INSERT INTO storage.buckets (id, name)
VALUES ('documents', 'documents');

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

-- Comentarios para documentación (comentados por permisos)
-- COMMENT ON TABLE storage.buckets IS 'Buckets de Storage para la aplicación POS';

-- Comentarios de columnas comentados por permisos
-- COMMENT ON COLUMN storage.buckets.id IS 'Identificador único del bucket';
-- COMMENT ON COLUMN storage.buckets.name IS 'Nombre del bucket';
-- COMMENT ON COLUMN storage.buckets.public IS 'Si el bucket es público o privado';
-- COMMENT ON COLUMN storage.buckets.file_size_limit IS 'Límite de tamaño de archivo en bytes';
-- COMMENT ON COLUMN storage.buckets.allowed_mime_types IS 'Tipos MIME permitidos en el bucket';