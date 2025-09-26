-- Crear función para crear cuentas por defecto al crear una empresa
-- 039_create_default_accounts_function.sql

-- Función para crear cuentas por defecto para una empresa
CREATE OR REPLACE FUNCTION create_default_accounts_for_company(
    p_company_id UUID,
    p_created_by UUID
)
RETURNS VOID AS $$
BEGIN
    -- Crear Caja Chica
    INSERT INTO accounts (
        company_id,
        account_name,
        account_type,
        currency,
        initial_balance,
        current_balance,
        is_active,
        requires_reconciliation,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'Caja Chica',
        'CASH_BOX',
        'COP',
        0,
        0,
        true,
        true,
        'Caja chica para gastos menores y cambio',
        p_created_by
    );

    -- Crear Caja General
    INSERT INTO accounts (
        company_id,
        account_name,
        account_type,
        currency,
        initial_balance,
        current_balance,
        is_active,
        requires_reconciliation,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'Caja General',
        'CASH_BOX',
        'COP',
        0,
        0,
        true,
        true,
        'Caja general para operaciones diarias',
        p_created_by
    );

    -- Crear Efectivo POS
    INSERT INTO accounts (
        company_id,
        account_name,
        account_type,
        currency,
        initial_balance,
        current_balance,
        is_active,
        requires_reconciliation,
        description,
        created_by
    ) VALUES (
        p_company_id,
        'Efectivo POS',
        'CASH_BOX',
        'COP',
        0,
        0,
        true,
        true,
        'Efectivo del punto de venta para transacciones',
        p_created_by
    );

    -- Log de la creación de cuentas por defecto
    INSERT INTO account_transactions (
        account_id,
        company_id,
        transaction_type,
        amount,
        balance_after,
        description,
        created_by
    ) 
    SELECT 
        a.id,
        p_company_id,
        'ADJUSTMENT',
        0,
        0,
        'Cuentas por defecto creadas automáticamente',
        p_created_by
    FROM accounts a
    WHERE a.company_id = p_company_id
    AND a.account_name IN ('Caja Chica', 'Caja General', 'Efectivo POS');

END;
$$ LANGUAGE plpgsql;

-- Comentario para documentación
COMMENT ON FUNCTION create_default_accounts_for_company IS 'Crea las cuentas por defecto (Caja Chica, Caja General, Efectivo POS) para una nueva empresa';

-- Crear trigger para ejecutar automáticamente la función al crear una empresa
CREATE OR REPLACE FUNCTION trigger_create_default_accounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear las cuentas por defecto para la nueva empresa
    PERFORM create_default_accounts_for_company(NEW.id, NEW.created_by);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger que se ejecuta después de insertar una empresa
CREATE TRIGGER trigger_company_created
    AFTER INSERT ON companies
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_accounts();

-- Comentario para documentación
COMMENT ON TRIGGER trigger_company_created ON companies IS 'Crea automáticamente las cuentas por defecto cuando se crea una nueva empresa';