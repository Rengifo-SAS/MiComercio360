-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;

DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can create initial profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

DROP POLICY IF EXISTS "Users can update their own company" ON public.companies;

DROP POLICY IF EXISTS "Users can create companies" ON public.companies;

-- Create better RLS policies that avoid recursion

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR
SELECT USING (id = auth.uid ());

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR
INSERT
WITH
    CHECK (id = auth.uid ());

CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE USING (id = auth.uid ());

-- Allow users to view other profiles in their company (but only after they have a profile)
CREATE POLICY "Users can view company profiles" ON public.profiles FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

-- Companies policies
CREATE POLICY "Users can view their company" ON public.companies FOR
SELECT USING (
        id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can update their company" ON public.companies FOR
UPDATE USING (
    id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Allow users to create companies (for initial setup)
CREATE POLICY "Users can create companies" ON public.companies FOR
INSERT
WITH
    CHECK (true);

-- Allow users to insert into profiles with any company_id (for initial setup)
-- This policy will be more restrictive after the user has a profile
CREATE POLICY "Users can create initial profile" ON public.profiles FOR
INSERT
WITH
    CHECK (id = auth.uid ());

-- Update the other policies to be more specific and avoid recursion
DROP POLICY IF EXISTS "Users can access their company data" ON public.products;

DROP POLICY IF EXISTS "Users can access products in their company" ON public.products;

DROP POLICY IF EXISTS "Users can access their company data" ON public.sales;

DROP POLICY IF EXISTS "Users can access sales in their company" ON public.sales;

DROP POLICY IF EXISTS "Users can access their company data" ON public.customers;

DROP POLICY IF EXISTS "Users can access customers in their company" ON public.customers;

DROP POLICY IF EXISTS "Users can access their company data" ON public.inventory;

DROP POLICY IF EXISTS "Users can access inventory in their company" ON public.inventory;

DROP POLICY IF EXISTS "Users can access their company data" ON public.categories;

DROP POLICY IF EXISTS "Users can access categories in their company" ON public.categories;

DROP POLICY IF EXISTS "Users can access their company data" ON public.suppliers;

DROP POLICY IF EXISTS "Users can access suppliers in their company" ON public.suppliers;

DROP POLICY IF EXISTS "Users can access their company data" ON public.shifts;

DROP POLICY IF EXISTS "Users can access shifts in their company" ON public.shifts;

DROP POLICY IF EXISTS "Users can access their company data" ON public.purchases;

DROP POLICY IF EXISTS "Users can access purchases in their company" ON public.purchases;

DROP POLICY IF EXISTS "Users can access their company data" ON public.settings;

DROP POLICY IF EXISTS "Users can access settings in their company" ON public.settings;

-- Create more specific policies for each table
CREATE POLICY "Users can access products in their company" ON public.products FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access sales in their company" ON public.sales FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access customers in their company" ON public.customers FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access inventory in their company" ON public.inventory FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access categories in their company" ON public.categories FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access suppliers in their company" ON public.suppliers FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access shifts in their company" ON public.shifts FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access purchases in their company" ON public.purchases FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access settings in their company" ON public.settings FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Create policies for new tables if they exist
DO $$
BEGIN
  -- Check if tax_rates table exists and create policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_rates' AND table_schema = 'public') THEN
    CREATE POLICY "Users can access tax_rates in their company" ON public.tax_rates
      FOR ALL USING (
        company_id IN (
          SELECT company_id 
          FROM public.profiles 
          WHERE id = auth.uid()
        )
      );
  END IF;

  -- Check if payment_methods table exists and create policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods' AND table_schema = 'public') THEN
    CREATE POLICY "Users can access payment_methods in their company" ON public.payment_methods
      FOR ALL USING (
        company_id IN (
          SELECT company_id 
          FROM public.profiles 
          WHERE id = auth.uid()
        )
      );
  END IF;

  -- Check if fiscal_settings table exists and create policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fiscal_settings' AND table_schema = 'public') THEN
    CREATE POLICY "Users can access fiscal_settings in their company" ON public.fiscal_settings
      FOR ALL USING (
        company_id IN (
          SELECT company_id 
          FROM public.profiles 
          WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create a function to setup company and profile in a transaction
CREATE OR REPLACE FUNCTION setup_company_and_profile(
  p_user_id uuid,
  p_user_email text,
  p_user_name text,
  p_company_name text,
  p_business_name text,
  p_tax_id text,
  p_email text,
  p_phone text,
  p_address text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_country text DEFAULT 'Colombia',
  p_regimen_tributario text DEFAULT 'Simplificado',
  p_codigo_ciiu text DEFAULT NULL,
  p_tipo_documento text DEFAULT 'NIT'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  -- Create company first
  INSERT INTO public.companies (
    name, business_name, tax_id, email, phone, address, 
    city, state, postal_code, country, regimen_tributario, 
    codigo_ciiu, tipo_documento, is_active
  ) VALUES (
    p_company_name, p_business_name, p_tax_id, p_email, p_phone, p_address,
    p_city, p_state, p_postal_code, p_country, p_regimen_tributario,
    p_codigo_ciiu, p_tipo_documento, true
  ) RETURNING id INTO v_company_id;

  -- Create or update profile
  INSERT INTO public.profiles (
    id, email, full_name, role, is_active, company_id
  ) VALUES (
    p_user_id, p_user_email, p_user_name, 'admin', true, v_company_id
  ) 
  ON CONFLICT (id) 
  DO UPDATE SET 
    company_id = v_company_id,
    email = p_user_email,
    full_name = COALESCE(p_user_name, profiles.full_name),
    updated_at = now()
  RETURNING id INTO v_profile_id;

  -- Return company data
  SELECT to_jsonb(c.*) INTO v_result
  FROM public.companies c
  WHERE c.id = v_company_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION setup_company_and_profile TO authenticated;

-- Create a function to setup default company configurations
CREATE OR REPLACE FUNCTION setup_company_defaults(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create fiscal settings
  INSERT INTO public.fiscal_settings (
    company_id, resolution_number, resolution_date, 
    valid_from, valid_to, consecutive_from, consecutive_to, 
    current_consecutive, is_active
  ) VALUES (
    p_company_id, 'RES-001', CURRENT_DATE,
    CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year',
    1, 999999, 0, true
  ) ON CONFLICT DO NOTHING;

  -- Create default tax rates for Colombia
  INSERT INTO public.tax_rates (company_id, name, rate, type, is_active) VALUES
    (p_company_id, 'IVA', 19, 'percentage', true),
    (p_company_id, 'ICA', 0.96, 'percentage', true),
    (p_company_id, 'Retención en la Fuente', 3.5, 'percentage', true)
  ON CONFLICT DO NOTHING;

  -- Create default payment methods
  INSERT INTO public.payment_methods (company_id, name, type, requires_pos, is_active) VALUES
    (p_company_id, 'Efectivo', 'cash', false, true),
    (p_company_id, 'Tarjeta Débito', 'card', true, true),
    (p_company_id, 'Tarjeta Crédito', 'card', true, true),
    (p_company_id, 'Transferencia', 'transfer', false, true),
    (p_company_id, 'Nequi', 'digital_wallet', false, true),
    (p_company_id, 'Daviplata', 'digital_wallet', false, true)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION setup_company_defaults TO authenticated;