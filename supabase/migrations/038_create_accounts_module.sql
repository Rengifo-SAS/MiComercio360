-- Crear módulo completo de cuentas bancarias y control de efectivo
-- 038_create_accounts_module.sql

-- Eliminar tablas relacionadas si existen
DROP TABLE IF EXISTS account_transactions CASCADE;

DROP TABLE IF EXISTS account_reconciliations CASCADE;

DROP TABLE IF EXISTS accounts CASCADE;

-- Crear tabla de cuentas bancarias y de efectivo
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

-- Información básica de la cuenta
account_name VARCHAR(255) NOT NULL, -- Nombre de la cuenta (ej: "Banco Bogotá - Cuenta Corriente")
account_number VARCHAR(50), -- Número de cuenta bancaria
account_type VARCHAR(20) NOT NULL CHECK (
    account_type IN (
        'BANK_ACCOUNT', -- Cuenta bancaria
        'CASH_BOX', -- Caja de efectivo
        'CREDIT_CARD', -- Tarjeta de crédito
        'INVESTMENT', -- Inversión
        'OTHER' -- Otras cuentas
    )
),

-- Información bancaria
bank_name VARCHAR(255), -- Nombre del banco
bank_code VARCHAR(10), -- Código del banco (ej: 0001 para Banco de Bogotá)
routing_number VARCHAR(20), -- Número de ruta bancaria

-- Información de la tarjeta de crédito
card_number_last_four VARCHAR(4), -- Últimos 4 dígitos de la tarjeta
card_holder_name VARCHAR(255), -- Nombre del titular
card_expiry_date DATE, -- Fecha de vencimiento

-- Configuración de la cuenta
currency VARCHAR(3) NOT NULL DEFAULT 'COP', -- Moneda (COP, USD, EUR)
initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Saldo inicial
current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Saldo actual
credit_limit DECIMAL(15, 2) DEFAULT 0, -- Límite de crédito (para tarjetas)
available_credit DECIMAL(15, 2) DEFAULT 0, -- Crédito disponible

-- Estado y configuración
is_active BOOLEAN NOT NULL DEFAULT true,
is_reconciled BOOLEAN NOT NULL DEFAULT false, -- Si está conciliada
last_reconciliation_date TIMESTAMPTZ, -- Última fecha de conciliación
requires_reconciliation BOOLEAN NOT NULL DEFAULT true, -- Si requiere conciliación

-- Metadatos
description TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Crear tabla de movimientos de cuentas
CREATE TABLE account_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

-- Información del movimiento
transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
transaction_type VARCHAR(20) NOT NULL CHECK (
    transaction_type IN (
        'DEPOSIT', -- Depósito/Ingreso
        'WITHDRAWAL', -- Retiro/Egreso
        'TRANSFER_IN', -- Transferencia entrante
        'TRANSFER_OUT', -- Transferencia saliente
        'PAYMENT', -- Pago
        'RECEIPT', -- Recibo/Cobro
        'ADJUSTMENT', -- Ajuste
        'INTEREST', -- Intereses
        'FEE', -- Comisiones
        'REFUND', -- Reembolso
        'RECONCILIATION' -- Conciliación
    )
),

-- Detalles del movimiento
amount DECIMAL(15, 2) NOT NULL, -- Monto (positivo para ingresos, negativo para egresos)
balance_after DECIMAL(15, 2) NOT NULL, -- Saldo después del movimiento
reference_number VARCHAR(100), -- Número de referencia
description TEXT NOT NULL, -- Descripción del movimiento

-- Información de la transacción relacionada
related_transaction_id UUID, -- ID de transacción relacionada (para transferencias)
related_account_id UUID REFERENCES accounts (id), -- Cuenta relacionada
related_entity_type VARCHAR(50), -- Tipo de entidad relacionada (sale, purchase, etc.)
related_entity_id UUID, -- ID de la entidad relacionada

-- Información bancaria
bank_reference VARCHAR(100), -- Referencia bancaria
check_number VARCHAR(50), -- Número de cheque
cleared_date TIMESTAMPTZ, -- Fecha de compensación

