
-- Suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  whatsapp text,
  document text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  category text,
  brand text,
  compatible_devices text,
  cost_price numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 0,
  minimum_quantity integer NOT NULL DEFAULT 0,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  location text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update products" ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_products_sku ON public.products USING btree (sku);
CREATE INDEX idx_products_name ON public.products USING gin (to_tsvector('portuguese', name));
CREATE INDEX idx_products_supplier ON public.products USING btree (supplier_id);

-- Stock movements table
CREATE TYPE public.stock_movement_type AS ENUM ('entry', 'exit', 'adjustment', 'return', 'reserved', 'consumed');

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type public.stock_movement_type NOT NULL,
  quantity integer NOT NULL,
  previous_quantity integer NOT NULL DEFAULT 0,
  new_quantity integer NOT NULL DEFAULT 0,
  unit_cost numeric,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view stock_movements" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert stock_movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_stock_movements_product ON public.stock_movements USING btree (product_id);
CREATE INDEX idx_stock_movements_reference ON public.stock_movements USING btree (reference_type, reference_id);

-- Purchase entries table
CREATE TABLE public.purchase_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  invoice_number text,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view purchase_entries" ON public.purchase_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert purchase_entries" ON public.purchase_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update purchase_entries" ON public.purchase_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete purchase_entries" ON public.purchase_entries FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_purchase_entries_supplier ON public.purchase_entries USING btree (supplier_id);

-- Repair parts used table
CREATE TABLE public.repair_parts_used (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  notes text,
  consumed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_parts_used ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view repair_parts_used" ON public.repair_parts_used FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert repair_parts_used" ON public.repair_parts_used FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update repair_parts_used" ON public.repair_parts_used FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete repair_parts_used" ON public.repair_parts_used FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_repair_parts_used_so ON public.repair_parts_used USING btree (service_order_id);
CREATE INDEX idx_repair_parts_used_product ON public.repair_parts_used USING btree (product_id);
