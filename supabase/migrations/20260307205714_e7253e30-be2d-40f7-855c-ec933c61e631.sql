
-- ============================================
-- BUSINESS AUTOMATION: TRIGGERS, FUNCTIONS, TABLES, RPCs
-- ============================================

-- 2. DELIVERY AUTOMATION TRIGGER
-- Auto-generates financial entry + commission when SO status changes to 'delivered'
CREATE OR REPLACE FUNCTION public.trg_auto_delivery_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _quote record;
  _cp record;
  _base_amount numeric;
  _calc_amount numeric;
  _existing integer;
BEGIN
  IF NEW.status <> 'delivered' OR OLD.status = 'delivered' THEN
    RETURN NEW;
  END IF;

  -- A) Auto revenue from approved quote
  SELECT * INTO _quote FROM repair_quotes
  WHERE service_order_id = NEW.id AND status = 'approved'
  ORDER BY updated_at DESC LIMIT 1;

  IF FOUND AND COALESCE(_quote.total_amount, 0) > 0 THEN
    SELECT COUNT(*) INTO _existing FROM financial_entries
    WHERE service_order_id = NEW.id AND quote_id = _quote.id
      AND entry_type = 'revenue' AND category = 'service';

    IF _existing = 0 THEN
      INSERT INTO financial_entries (entry_type, description, amount, service_order_id, customer_id, quote_id, category, created_by)
      VALUES ('revenue',
        'Serviço - ' || COALESCE(_quote.quote_number, NEW.order_number),
        _quote.total_amount, NEW.id, NEW.customer_id, _quote.id, 'service', auth.uid());
    END IF;
  END IF;

  -- B) Auto commission for collection point
  IF NEW.collection_point_id IS NOT NULL THEN
    SELECT * INTO _cp FROM collection_points WHERE id = NEW.collection_point_id AND is_active = true;

    IF FOUND THEN
      SELECT COUNT(*) INTO _existing FROM collection_point_commissions
      WHERE service_order_id = NEW.id AND collection_point_id = NEW.collection_point_id;

      IF _existing = 0 THEN
        _base_amount := COALESCE(
          (SELECT total_amount FROM repair_quotes WHERE service_order_id = NEW.id AND status = 'approved' ORDER BY updated_at DESC LIMIT 1),
          0
        );

        CASE _cp.commission_type::text
          WHEN 'percentage' THEN _calc_amount := _base_amount * (_cp.commission_value / 100);
          WHEN 'fixed_per_order' THEN _calc_amount := _cp.commission_value;
          WHEN 'fixed_per_device' THEN _calc_amount := _cp.commission_value;
          ELSE _calc_amount := 0;
        END CASE;

        IF _calc_amount > 0 THEN
          INSERT INTO collection_point_commissions (collection_point_id, service_order_id, commission_type, commission_value, base_amount, calculated_amount)
          VALUES (NEW.collection_point_id, NEW.id, _cp.commission_type, _cp.commission_value, _base_amount, _calc_amount);

          INSERT INTO financial_entries (entry_type, description, amount, service_order_id, collection_point_id, category, created_by)
          VALUES ('commission', 'Comissão - ' || _cp.name, _calc_amount, NEW.id, NEW.collection_point_id, 'commission', auth.uid());
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_automations ON service_orders;
CREATE TRIGGER trg_delivery_automations
AFTER UPDATE ON service_orders
FOR EACH ROW
WHEN (NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered')
EXECUTE FUNCTION trg_auto_delivery_financials();

-- 3. QUOTE EXPIRATION FUNCTION
CREATE OR REPLACE FUNCTION public.expire_stale_quotes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
BEGIN
  WITH expired AS (
    UPDATE repair_quotes
    SET status = 'expired', updated_at = now()
    WHERE status = 'sent'
      AND expires_at IS NOT NULL
      AND expires_at < now()
    RETURNING id, service_order_id
  )
  SELECT COUNT(*) INTO _count FROM expired;

  UPDATE service_orders so
  SET status = 'awaiting_quote', updated_at = now()
  WHERE so.status = 'awaiting_customer_approval'
    AND EXISTS (
      SELECT 1 FROM repair_quotes rq
      WHERE rq.service_order_id = so.id AND rq.status = 'expired'
    )
    AND NOT EXISTS (
      SELECT 1 FROM repair_quotes rq2
      WHERE rq2.service_order_id = so.id AND rq2.status IN ('sent', 'approved', 'draft')
    );

  RETURN _count;
END;
$$;

-- 4. FINANCIAL OVERDUE FUNCTION
CREATE OR REPLACE FUNCTION public.mark_overdue_entries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
BEGIN
  WITH updated AS (
    UPDATE financial_entries
    SET status = 'overdue', updated_at = now()
    WHERE status IN ('pending', 'partial')
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO _count FROM updated;

  RETURN _count;
END;
$$;

-- 5. SLA CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS public.sla_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority text NOT NULL,
  status text NOT NULL,
  target_hours integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(priority, status)
);

ALTER TABLE public.sla_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manager_all_sla" ON public.sla_configs
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "operational_select_sla" ON public.sla_configs
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_sla_configs_updated_at BEFORE UPDATE ON public.sla_configs
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO public.sla_configs (priority, status, target_hours) VALUES
('urgent', 'awaiting_diagnosis', 4), ('urgent', 'awaiting_customer_approval', 24),
('urgent', 'in_repair', 8), ('urgent', 'awaiting_parts', 48), ('urgent', 'ready_for_pickup', 24),
('high', 'awaiting_diagnosis', 8), ('high', 'awaiting_customer_approval', 48),
('high', 'in_repair', 24), ('high', 'awaiting_parts', 72), ('high', 'ready_for_pickup', 48),
('normal', 'awaiting_diagnosis', 24), ('normal', 'awaiting_customer_approval', 72),
('normal', 'in_repair', 48), ('normal', 'awaiting_parts', 120), ('normal', 'ready_for_pickup', 72),
('low', 'awaiting_diagnosis', 48), ('low', 'awaiting_customer_approval', 120),
('low', 'in_repair', 72), ('low', 'awaiting_parts', 168), ('low', 'ready_for_pickup', 120)
ON CONFLICT DO NOTHING;

-- 6. WORK QUEUE RPC
CREATE OR REPLACE FUNCTION public.get_work_queues(
  _queue text DEFAULT NULL,
  _technician_id uuid DEFAULT NULL,
  _priority text DEFAULT NULL,
  _collection_point_only boolean DEFAULT false,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _offset integer;
  _total bigint;
BEGIN
  _offset := (_page - 1) * _page_size;

  SELECT COUNT(*) INTO _total
  FROM service_orders so
  WHERE
    CASE _queue
      WHEN 'diagnosis' THEN so.status IN ('awaiting_diagnosis', 'triage')
      WHEN 'repair' THEN so.status IN ('in_repair', 'awaiting_parts')
      WHEN 'testing' THEN so.status = 'in_testing'
      WHEN 'pickup' THEN so.status = 'ready_for_pickup'
      ELSE so.status NOT IN ('delivered', 'cancelled')
    END
    AND (_technician_id IS NULL OR so.assigned_technician_id = _technician_id)
    AND (_priority IS NULL OR so.priority::text = _priority)
    AND (NOT _collection_point_only OR so.collection_point_id IS NOT NULL);

  SELECT jsonb_build_object(
    'items', COALESCE(items_agg, '[]'::jsonb),
    'total', _total,
    'page', _page,
    'page_size', _page_size
  ) INTO _result
  FROM (
    SELECT jsonb_agg(item ORDER BY priority_rank, so_created) as items_agg
    FROM (
      SELECT
        jsonb_build_object(
          'id', so.id,
          'order_number', so.order_number,
          'status', so.status::text,
          'priority', so.priority::text,
          'created_at', so.created_at,
          'updated_at', so.updated_at,
          'assigned_technician_id', so.assigned_technician_id,
          'collection_point_id', so.collection_point_id,
          'reported_issue', so.reported_issue,
          'customer_name', c.full_name,
          'device_label', TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.model, '')),
          'technician_name', p.full_name,
          'collection_point_name', cp.name,
          'target_hours', sla.target_hours,
          'hours_in_status', ROUND(EXTRACT(EPOCH FROM (now() - so.updated_at)) / 3600, 1),
          'sla_overdue', CASE WHEN sla.target_hours IS NOT NULL
            AND EXTRACT(EPOCH FROM (now() - so.updated_at)) / 3600 > sla.target_hours
            THEN true ELSE false END
        ) as item,
        CASE so.priority
          WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4
        END as priority_rank,
        so.created_at as so_created
      FROM service_orders so
      JOIN customers c ON c.id = so.customer_id
      LEFT JOIN devices d ON d.id = so.device_id
      LEFT JOIN profiles p ON p.id = so.assigned_technician_id
      LEFT JOIN collection_points cp ON cp.id = so.collection_point_id
      LEFT JOIN sla_configs sla ON sla.priority = so.priority::text AND sla.status = so.status::text
      WHERE
        CASE _queue
          WHEN 'diagnosis' THEN so.status IN ('awaiting_diagnosis', 'triage')
          WHEN 'repair' THEN so.status IN ('in_repair', 'awaiting_parts')
          WHEN 'testing' THEN so.status = 'in_testing'
          WHEN 'pickup' THEN so.status = 'ready_for_pickup'
          ELSE so.status NOT IN ('delivered', 'cancelled')
        END
        AND (_technician_id IS NULL OR so.assigned_technician_id = _technician_id)
        AND (_priority IS NULL OR so.priority::text = _priority)
        AND (NOT _collection_point_only OR so.collection_point_id IS NOT NULL)
      ORDER BY priority_rank, so.created_at ASC
      LIMIT _page_size OFFSET _offset
    ) sub
  ) agg;

  RETURN _result;
