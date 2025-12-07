-- Create companies table first (no dependencies)
-- Note: uuid-ossp extension is enabled in migration 000_enable_extensions.sql
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_name text,
  tax_id text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'Colombia'::text,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);

-- Create profiles table (depends on companies)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'employee'::text CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'employee'::text, 'cashier'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_id uuid NOT NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- Create suppliers table (depends on companies)
CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'México'::text,
  tax_id text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_id uuid NOT NULL,
  CONSTRAINT suppliers_pkey PRIMARY KEY (id),
  CONSTRAINT suppliers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- Create categories table (depends on companies)
CREATE TABLE public.categories (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    name text NOT NULL,
    description text,
    color text,
    is_active boolean DEFAULT true,
    created_at timestamp
    with
        time zone DEFAULT now(),
        updated_at timestamp
    with
        time zone DEFAULT now(),
        company_id uuid NOT NULL,
        CONSTRAINT categories_pkey PRIMARY KEY (id),
        CONSTRAINT categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies (id)
);

-- Create products table (depends on categories, suppliers, companies)
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid,
  supplier_id uuid,
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  min_stock integer DEFAULT 0,
  max_stock integer,
  unit text DEFAULT 'pcs'::text,
  barcode text,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_id uuid NOT NULL,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id),
  CONSTRAINT products_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- Create customers table (depends on companies)
CREATE TABLE public.customers (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    name text NOT NULL,
    email text,
    phone text,
    address text,
    city text,
    state text,
    postal_code text,
    birth_date date,
    loyalty_points integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp
    with
        time zone DEFAULT now(),
        updated_at timestamp
    with
        time zone DEFAULT now(),
        company_id uuid NOT NULL,
        CONSTRAINT customers_pkey PRIMARY KEY (id),
        CONSTRAINT customers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies (id)
);

-- Create shifts table (depends on profiles, companies)
CREATE TABLE public.shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cashier_id uuid,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  initial_cash numeric NOT NULL DEFAULT 0,
  final_cash numeric,
  total_sales numeric DEFAULT 0,
  total_transactions integer DEFAULT 0,
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'closed'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  company_id uuid NOT NULL,
  CONSTRAINT shifts_pkey PRIMARY KEY (id),
  CONSTRAINT shifts_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.profiles(id),
  CONSTRAINT shifts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- Create sales table (depends on shifts, customers, profiles, companies)
CREATE TABLE public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_id uuid,
  customer_id uuid,
  cashier_id uuid,
  sale_number text NOT NULL,
  subtotal numeric NOT NULL,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'transfer'::text, 'mixed'::text])),
  payment_status text DEFAULT 'completed'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'completed'::text, 'refunded'::text, 'partially_refunded'::text])),
  status text DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_id uuid NOT NULL,
  CONSTRAINT sales_pkey PRIMARY KEY (id),
  CONSTRAINT sales_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id),
  CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT sales_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.profiles(id),
  CONSTRAINT sales_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- Create sale_items table (depends on sales, products)
CREATE TABLE public.sale_items (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    sale_id uuid,
    product_id uuid,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    discount_percentage numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    total_price numeric NOT NULL,
    created_at timestamp
    with
        time zone DEFAULT now(),
        CONSTRAINT sale_items_pkey PRIMARY KEY (id),
        CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales (id),
        CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products (id)
);

-- Create purchases table (depends on suppliers, profiles, companies)
CREATE TABLE public.purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid,
  purchase_number text NOT NULL,
  subtotal numeric NOT NULL,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'received'::text, 'cancelled'::text])),
  received_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_id uuid NOT NULL,
  CONSTRAINT purchases_pkey PRIMARY KEY (id),
  CONSTRAINT purchases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id),
  CONSTRAINT purchases_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- Create purchase_items table (depends on purchases, products)
CREATE TABLE public.purchase_items (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    purchase_id uuid,
    product_id uuid,
    quantity integer NOT NULL,
    unit_cost numeric NOT NULL,
    total_cost numeric NOT NULL,
    created_at timestamp
    with
        time zone DEFAULT now(),
        CONSTRAINT purchase_items_pkey PRIMARY KEY (id),
        CONSTRAINT purchase_items_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases (id),
        CONSTRAINT purchase_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products (id)
);

-- Create inventory table (depends on products, profiles, companies)
CREATE TABLE public.inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  quantity integer NOT NULL DEFAULT 0,
  reserved_quantity integer DEFAULT 0,
  location text DEFAULT 'main'::text,
  last_updated timestamp with time zone DEFAULT now(),
  updated_by uuid,
  company_id uuid NOT NULL,
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT inventory_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id),
  CONSTRAINT inventory_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- Create inventory_movements table (depends on products, profiles, companies)
CREATE TABLE public.inventory_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  movement_type text NOT NULL CHECK (movement_type = ANY (ARRAY['in'::text, 'out'::text, 'adjustment'::text, 'transfer'::text])),
  quantity integer NOT NULL,
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  reason text,
  reference_id uuid,
  reference_type text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  company_id uuid NOT NULL,
  CONSTRAINT inventory_movements_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT inventory_movements_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- Create settings table (depends on profiles, companies)
CREATE TABLE public.settings (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    key text NOT NULL,
    value text NOT NULL,
    description text,
    updated_by uuid,
    updated_at timestamp
    with
        time zone DEFAULT now(),
        company_id uuid NOT NULL,
        CONSTRAINT settings_pkey PRIMARY KEY (id),
        CONSTRAINT settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles (id),
        CONSTRAINT settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies (id)
);

-- Create audit_log table (depends on profiles)
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
  old_values jsonb,
  new_values jsonb,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_company_id ON public.profiles (company_id);

CREATE INDEX idx_products_company_id ON public.products (company_id);

CREATE INDEX idx_products_category_id ON public.products (category_id);

CREATE INDEX idx_products_supplier_id ON public.products (supplier_id);

CREATE INDEX idx_sales_company_id ON public.sales (company_id);

CREATE INDEX idx_sales_cashier_id ON public.sales (cashier_id);

CREATE INDEX idx_sales_created_at ON public.sales (created_at);

CREATE INDEX idx_customers_company_id ON public.customers (company_id);

CREATE INDEX idx_inventory_company_id ON public.inventory (company_id);

CREATE INDEX idx_inventory_product_id ON public.inventory (product_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies
CREATE POLICY "Users can view their own company" ON public.companies FOR
SELECT USING (
        id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can update their own company" ON public.companies FOR
UPDATE USING (
    id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

-- Create RLS policies for profiles
CREATE POLICY "Users can view profiles in their company" ON public.profiles FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE USING (id = auth.uid ());

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR
INSERT
WITH
    CHECK (id = auth.uid ());

-- Create RLS policies for other tables (basic company-based access)
CREATE POLICY "Users can access their company data" ON public.products FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access their company data" ON public.sales FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access their company data" ON public.customers FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access their company data" ON public.inventory FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access their company data" ON public.categories FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access their company data" ON public.suppliers FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access their company data" ON public.shifts FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access their company data" ON public.purchases FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);

CREATE POLICY "Users can access their company data" ON public.settings FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE
            id = auth.uid ()
    )
);