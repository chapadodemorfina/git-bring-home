-- =========================================================
-- 1. Add is_primary_os_revenue column
-- =========================================================
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS is_primary_os_revenue boolean NOT NULL DEFAULT false;

-- =========================================================
-- 2. Drop old unique index (replaced by new one)
-- =========================================================
DROP INDEX IF EXISTS public.idx_fe_unique_revenue_per_so;

-- =========================================================
-- 3. New unique partial index on is_primary_os_revenue
-- =========================================================
CREATE UNIQUE INDEX idx_fe_unique_primary_os_revenue
  ON public.financial_entries (service_order_id)
  WHERE (service_order_id IS NOT NULL
     AND entry_type = 'revenue'
     AND is_primary_os_revenue = true
     AND status <> 'cancelled');

-- =========================================================
-- 4. Backfill: mark exactly 1 revenue per OS as primary
--    Strategy: pick the oldest non-cancelled revenue per OS
-- =========================================================
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY service_order_id
           ORDER BY created_at ASC
         ) AS rn
  FROM financial_entries
  WHERE service_order_id IS NOT NULL
    AND entry_type = 'revenue'
    AND status <> 'cancelled'
)
UPDATE financial_entries fe
   SET is_primary_os_revenue = true
  FROM ranked r
 WHERE fe.id = r.id
   AND r.rn = 1;

-- =========================================================
-- 5. Update upsert_os_revenue to use is_primary_os_revenue
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
  _fe_status text;
  _uid uuid := auth.uid();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set';
  END IF;

  SELECT id, order_number, customer_id, total_amount, status
    INTO _so
    FROM service_orders
   WHERE id = _service_order_id
     AND tenant_id = _tid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de serviço não encontrada';
  END IF;

  -- If total is 0, cancel existing primary revenue
  IF _so.total_amount <= 0 THEN
    UPDATE financial_entries
       SET status = 'cancelled', updated_at = now()
     WHERE service_order_id = _service_order_id
       AND entry_type = 'revenue'
       AND is_primary_os_revenue = true
       AND status <> 'cancelled'
       AND tenant_id = _tid;
    RETURN NULL;
  END IF;

  -- Find existing primary revenue
  SELECT id, status::text INTO _fe_id, _fe_status
    FROM financial_entries
   WHERE service_order_id = _service_order_id
     AND entry_type = 'revenue'
     AND is_primary_os_revenue = true
     AND status <> 'cancelled'
     AND tenant_id = _tid
   LIMIT 1;

  IF _fe_id IS NOT NULL THEN
    -- Only update if not fully paid
    IF _fe_status <> 'paid' THEN
      UPDATE financial_entries
         SET amount = _so.total_amount,
             description = 'Receita OS #' || _so.order_number,
             customer_id = _so.customer_id,
             updated_at = now()
       WHERE id = _fe_id
         AND tenant_id = _tid;
    END IF;
    RETURN _fe_id;
  ELSE
    -- Create new primary revenue
    INSERT INTO financial_entries (
      entry_type, status, description, amount, paid_amount,
      service_order_id, customer_id, category, created_by,
      is_primary_os_revenue, tenant_id
    ) VALUES (
      'revenue', 'pending',
      'Receita OS #' || _so.order_number,
      _so.total_amount, 0,
      _service_order_id, _so.customer_id,
      'Serviço de Reparo', _uid,
      true, _tid
    )
    RETURNING id INTO _fe_id;
    RETURN _fe_id;
  END IF;
END;
$$;

-- =========================================================
-- 6. Update cancel_os_revenue to only cancel primary
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
     AND is_primary_os_revenue = true
     AND status <> 'cancelled'
     AND tenant_id = _tid;
END;
$$;