-- Estado de conciliación
is_reconciled BOOLEAN NOT NULL DEFAULT false,
reconciliation_id UUID, -- ID de conciliación
reconciliation_date TIMESTAMPTZ, -- Fecha de conciliación

-- Metadatos
created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Crear tabla de conciliaciones bancarias
CREATE TABLE account_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

-- Información de la conciliación
reconciliation_date DATE NOT NULL, -- Fecha de conciliación
statement_balance DECIMAL(15, 2) NOT NULL, -- Saldo según estado de cuenta
book_balance DECIMAL(15, 2) NOT NULL, -- Saldo según libros
reconciled_balance DECIMAL(15, 2) NOT NULL, -- Saldo conciliado

-- Diferencias
outstanding_deposits DECIMAL(15, 2) DEFAULT 0, -- Depósitos en tránsito
outstanding_checks DECIMAL(15, 2) DEFAULT 0, -- Cheques pendientes
bank_charges DECIMAL(15, 2) DEFAULT 0, -- Cargos bancarios
bank_credits DECIMAL(15, 2) DEFAULT 0, -- Créditos bancarios
adjustments DECIMAL(15, 2) DEFAULT 0, -- Ajustes

-- Estado
status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN (
        'PENDING',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
    )
),

-- Metadatos
notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_accounts_company_id ON accounts (company_id);

CREATE INDEX IF NOT EXISTS idx_accounts_account_type ON accounts (company_id, account_type);

CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts (company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_accounts_bank_name ON accounts (company_id, bank_name);

CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON account_transactions (account_id);

CREATE INDEX IF NOT EXISTS idx_account_transactions_company_id ON account_transactions (company_id);

CREATE INDEX IF NOT EXISTS idx_account_transactions_date ON account_transactions (transaction_date);

CREATE INDEX IF NOT EXISTS idx_account_transactions_type ON account_transactions (transaction_type);

CREATE INDEX IF NOT EXISTS idx_account_transactions_reconciled ON account_transactions (is_reconciled);

CREATE INDEX IF NOT EXISTS idx_account_transactions_related ON account_transactions (
    related_entity_type,
    related_entity_id
);

CREATE INDEX IF NOT EXISTS idx_account_reconciliations_account_id ON account_reconciliations (account_id);

CREATE INDEX IF NOT EXISTS idx_account_reconciliations_company_id ON account_reconciliations (company_id);

CREATE INDEX IF NOT EXISTS idx_account_reconciliations_date ON account_reconciliations (reconciliation_date);

CREATE INDEX IF NOT EXISTS idx_account_reconciliations_status ON account_reconciliations (status);

-- Crear función para actualizar saldo de cuenta
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    account_balance DECIMAL(15,2);
BEGIN
    -- Calcular el saldo actual basado en las transacciones
    SELECT COALESCE(SUM(amount), 0) INTO account_balance
    FROM account_transactions
    WHERE account_id = COALESCE(NEW.account_id, OLD.account_id);
    
    -- Actualizar el saldo en la tabla de cuentas
    UPDATE accounts
    SET current_balance = account_balance,
        updated_at = NOW(),
        updated_by = COALESCE(NEW.created_by, OLD.created_by)
    WHERE id = COALESCE(NEW.account_id, OLD.account_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar saldo automáticamente
CREATE TRIGGER trigger_update_account_balance
    AFTER INSERT OR UPDATE OR DELETE ON account_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at
CREATE TRIGGER trigger_update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_accounts_updated_at();

-- Crear función para validar transferencias
CREATE OR REPLACE FUNCTION validate_transfer(
    p_from_account_id UUID,
    p_to_account_id UUID,
    p_amount DECIMAL(15,2)
)
RETURNS BOOLEAN AS $$
DECLARE
    from_balance DECIMAL(15,2);
    to_account_exists BOOLEAN;
BEGIN
    -- Verificar que la cuenta de destino existe
    SELECT EXISTS(SELECT 1 FROM accounts WHERE id = p_to_account_id) INTO to_account_exists;
    
    IF NOT to_account_exists THEN
        RAISE EXCEPTION 'Cuenta de destino no encontrada';
    END IF;
    
    -- Verificar que la cuenta de origen tiene suficiente saldo
    SELECT current_balance INTO from_balance
    FROM accounts
    WHERE id = p_from_account_id;
    
    IF from_balance < p_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente en la cuenta de origen';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Crear función para crear transferencia
CREATE OR REPLACE FUNCTION create_transfer(
    p_from_account_id UUID,
    p_to_account_id UUID,
    p_amount DECIMAL(15,2),
    p_description TEXT,
    p_reference_number VARCHAR(100),
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    transfer_id UUID;
    from_balance DECIMAL(15,2);
    to_balance DECIMAL(15,2);
BEGIN
    -- Validar la transferencia
    PERFORM validate_transfer(p_from_account_id, p_to_account_id, p_amount);
    
    -- Obtener saldos actuales
    SELECT current_balance INTO from_balance FROM accounts WHERE id = p_from_account_id;
    SELECT current_balance INTO to_balance FROM accounts WHERE id = p_to_account_id;
    
    -- Crear transacción de salida
    INSERT INTO account_transactions (
        account_id, company_id, transaction_type, amount, balance_after,
        description, reference_number, related_account_id, created_by
    ) VALUES (
        p_from_account_id, 
        (SELECT company_id FROM accounts WHERE id = p_from_account_id),
        'TRANSFER_OUT', 
        -p_amount, 
        from_balance - p_amount,
        p_description, 
        p_reference_number, 
        p_to_account_id, 
        p_created_by
    ) RETURNING id INTO transfer_id;
    
    -- Crear transacción de entrada
    INSERT INTO account_transactions (
        account_id, company_id, transaction_type, amount, balance_after,
        description, reference_number, related_account_id, created_by
    ) VALUES (
        p_to_account_id, 
        (SELECT company_id FROM accounts WHERE id = p_to_account_id),
        'TRANSFER_IN', 
        p_amount, 
        to_balance + p_amount,
        p_description, 
        p_reference_number, 
        p_from_account_id, 
        p_created_by
    );
    
    RETURN transfer_id;
END;
$$ LANGUAGE plpgsql;

-- Crear función para obtener resumen de cuentas
CREATE OR REPLACE FUNCTION get_accounts_summary(p_company_id UUID)
RETURNS TABLE (
    account_id UUID,
    account_name VARCHAR(255),
    account_type VARCHAR(20),
    bank_name VARCHAR(255),
    current_balance DECIMAL(15,2),
    currency VARCHAR(3),
    is_active BOOLEAN,
    last_transaction_date TIMESTAMPTZ,
    transaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.account_name,
        a.account_type,
        a.bank_name,
        a.current_balance,
        a.currency,
        a.is_active,
        MAX(at.transaction_date) as last_transaction_date,
        COUNT(at.id) as transaction_count
    FROM accounts a
    LEFT JOIN account_transactions at ON a.id = at.account_id
    WHERE a.company_id = p_company_id
    GROUP BY a.id, a.account_name, a.account_type, a.bank_name, 
             a.current_balance, a.currency, a.is_active
    ORDER BY a.account_name;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON
TABLE accounts IS 'Cuentas bancarias, de efectivo y tarjetas de crédito de la empresa';

COMMENT ON
TABLE account_transactions IS 'Movimientos financieros de las cuentas';

COMMENT ON
TABLE account_reconciliations IS 'Conciliaciones bancarias';

COMMENT ON FUNCTION update_account_balance IS 'Actualiza automáticamente el saldo de una cuenta';

COMMENT ON FUNCTION validate_transfer IS 'Valida que una transferencia sea posible';

COMMENT ON FUNCTION create_transfer IS 'Crea una transferencia entre cuentas';

COMMENT ON FUNCTION get_accounts_summary IS 'Obtiene resumen de todas las cuentas de una empresa';