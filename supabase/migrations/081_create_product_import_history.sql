-- Crear tabla para el historial de importaciones de productos
CREATE TABLE IF NOT EXISTS product_import_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_rows INTEGER NOT NULL DEFAULT 0,
    error_rows INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    errors TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_product_import_history_company_id ON product_import_history(company_id);
CREATE INDEX IF NOT EXISTS idx_product_import_history_uploaded_by ON product_import_history(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_product_import_history_uploaded_at ON product_import_history(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_import_history_status ON product_import_history(status);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_product_import_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at
CREATE TRIGGER trigger_update_product_import_history_updated_at
    BEFORE UPDATE ON product_import_history
    FOR EACH ROW
    EXECUTE FUNCTION update_product_import_history_updated_at();

-- Habilitar RLS
ALTER TABLE product_import_history ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Users can view import history for their company" ON product_import_history
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create import history for their company" ON product_import_history
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        ) AND uploaded_by = auth.uid()
    );

CREATE POLICY "Users can update import history for their company" ON product_import_history
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Crear bucket para almacenar archivos de importación
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-imports',
    'product-imports',
    false,
    10485760, -- 10MB limit
    ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
) ON CONFLICT (id) DO NOTHING;

-- Crear políticas para el bucket de storage
CREATE POLICY "Users can upload import files to their company folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'product-imports' AND
        (storage.foldername(name))[1] = 'imports' AND
        (storage.foldername(name))[2] = 'products' AND
        (storage.foldername(name))[3] IN (
            SELECT company_id::text FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can view import files from their company folder" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'product-imports' AND
        (storage.foldername(name))[1] = 'imports' AND
        (storage.foldername(name))[2] = 'products' AND
        (storage.foldername(name))[3] IN (
            SELECT company_id::text FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete import files from their company folder" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'product-imports' AND
        (storage.foldername(name))[1] = 'imports' AND
        (storage.foldername(name))[2] = 'products' AND
        (storage.foldername(name))[3] IN (
            SELECT company_id::text FROM profiles WHERE id = auth.uid()
        )
    );
