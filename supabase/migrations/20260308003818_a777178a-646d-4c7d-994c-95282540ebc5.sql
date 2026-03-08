
-- Add missing columns to warranties
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS warranty_type text NOT NULL DEFAULT 'repair_warranty';
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS void_reason text;

-- Backfill customer_id from service_orders
UPDATE warranties w SET customer_id = so.customer_id
FROM service_orders so WHERE so.id = w.service_order_id AND w.customer_id IS NULL;

-- Add return cause to warranty_returns
ALTER TABLE warranty_returns ADD COLUMN IF NOT EXISTS return_cause text;
ALTER TABLE warranty_returns ADD COLUMN IF NOT EXISTS outcome text;

-- Auto-create warranty on delivery trigger
CREATE OR REPLACE FUNCTION public.trg_auto_warranty_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _existing integer;
  _days integer := 90;
  _start_date date;
  _end_date date;
BEGIN
  IF NEW.status <> 'delivered' OR OLD.status = 'delivered' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO _existing FROM warranties WHERE service_order_id = NEW.id;
  IF _existing > 0 THEN RETURN NEW; END IF;

  _start_date := CURRENT_DATE;
  _end_date := CURRENT_DATE + _days;

  INSERT INTO warranties (service_order_id, customer_id, start_date, end_date, warranty_type,
    coverage_description, terms, created_by)
  VALUES (NEW.id, NEW.customer_id, _start_date, _end_date, 'repair_warranty',
    'Garantia padrão de serviço — cobre o reparo realizado.',
    'Garantia válida por ' || _days || ' dias a partir da data de entrega. Cobre exclusivamente o serviço realizado. Não cobre mau uso, danos físicos ou líquidos.',
    auth.uid());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_warranty_delivery ON service_orders;
CREATE TRIGGER trg_auto_warranty_delivery
  BEFORE UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_warranty_on_delivery();

-- Void warranty function
CREATE OR REPLACE FUNCTION public.void_warranty(_warranty_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _w warranties%ROWTYPE;
BEGIN
  SELECT * INTO _w FROM warranties WHERE id = _warranty_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Garantia não encontrada'; END IF;
  IF _w.is_void THEN RAISE EXCEPTION 'Garantia já anulada'; END IF;
  IF _reason IS NULL OR trim(_reason) = '' THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;

  UPDATE warranties SET is_void = true, void_reason = _reason WHERE id = _warranty_id;

  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (auth.uid(), 'warranty_voided', 'warranties', _warranty_id,
    jsonb_build_object('warranty_number', _w.warranty_number, 'reason', _reason));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Warranty analytics function
CREATE OR REPLACE FUNCTION public.warranty_analytics(_from timestamptz DEFAULT now() - interval '1 year', _to timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_warranties', (SELECT COUNT(*) FROM warranties WHERE created_at BETWEEN _from AND _to),
    'active_warranties', (SELECT COUNT(*) FROM warranties WHERE NOT is_void AND end_date >= CURRENT_DATE AND created_at BETWEEN _from AND _to),
    'expired_warranties', (SELECT COUNT(*) FROM warranties WHERE NOT is_void AND end_date < CURRENT_DATE AND created_at BETWEEN _from AND _to),
    'voided_warranties', (SELECT COUNT(*) FROM warranties WHERE is_void AND created_at BETWEEN _from AND _to),
    'total_returns', (SELECT COUNT(*) FROM warranty_returns WHERE created_at BETWEEN _from AND _to),
    'return_rate', (
      SELECT CASE WHEN COUNT(w.*) = 0 THEN 0
        ELSE ROUND(COUNT(wr.id)::numeric / COUNT(DISTINCT w.id) * 100, 1)
      END
      FROM warranties w
      LEFT JOIN warranty_returns wr ON wr.warranty_id = w.id
      WHERE w.created_at BETWEEN _from AND _to
    ),
    'returns_by_cause', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('cause', return_cause, 'count', cnt)), '[]'::jsonb)
      FROM (SELECT COALESCE(return_cause, 'não informado') as return_cause, COUNT(*) as cnt
            FROM warranty_returns WHERE created_at BETWEEN _from AND _to
            GROUP BY return_cause ORDER BY cnt DESC) sub
    ),
    'returns_by_outcome', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('outcome', outcome, 'count', cnt)), '[]'::jsonb)
      FROM (SELECT COALESCE(outcome, 'pendente') as outcome, COUNT(*) as cnt
            FROM warranty_returns WHERE created_at BETWEEN _from AND _to
            GROUP BY outcome ORDER BY cnt DESC) sub
    ),
    'top_returning_devices', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('device', label, 'count', cnt)), '[]'::jsonb)
      FROM (SELECT TRIM(COALESCE(d.brand,'') || ' ' || COALESCE(d.model,'')) as label, COUNT(*) as cnt
            FROM warranty_returns wr
            JOIN warranties w ON w.id = wr.warranty_id
            JOIN service_orders so ON so.id = w.service_order_id
            LEFT JOIN devices d ON d.id = so.device_id
            WHERE wr.created_at BETWEEN _from AND _to
            GROUP BY d.brand, d.model ORDER BY cnt DESC LIMIT 10) sub
    ),
    'recent_returns', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', wr.id, 'warranty_number', w.warranty_number, 'reason', wr.reason,
        'return_cause', wr.return_cause, 'outcome', wr.outcome, 'status', wr.status,
        'customer_name', c.full_name, 'created_at', wr.created_at
      ) ORDER BY wr.created_at DESC), '[]'::jsonb)
      FROM warranty_returns wr
      JOIN warranties w ON w.id = wr.warranty_id
      JOIN service_orders so ON so.id = w.service_order_id
      JOIN customers c ON c.id = so.customer_id
      WHERE wr.created_at BETWEEN _from AND _to
      LIMIT 20
    )
  );
END;
$$;
