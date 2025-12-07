-- Crear tabla para solicitudes de reembolso/anulación
CREATE TABLE public.refund_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  company_id uuid NOT NULL,
  request_type character varying NOT NULL CHECK (request_type IN ('REFUND', 'CANCELLATION')),
  reason character varying NOT NULL CHECK (reason IN (
    'CONSUMER_RETRACT', 
    'WARRANTY_CLAIM', 
    'PRODUCT_DEFECT', 
    'FRAUD', 
    'CUSTOMER_DISSATISFACTION', 
    'OTHER'
  )),
  status character varying NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 
    'APPROVED', 
    'REJECTED', 
    'PROCESSED'
  )),
  requested_amount numeric NOT NULL CHECK (requested_amount >= 0),
  approved_amount numeric CHECK (approved_amount >= 0),
  refund_method character varying NOT NULL CHECK (refund_method IN (
    'CASH', 
    'CARD_REVERSAL', 
    'TRANSFER', 
    'STORE_CREDIT'
  )),
  description text NOT NULL,
  supporting_documents text[],
  request_date timestamp with time zone NOT NULL DEFAULT now(),
  processed_date timestamp with time zone,
  processed_by uuid,
  customer_signature text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,
  updated_by uuid,
  CONSTRAINT refund_requests_pkey PRIMARY KEY (id),
  CONSTRAINT refund_requests_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id),
  CONSTRAINT refund_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT refund_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id),
  CONSTRAINT refund_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT refund_requests_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
);

-- Crear tabla para items de reembolso
CREATE TABLE public.refund_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  refund_request_id uuid NOT NULL,
  sale_item_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  condition character varying NOT NULL DEFAULT 'NEW' CHECK (condition IN (
    'NEW', 
    'USED', 
    'DAMAGED'
  )),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT refund_items_pkey PRIMARY KEY (id),
  CONSTRAINT refund_items_refund_request_id_fkey FOREIGN KEY (refund_request_id) REFERENCES public.refund_requests(id) ON DELETE CASCADE,
  CONSTRAINT refund_items_sale_item_id_fkey FOREIGN KEY (sale_item_id) REFERENCES public.sale_items(id),
  CONSTRAINT refund_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_refund_requests_company_id ON public.refund_requests(company_id);
CREATE INDEX idx_refund_requests_sale_id ON public.refund_requests(sale_id);
CREATE INDEX idx_refund_requests_status ON public.refund_requests(status);
CREATE INDEX idx_refund_requests_request_type ON public.refund_requests(request_type);
CREATE INDEX idx_refund_requests_request_date ON public.refund_requests(request_date);
CREATE INDEX idx_refund_requests_created_by ON public.refund_requests(created_by);

CREATE INDEX idx_refund_items_refund_request_id ON public.refund_items(refund_request_id);
CREATE INDEX idx_refund_items_product_id ON public.refund_items(product_id);

-- Habilitar RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_items ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para refund_requests
CREATE POLICY "Users can view refund requests for their company" ON public.refund_requests
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create refund requests for their company" ON public.refund_requests
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update refund requests for their company" ON public.refund_requests
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete refund requests for their company" ON public.refund_requests
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Crear políticas RLS para refund_items
CREATE POLICY "Users can view refund items for their company" ON public.refund_items
  FOR SELECT USING (
    refund_request_id IN (
      SELECT id FROM public.refund_requests 
      WHERE company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create refund items for their company" ON public.refund_items
  FOR INSERT WITH CHECK (
    refund_request_id IN (
      SELECT id FROM public.refund_requests 
      WHERE company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update refund items for their company" ON public.refund_items
  FOR UPDATE USING (
    refund_request_id IN (
      SELECT id FROM public.refund_requests 
      WHERE company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete refund items for their company" ON public.refund_items
  FOR DELETE USING (
    refund_request_id IN (
      SELECT id FROM public.refund_requests 
      WHERE company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_refund_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at
CREATE TRIGGER trigger_update_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_refund_requests_updated_at();

-- Crear función para validar que el monto aprobado no exceda el solicitado
CREATE OR REPLACE FUNCTION validate_approved_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved_amount IS NOT NULL AND NEW.approved_amount > NEW.requested_amount THEN
    RAISE EXCEPTION 'El monto aprobado no puede exceder el monto solicitado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar monto aprobado
CREATE TRIGGER trigger_validate_approved_amount
  BEFORE INSERT OR UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_approved_amount();

-- Crear función para validar que el total de items coincida con el monto solicitado
CREATE OR REPLACE FUNCTION validate_refund_items_total()
RETURNS TRIGGER AS $$
DECLARE
  items_total numeric;
  request_amount numeric;
BEGIN
  -- Obtener el total de los items del reembolso
  SELECT COALESCE(SUM(total_amount), 0) INTO items_total
  FROM public.refund_items
  WHERE refund_request_id = NEW.refund_request_id;
  
  -- Obtener el monto solicitado
  SELECT requested_amount INTO request_amount
  FROM public.refund_requests
  WHERE id = NEW.refund_request_id;
  
  -- Validar que el total de items no exceda el monto solicitado
  IF items_total > request_amount THEN
    RAISE EXCEPTION 'El total de los items del reembolso no puede exceder el monto solicitado';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar total de items
CREATE TRIGGER trigger_validate_refund_items_total
  AFTER INSERT OR UPDATE ON public.refund_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_refund_items_total();

-- Comentarios en las tablas
COMMENT ON TABLE public.refund_requests IS 'Solicitudes de reembolso y anulación de ventas conforme a normativa colombiana';
COMMENT ON TABLE public.refund_items IS 'Items específicos incluidos en las solicitudes de reembolso';

COMMENT ON COLUMN public.refund_requests.request_type IS 'Tipo de solicitud: REFUND (reembolso) o CANCELLATION (anulación)';
COMMENT ON COLUMN public.refund_requests.reason IS 'Motivo del reembolso según normativa colombiana';
COMMENT ON COLUMN public.refund_requests.status IS 'Estado de la solicitud: PENDING, APPROVED, REJECTED, PROCESSED';
COMMENT ON COLUMN public.refund_requests.refund_method IS 'Método de reembolso: efectivo, reversión a tarjeta, transferencia o crédito en tienda';
COMMENT ON COLUMN public.refund_requests.customer_signature IS 'Firma digital del cliente para validar la solicitud';
COMMENT ON COLUMN public.refund_items.condition IS 'Condición del producto al momento de la devolución';
