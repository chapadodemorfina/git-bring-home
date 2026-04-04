
CREATE SEQUENCE IF NOT EXISTS public.quotes_number_seq;

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid REFERENCES public.customers(id),
  device_id uuid REFERENCES public.devices(id),
  service_order_id uuid REFERENCES public.service_orders(id),
  quote_number text NOT NULL DEFAULT ('ORC-' || lpad(nextval('public.quotes_number_seq')::text, 6, '0')),
  title text NOT NULL,
  description text,
  subtotal_parts numeric NOT NULL DEFAULT 0,
  subtotal_labor numeric NOT NULL DEFAULT 0,
  subtotal_other numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  estimated_profit numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  valid_until date,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'service',
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  total_price numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  profit_amount numeric GENERATED ALWAYS AS (quantity * (unit_price - unit_cost)) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  action text NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotes_t ON public.quotes(tenant_id);
CREATE INDEX idx_quotes_c ON public.quotes(customer_id);
CREATE INDEX idx_quotes_s ON public.quotes(status);
CREATE INDEX idx_qi_q ON public.quote_items(quote_id);
CREATE INDEX idx_qh_q ON public.quote_history(quote_id);

CREATE TRIGGER set_tenant_quotes BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER set_tenant_quote_items BEFORE INSERT ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER set_tenant_quote_history BEFORE INSERT ON public.quote_history
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();

CREATE TRIGGER set_updated_at_quotes BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.quotes AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.get_active_tenant_id())
  WITH CHECK (tenant_id = public.get_active_tenant_id());

CREATE POLICY tenant_isolation ON public.quote_items AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.get_active_tenant_id())
  WITH CHECK (tenant_id = public.get_active_tenant_id());

CREATE POLICY tenant_isolation ON public.quote_history AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.get_active_tenant_id())
  WITH CHECK (tenant_id = public.get_active_tenant_id());

CREATE POLICY quotes_access ON public.quotes
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[]));

CREATE POLICY quote_items_access ON public.quote_items
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[]));

CREATE POLICY quote_history_access ON public.quote_history
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[]));

CREATE OR REPLACE FUNCTION public.recalculate_quote_totals(_quote_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _parts numeric; _labor numeric; _other numeric; _cost numeric;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN item_type = 'part' THEN quantity * unit_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN item_type = 'labor' THEN quantity * unit_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN item_type NOT IN ('part','labor') THEN quantity * unit_price ELSE 0 END), 0),
    COALESCE(SUM(quantity * unit_cost), 0)
  INTO _parts, _labor, _other, _cost
  FROM public.quote_items WHERE quote_id = _quote_id;

  UPDATE public.quotes SET
    subtotal_parts = _parts, subtotal_labor = _labor, subtotal_other = _other,
    total_cost = _cost,
    total_amount = _parts + _labor + _other - discount_amount,
    estimated_profit = (_parts + _labor + _other - discount_amount) - _cost
  WHERE id = _quote_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.quotes_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _tid uuid := public.get_active_tenant_id();
  _result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'draft', COUNT(*) FILTER (WHERE status = 'draft'),
    'sent', COUNT(*) FILTER (WHERE status = 'sent'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'expired', COUNT(*) FILTER (WHERE status = 'expired'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'total_approved_value', COALESCE(SUM(total_amount) FILTER (WHERE status = 'approved'), 0),
    'total_rejected_value', COALESCE(SUM(total_amount) FILTER (WHERE status = 'rejected'), 0),
    'total_estimated_profit', COALESCE(SUM(estimated_profit) FILTER (WHERE status = 'approved'), 0),
    'approval_rate', CASE WHEN COUNT(*) FILTER (WHERE status IN ('approved','rejected')) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE status = 'approved')::numeric / COUNT(*) FILTER (WHERE status IN ('approved','rejected')) * 100, 1)
      ELSE 0 END,
    'avg_approval_days', COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 86400) FILTER (WHERE status = 'approved'), 1), 0)
  ) INTO _result
  FROM public.quotes WHERE tenant_id = _tid;
  RETURN _result;
END;
$$;
