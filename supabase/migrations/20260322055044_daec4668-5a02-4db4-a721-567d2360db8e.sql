-- =========================================================
-- 1. Unique partial index: at most 1 active revenue per OS
-- =========================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_fe_unique_revenue_per_so
  ON public.financial_entries (service_order_id, entry_type)
  WHERE (service_order_id IS NOT NULL
     AND entry_type = 'revenue'
     AND status <> 'cancelled');

-- =========================================================
-- 2. RPC: upsert_os_revenue
--    Creates or updates the primary revenue entry for a SO.
--    Idempotent: safe to call multiple times.
-- =========================================================
CREATE OR REPLACE FUNCTION public.upsert_os_revenue(
  _service_order_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tid uuid := get_active_tenant_id();
  _so  record;
  _fe_id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set';
  END IF;

  -- Fetch the service order
  SELECT id, order_number, customer_id, total_amount, status
    INTO _so
    FROM service_orders
   WHERE id = _service_order_id
     AND tenant_id = _tid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de serviço não encontrada';
  END IF;

  -- If total_amount is 0, nothing to sync
  IF _so.total_amount <= 0 THEN
    -- Cancel any existing revenue if total went to 0
    UPDATE financial_entries
       SET status = 'cancelled', updated_at = now()
     WHERE service_order_id = _service_order_id
       AND entry_type = 'revenue'
       AND status <> 'cancelled'
       AND tenant_id = _tid;
    RETURN NULL;
  END IF;

  -- Try to find existing active revenue for this OS
  SELECT id INTO _fe_id
    FROM financial_entries
   WHERE service_order_id = _service_order_id
     AND entry_type = 'revenue'
     AND status <> 'cancelled'
     AND tenant_id = _tid
   LIMIT 1;

  IF _fe_id IS NOT NULL THEN
    -- Update amount (only if not fully paid)
    UPDATE financial_entries
       SET amount = _so.total_amount,
           description = 'Receita OS #' || _so.order_number,
           customer_id = _so.customer_id,
           updated_at = now()
     WHERE id = _fe_id
       AND status NOT IN ('paid')
       AND tenant_id = _tid;
    RETURN _fe_id;
  ELSE
    -- Create new revenue entry
    INSERT INTO financial_entries (
      entry_type, status, description, amount, paid_amount,
      service_order_id, customer_id, category, created_by, tenant_id
    ) VALUES (
      'revenue', 'pending',
      'Receita OS #' || _so.order_number,
      _so.total_amount, 0,
      _service_order_id, _so.customer_id,
      'Serviço de Reparo', _uid, _tid
    )
    RETURNING id INTO _fe_id;
    RETURN _fe_id;
  END IF;
END;
$$;

-- =========================================================
-- 3. RPC: cancel_os_revenue
--    Called when an OS is cancelled.
-- =========================================================
CREATE OR REPLACE FUNCTION public.cancel_os_revenue(
  _service_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tid uuid := get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set';
  END IF;

  UPDATE financial_entries
     SET status = 'cancelled', updated_at = now()
   WHERE service_order_id = _service_order_id
     AND entry_type = 'revenue'
     AND status <> 'cancelled'
     AND tenant_id = _tid;
END;
$$;