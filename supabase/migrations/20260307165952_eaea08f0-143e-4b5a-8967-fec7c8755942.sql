
-- Customer type enum
CREATE TYPE public.customer_type AS ENUM ('individual', 'business');

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type customer_type NOT NULL DEFAULT 'individual',
  full_name TEXT NOT NULL,
  document TEXT, -- CPF or CNPJ
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Customer addresses
CREATE TABLE public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Principal',
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Customer contacts (additional contacts for business customers)
CREATE TABLE public.customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER customer_contacts_updated_at
  BEFORE UPDATE ON public.customer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies for customers (authenticated users can CRUD)
CREATE POLICY "Authenticated can view customers"
  ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert customers"
  ON public.customers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update customers"
  ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS for customer_addresses
CREATE POLICY "Authenticated can view customer_addresses"
  ON public.customer_addresses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert customer_addresses"
  ON public.customer_addresses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update customer_addresses"
  ON public.customer_addresses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete customer_addresses"
  ON public.customer_addresses FOR DELETE TO authenticated USING (true);

-- RLS for customer_contacts
CREATE POLICY "Authenticated can view customer_contacts"
  ON public.customer_contacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert customer_contacts"
  ON public.customer_contacts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update customer_contacts"
  ON public.customer_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete customer_contacts"
  ON public.customer_contacts FOR DELETE TO authenticated USING (true);

-- Index for searching
CREATE INDEX idx_customers_full_name ON public.customers USING gin (to_tsvector('portuguese', full_name));
CREATE INDEX idx_customers_document ON public.customers (document);
CREATE INDEX idx_customers_phone ON public.customers (phone);
CREATE INDEX idx_customers_type ON public.customers (type);
CREATE INDEX idx_customers_is_active ON public.customers (is_active);
