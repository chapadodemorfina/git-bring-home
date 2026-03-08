
-- =====================================================
-- OPERATIONAL SAFEGUARDS MIGRATION
-- =====================================================

-- 1. PREVENT DUPLICATE SERVICE ORDERS FOR SAME DEVICE
CREATE OR REPLACE FUNCTION prevent_duplicate_device_so()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.device_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM service_orders
      WHERE device_id = NEW.device_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND status NOT IN ('delivered', 'cancelled')
    ) THEN
      RAISE EXCEPTION 'Já existe uma ordem de serviço aberta para este dispositivo.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_device_so ON service_orders;
CREATE TRIGGER trg_prevent_duplicate_device_so
  BEFORE INSERT ON service_orders
  FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_device_so();

-- 2. ENFORCE STATUS TRANSITIONS
CREATE OR REPLACE FUNCTION enforce_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  allowed text[];
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  CASE OLD.status
    WHEN 'received' THEN allowed := ARRAY['triage','cancelled'];
    WHEN 'triage' THEN allowed := ARRAY['awaiting_diagnosis','cancelled'];
    WHEN 'awaiting_diagnosis' THEN allowed := ARRAY['awaiting_quote','in_repair','cancelled'];
    WHEN 'awaiting_quote' THEN allowed := ARRAY['awaiting_customer_approval','cancelled'];
    WHEN 'awaiting_customer_approval' THEN allowed := ARRAY['awaiting_parts','in_repair','cancelled'];
    WHEN 'awaiting_parts' THEN allowed := ARRAY['in_repair','cancelled'];
    WHEN 'in_repair' THEN allowed := ARRAY['in_testing','awaiting_parts','cancelled'];
    WHEN 'in_testing' THEN allowed := ARRAY['ready_for_pickup','in_repair','cancelled'];
    WHEN 'ready_for_pickup' THEN allowed := ARRAY['delivered'];
    WHEN 'delivered' THEN allowed := ARRAY['warranty_return'];
    WHEN 'warranty_return' THEN allowed := ARRAY['triage'];
    WHEN 'cancelled' THEN allowed := ARRAY[]::text[];
    ELSE allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(allowed)) THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_status_transition ON service_orders;
CREATE TRIGGER trg_enforce_status_transition
  BEFORE UPDATE OF status ON service_orders
  FOR EACH ROW EXECUTE FUNCTION enforce_status_transition();

-- 3. PREVENT NEGATIVE STOCK
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Estoque não pode ser negativo. Produto: %', NEW.name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_negative_stock ON products;
CREATE TRIGGER trg_prevent_negative_stock
  BEFORE UPDATE OF quantity ON products
  FOR EACH ROW EXECUTE FUNCTION prevent_negative_stock();

-- 4. PREVENT DELETION OF STOCK MOVEMENTS
CREATE OR REPLACE FUNCTION prevent_stock_movement_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Movimentações de estoque não podem ser excluídas.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_stock_movement_delete ON stock_movements;
CREATE TRIGGER trg_prevent_stock_movement_delete
  BEFORE DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION prevent_stock_movement_delete();

-- 5. PROTECT APPROVED QUOTES FROM MODIFICATION
CREATE OR REPLACE FUNCTION protect_approved_quote()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('approved', 'rejected') AND TG_OP = 'UPDATE' THEN
    -- Allow only status changes (e.g. to expired)
    IF NEW.status != OLD.status AND 
       (NEW.labor_cost = OLD.labor_cost AND NEW.parts_cost = OLD.parts_cost AND NEW.total = OLD.total) THEN
      RETURN NEW;
    END IF;
    -- If values changed, block
    IF NEW.labor_cost != OLD.labor_cost OR NEW.parts_cost != OLD.parts_cost OR NEW.total != OLD.total THEN
      RAISE EXCEPTION 'Orçamento já aprovado/rejeitado não pode ter valores alterados.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_approved_quote ON repair_quotes;
