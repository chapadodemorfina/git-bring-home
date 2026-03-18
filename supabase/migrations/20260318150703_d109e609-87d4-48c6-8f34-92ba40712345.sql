
-- =============================================
-- WARRANTY MODULE EXPANSION
-- =============================================

-- 1. Add missing columns to warranties
ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.repair_quotes(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Add missing columns to warranty_returns
ALTER TABLE public.warranty_returns
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id),
  ADD COLUMN IF NOT EXISTS technical_analysis text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- 3. Create warranty_rules table
CREATE TABLE IF NOT EXISTS public.warranty_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  device_type text,
  service_category text,
  warranty_days integer NOT NULL DEFAULT 90,
  applies_to text NOT NULL DEFAULT 'service' CHECK (applies_to IN ('service', 'part', 'mixed')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warranty_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read warranty_rules" ON public.warranty_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can manage warranty_rules" ON public.warranty_rules
  FOR ALL TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])
  );

-- 4. Create warranty_items table
CREATE TABLE IF NOT EXISTS public.warranty_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES public.warranties(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('part', 'service')),
  reference_id uuid,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warranty_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read warranty_items" ON public.warranty_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can manage warranty_items" ON public.warranty_items
  FOR ALL TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin','manager','bench_technician','front_desk']::app_role[])
  );

-- 5. Insert default warranty rules
INSERT INTO public.warranty_rules (name, service_category, warranty_days, applies_to) VALUES
  ('Troca de Tela', 'screen_replacement', 90, 'mixed'),
  ('Troca de Conector', 'connector_replacement', 30, 'part'),
  ('Limpeza / Manutenção', 'cleaning', 15, 'service'),
  ('Placa Reparada', 'board_repair', 60, 'service'),
  ('Troca de Bateria', 'battery_replacement', 90, 'part'),
  ('Reparo Geral', 'general_repair', 90, 'service')
ON CONFLICT DO NOTHING;

-- 6. Enhanced auto-warranty trigger that uses warranty_rules
CREATE OR REPLACE FUNCTION public.trg_auto_warranty_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _existing integer;
  _days integer := 90;
  _rule record;
  _start_date date;
  _end_date date;
  _warranty_id uuid;
  _warranty_type text := 'service';
  _coverage text;
BEGIN
  IF NEW.status <> 'delivered' OR OLD.status = 'delivered' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO _existing FROM warranties WHERE service_order_id = NEW.id;
  IF _existing > 0 THEN RETURN NEW; END IF;

  -- Try to find matching warranty rule
  SELECT * INTO _rule FROM warranty_rules
    WHERE is_active = true
    ORDER BY
      CASE WHEN service_category IS NOT NULL THEN 0 ELSE 1 END,
      warranty_days DESC
    LIMIT 1;

  IF FOUND THEN
    _days := _rule.warranty_days;
    _warranty_type := _rule.applies_to;
    _coverage := 'Garantia: ' || _rule.name || ' — ' || _days || ' dias.';
  ELSE
    _coverage := 'Garantia padrão de serviço — cobre o reparo realizado.';
  END IF;

  _start_date := CURRENT_DATE;
  _end_date := CURRENT_DATE + _days;

  INSERT INTO warranties (service_order_id, customer_id, warranty_type, start_date, end_date,
    coverage_description, terms, created_by)
  VALUES (NEW.id, NEW.customer_id, _warranty_type, _start_date, _end_date,
    _coverage,
    'Garantia válida por ' || _days || ' dias a partir da data de entrega. Cobre exclusivamente o serviço realizado. Não cobre mau uso, danos físicos ou líquidos.',
    auth.uid())
  RETURNING id INTO _warranty_id;

  -- Auto-populate warranty_items from repair_parts_used
  INSERT INTO warranty_items (warranty_id, item_type, reference_id, description, quantity)
  SELECT _warranty_id, 'part', rpu.product_id,
    COALESCE(p.name, 'Peça'), rpu.quantity
  FROM repair_parts_used rpu
  LEFT JOIN products p ON p.id = rpu.product_id
  WHERE rpu.service_order_id = NEW.id;

  -- Add service item
  INSERT INTO warranty_items (warranty_id, item_type, description, quantity)
  VALUES (_warranty_id, 'service', COALESCE(NEW.reported_issue, 'Serviço de reparo'), 1);

  RETURN NEW;
END;
$$;

