
-- 1. Add missing columns to commission_rules
ALTER TABLE commission_rules
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_filter text,
  ADD COLUMN IF NOT EXISTS only_after_payment boolean NOT NULL DEFAULT false;

-- 2. Create sales_goals table
CREATE TABLE IF NOT EXISTS sales_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid,
  team_role text,
  goal_type text NOT NULL DEFAULT 'revenue',
  target_value numeric NOT NULL DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  label text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_goals_tenant_isolation" ON sales_goals
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT raw_app_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())::uuid)
  WITH CHECK (tenant_id = (SELECT raw_app_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())::uuid);

-- 3. Rewrite generate_sale_commissions with product/category/only_after_payment support
CREATE OR REPLACE FUNCTION generate_sale_commissions(_sale_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale RECORD;
  _rule RECORD;
  _base NUMERIC;
  _amount NUMERIC;
  _count INTEGER := 0;
  _target_user UUID;
  _has_matching_items BOOLEAN;
  _item_total NUMERIC;
BEGIN
  SELECT * INTO _sale FROM sales WHERE id = _sale_id;
  IF NOT FOUND OR _sale.status <> 'completed' THEN RETURN 0; END IF;

  FOR _rule IN
    SELECT * FROM commission_rules
    WHERE source_type = 'sale' AND is_active = true AND tenant_id = _sale.tenant_id
  LOOP
    -- Skip only_after_payment rules when sale is not fully paid
    IF _rule.only_after_payment AND _sale.payment_status <> 'paid' THEN CONTINUE; END IF;

    -- Determine target user
    IF _rule.role IN ('front_desk', 'manager', 'admin') THEN
      _target_user := _sale.seller_user_id;
    ELSE
      CONTINUE;
    END IF;
    IF _target_user IS NULL THEN CONTINUE; END IF;

    -- Check product_id filter
    IF _rule.product_id IS NOT NULL THEN
      SELECT COALESCE(SUM(si.total_amount), 0) INTO _item_total
      FROM sale_items si WHERE si.sale_id = _sale_id AND si.product_id = _rule.product_id;
      IF _item_total <= 0 THEN CONTINUE; END IF;
    END IF;

    -- Check category_filter
    IF _rule.category_filter IS NOT NULL AND _rule.category_filter <> '' THEN
      SELECT EXISTS(
        SELECT 1 FROM sale_items si
        JOIN products p ON p.id = si.product_id
        WHERE si.sale_id = _sale_id AND p.category = _rule.category_filter
      ) INTO _has_matching_items;
      IF NOT _has_matching_items THEN CONTINUE; END IF;
    END IF;

    -- Calculate base amount
    IF _rule.product_id IS NOT NULL THEN
      -- Use product-specific total
      _base := _item_total;
    ELSIF _rule.category_filter IS NOT NULL AND _rule.category_filter <> '' THEN
      SELECT COALESCE(SUM(si.total_amount), 0) INTO _base
      FROM sale_items si JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = _sale_id AND p.category = _rule.category_filter;
    ELSIF _rule.base_type = 'total_amount' THEN
      _base := _sale.total_amount;
    ELSIF _rule.base_type = 'net_amount' THEN
      _base := _sale.total_amount - COALESCE(_sale.discount_amount, 0);
    ELSIF _rule.base_type = 'profit' THEN
      SELECT _sale.total_amount - COALESCE(SUM(si.cost_price_snapshot * si.quantity), 0)
      INTO _base FROM sale_items si WHERE si.sale_id = _sale_id;
    ELSIF _rule.base_type = 'received_amount' THEN
      SELECT COALESCE(SUM(sp.amount), 0) INTO _base
      FROM sale_payments sp WHERE sp.sale_id = _sale_id;
    ELSIF _rule.base_type = 'fixed_per_unit' THEN
      _base := 1;
    ELSE
      _base := _sale.total_amount;
    END IF;

    -- Calculate commission
    IF COALESCE(_rule.fixed_amount, 0) > 0 THEN
      _amount := _rule.fixed_amount;
    ELSE
      _amount := _base * (COALESCE(_rule.percentage, 0) / 100);
    END IF;

    IF _amount <= 0 THEN CONTINUE; END IF;

    INSERT INTO commission_entries (tenant_id, user_id, rule_id, role, source_type, source_id, source_label, base_amount, commission_amount, reference_date, status)
    VALUES (_sale.tenant_id, _target_user, _rule.id, _rule.role, 'sale', _sale_id, _sale.sale_number, _base, _amount, COALESCE(_sale.completed_at::date, CURRENT_DATE), 'pending')
    ON CONFLICT (user_id, source_id, rule_id) DO NOTHING;

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

-- 4. Create reverse_sale_commissions
CREATE OR REPLACE FUNCTION reverse_sale_commissions(_sale_id uuid, _proportion numeric DEFAULT 1.0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _proportion >= 1.0 THEN
    UPDATE commission_entries SET status = 'cancelled', updated_at = now()
    WHERE source_id = _sale_id AND source_type = 'sale' AND status IN ('pending', 'approved');
  ELSE
    UPDATE commission_entries
    SET commission_amount = commission_amount * (1 - _proportion),
        base_amount = base_amount * (1 - _proportion),
        notes = COALESCE(notes, '') || ' [Estorno proporcional: ' || round(_proportion * 100) || '%]',
        updated_at = now()
    WHERE source_id = _sale_id AND source_type = 'sale' AND status IN ('pending', 'approved');
  END IF;
END;
$$;

-- 5. Create get_goal_progress
CREATE OR REPLACE FUNCTION get_goal_progress(_goal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _goal RECORD;
  _actual NUMERIC := 0;
  _pct NUMERIC := 0;
BEGIN
  SELECT * INTO _goal FROM sales_goals WHERE id = _goal_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF _goal.goal_type = 'revenue' THEN
    SELECT COALESCE(SUM(s.total_amount), 0) INTO _actual
    FROM sales s
    WHERE s.tenant_id = _goal.tenant_id
      AND s.status = 'completed'
      AND s.completed_at::date BETWEEN _goal.period_start AND _goal.period_end
      AND (_goal.user_id IS NULL OR s.seller_user_id = _goal.user_id)
      AND (_goal.team_role IS NULL OR EXISTS(
        SELECT 1 FROM user_roles ur WHERE ur.user_id = s.seller_user_id AND ur.role::text = _goal.team_role
      ));
  ELSIF _goal.goal_type = 'quantity' THEN
    SELECT COUNT(*) INTO _actual
    FROM sales s
    WHERE s.tenant_id = _goal.tenant_id
      AND s.status = 'completed'
      AND s.completed_at::date BETWEEN _goal.period_start AND _goal.period_end
      AND (_goal.user_id IS NULL OR s.seller_user_id = _goal.user_id)
      AND (_goal.team_role IS NULL OR EXISTS(
        SELECT 1 FROM user_roles ur WHERE ur.user_id = s.seller_user_id AND ur.role::text = _goal.team_role
      ));
  ELSIF _goal.goal_type = 'ticket_avg' THEN
    SELECT COALESCE(AVG(s.total_amount), 0) INTO _actual
    FROM sales s
    WHERE s.tenant_id = _goal.tenant_id
      AND s.status = 'completed'
      AND s.completed_at::date BETWEEN _goal.period_start AND _goal.period_end
      AND (_goal.user_id IS NULL OR s.seller_user_id = _goal.user_id)
      AND (_goal.team_role IS NULL OR EXISTS(
        SELECT 1 FROM user_roles ur WHERE ur.user_id = s.seller_user_id AND ur.role::text = _goal.team_role
      ));
  END IF;

  IF _goal.target_value > 0 THEN
    _pct := ROUND((_actual / _goal.target_value) * 100, 1);
  END IF;

  RETURN jsonb_build_object(
    'goal_id', _goal.id,
    'label', _goal.label,
    'goal_type', _goal.goal_type,
    'target', _goal.target_value,
    'actual', _actual,
    'percentage', _pct,
    'user_id', _goal.user_id,
    'team_role', _goal.team_role,
    'period_start', _goal.period_start,
    'period_end', _goal.period_end
  );
END;
$$;

-- 6. Create team_ranking_data RPC
CREATE OR REPLACE FUNCTION team_ranking_data(_from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  name text,
  role text,
  sales_count bigint,
  sales_revenue numeric,
  so_count bigint,
  so_revenue numeric,
  total_revenue numeric,
  ticket_avg numeric,
  commission_total numeric,
  goal_pct numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid;
BEGIN
  SELECT (raw_app_meta_data->>'tenant_id')::uuid INTO _tenant FROM auth.users WHERE id = auth.uid();

  RETURN QUERY
  WITH user_sales AS (
    SELECT s.seller_user_id AS uid,
           COUNT(*) AS cnt,
           COALESCE(SUM(s.total_amount), 0) AS rev
    FROM sales s
    WHERE s.tenant_id = _tenant AND s.status = 'completed'
      AND (_from IS NULL OR s.completed_at::date >= _from)
      AND (_to IS NULL OR s.completed_at::date <= _to)
    GROUP BY s.seller_user_id
  ),
  user_so AS (
    SELECT so.assigned_technician_id AS uid,
           COUNT(*) AS cnt,
           COALESCE(SUM(so.final_cost), 0) AS rev
    FROM service_orders so
    WHERE so.tenant_id = _tenant AND so.status = 'completed'
      AND (_from IS NULL OR so.completed_at::date >= _from)
      AND (_to IS NULL OR so.completed_at::date <= _to)
    GROUP BY so.assigned_technician_id
  ),
  user_comms AS (
    SELECT ce.user_id AS uid,
           COALESCE(SUM(ce.commission_amount), 0) AS total
    FROM commission_entries ce
    WHERE ce.tenant_id = _tenant AND ce.status IN ('pending', 'approved', 'paid')
      AND (_from IS NULL OR ce.reference_date >= _from)
      AND (_to IS NULL OR ce.reference_date <= _to)
    GROUP BY ce.user_id
  ),
  all_users AS (
    SELECT uid FROM user_sales
    UNION SELECT uid FROM user_so
    UNION SELECT uid FROM user_comms
  )
  SELECT
    au.uid,
    COALESCE(p.full_name, 'Sem nome') AS name,
    COALESCE((SELECT ur.role::text FROM user_roles ur WHERE ur.user_id = au.uid LIMIT 1), '') AS role,
    COALESCE(us.cnt, 0) AS sales_count,
    COALESCE(us.rev, 0) AS sales_revenue,
    COALESCE(uo.cnt, 0) AS so_count,
    COALESCE(uo.rev, 0) AS so_revenue,
    COALESCE(us.rev, 0) + COALESCE(uo.rev, 0) AS total_revenue,
    CASE WHEN COALESCE(us.cnt, 0) > 0 THEN ROUND(COALESCE(us.rev, 0) / us.cnt, 2) ELSE 0 END AS ticket_avg,
    COALESCE(uc.total, 0) AS commission_total,
    0::numeric AS goal_pct
  FROM all_users au
  LEFT JOIN profiles p ON p.id = au.uid
  LEFT JOIN user_sales us ON us.uid = au.uid
  LEFT JOIN user_so uo ON uo.uid = au.uid
  LEFT JOIN user_comms uc ON uc.uid = au.uid
  ORDER BY total_revenue DESC;
END;
$$;

-- 7. Update commission_summary to also accept tenant filtering
CREATE OR REPLACE FUNCTION commission_summary(_from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid;
  _result jsonb;
BEGIN
  SELECT (raw_app_meta_data->>'tenant_id')::uuid INTO _tenant FROM auth.users WHERE id = auth.uid();

  SELECT jsonb_build_object(
    'total_pending', COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0),
    'total_approved', COALESCE(SUM(CASE WHEN status = 'approved' THEN commission_amount ELSE 0 END), 0),
    'total_paid', COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0),
    'total_cancelled', COALESCE(SUM(CASE WHEN status = 'cancelled' THEN commission_amount ELSE 0 END), 0),
    'total_month', COALESCE(SUM(CASE WHEN status IN ('pending','approved','paid') AND reference_date >= date_trunc('month', CURRENT_DATE) THEN commission_amount ELSE 0 END), 0),
    'count_pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'count_approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'count_paid', COUNT(*) FILTER (WHERE status = 'paid')
  ) INTO _result
  FROM commission_entries
  WHERE tenant_id = _tenant
    AND (_from IS NULL OR reference_date >= _from)
    AND (_to IS NULL OR reference_date <= _to);

  RETURN _result;
END;
$$;
