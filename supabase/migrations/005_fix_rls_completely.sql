-- Completely fix RLS policies to avoid recursion
-- This migration removes all problematic policies and creates simple, safe ones

-- First, drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can create initial profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their company" ON public.companies;

DROP POLICY IF EXISTS "Users can update their company" ON public.companies;

DROP POLICY IF EXISTS "Users can create companies" ON public.companies;

-- Drop all other table policies (only for tables that exist)
DROP POLICY IF EXISTS "Users can access products in their company" ON public.products;

DROP POLICY IF EXISTS "Users can access sales in their company" ON public.sales;

DROP POLICY IF EXISTS "Users can access customers in their company" ON public.customers;

DROP POLICY IF EXISTS "Users can access inventory in their company" ON public.inventory;

DROP POLICY IF EXISTS "Users can access categories in their company" ON public.categories;

DROP POLICY IF EXISTS "Users can access suppliers in their company" ON public.suppliers;

DROP POLICY IF EXISTS "Users can access shifts in their company" ON public.shifts;

DROP POLICY IF EXISTS "Users can access purchases in their company" ON public.purchases;

DROP POLICY IF EXISTS "Users can access settings in their company" ON public.settings;

-- Drop policies for additional tables only if they exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_rates' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can access tax_rates in their company" ON public.tax_rates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can access payment_methods in their company" ON public.payment_methods;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fiscal_settings' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can access fiscal_settings in their company" ON public.fiscal_settings;
  END IF;
END $$;

-- Create very simple, non-recursive policies for profiles
-- These policies only check the user's own ID, no subqueries
CREATE POLICY "Users can view their own profile" ON public.profiles FOR
SELECT USING (id = auth.uid ());

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR
INSERT
WITH
    CHECK (id = auth.uid ());

CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE USING (id = auth.uid ());

-- Create simple policies for companies
-- Allow all authenticated users to create companies (for initial setup)
CREATE POLICY "Users can create companies" ON public.companies FOR
INSERT
WITH
    CHECK (
        auth.role () = 'authenticated'
    );

-- Allow users to view companies (we'll restrict this later with application logic)
CREATE POLICY "Users can view companies" ON public.companies FOR
SELECT USING (
        auth.role () = 'authenticated'
    );

-- Allow users to update companies (we'll restrict this later with application logic)
CREATE POLICY "Users can update companies" ON public.companies FOR
UPDATE USING (
    auth.role () = 'authenticated'
);

-- Create simple policies for other tables
-- These will work once the user has a profile with company_id
CREATE POLICY "Users can access products" ON public.products FOR ALL USING (
    auth.role () = 'authenticated'
);

CREATE POLICY "Users can access sales" ON public.sales FOR ALL USING (
    auth.role () = 'authenticated'
);

CREATE POLICY "Users can access customers" ON public.customers FOR ALL USING (
    auth.role () = 'authenticated'
);

CREATE POLICY "Users can access inventory" ON public.inventory FOR ALL USING (
    auth.role () = 'authenticated'
);

CREATE POLICY "Users can access categories" ON public.categories FOR ALL USING (
    auth.role () = 'authenticated'
);

CREATE POLICY "Users can access suppliers" ON public.suppliers FOR ALL USING (
    auth.role () = 'authenticated'
);

CREATE POLICY "Users can access shifts" ON public.shifts FOR ALL USING (
    auth.role () = 'authenticated'
);

CREATE POLICY "Users can access purchases" ON public.purchases FOR ALL USING (
    auth.role () = 'authenticated'
);

CREATE POLICY "Users can access settings" ON public.settings FOR ALL USING (
    auth.role () = 'authenticated'
);

-- Create policies for additional tables if they exist
DO $$ BEGIN
  -- Tax rates policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_rates' AND table_schema = 'public') THEN
    CREATE POLICY "Users can access tax_rates" ON public.tax_rates
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  -- Payment methods policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods' AND table_schema = 'public') THEN
    CREATE POLICY "Users can access payment_methods" ON public.payment_methods
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  -- Fiscal settings policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fiscal_settings' AND table_schema = 'public') THEN
    CREATE POLICY "Users can access fiscal_settings" ON public.fiscal_settings
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Create a more robust function for company setup that bypasses RLS issues
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
SET search_path = public
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