
-- =========================================================
-- 1. Internal sync function (SECURITY DEFINER, no auth context needed)
-- =========================================================
CREATE OR REPLACE FUNCTION public._internal_sync_os_revenue(
  _so_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _so record;
  _fe_id uuid;
  _fe_status text;
BEGIN
  SELECT id, order_number, customer_id, total_amount, status::text, tenant_id
    INTO _so
    FROM service_orders
   WHERE id = _so_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Don't sync cancelled OS
  IF _so.status = 'cancelled' THEN RETURN; END IF;

  -- If total is 0, cancel existing primary revenue
  IF _so.total_amount <= 0 THEN
    UPDATE financial_entries
       SET status = 'cancelled', updated_at = now()
     WHERE service_order_id = _so_id
       AND entry_type = 'revenue'
       AND is_primary_os_revenue = true
       AND status <> 'cancelled'
       AND tenant_id = _so.tenant_id;
    RETURN;
  END IF;

  -- Find existing primary revenue
  SELECT id, status::text INTO _fe_id, _fe_status
    FROM financial_entries
   WHERE service_order_id = _so_id
     AND entry_type = 'revenue'
     AND is_primary_os_revenue = true
     AND status <> 'cancelled'
     AND tenant_id = _so.tenant_id
   LIMIT 1;

  IF _fe_id IS NOT NULL THEN
    -- Only update if not fully paid
    IF _fe_status <> 'paid' THEN
      UPDATE financial_entries
         SET amount = _so.total_amount,
             description = 'Receita OS #' || _so.order_number,
             customer_id = _so.customer_id,
             updated_at = now()
       WHERE id = _fe_id;
    END IF;
  ELSE
    -- Create new primary revenue
    INSERT INTO financial_entries (
      entry_type, status, description, amount, paid_amount,
      service_order_id, customer_id, category,
      is_primary_os_revenue, tenant_id
    ) VALUES (
      'revenue', 'pending',
      'Receita OS #' || _so.order_number,
      _so.total_amount, 0,
      _so_id, _so.customer_id,
      'Serviço de Reparo',
      true, _so.tenant_id
    );
  END IF;
END;
$$;

-- =========================================================
-- 2. Enhanced recalculate trigger: recalc + auto-sync
-- =========================================================
CREATE OR REPLACE FUNCTION public.recalculate_service_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _so_id uuid;
  _new_total numeric(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    _so_id := OLD.service_order_id;
  ELSE
    _so_id := NEW.service_order_id;
  END IF;

  SELECT COALESCE(SUM(total_price), 0) INTO _new_total
  FROM service_order_items
  WHERE service_order_id = _so_id;

  UPDATE service_orders
  SET total_amount = _new_total,
      updated_at = now()
  WHERE id = _so_id;

  -- Auto-sync revenue (skips if paid or cancelled)
  PERFORM _internal_sync_os_revenue(_so_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- =========================================================
-- 3. Audit RPC: list OS financial inconsistencies
-- =========================================================
CREATE OR REPLACE FUNCTION public.audit_os_financial_inconsistencies()
RETURNS TABLE(
  service_order_id uuid,
  order_number text,
  customer_name text,
  os_status text,
  os_total numeric,
  primary_revenue_id uuid,
  primary_revenue_amount numeric,
  primary_revenue_paid numeric,
  primary_revenue_status text,
  divergence numeric,
  has_auxiliary_revenues boolean,
  auxiliary_count bigint,
  auxiliary_paid_any boolean,
  cancelled_os_active_revenue boolean,
  issue_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH primary_rev AS (
    SELECT
      fe.service_order_id,
      fe.id AS fe_id,
      fe.amount,
      fe.paid_amount,
      fe.status::text AS fe_status
    FROM financial_entries fe
    WHERE fe.entry_type = 'revenue'
      AND fe.is_primary_os_revenue = true
      AND fe.status <> 'cancelled'
      AND fe.tenant_id = get_active_tenant_id()
  ),
  aux_rev AS (
    SELECT
      fe.service_order_id,
      COUNT(*) AS cnt,
      bool_or(fe.status::text = 'paid') AS any_paid
    FROM financial_entries fe
    WHERE fe.entry_type = 'revenue'
      AND fe.is_primary_os_revenue = false
      AND fe.status <> 'cancelled'
      AND fe.service_order_id IS NOT NULL
      AND fe.tenant_id = get_active_tenant_id()
    GROUP BY fe.service_order_id
  ),
  combined AS (
    SELECT
      so.id AS service_order_id,
      so.order_number,
      c.full_name AS customer_name,
      so.status::text AS os_status,
      COALESCE(so.total_amount, 0) AS os_total,
      pr.fe_id AS primary_revenue_id,
      COALESCE(pr.amount, 0) AS primary_revenue_amount,
      COALESCE(pr.paid_amount, 0) AS primary_revenue_paid,
      pr.fe_status AS primary_revenue_status,
      COALESCE(so.total_amount, 0) - COALESCE(pr.amount, 0) AS divergence,
      COALESCE(ar.cnt, 0) > 0 AS has_auxiliary_revenues,
      COALESCE(ar.cnt, 0) AS auxiliary_count,
      COALESCE(ar.any_paid, false) AS auxiliary_paid_any,
      (so.status::text = 'cancelled' AND pr.fe_id IS NOT NULL) AS cancelled_os_active_revenue,
      CASE
        WHEN so.status::text = 'cancelled' AND pr.fe_id IS NOT NULL THEN 'cancelled_with_active_revenue'
        WHEN pr.fe_id IS NULL AND so.total_amount > 0 AND so.status::text <> 'cancelled' THEN 'missing_primary_revenue'
        WHEN pr.fe_id IS NOT NULL AND ABS(COALESCE(so.total_amount, 0) - COALESCE(pr.amount, 0)) > 0.01 AND pr.fe_status = 'paid' THEN 'critical_divergence'
        WHEN pr.fe_id IS NOT NULL AND ABS(COALESCE(so.total_amount, 0) - COALESCE(pr.amount, 0)) > 0.01 THEN 'divergence'
        WHEN COALESCE(ar.cnt, 0) > 0 THEN 'has_auxiliaries'
        ELSE NULL
      END AS issue_type
    FROM service_orders so
    LEFT JOIN customers c ON c.id = so.customer_id
    LEFT JOIN primary_rev pr ON pr.service_order_id = so.id
    LEFT JOIN aux_rev ar ON ar.service_order_id = so.id
    WHERE so.tenant_id = get_active_tenant_id()
  )
  SELECT * FROM combined WHERE issue_type IS NOT NULL
  ORDER BY
    CASE issue_type
      WHEN 'critical_divergence' THEN 1
      WHEN 'cancelled_with_active_revenue' THEN 2
      WHEN 'missing_primary_revenue' THEN 3
      WHEN 'divergence' THEN 4
      WHEN 'has_auxiliaries' THEN 5
    END,
    order_number DESC;
$$;
