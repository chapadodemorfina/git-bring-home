
-- Commission rules (configurable per role)
CREATE TABLE public.commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  label TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('sale', 'service_order')),
  base_type TEXT NOT NULL CHECK (base_type IN ('total_amount', 'labor_cost', 'fixed_per_unit')),
  percentage NUMERIC DEFAULT 0,
  fixed_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Commission entries (generated records)
CREATE TYPE public.commission_entry_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');

CREATE TABLE public.commission_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.commission_rules(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  source_label TEXT,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status public.commission_entry_status DEFAULT 'pending',
  reference_date DATE DEFAULT CURRENT_DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Prevent duplicate commissions for the same source + user + rule
  UNIQUE(user_id, source_id, rule_id)
);

CREATE INDEX idx_commission_entries_user ON public.commission_entries(user_id);
CREATE INDEX idx_commission_entries_status ON public.commission_entries(status);
CREATE INDEX idx_commission_entries_ref_date ON public.commission_entries(reference_date);
CREATE INDEX idx_commission_entries_source ON public.commission_entries(source_type, source_id);

-- Updated_at triggers
CREATE TRIGGER set_commission_rules_updated_at
  BEFORE UPDATE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_commission_entries_updated_at
  BEFORE UPDATE ON public.commission_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for commission_rules
CREATE POLICY "Staff can read commission rules"
  ON public.commission_rules FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','finance','front_desk','bench_technician','field_technician']::app_role[]));

CREATE POLICY "Admins can manage commission rules"
  ON public.commission_rules FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- RLS policies for commission_entries
CREATE POLICY "Admins and finance can read all commissions"
  ON public.commission_entries FOR SELECT TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[])
    OR user_id = auth.uid()
  );

CREATE POLICY "System can insert commissions"
  ON public.commission_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','finance','front_desk','bench_technician','field_technician']::app_role[]));

CREATE POLICY "Admins can update commissions"
  ON public.commission_entries FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]));

-- Function to generate commissions for a sale
CREATE OR REPLACE FUNCTION public.generate_sale_commissions(_sale_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sale RECORD;
  _rule RECORD;
  _base NUMERIC;
  _amount NUMERIC;
  _count INTEGER := 0;
BEGIN
  SELECT * INTO _sale FROM sales WHERE id = _sale_id;
  IF NOT FOUND OR _sale.status <> 'completed' THEN RETURN 0; END IF;

  FOR _rule IN
    SELECT * FROM commission_rules
    WHERE source_type = 'sale' AND is_active = true
  LOOP
    -- Determine user: seller_user_id for front_desk/manager, etc
    DECLARE
      _target_user UUID;
    BEGIN
      IF _rule.role IN ('front_desk', 'manager', 'admin') THEN
        _target_user := _sale.seller_user_id;
      ELSE
        CONTINUE;
      END IF;

      IF _target_user IS NULL THEN CONTINUE; END IF;

      -- Check user has the required role
      IF NOT has_role(_target_user, _rule.role::app_role) THEN CONTINUE; END IF;

      -- Calculate base
      IF _rule.base_type = 'total_amount' THEN
        _base := _sale.total_amount;
      ELSIF _rule.base_type = 'fixed_per_unit' THEN
        _base := 1;
      ELSE
        _base := _sale.total_amount;
      END IF;

      -- Calculate commission
      IF _rule.fixed_amount > 0 THEN
        _amount := _rule.fixed_amount;
      ELSE
        _amount := _base * (_rule.percentage / 100);
      END IF;

      IF _amount <= 0 THEN CONTINUE; END IF;

      -- Insert (skip duplicates)
      INSERT INTO commission_entries (user_id, rule_id, role, source_type, source_id, source_label, base_amount, commission_amount, reference_date)
      VALUES (_target_user, _rule.id, _rule.role, 'sale', _sale_id, _sale.sale_number, _base, _amount, COALESCE(_sale.completed_at::date, CURRENT_DATE))
      ON CONFLICT (user_id, source_id, rule_id) DO NOTHING;

      _count := _count + 1;
    END;
  END LOOP;

  RETURN _count;
END;
$$;

-- Function to generate commissions for a service order (on delivery)
CREATE OR REPLACE FUNCTION public.generate_so_commissions(_so_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _so RECORD;
  _quote RECORD;
  _rule RECORD;
  _base NUMERIC;
  _amount NUMERIC;
  _target_user UUID;
  _count INTEGER := 0;
BEGIN
  SELECT * INTO _so FROM service_orders WHERE id = _so_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Get approved quote total
  SELECT * INTO _quote FROM repair_quotes
    WHERE service_order_id = _so_id AND status = 'approved'
    ORDER BY updated_at DESC LIMIT 1;

  FOR _rule IN
    SELECT * FROM commission_rules
    WHERE source_type = 'service_order' AND is_active = true
  LOOP
    -- Determine target user based on role
    IF _rule.role IN ('bench_technician', 'field_technician') THEN
      _target_user := _so.assigned_technician_id;
    ELSIF _rule.role IN ('front_desk', 'manager', 'admin') THEN
      _target_user := _so.created_by;
    ELSE
      CONTINUE;
    END IF;

    IF _target_user IS NULL THEN CONTINUE; END IF;
    IF NOT has_role(_target_user, _rule.role::app_role) THEN CONTINUE; END IF;

    -- Calculate base
    IF _rule.base_type = 'labor_cost' THEN
      _base := COALESCE(_quote.labor_cost, 0);
    ELSIF _rule.base_type = 'total_amount' THEN
      _base := COALESCE(_quote.total_amount, _so.estimated_cost, 0);
    ELSIF _rule.base_type = 'fixed_per_unit' THEN
      _base := 1;
    ELSE
      _base := COALESCE(_quote.total_amount, 0);
    END IF;

    -- Calculate
    IF _rule.fixed_amount > 0 THEN
      _amount := _rule.fixed_amount;
    ELSE
      _amount := _base * (_rule.percentage / 100);
    END IF;

    IF _amount <= 0 THEN CONTINUE; END IF;

    INSERT INTO commission_entries (user_id, rule_id, role, source_type, source_id, source_label, base_amount, commission_amount, reference_date)
    VALUES (_target_user, _rule.id, _rule.role, 'service_order', _so_id, _so.order_number, _base, _amount, CURRENT_DATE)
    ON CONFLICT (user_id, source_id, rule_id) DO NOTHING;

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

-- Summary function
CREATE OR REPLACE FUNCTION public.commission_summary(_from DATE DEFAULT NULL, _to DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_pending', COALESCE(SUM(commission_amount) FILTER (WHERE status = 'pending'), 0),
      'total_approved', COALESCE(SUM(commission_amount) FILTER (WHERE status = 'approved'), 0),
      'total_paid', COALESCE(SUM(commission_amount) FILTER (WHERE status = 'paid'), 0),
      'total_cancelled', COALESCE(SUM(commission_amount) FILTER (WHERE status = 'cancelled'), 0),
      'total_month', COALESCE(SUM(commission_amount) FILTER (
        WHERE status IN ('pending','approved','paid')
        AND reference_date >= date_trunc('month', CURRENT_DATE)
      ), 0),
      'count_pending', COUNT(*) FILTER (WHERE status = 'pending'),
      'count_approved', COUNT(*) FILTER (WHERE status = 'approved'),
      'count_paid', COUNT(*) FILTER (WHERE status = 'paid')
    )
    FROM commission_entries
    WHERE (_from IS NULL OR reference_date >= _from)
      AND (_to IS NULL OR reference_date <= _to)
  );
END;
$$;