END;
$$;

-- 7. DASHBOARD SUMMARY RPC
CREATE OR REPLACE FUNCTION public.dashboard_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_orders', (SELECT COUNT(*) FROM service_orders WHERE created_at BETWEEN _from AND _to),
    'open_orders', (SELECT COUNT(*) FROM service_orders WHERE created_at BETWEEN _from AND _to AND status NOT IN ('delivered', 'cancelled')),
    'orders_by_status', (
      SELECT COALESCE(jsonb_object_agg(status::text, cnt), '{}'::jsonb)
      FROM (SELECT status, COUNT(*) as cnt FROM service_orders WHERE created_at BETWEEN _from AND _to GROUP BY status) s
    ),
    'total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM financial_entries WHERE entry_type = 'revenue' AND created_at BETWEEN _from AND _to),
    'total_expenses', (SELECT COALESCE(SUM(amount), 0) FROM financial_entries WHERE entry_type = 'expense' AND created_at BETWEEN _from AND _to),
    'total_commissions', (SELECT COALESCE(SUM(amount), 0) FROM financial_entries WHERE entry_type = 'commission' AND created_at BETWEEN _from AND _to),
    'quotes_total', (SELECT COUNT(*) FROM repair_quotes WHERE created_at BETWEEN _from AND _to),
    'quotes_approved', (SELECT COUNT(*) FROM repair_quotes WHERE status = 'approved' AND created_at BETWEEN _from AND _to),
    'warranties_total', (SELECT COUNT(*) FROM warranties WHERE created_at BETWEEN _from AND _to),
    'warranties_voided', (SELECT COUNT(*) FROM warranties WHERE is_void = true AND created_at BETWEEN _from AND _to),
    'avg_turnaround_hours', (
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (h.created_at - so.created_at)) / 3600), 1)
      FROM service_order_status_history h
      JOIN service_orders so ON so.id = h.service_order_id
      WHERE h.to_status IN ('delivered', 'ready_for_pickup')
        AND h.created_at BETWEEN _from AND _to
    ),
    'sla_overdue_count', (
      SELECT COUNT(*) FROM service_orders so
      JOIN sla_configs sla ON sla.priority = so.priority::text AND sla.status = so.status::text
      WHERE so.status NOT IN ('delivered', 'cancelled')
        AND EXTRACT(EPOCH FROM (now() - so.updated_at)) / 3600 > sla.target_hours
    ),
    'device_types', (
      SELECT COALESCE(jsonb_object_agg(device_type::text, cnt), '{}'::jsonb)
      FROM (SELECT device_type, COUNT(*) as cnt FROM devices WHERE created_at BETWEEN _from AND _to GROUP BY device_type) dt
    ),
    'top_defects', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('cause', probable_cause, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (SELECT probable_cause, COUNT(*) as cnt FROM diagnostics WHERE probable_cause IS NOT NULL AND created_at BETWEEN _from AND _to GROUP BY probable_cause ORDER BY cnt DESC LIMIT 10) td
    ),
    'technician_orders', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('technician_id', t.assigned_technician_id, 'name', p.full_name, 'count', t.cnt)), '[]'::jsonb)
      FROM (
        SELECT assigned_technician_id, COUNT(*) as cnt
        FROM service_orders WHERE assigned_technician_id IS NOT NULL AND created_at BETWEEN _from AND _to
        GROUP BY assigned_technician_id
      ) t
      LEFT JOIN profiles p ON p.id = t.assigned_technician_id
    ),
    'collection_point_orders', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('cp_id', cpo.collection_point_id, 'name', cp.name, 'count', cpo.cnt)), '[]'::jsonb)
      FROM (
        SELECT collection_point_id, COUNT(*) as cnt
        FROM service_orders WHERE collection_point_id IS NOT NULL AND created_at BETWEEN _from AND _to
        GROUP BY collection_point_id
      ) cpo
      LEFT JOIN collection_points cp ON cp.id = cpo.collection_point_id
    ),
    'monthly_trend', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'month', TO_CHAR(m.month_start, 'Mon'),
          'orders', COALESCE(o.cnt, 0),
          'revenue', COALESCE(r.amt, 0),
          'expenses', COALESCE(e.amt, 0),
          'profit', COALESCE(r.amt, 0) - COALESCE(e.amt, 0)
        ) ORDER BY m.month_start
      ), '[]'::jsonb)
      FROM generate_series(
        date_trunc('month', now() - interval '5 months'),
        date_trunc('month', now()),
        interval '1 month'
      ) m(month_start)
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as cnt FROM service_orders
        WHERE created_at >= m.month_start AND created_at < m.month_start + interval '1 month'
      ) o ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(amount), 0) as amt FROM financial_entries
        WHERE entry_type = 'revenue' AND created_at >= m.month_start AND created_at < m.month_start + interval '1 month'
      ) r ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(amount), 0) as amt FROM financial_entries
        WHERE entry_type = 'expense' AND created_at >= m.month_start AND created_at < m.month_start + interval '1 month'
      ) e ON true
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

-- 8. FINANCE SUMMARY RPC
CREATE OR REPLACE FUNCTION public.finance_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_revenue', COALESCE(SUM(CASE WHEN entry_type = 'revenue' THEN amount END), 0),
      'total_expenses', COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount END), 0),
      'total_commissions', COALESCE(SUM(CASE WHEN entry_type = 'commission' THEN amount END), 0),
      'pending_receivables', COALESCE(SUM(CASE WHEN entry_type = 'revenue' AND status IN ('pending', 'partial', 'overdue') THEN amount - paid_amount END), 0),
      'pending_payables', COALESCE(SUM(CASE WHEN entry_type IN ('expense', 'commission') AND status IN ('pending', 'partial', 'overdue') THEN amount - paid_amount END), 0),
      'overdue_count', COUNT(*) FILTER (WHERE status = 'overdue'),
      'profit', COALESCE(SUM(CASE WHEN entry_type = 'revenue' THEN amount ELSE 0 END), 0)
              - COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0)
              - COALESCE(SUM(CASE WHEN entry_type = 'commission' THEN amount ELSE 0 END), 0)
    )
    FROM financial_entries
    WHERE status <> 'cancelled'
  );
END;
$$;