-- 7. Enhanced warranty_analytics with more data
CREATE OR REPLACE FUNCTION public.warranty_analytics(_from timestamptz DEFAULT '2000-01-01', _to timestamptz DEFAULT now())
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
    'open_returns', (SELECT COUNT(*) FROM warranty_returns WHERE status IN ('open', 'in_analysis') AND created_at BETWEEN _from AND _to),
    'return_rate', (
      SELECT CASE WHEN COUNT(w.*) = 0 THEN 0
        ELSE ROUND(COUNT(wr.id)::numeric / COUNT(DISTINCT w.id) * 100, 1)
      END
      FROM warranties w
      LEFT JOIN warranty_returns wr ON wr.warranty_id = w.id
      WHERE w.created_at BETWEEN _from AND _to
    ),
    'expiring_soon', (SELECT COUNT(*) FROM warranties WHERE NOT is_void AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30 AND created_at BETWEEN _from AND _to),
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
        'customer_name', c.full_name, 'created_at', wr.created_at,
        'technical_analysis', wr.technical_analysis, 'resolved_at', wr.resolved_at,
        'new_service_order_id', wr.new_service_order_id
      ) ORDER BY wr.created_at DESC), '[]'::jsonb)
      FROM warranty_returns wr
      JOIN warranties w ON w.id = wr.warranty_id
      JOIN service_orders so ON so.id = w.service_order_id
      JOIN customers c ON c.id = so.customer_id
      WHERE wr.created_at BETWEEN _from AND _to
      LIMIT 20
    ),
    'returns_by_technician', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('technician', tech_name, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT COALESCE(p.full_name, 'Desconhecido') as tech_name, COUNT(*) as cnt
        FROM warranty_returns wr
        JOIN warranties w ON w.id = wr.warranty_id
        JOIN service_orders so ON so.id = w.service_order_id
        LEFT JOIN profiles p ON p.id = so.assigned_technician_id
        WHERE wr.created_at BETWEEN _from AND _to
        GROUP BY p.full_name ORDER BY cnt DESC LIMIT 10
      ) sub
    )
  );
END;
$$;

-- 8. Function to resolve warranty return
CREATE OR REPLACE FUNCTION public.resolve_warranty_return(
  _return_id uuid,
  _outcome text,
  _technical_analysis text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ret warranty_returns%ROWTYPE;
BEGIN
  SELECT * INTO _ret FROM warranty_returns WHERE id = _return_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Retorno não encontrado'; END IF;
  IF _ret.status IN ('resolved', 'cancelled') THEN RAISE EXCEPTION 'Retorno já finalizado'; END IF;

  UPDATE warranty_returns SET
    outcome = _outcome,
    technical_analysis = COALESCE(_technical_analysis, technical_analysis),
    status = 'resolved',
    resolved_at = now(),
    updated_at = now()
  WHERE id = _return_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Enhanced create_warranty_return to populate customer_id
CREATE OR REPLACE FUNCTION public.create_warranty_return(_warranty_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _warranty warranties%ROWTYPE;
  _original_so service_orders%ROWTYPE;
  _user_id uuid;
  _new_so_id uuid;
BEGIN
  _user_id := auth.uid();

  SELECT * INTO _warranty FROM warranties WHERE id = _warranty_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Garantia não encontrada'; END IF;
  IF _warranty.is_void THEN RAISE EXCEPTION 'Garantia anulada'; END IF;
  IF _warranty.end_date::date < CURRENT_DATE THEN RAISE EXCEPTION 'Garantia expirada'; END IF;

  SELECT * INTO _original_so FROM service_orders WHERE id = _warranty.service_order_id;

  INSERT INTO service_orders (customer_id, device_id, priority, intake_channel, reported_issue, status, created_by)
  VALUES (_original_so.customer_id, _original_so.device_id, 'high', 'front_desk',
          'Retorno de garantia: ' || _reason, 'received', _user_id)
  RETURNING id INTO _new_so_id;

  INSERT INTO service_order_status_history (service_order_id, to_status, changed_by, notes)
  VALUES (_new_so_id, 'received', _user_id, 'OS criada por retorno de garantia #' || _warranty.warranty_number);

  INSERT INTO warranty_returns (warranty_id, original_service_order_id, new_service_order_id, customer_id, reason, status, created_by)
  VALUES (_warranty_id, _warranty.service_order_id, _new_so_id, _original_so.customer_id, _reason, 'open', _user_id);

  RETURN jsonb_build_object('success', true, 'new_service_order_id', _new_so_id);
END;
$$;

-- 10. Updated_at trigger for warranties
CREATE OR REPLACE TRIGGER update_warranties_updated_at
  BEFORE UPDATE ON public.warranties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
