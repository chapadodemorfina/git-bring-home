
-- Enhanced dashboard_summary with BI metrics
CREATE OR REPLACE FUNCTION public.dashboard_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _today_start timestamptz := date_trunc('day', now());
  _today_end timestamptz := _today_start + interval '1 day';
BEGIN
  SELECT jsonb_build_object(
    -- Core counts
    'total_orders', (SELECT COUNT(*) FROM service_orders WHERE created_at BETWEEN _from AND _to),
    'open_orders', (SELECT COUNT(*) FROM service_orders WHERE created_at BETWEEN _from AND _to AND status NOT IN ('delivered', 'cancelled')),
    'orders_by_status', (
      SELECT COALESCE(jsonb_object_agg(status::text, cnt), '{}'::jsonb)
      FROM (SELECT status, COUNT(*) as cnt FROM service_orders WHERE created_at BETWEEN _from AND _to GROUP BY status) s
    ),

    -- Revenue / Expense
    'total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM financial_entries WHERE entry_type = 'revenue' AND created_at BETWEEN _from AND _to),
    'total_expenses', (SELECT COALESCE(SUM(amount), 0) FROM financial_entries WHERE entry_type = 'expense' AND created_at BETWEEN _from AND _to),
    'total_commissions', (SELECT COALESCE(SUM(amount), 0) FROM financial_entries WHERE entry_type = 'commission' AND created_at BETWEEN _from AND _to),

    -- Quotes
    'quotes_total', (SELECT COUNT(*) FROM repair_quotes WHERE created_at BETWEEN _from AND _to),
    'quotes_approved', (SELECT COUNT(*) FROM repair_quotes WHERE status = 'approved' AND created_at BETWEEN _from AND _to),
    'quotes_rejected', (SELECT COUNT(*) FROM repair_quotes WHERE status = 'rejected' AND created_at BETWEEN _from AND _to),

    -- Warranties
    'warranties_total', (SELECT COUNT(*) FROM warranties WHERE created_at BETWEEN _from AND _to),
    'warranties_voided', (SELECT COUNT(*) FROM warranties WHERE is_void = true AND created_at BETWEEN _from AND _to),

    -- Turnaround
    'avg_turnaround_hours', (
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (h.created_at - so.created_at)) / 3600), 1)
      FROM service_order_status_history h
      JOIN service_orders so ON so.id = h.service_order_id
      WHERE h.to_status IN ('delivered', 'ready_for_pickup') AND h.created_at BETWEEN _from AND _to
    ),

    -- SLA
    'sla_overdue_count', (
      SELECT COUNT(*) FROM service_orders so
      JOIN sla_configs sla ON sla.priority = so.priority::text AND sla.status = so.status::text
      WHERE so.status NOT IN ('delivered', 'cancelled')
        AND EXTRACT(EPOCH FROM (now() - so.updated_at)) / 3600 > sla.target_hours
    ),

    -- Device types
    'device_types', (
      SELECT COALESCE(jsonb_object_agg(device_type::text, cnt), '{}'::jsonb)
      FROM (SELECT device_type, COUNT(*) as cnt FROM devices WHERE created_at BETWEEN _from AND _to GROUP BY device_type) dt
    ),

    -- Top defects
    'top_defects', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('cause', probable_cause, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (SELECT probable_cause, COUNT(*) as cnt FROM diagnostics WHERE probable_cause IS NOT NULL AND created_at BETWEEN _from AND _to GROUP BY probable_cause ORDER BY cnt DESC LIMIT 10) td
    ),

    -- Technician orders
    'technician_orders', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('technician_id', t.assigned_technician_id, 'name', p.full_name, 'count', t.cnt)), '[]'::jsonb)
      FROM (SELECT assigned_technician_id, COUNT(*) as cnt FROM service_orders WHERE assigned_technician_id IS NOT NULL AND created_at BETWEEN _from AND _to GROUP BY assigned_technician_id) t
      LEFT JOIN profiles p ON p.id = t.assigned_technician_id
    ),

    -- Collection point orders
    'collection_point_orders', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('cp_id', cpo.collection_point_id, 'name', cp.name, 'count', cpo.cnt, 'revenue', COALESCE(rev.amt, 0), 'commissions', COALESCE(com.amt, 0))), '[]'::jsonb)
      FROM (SELECT collection_point_id, COUNT(*) as cnt FROM service_orders WHERE collection_point_id IS NOT NULL AND created_at BETWEEN _from AND _to GROUP BY collection_point_id) cpo
      LEFT JOIN collection_points cp ON cp.id = cpo.collection_point_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(fe.amount), 0) as amt FROM financial_entries fe
        JOIN service_orders so2 ON so2.id = fe.service_order_id
        WHERE so2.collection_point_id = cpo.collection_point_id AND fe.entry_type = 'revenue' AND fe.created_at BETWEEN _from AND _to
      ) rev ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(calculated_amount), 0) as amt FROM collection_point_commissions
        WHERE collection_point_id = cpo.collection_point_id AND created_at BETWEEN _from AND _to
      ) com ON true
    ),

    -- Monthly trend
    'monthly_trend', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('month', TO_CHAR(m.month_start, 'Mon'), 'orders', COALESCE(o.cnt, 0), 'revenue', COALESCE(r.amt, 0), 'expenses', COALESCE(e.amt, 0), 'profit', COALESCE(r.amt, 0) - COALESCE(e.amt, 0)) ORDER BY m.month_start), '[]'::jsonb)
      FROM generate_series(date_trunc('month', now() - interval '5 months'), date_trunc('month', now()), interval '1 month') m(month_start)
      LEFT JOIN LATERAL (SELECT COUNT(*) as cnt FROM service_orders WHERE created_at >= m.month_start AND created_at < m.month_start + interval '1 month') o ON true
      LEFT JOIN LATERAL (SELECT COALESCE(SUM(amount), 0) as amt FROM financial_entries WHERE entry_type = 'revenue' AND created_at >= m.month_start AND created_at < m.month_start + interval '1 month') r ON true
      LEFT JOIN LATERAL (SELECT COALESCE(SUM(amount), 0) as amt FROM financial_entries WHERE entry_type = 'expense' AND created_at >= m.month_start AND created_at < m.month_start + interval '1 month') e ON true
    ),

    -- === NEW BI METRICS ===

    -- Today quick metrics
    'today_received', (SELECT COUNT(*) FROM service_orders WHERE created_at BETWEEN _today_start AND _today_end),
    'today_delivered', (SELECT COUNT(*) FROM service_orders so JOIN service_order_status_history h ON h.service_order_id = so.id WHERE h.to_status = 'delivered' AND h.created_at BETWEEN _today_start AND _today_end),
    'today_revenue', (SELECT COALESCE(SUM(amount), 0) FROM financial_entries WHERE entry_type = 'revenue' AND created_at BETWEEN _today_start AND _today_end),
    'today_quotes', (SELECT COUNT(*) FROM repair_quotes WHERE created_at BETWEEN _today_start AND _today_end),

    -- Avg diagnosis time (hours)
    'avg_diagnosis_hours', (
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (d.diagnosis_completed_at - d.diagnosis_started_at)) / 3600), 1)
      FROM diagnostics d WHERE d.diagnosis_completed_at IS NOT NULL AND d.created_at BETWEEN _from AND _to
    ),

    -- Avg ticket value
    'avg_ticket_value', (
      SELECT ROUND(AVG(rq.total_amount), 2)
      FROM repair_quotes rq WHERE rq.status = 'approved' AND rq.total_amount > 0 AND rq.created_at BETWEEN _from AND _to
    ),

    -- Parts consumption top 10
    'top_parts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', p.name, 'sku', p.sku, 'qty', sub.total_qty, 'cost', sub.total_cost) ORDER BY sub.total_qty DESC), '[]'::jsonb)
      FROM (
        SELECT product_id, SUM(quantity) as total_qty, SUM(total_cost) as total_cost
        FROM repair_parts_used WHERE created_at BETWEEN _from AND _to
        GROUP BY product_id ORDER BY total_qty DESC LIMIT 10
      ) sub
      JOIN products p ON p.id = sub.product_id
    ),

    -- Inventory stock value
    'stock_value', (SELECT COALESCE(SUM(quantity * cost_price), 0) FROM products WHERE is_active = true),
    'low_stock_count', (SELECT COUNT(*) FROM products WHERE is_active = true AND quantity <= minimum_quantity AND minimum_quantity > 0),

    -- Status breakdown for pipeline view
    'pipeline', (
      SELECT COALESCE(jsonb_object_agg(status::text, cnt), '{}'::jsonb)
      FROM (SELECT status, COUNT(*) as cnt FROM service_orders WHERE status NOT IN ('delivered', 'cancelled') GROUP BY status) pp
    )
  ) INTO _result;

  RETURN _result;
END;
$$;
