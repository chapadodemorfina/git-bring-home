-- =========================================================
-- PHASE 1: Add total_amount and JSONB checklist columns to service_orders
-- =========================================================

-- Official total calculated from items
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) NOT NULL DEFAULT 0;

-- Structured checklists (JSONB)
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS intake_checklist jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_checklist jsonb DEFAULT NULL;

-- =========================================================
-- PHASE 2: Trigger to recalculate total_amount from items
-- =========================================================

CREATE OR REPLACE FUNCTION public.recalculate_service_order_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _so_id uuid;
  _new_total numeric(12,2);
BEGIN
  -- Determine which SO to recalculate
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

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing triggers if any, then create
DROP TRIGGER IF EXISTS trg_recalc_so_total_insert ON public.service_order_items;
DROP TRIGGER IF EXISTS trg_recalc_so_total_update ON public.service_order_items;
DROP TRIGGER IF EXISTS trg_recalc_so_total_delete ON public.service_order_items;

CREATE TRIGGER trg_recalc_so_total_insert
  AFTER INSERT ON public.service_order_items
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_service_order_total();

CREATE TRIGGER trg_recalc_so_total_update
  AFTER UPDATE ON public.service_order_items
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_service_order_total();

CREATE TRIGGER trg_recalc_so_total_delete
  AFTER DELETE ON public.service_order_items
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_service_order_total();

-- =========================================================
-- PHASE 3: Backfill total_amount for existing OS with items
-- =========================================================

UPDATE service_orders so
SET total_amount = COALESCE(sub.total, 0)
FROM (
  SELECT service_order_id, SUM(total_price) AS total
  FROM service_order_items
  GROUP BY service_order_id
) sub
WHERE so.id = sub.service_order_id;