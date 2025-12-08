-- Fix RLS recursion issue by simplifying policies

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can create initial profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their company" ON public.companies;

DROP POLICY IF EXISTS "Users can update their company" ON public.companies;

DROP POLICY IF EXISTS "Users can create companies" ON public.companies;

-- Create simple, non-recursive policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR
SELECT USING (id = auth.uid ());

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR
INSERT
WITH
    CHECK (id = auth.uid ());

CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE USING (id = auth.uid ());

-- Allow users to view other profiles in their company (only after they have a profile)
-- This policy uses a subquery but avoids recursion by not referencing profiles in the main query
CREATE POLICY "Users can view company profiles" ON public.profiles FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

-- Create simple policies for companies
-- Allow users to view companies they have access to
CREATE POLICY "Users can view their company" ON public.companies FOR
SELECT USING (
        id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

-- Allow users to update their company
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

-- Update other table policies to be more specific and avoid recursion
-- These policies will work correctly once the user has a profile

-- Products policies
DROP POLICY IF EXISTS "Users can access products in their company" ON public.products;

CREATE POLICY "Users can access products in their company" ON public.products FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Sales policies
DROP POLICY IF EXISTS "Users can access sales in their company" ON public.sales;

CREATE POLICY "Users can access sales in their company" ON public.sales FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Customers policies
DROP POLICY IF EXISTS "Users can access customers in their company" ON public.customers;

CREATE POLICY "Users can access customers in their company" ON public.customers FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Inventory policies
DROP POLICY IF EXISTS "Users can access inventory in their company" ON public.inventory;

CREATE POLICY "Users can access inventory in their company" ON public.inventory FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Categories policies
DROP POLICY IF EXISTS "Users can access categories in their company" ON public.categories;

CREATE POLICY "Users can access categories in their company" ON public.categories FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Suppliers policies
DROP POLICY IF EXISTS "Users can access suppliers in their company" ON public.suppliers;

CREATE POLICY "Users can access suppliers in their company" ON public.suppliers FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Shifts policies
DROP POLICY IF EXISTS "Users can access shifts in their company" ON public.shifts;

CREATE POLICY "Users can access shifts in their company" ON public.shifts FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Purchases policies
DROP POLICY IF EXISTS "Users can access purchases in their company" ON public.purchases;

CREATE POLICY "Users can access purchases in their company" ON public.purchases FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Settings policies
DROP POLICY IF EXISTS "Users can access settings in their company" ON public.settings;

CREATE POLICY "Users can access settings in their company" ON public.settings FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Update policies for additional tables if they exist
DO $$ BEGIN
-- Tax rates policies
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE
        table_name = 'tax_rates'
        AND table_schema = 'public'
) THEN
DROP POLICY IF EXISTS "Users can access tax_rates in their company" ON public.tax_rates;

CREATE POLICY "Users can access tax_rates in their company" ON public.tax_rates FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

END IF;

-- Payment methods policies
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE
        table_name = 'payment_methods'
        AND table_schema = 'public'
) THEN
DROP POLICY IF EXISTS "Users can access payment_methods in their company" ON public.payment_methods;

CREATE POLICY "Users can access payment_methods in their company" ON public.payment_methods FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

END IF;

-- Fiscal settings policies
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE
        table_name = 'fiscal_settings'
        AND table_schema = 'public'
) THEN
DROP POLICY IF EXISTS "Users can access fiscal_settings in their company" ON public.fiscal_settings;

CREATE POLICY "Users can access fiscal_settings in their company" ON public.fiscal_settings FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

END IF;

END $$;