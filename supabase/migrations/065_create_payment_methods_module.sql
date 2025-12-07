-- Crear módulo de métodos de pago
-- 065_create_payment_methods_module.sql

-- Crear tabla de métodos de pago
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL, -- Nombre del método de pago (ej: "Efectivo", "Tarjeta de Crédito", "Transferencia")
    description text, -- Descripción del método de pago
    payment_type text NOT NULL CHECK (payment_type IN (
        'CASH',           -- Efectivo
        'CARD',           -- Tarjeta (crédito/débito)
        'TRANSFER',       -- Transferencia bancaria
        'CHECK',          -- Cheque
        'DIGITAL_WALLET', -- Billetera digital (Nequi, Daviplata, etc.)
        'CRYPTOCURRENCY', -- Criptomonedas
        'GATEWAY',        -- Pasarela de pago (Stripe, PayPal, etc.)
        'OTHER'           -- Otros métodos
    )),
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false, -- Si es un método de pago por defecto del sistema
    requires_authorization boolean DEFAULT false, -- Si requiere autorización especial
    requires_reference boolean DEFAULT false, -- Si requiere número de referencia
    requires_approval boolean DEFAULT false, -- Si requiere aprobación
    fee_percentage decimal(5,2) DEFAULT 0.00, -- Porcentaje de comisión (ej: 2.50 para 2.5%)
    fee_fixed decimal(10,2) DEFAULT 0.00, -- Comisión fija (ej: 500.00)
    min_amount decimal(12,2) DEFAULT 0.00, -- Monto mínimo para usar este método
    max_amount decimal(12,2), -- Monto máximo para usar este método
    gateway_config jsonb, -- Configuración específica de la pasarela (API keys, etc.)
    icon text, -- Nombre del icono a mostrar
    color text DEFAULT '#6B7280', -- Color del icono
    sort_order integer DEFAULT 0, -- Orden de visualización
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id),

-- Restricciones
UNIQUE(company_id, name),
    CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
    CHECK (fee_fixed >= 0),
    CHECK (min_amount >= 0),
    CHECK (max_amount IS NULL OR max_amount > min_amount),
    CHECK (name != '')
);

-- Crear tabla de historial de métodos de pago (para auditoría)
CREATE TABLE IF NOT EXISTS public.payment_method_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_method_id uuid NOT NULL REFERENCES public.payment_methods(id) ON DELETE CASCADE,
    old_fee_percentage decimal(5,2),
    new_fee_percentage decimal(5,2),
    old_fee_fixed decimal(10,2),
    new_fee_fixed decimal(10,2),
    change_reason text,
    changed_by uuid REFERENCES auth.users(id),
    changed_at timestamp with time zone DEFAULT now(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Crear tabla de configuraciones de pasarelas de pago
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL, -- Nombre de la pasarela (ej: "Stripe", "PayPal", "MercadoPago")
    gateway_type text NOT NULL CHECK (gateway_type IN (
        'STRIPE',        -- Stripe
        'PAYPAL',        -- PayPal
        'MERCADOPAGO',   -- MercadoPago
        'WOMIPAY',       -- Wompi
        'EPAYCO',        -- ePayco
        'PLACETOPAY',    -- Place to Pay
        'CUSTOM'         -- Pasarela personalizada
    )),
    is_active boolean DEFAULT true,
    is_test_mode boolean DEFAULT true, -- Modo de pruebas
    api_key text, -- Clave API
    secret_key text, -- Clave secreta
    webhook_secret text, -- Secreto del webhook
    merchant_id text, -- ID del comerciante
    public_key text, -- Clave pública
    environment text DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
    config jsonb, -- Configuración adicional específica de la pasarela
    supported_currencies text[] DEFAULT ARRAY['COP'], -- Monedas soportadas
    supported_methods text[] DEFAULT ARRAY['CARD'], -- Métodos soportados
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id),

-- Restricciones
UNIQUE(company_id, name),
    CHECK (name != '')
);

-- Crear tabla de transacciones de pago
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    payment_method_id uuid NOT NULL REFERENCES public.payment_methods(id),
    gateway_id uuid REFERENCES public.payment_gateways(id),
    transaction_id text, -- ID de la transacción en la pasarela
    external_id text, -- ID externo de la transacción
    amount decimal(12,2) NOT NULL,
    currency text DEFAULT 'COP',
    status text NOT NULL CHECK (status IN (
        'PENDING',       -- Pendiente
        'PROCESSING',    -- Procesando
        'COMPLETED',     -- Completada
        'FAILED',        -- Fallida
        'CANCELLED',     -- Cancelada
        'REFUNDED',      -- Reembolsada
        'PARTIALLY_REFUNDED' -- Parcialmente reembolsada
    )),
    gateway_response jsonb, -- Respuesta completa de la pasarela
    reference text, -- Número de referencia
    authorization_code text, -- Código de autorización
    fee_amount decimal(10,2) DEFAULT 0.00, -- Monto de la comisión
    net_amount decimal(12,2), -- Monto neto (después de comisiones)
    customer_email text,
    customer_phone text,
    description text,
    metadata jsonb, -- Metadatos adicionales
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),

