
CREATE TYPE public.so_item_type AS ENUM ('service', 'product', 'labor');

CREATE TABLE public.service_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  item_type public.so_item_type NOT NULL DEFAULT 'service',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order int NOT NULL DEFAULT 0,
  notes text,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_so_items_order ON public.service_order_items(service_order_id);

ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for so_items" ON public.service_order_items
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT get_active_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_active_tenant_id()));

CREATE TRIGGER set_updated_at_so_items
  BEFORE UPDATE ON public.service_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_tenant_id_so_items()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_active_tenant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_set_tenant_so_items
  BEFORE INSERT ON public.service_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_so_items();