CREATE TRIGGER trg_protect_approved_quote
  BEFORE UPDATE ON repair_quotes
  FOR EACH ROW EXECUTE FUNCTION protect_approved_quote();

-- 6. DEVICE LOCATION TRACKING TABLE
CREATE TABLE IF NOT EXISTS device_location_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  location text NOT NULL DEFAULT 'reception',
  moved_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dlt_service_order ON device_location_tracking(service_order_id);
CREATE INDEX IF NOT EXISTS idx_dlt_created_at ON device_location_tracking(created_at DESC);

ALTER TABLE device_location_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_dlt" ON device_location_tracking
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician']::app_role[]));

CREATE POLICY "staff_insert_dlt" ON device_location_tracking
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician']::app_role[]));

-- Auto-track location on status changes
CREATE OR REPLACE FUNCTION auto_track_device_location()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  loc text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'received' THEN loc := 'reception';
    WHEN 'triage' THEN loc := 'triage_bench';
    WHEN 'awaiting_diagnosis' THEN loc := 'diagnosis_bench';
    WHEN 'awaiting_quote' THEN loc := 'diagnosis_bench';
    WHEN 'awaiting_customer_approval' THEN loc := 'storage';
    WHEN 'awaiting_parts' THEN loc := 'storage';
    WHEN 'in_repair' THEN loc := 'repair_bench';
    WHEN 'in_testing' THEN loc := 'testing_bench';
    WHEN 'ready_for_pickup' THEN loc := 'ready_storage';
    WHEN 'delivered' THEN loc := 'delivered';
    ELSE loc := 'unknown';
  END CASE;

  INSERT INTO device_location_tracking (service_order_id, device_id, location, moved_by)
  VALUES (NEW.id, NEW.device_id, loc, auth.uid());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_track_device_location ON service_orders;
CREATE TRIGGER trg_auto_track_device_location
  AFTER UPDATE OF status ON service_orders
  FOR EACH ROW EXECUTE FUNCTION auto_track_device_location();

-- 7. STALE DEVICE DETECTION RPC
CREATE OR REPLACE FUNCTION detect_stale_devices(days_threshold int DEFAULT 5)
RETURNS TABLE(
  service_order_id uuid,
  order_number text,
  status text,
  customer_name text,
  device_label text,
  last_update timestamptz,
  days_stale int
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    so.id as service_order_id,
    so.order_number,
    so.status::text,
    c.full_name as customer_name,
    COALESCE(d.brand || ' ' || d.model, 'Sem dispositivo') as device_label,
    so.updated_at as last_update,
    EXTRACT(DAY FROM now() - so.updated_at)::int as days_stale
  FROM service_orders so
  JOIN customers c ON c.id = so.customer_id
  LEFT JOIN devices d ON d.id = so.device_id
  WHERE so.status NOT IN ('delivered', 'cancelled')
    AND so.updated_at < now() - (days_threshold || ' days')::interval
  ORDER BY so.updated_at ASC;
$$;

-- 8. CONSISTENCY CHECKS RPC
CREATE OR REPLACE FUNCTION run_consistency_checks()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'orders_without_devices', (
      SELECT count(*) FROM service_orders
      WHERE device_id IS NULL AND status NOT IN ('cancelled')
    ),
    'stale_devices_5_days', (
      SELECT count(*) FROM service_orders
      WHERE status NOT IN ('delivered','cancelled')
        AND updated_at < now() - interval '5 days'
    ),
    'negative_stock_products', (
      SELECT count(*) FROM products WHERE quantity < 0
    ),
    'orphan_diagnostics', (
      SELECT count(*) FROM diagnostics d
      WHERE NOT EXISTS (SELECT 1 FROM service_orders so WHERE so.id = d.service_order_id)
    ),
    'checked_at', now()
  ) INTO result;

  RETURN result;
END;
$$;