-- Restricciones
CHECK (amount > 0),
    CHECK (fee_amount >= 0),
    CHECK (net_amount IS NULL OR net_amount >= 0)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON public.payment_methods (company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_payment_type ON public.payment_methods (payment_type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON public.payment_methods (is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON public.payment_methods (is_default);
CREATE INDEX IF NOT EXISTS idx_payment_methods_sort_order ON public.payment_methods (sort_order);

CREATE INDEX IF NOT EXISTS idx_payment_method_history_payment_method_id ON public.payment_method_history (payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_method_history_company_id ON public.payment_method_history (company_id);

CREATE INDEX IF NOT EXISTS idx_payment_gateways_company_id ON public.payment_gateways (company_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_gateway_type ON public.payment_gateways (gateway_type);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_is_active ON public.payment_gateways (is_active);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_company_id ON public.payment_transactions (company_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_method_id ON public.payment_transactions (payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_id ON public.payment_transactions (gateway_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions (status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON public.payment_transactions (transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_external_id ON public.payment_transactions (external_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions (created_at);

-- Crear triggers para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_payment_methods_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_payment_methods_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payment_methods_updated_at();

CREATE OR REPLACE FUNCTION public.update_payment_gateways_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_payment_gateways_updated_at
    BEFORE UPDATE ON public.payment_gateways
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payment_gateways_updated_at();

CREATE OR REPLACE FUNCTION public.update_payment_transactions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_payment_transactions_updated_at
    BEFORE UPDATE ON public.payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payment_transactions_updated_at();

-- Crear RLS (Row Level Security)
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_method_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para payment_methods
CREATE POLICY "Users can view payment methods from their company" ON public.payment_methods FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid()
        )
    );

CREATE POLICY "Users can insert payment methods for their company" ON public.payment_methods FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid()
        )
    );

CREATE POLICY "Users can update payment methods from their company" ON public.payment_methods FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid()
    )
);

CREATE POLICY "Users can delete payment methods from their company" ON public.payment_methods FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid()
    )
);

-- Políticas para payment_method_history
CREATE POLICY "Users can view payment method history from their company" ON public.payment_method_history FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid()
        )
    );

CREATE POLICY "Users can insert payment method history for their company" ON public.payment_method_history FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid()
        )
    );

-- Políticas para payment_gateways
CREATE POLICY "Users can view payment gateways from their company" ON public.payment_gateways FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid()
        )
    );

CREATE POLICY "Users can insert payment gateways for their company" ON public.payment_gateways FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid()
        )
    );

CREATE POLICY "Users can update payment gateways from their company" ON public.payment_gateways FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid()
    )
);

CREATE POLICY "Users can delete payment gateways from their company" ON public.payment_gateways FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid()
    )
);

-- Políticas para payment_transactions
CREATE POLICY "Users can view payment transactions from their company" ON public.payment_transactions FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid()
        )
    );

CREATE POLICY "Users can insert payment transactions for their company" ON public.payment_transactions FOR
INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid()
        )
    );

CREATE POLICY "Users can update payment transactions from their company" ON public.payment_transactions FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid()
    )
);

-- Comentarios para documentación
COMMENT ON TABLE public.payment_methods IS 'Métodos de pago configurados por empresa';
COMMENT ON COLUMN public.payment_methods.payment_type IS 'Tipo de método de pago (CASH, CARD, TRANSFER, CHECK, DIGITAL_WALLET, CRYPTOCURRENCY, GATEWAY, OTHER)';
COMMENT ON COLUMN public.payment_methods.fee_percentage IS 'Porcentaje de comisión (0.00 a 100.00)';
COMMENT ON COLUMN public.payment_methods.fee_fixed IS 'Comisión fija en pesos colombianos';
COMMENT ON COLUMN public.payment_methods.gateway_config IS 'Configuración específica de la pasarela de pago';
COMMENT ON TABLE public.payment_method_history IS 'Historial de cambios en métodos de pago';
COMMENT ON TABLE public.payment_gateways IS 'Pasarelas de pago configuradas por empresa';
COMMENT ON TABLE public.payment_transactions IS 'Transacciones de pago procesadas';
