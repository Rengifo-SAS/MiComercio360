-- Modificar trigger de inventario para que NO actualice al crear factura
-- El inventario solo se actualizará cuando se registre un pago

-- Eliminar el trigger que actualiza inventario al crear items
DROP TRIGGER IF EXISTS trigger_update_inventory_on_purchase_invoice ON public.purchase_invoice_items;

-- Crear función para actualizar inventario cuando se paga una factura de compra
CREATE OR REPLACE FUNCTION public.update_inventory_on_purchase_invoice_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item record;
    v_warehouse_id uuid;
    v_company_id uuid;
    v_old_paid_amount numeric(15,2);
    v_new_paid_amount numeric(15,2);
    v_total_amount numeric(15,2);
    v_payment_difference numeric(15,2);
    v_quantity_to_add numeric(10,2);
BEGIN
    -- Obtener valores antiguos y nuevos
    v_old_paid_amount := COALESCE(OLD.paid_amount, 0);
    v_new_paid_amount := COALESCE(NEW.paid_amount, 0);
    v_total_amount := NEW.total_amount;
    v_payment_difference := v_new_paid_amount - v_old_paid_amount;
    
    -- Solo procesar si hay un incremento en el pago y la factura está activa
    IF v_payment_difference > 0 AND NEW.status = 'active' AND NEW.is_cancelled = false THEN
        -- Obtener warehouse_id y company_id de la factura
        v_warehouse_id := NEW.warehouse_id;
        v_company_id := NEW.company_id;
        
        -- Procesar items de productos
        FOR v_item IN 
            SELECT * FROM public.purchase_invoice_items
            WHERE purchase_invoice_id = NEW.id
            AND item_type = 'PRODUCT'
            AND product_id IS NOT NULL
            AND quantity > 0
        LOOP
            -- Calcular la proporción del pago vs el total
            -- Si es el primer pago o pago parcial, agregar proporcionalmente
            -- Si es pago completo, agregar todo el inventario pendiente
            
            IF v_old_paid_amount = 0 THEN
                -- Primer pago: calcular proporción
                IF v_new_paid_amount >= v_total_amount THEN
                    -- Pago completo: agregar toda la cantidad
                    v_quantity_to_add := v_item.quantity;
                ELSE
                    -- Pago parcial: agregar proporción
                    v_quantity_to_add := (v_item.quantity * (v_new_paid_amount / v_total_amount));
                END IF;
            ELSE
                -- Pago adicional: agregar solo la diferencia proporcional
                IF v_new_paid_amount >= v_total_amount THEN
                    -- Ahora está pagado completamente, agregar lo que falta
                    v_quantity_to_add := v_item.quantity - (v_item.quantity * (v_old_paid_amount / v_total_amount));
                ELSE
                    -- Pago parcial adicional: agregar diferencia proporcional
                    v_quantity_to_add := v_item.quantity * ((v_new_paid_amount - v_old_paid_amount) / v_total_amount);
                END IF;
            END IF;
            
            -- Solo agregar si hay cantidad positiva
            IF v_quantity_to_add > 0 AND v_warehouse_id IS NOT NULL THEN
                PERFORM public.adjust_warehouse_inventory(
                    v_item.product_id,
                    'in',
                    v_quantity_to_add::integer,
                    v_warehouse_id,
                    'Pago de factura de compra: ' || NEW.supplier_invoice_number
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Crear trigger para actualizar inventario cuando se actualiza el paid_amount
CREATE TRIGGER trigger_update_inventory_on_purchase_invoice_payment
    AFTER UPDATE OF paid_amount ON public.purchase_invoices
    FOR EACH ROW
    WHEN (NEW.paid_amount > OLD.paid_amount AND NEW.status = 'active' AND NEW.is_cancelled = false)
    EXECUTE FUNCTION public.update_inventory_on_purchase_invoice_payment();

-- Comentarios
COMMENT ON FUNCTION public.update_inventory_on_purchase_invoice_payment IS 'Actualiza el inventario cuando se registra un pago en una factura de compra. Solo agrega inventario proporcional al monto pagado.';

