-- Corregir purchase_debit_notes para usar supplier_id en lugar de customer_id
-- 129_fix_purchase_debit_notes_supplier_id.sql

-- Verificar si existe customer_id y cambiarlo a supplier_id
DO $$
BEGIN
  -- Si existe customer_id, cambiarlo a supplier_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_debit_notes' 
    AND column_name = 'customer_id'
    AND table_schema = 'public'
  ) THEN
    -- Eliminar foreign key de customer_id si existe
    ALTER TABLE public.purchase_debit_notes
    DROP CONSTRAINT IF EXISTS purchase_debit_notes_customer_id_fkey;

    -- Eliminar índice de customer_id si existe
    DROP INDEX IF EXISTS idx_purchase_debit_notes_customer_id;

    -- Eliminar columna customer_id
    ALTER TABLE public.purchase_debit_notes
    DROP COLUMN IF EXISTS customer_id;
  END IF;

  -- Agregar supplier_id si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_debit_notes' 
    AND column_name = 'supplier_id'
    AND table_schema = 'public'
  ) THEN
    -- Agregar columna supplier_id
    ALTER TABLE public.purchase_debit_notes
    ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE CASCADE;

    -- Hacer supplier_id NOT NULL (solo si no hay datos)
    -- Si hay datos, primero deberían migrarse
    -- Por ahora lo dejamos nullable para permitir migración
  END IF;
END $$;

-- Crear índice para supplier_id
CREATE INDEX IF NOT EXISTS idx_purchase_debit_notes_supplier_id ON public.purchase_debit_notes(supplier_id);

-- Actualizar comentarios
COMMENT ON COLUMN public.purchase_debit_notes.supplier_id IS 'Proveedor a nombre de quien está hecha la nota débito (obligatorio)';
COMMENT ON TABLE public.purchase_debit_notes IS 'Notas débito de compra para disminuir el saldo por pagar a proveedores';

-- También corregir settlements si tienen sale_id
DO $$
BEGIN
  -- Si existe sale_id en settlements, eliminarlo
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_debit_note_settlements' 
    AND column_name = 'sale_id'
    AND table_schema = 'public'
  ) THEN
    -- Eliminar foreign key de sale_id si existe
    ALTER TABLE public.purchase_debit_note_settlements
    DROP CONSTRAINT IF EXISTS purchase_debit_note_settlements_sale_id_fkey;

    -- Eliminar índice de sale_id si existe
    DROP INDEX IF EXISTS idx_purchase_debit_note_settlements_sale_id;

    -- Eliminar columna sale_id
    ALTER TABLE public.purchase_debit_note_settlements
    DROP COLUMN IF EXISTS sale_id;
  END IF;

  -- Asegurar que purchase_id existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_debit_note_settlements' 
    AND column_name = 'purchase_id'
    AND table_schema = 'public'
  ) THEN
    -- Agregar columna purchase_id
    ALTER TABLE public.purchase_debit_note_settlements
    ADD COLUMN purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL;

    -- Crear índice
    CREATE INDEX IF NOT EXISTS idx_purchase_debit_note_settlements_purchase_id 
    ON public.purchase_debit_note_settlements(purchase_id);
  END IF;
END $$;

-- Actualizar comentarios de settlements
COMMENT ON COLUMN public.purchase_debit_note_settlements.purchase_id IS 'Factura de compra a la que se aplica el crédito';
COMMENT ON COLUMN public.purchase_debit_note_settlements.settlement_type IS 'Tipo de liquidación: CASH_REFUND (devolución de dinero) o INVOICE_CREDIT (crédito a factura de compra)';

