
CREATE OR REPLACE FUNCTION public.dashboard_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r jsonb;
  _tid uuid := get_active_tenant_id();
  _today_start timestamptz := date_trunc('day', now());
  _today_end timestamptz := _today_start + interval '1 day';
BEGIN
  IF _tid IS NULL THEN RAISE EXCEPTION 'Tenant not set'; END IF;

  SELECT jsonb_build_object(
    -- ══ Orders ══
    'total_orders',    (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to),
    'open_orders',     (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to AND status::text NOT IN ('delivered','cancelled')),
    'orders_by_status',(SELECT COALESCE(jsonb_object_agg(s,c),'{}'::jsonb) FROM (SELECT status::text s, COUNT(*) c FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to GROUP BY status) x),
    'pipeline',        (SELECT COALESCE(jsonb_object_agg(s,c),'{}'::jsonb) FROM (SELECT status::text s, COUNT(*) c FROM service_orders WHERE tenant_id=_tid AND status::text NOT IN ('delivered','cancelled') GROUP BY status) x),
    'services_completed', (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to AND status::text IN ('completed','delivered')),
    'os_conversion_rate', (SELECT CASE WHEN COUNT(*)>0 THEN ROUND(COUNT(*) FILTER (WHERE status::text IN ('completed','delivered'))::numeric / COUNT(*) * 100, 1) ELSE 0 END FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to),

    -- ══ Financial ══
    'total_revenue',   (SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='revenue' AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'total_expenses',  (SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='expense' AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'total_commissions',(SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='commission' AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'receivables_total',(SELECT COALESCE(SUM(remaining_amount),0) FROM accounts_receivable WHERE tenant_id=_tid AND status NOT IN ('paid','cancelled')),
    'receivables_overdue',(SELECT COALESCE(SUM(remaining_amount),0) FROM accounts_receivable WHERE tenant_id=_tid AND status='overdue'),
    'payables_total',  (SELECT COALESCE(SUM(amount - paid_amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='expense' AND status NOT IN ('paid','cancelled')),

    -- ══ Cash / Bank balances ══
    'cash_balance',    (SELECT COALESCE(
      (SELECT expected_amount FROM cash_registers WHERE tenant_id=_tid AND status='open' ORDER BY opened_at DESC LIMIT 1),
      (SELECT expected_amount FROM cash_registers WHERE tenant_id=_tid AND status='closed' ORDER BY closed_at DESC LIMIT 1),
      0)),

    -- ══ Today ══
    'today_received',  (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _today_start AND _today_end),
    'today_delivered',  (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND status::text='delivered' AND updated_at BETWEEN _today_start AND _today_end),
    'today_revenue',   (SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='revenue' AND status<>'cancelled' AND created_at BETWEEN _today_start AND _today_end),
    'today_quotes',    (SELECT COUNT(*) FROM repair_quotes WHERE tenant_id=_tid AND created_at BETWEEN _today_start AND _today_end),
    'today_sales_revenue', (SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE tenant_id=_tid AND status='completed' AND completed_at BETWEEN _today_start AND _today_end),
    'today_sales_count', (SELECT COUNT(*) FROM sales WHERE tenant_id=_tid AND status='completed' AND completed_at BETWEEN _today_start AND _today_end),

    -- ══ Quotes ══
    'quotes_total',    (SELECT COUNT(*) FROM repair_quotes WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to),
    'quotes_approved', (SELECT COUNT(*) FROM repair_quotes WHERE tenant_id=_tid AND status='approved' AND created_at BETWEEN _from AND _to),
    'quotes_rejected', (SELECT COUNT(*) FROM repair_quotes WHERE tenant_id=_tid AND status='rejected' AND created_at BETWEEN _from AND _to),

    -- ══ Warranties ══
    'warranties_total',(SELECT COUNT(*) FROM warranties WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to),
    'warranties_voided',(SELECT COUNT(*) FROM warranties WHERE tenant_id=_tid AND status::text='voided' AND created_at BETWEEN _from AND _to),

    -- ══ Averages ══
    'avg_turnaround_hours', (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)::numeric,1) FROM service_orders WHERE tenant_id=_tid AND status::text='delivered' AND created_at BETWEEN _from AND _to),
    'avg_diagnosis_hours', (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(diagnosis_completed_at, now()) - COALESCE(diagnosis_started_at, created_at)))/3600)::numeric,1) FROM diagnostics WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to),
    'sla_overdue_count', (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND expected_deadline < now() AND status::text NOT IN ('delivered','cancelled')),
    'avg_ticket_value', (SELECT ROUND(AVG(amount)::numeric,2) FROM financial_entries WHERE tenant_id=_tid AND entry_type='revenue' AND status<>'cancelled' AND created_at BETWEEN _from AND _to AND service_order_id IS NOT NULL),

    -- ══ Stock ══
    'stock_value',     (SELECT COALESCE(SUM(stock_quantity * cost_price),0) FROM products WHERE tenant_id=_tid AND is_active=true),
    'low_stock_count', (SELECT COUNT(*) FROM products WHERE tenant_id=_tid AND is_active=true AND stock_quantity <= min_stock_quantity),

    -- ══ Device types ══
    'device_types',    (SELECT COALESCE(jsonb_object_agg(dt,c),'{}'::jsonb) FROM (SELECT d.device_type::text dt, COUNT(*) c FROM service_orders so JOIN devices d ON d.id=so.device_id WHERE so.tenant_id=_tid AND so.created_at BETWEEN _from AND _to GROUP BY d.device_type) x),

    -- ══ Sales ══
    'sales_count',     (SELECT COUNT(*) FROM sales WHERE tenant_id=_tid AND status='completed' AND completed_at BETWEEN _from AND _to),
    'sales_revenue',   (SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE tenant_id=_tid AND status='completed' AND completed_at BETWEEN _from AND _to),
    'sales_avg_ticket',(SELECT COALESCE(ROUND(AVG(total_amount)::numeric,2),0) FROM sales WHERE tenant_id=_tid AND status='completed' AND completed_at BETWEEN _from AND _to)
  ) INTO _r;

  -- ══ Top defects ══
  _r := _r || jsonb_build_object('top_defects', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT reported_issue AS cause, COUNT(*) AS count
      FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to AND reported_issue IS NOT NULL AND reported_issue<>''
      GROUP BY reported_issue ORDER BY count DESC LIMIT 10
    ) x
  ));

  -- ══ Top parts consumed ══
  _r := _r || jsonb_build_object('top_parts', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT p.name, p.sku, SUM(ABS(sm.quantity)) AS qty, SUM(ABS(sm.quantity) * sm.unit_cost) AS cost
      FROM stock_movements sm JOIN products p ON p.id=sm.product_id
      WHERE sm.tenant_id=_tid AND sm.movement_type='consumption' AND sm.created_at BETWEEN _from AND _to
      GROUP BY p.name, p.sku ORDER BY qty DESC LIMIT 10
    ) x
  ));

  -- ══ Technician orders ══
  _r := _r || jsonb_build_object('technician_orders', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT so.assigned_technician_id AS technician_id, COALESCE(pr.full_name,'N/A') AS name, COUNT(*) AS count
      FROM service_orders so LEFT JOIN profiles pr ON pr.id=so.assigned_technician_id
      WHERE so.tenant_id=_tid AND so.created_at BETWEEN _from AND _to AND so.assigned_technician_id IS NOT NULL
      GROUP BY so.assigned_technician_id, pr.full_name ORDER BY count DESC LIMIT 10
    ) x
  ));

  -- ══ Collection point orders ══
  _r := _r || jsonb_build_object('collection_point_orders', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT so.collection_point_id AS cp_id, cp.name, COUNT(*) AS count,
        COALESCE(SUM(fe.amount),0) AS revenue,
        COALESCE(SUM(cpc.calculated_amount),0) AS commissions
      FROM service_orders so
      JOIN collection_points cp ON cp.id=so.collection_point_id
      LEFT JOIN financial_entries fe ON fe.service_order_id=so.id AND fe.entry_type='revenue' AND fe.status<>'cancelled' AND fe.tenant_id=_tid
      LEFT JOIN collection_point_commissions cpc ON cpc.service_order_id=so.id AND cpc.tenant_id=_tid
      WHERE so.tenant_id=_tid AND so.created_at BETWEEN _from AND _to AND so.collection_point_id IS NOT NULL
      GROUP BY so.collection_point_id, cp.name ORDER BY revenue DESC LIMIT 5
    ) x
  ));

  -- ══ Monthly trend ══
  _r := _r || jsonb_build_object('monthly_trend', (
    SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY x.month), '[]'::jsonb) FROM (
      SELECT to_char(d, 'YYYY-MM') AS month,
        (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND date_trunc('month',created_at)=d) AS orders,
        (SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='revenue' AND status<>'cancelled' AND date_trunc('month',created_at)=d) AS revenue,
        (SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='expense' AND status<>'cancelled' AND date_trunc('month',created_at)=d) AS expenses,
        0 AS profit
      FROM generate_series(date_trunc('month', _from), date_trunc('month', _to), '1 month') d
    ) x
  ));

  -- ══ Sales by payment method ══
  _r := _r || jsonb_build_object('sales_by_payment_method', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT sp.payment_method AS method, COUNT(*) AS count, SUM(sp.amount) AS amount
      FROM sale_payments sp JOIN sales s ON s.id=sp.sale_id
      WHERE sp.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _from AND _to
      GROUP BY sp.payment_method ORDER BY amount DESC
    ) x
  ));

  -- ══ Top products sold ══
  _r := _r || jsonb_build_object('top_products_sold', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT si.product_name_snapshot AS name, SUM(si.quantity) AS qty, SUM(si.total_amount) AS revenue
      FROM sale_items si JOIN sales s ON s.id=si.sale_id
      WHERE si.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _from AND _to
      GROUP BY si.product_name_snapshot ORDER BY revenue DESC LIMIT 5
    ) x
  ));

  -- ══ Team ranking ══
  _r := _r || jsonb_build_object('team_ranking', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      WITH sale_stats AS (
        SELECT seller_user_id AS uid, COUNT(*) AS sales_count, SUM(total_amount) AS sales_revenue
        FROM sales WHERE tenant_id=_tid AND status='completed' AND completed_at BETWEEN _from AND _to AND seller_user_id IS NOT NULL
        GROUP BY seller_user_id
      ),
      so_stats AS (
        SELECT assigned_technician_id AS uid, COUNT(*) AS so_count,
          COALESCE(SUM(fe.amount),0) AS so_revenue
        FROM service_orders so
        LEFT JOIN financial_entries fe ON fe.service_order_id=so.id AND fe.entry_type='revenue' AND fe.status<>'cancelled' AND fe.tenant_id=_tid
        WHERE so.tenant_id=_tid AND so.created_at BETWEEN _from AND _to AND so.assigned_technician_id IS NOT NULL
        GROUP BY assigned_technician_id
      )
      SELECT COALESCE(ss.uid, sos.uid) AS user_id, COALESCE(p.full_name,'N/A') AS name,
        COALESCE(ss.sales_count,0) AS sales_count, COALESCE(ss.sales_revenue,0) AS sales_revenue,
        COALESCE(sos.so_count,0) AS so_count,
        COALESCE(ss.sales_revenue,0) + COALESCE(sos.so_revenue,0) AS total_revenue
      FROM sale_stats ss FULL OUTER JOIN so_stats sos ON ss.uid=sos.uid
      LEFT JOIN profiles p ON p.id=COALESCE(ss.uid,sos.uid)
      ORDER BY total_revenue DESC LIMIT 10
    ) x
  ));

  -- Compute profit in monthly_trend
  _r := jsonb_set(_r, '{monthly_trend}', (
    SELECT COALESCE(jsonb_agg(
      t || jsonb_build_object('profit', (t->>'revenue')::numeric - (t->>'expenses')::numeric)
      ORDER BY t->>'month'
    ), '[]'::jsonb)
    FROM jsonb_array_elements(_r->'monthly_trend') t
  ));

  RETURN _r;
END;
$$;
