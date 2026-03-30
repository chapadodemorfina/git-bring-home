CREATE OR REPLACE FUNCTION public.dashboard_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
    'total_orders',    (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to),
    'open_orders',     (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to AND status::text NOT IN ('delivered','cancelled')),
    'orders_by_status',(SELECT COALESCE(jsonb_object_agg(s,c),'{}'::jsonb) FROM (SELECT status::text s, COUNT(*) c FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to GROUP BY status) x),
    'pipeline',        (SELECT COALESCE(jsonb_object_agg(s,c),'{}'::jsonb) FROM (SELECT status::text s, COUNT(*) c FROM service_orders WHERE tenant_id=_tid AND status::text NOT IN ('delivered','cancelled') GROUP BY status) x),
    'services_completed', (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to AND status::text IN ('completed','delivered')),
    'os_conversion_rate', (SELECT CASE WHEN COUNT(*)>0 THEN ROUND(COUNT(*) FILTER (WHERE status::text IN ('completed','delivered'))::numeric / COUNT(*) * 100, 1) ELSE 0 END FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to),
    -- Revenue: use updated_at as payment date reference
    'total_revenue',   (SELECT COALESCE(SUM(fe.paid_amount),0) FROM financial_entries fe WHERE fe.tenant_id=_tid AND fe.entry_type='revenue' AND fe.status::text IN ('paid','partial') AND fe.updated_at BETWEEN _from AND _to),
    -- Expenses: use updated_at as payment date reference
    'total_expenses',  (SELECT COALESCE(SUM(fe.paid_amount),0) FROM financial_entries fe WHERE fe.tenant_id=_tid AND fe.entry_type='expense' AND fe.status::text IN ('paid','partial') AND fe.updated_at BETWEEN _from AND _to),
    -- Commissions: use updated_at as payment date reference
    'total_commissions',(SELECT COALESCE(SUM(fe.paid_amount),0) FROM financial_entries fe WHERE fe.tenant_id=_tid AND fe.entry_type='commission' AND fe.status::text IN ('paid','partial') AND fe.updated_at BETWEEN _from AND _to),
    'receivables_total',(SELECT COALESCE(SUM(ar.remaining_amount),0) FROM accounts_receivable ar WHERE ar.tenant_id=_tid AND ar.status NOT IN ('paid','cancelled')),
    'receivables_overdue',(SELECT COALESCE(SUM(ar.remaining_amount),0) FROM accounts_receivable ar WHERE ar.tenant_id=_tid AND ar.status='overdue'),
    'payables_total',  (SELECT COALESCE(SUM(fe.amount - fe.paid_amount),0) FROM financial_entries fe WHERE fe.tenant_id=_tid AND fe.entry_type='expense' AND fe.status::text NOT IN ('paid','cancelled')),
    'cash_balance',    (SELECT COALESCE(
      (SELECT cr.expected_amount FROM cash_registers cr WHERE cr.tenant_id=_tid AND cr.status='open' ORDER BY cr.opened_at DESC LIMIT 1),
      (SELECT cr.expected_amount FROM cash_registers cr WHERE cr.tenant_id=_tid AND cr.status='closed' ORDER BY cr.closed_at DESC LIMIT 1),
      0)),
    'today_received',  (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _today_start AND _today_end),
    'today_delivered',  (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND status::text='delivered' AND updated_at BETWEEN _today_start AND _today_end),
    -- Today revenue: use updated_at so payments made today count
    'today_revenue',   (SELECT COALESCE(SUM(fe.paid_amount),0) FROM financial_entries fe WHERE fe.tenant_id=_tid AND fe.entry_type='revenue' AND fe.status::text IN ('paid','partial') AND fe.updated_at BETWEEN _today_start AND _today_end),
    'today_quotes',    (SELECT COUNT(*) FROM repair_quotes WHERE tenant_id=_tid AND created_at BETWEEN _today_start AND _today_end),
    'today_sales_revenue', (SELECT COALESCE(SUM(s.total_amount),0) FROM sales s WHERE s.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _today_start AND _today_end),
    'today_sales_count', (SELECT COUNT(*) FROM sales s WHERE s.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _today_start AND _today_end),
    'quotes_total',    (SELECT COUNT(*) FROM repair_quotes WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to),
    'quotes_approved', (SELECT COUNT(*) FROM repair_quotes WHERE tenant_id=_tid AND status='approved' AND created_at BETWEEN _from AND _to),
    'quotes_rejected', (SELECT COUNT(*) FROM repair_quotes WHERE tenant_id=_tid AND status='rejected' AND created_at BETWEEN _from AND _to),
    'warranties_total',(SELECT COUNT(*) FROM warranties w WHERE w.tenant_id=_tid AND w.created_at BETWEEN _from AND _to),
    'warranties_voided',(SELECT COUNT(*) FROM warranties w WHERE w.tenant_id=_tid AND w.is_void=true AND w.created_at BETWEEN _from AND _to),
    'avg_turnaround_hours', (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)::numeric,1) FROM service_orders WHERE tenant_id=_tid AND status::text='delivered' AND created_at BETWEEN _from AND _to),
    'avg_diagnosis_hours', (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(diagnosis_completed_at, now()) - COALESCE(diagnosis_started_at, created_at)))/3600)::numeric,1) FROM diagnostics WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to),
    'sla_overdue_count', (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND expected_deadline < now() AND status::text NOT IN ('delivered','cancelled')),
    -- Avg ticket: use updated_at
    'avg_ticket_value', (SELECT ROUND(AVG(fe.paid_amount)::numeric,2) FROM financial_entries fe WHERE fe.tenant_id=_tid AND fe.entry_type='revenue' AND fe.status::text IN ('paid','partial') AND fe.updated_at BETWEEN _from AND _to AND fe.service_order_id IS NOT NULL AND fe.paid_amount > 0),
    'stock_value',     (SELECT COALESCE(SUM(p.quantity * p.cost_price),0) FROM products p WHERE p.tenant_id=_tid AND p.is_active=true),
    'low_stock_count', (SELECT COUNT(*) FROM products p WHERE p.tenant_id=_tid AND p.is_active=true AND p.quantity <= p.minimum_quantity),
    'device_types',    (SELECT COALESCE(jsonb_object_agg(dt,c),'{}'::jsonb) FROM (SELECT d.device_type::text dt, COUNT(*) c FROM service_orders so JOIN devices d ON d.id=so.device_id WHERE so.tenant_id=_tid AND so.created_at BETWEEN _from AND _to GROUP BY d.device_type) x),
    'sales_count',     (SELECT COUNT(*) FROM sales s WHERE s.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _from AND _to),
    'sales_revenue',   (SELECT COALESCE(SUM(s.total_amount),0) FROM sales s WHERE s.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _from AND _to),
    'sales_avg_ticket',(SELECT COALESCE(ROUND(AVG(s.total_amount)::numeric,2),0) FROM sales s WHERE s.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _from AND _to)
  ) INTO _r;

  _r := _r || jsonb_build_object('top_defects', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT so.reported_issue AS cause, COUNT(*) AS count
      FROM service_orders so WHERE so.tenant_id=_tid AND so.created_at BETWEEN _from AND _to AND so.reported_issue IS NOT NULL AND so.reported_issue<>''
      GROUP BY so.reported_issue ORDER BY count DESC LIMIT 10
    ) x
  ));

  _r := _r || jsonb_build_object('top_parts', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT p.name, p.sku, SUM(ABS(sm.quantity)) AS qty, SUM(ABS(sm.quantity) * sm.unit_cost) AS cost
      FROM stock_movements sm JOIN products p ON p.id=sm.product_id
      WHERE sm.tenant_id=_tid AND sm.movement_type='consumed' AND sm.created_at BETWEEN _from AND _to
      GROUP BY p.name, p.sku ORDER BY qty DESC LIMIT 10
    ) x
  ));

  _r := _r || jsonb_build_object('technician_orders', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT so.assigned_technician_id AS technician_id, COALESCE(pr.full_name,'N/A') AS name, COUNT(*) AS count
      FROM service_orders so LEFT JOIN profiles pr ON pr.id=so.assigned_technician_id
      WHERE so.tenant_id=_tid AND so.created_at BETWEEN _from AND _to AND so.assigned_technician_id IS NOT NULL
      GROUP BY so.assigned_technician_id, pr.full_name ORDER BY count DESC LIMIT 10
    ) x
  ));

  -- Collection point revenue: use updated_at for paid entries
  _r := _r || jsonb_build_object('collection_point_orders', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT so.collection_point_id AS cp_id, cp.name, COUNT(DISTINCT so.id) AS count,
        COALESCE((SELECT SUM(fe2.paid_amount) FROM financial_entries fe2 WHERE fe2.service_order_id = ANY(ARRAY_AGG(so.id)) AND fe2.entry_type='revenue' AND fe2.status::text IN ('paid','partial') AND fe2.tenant_id=_tid),0) AS revenue,
        COALESCE((SELECT SUM(cpc2.calculated_amount) FROM collection_point_commissions cpc2 WHERE cpc2.service_order_id = ANY(ARRAY_AGG(so.id)) AND cpc2.tenant_id=_tid),0) AS commissions
      FROM service_orders so
      JOIN collection_points cp ON cp.id=so.collection_point_id
      WHERE so.tenant_id=_tid AND so.created_at BETWEEN _from AND _to AND so.collection_point_id IS NOT NULL
      GROUP BY so.collection_point_id, cp.name ORDER BY count DESC LIMIT 5
    ) x
  ));

  -- Monthly trend: use updated_at for financial entries
  _r := _r || jsonb_build_object('monthly_trend', (
    SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY x.month), '[]'::jsonb) FROM (
      SELECT to_char(d, 'YYYY-MM') AS month,
        (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND date_trunc('month',created_at)=d) AS orders,
        (SELECT COALESCE(SUM(fe2.paid_amount),0) FROM financial_entries fe2 WHERE fe2.tenant_id=_tid AND fe2.entry_type='revenue' AND fe2.status::text IN ('paid','partial') AND date_trunc('month',fe2.updated_at)=d) AS revenue,
        (SELECT COALESCE(SUM(fe3.paid_amount),0) FROM financial_entries fe3 WHERE fe3.tenant_id=_tid AND fe3.entry_type='expense' AND fe3.status::text IN ('paid','partial') AND date_trunc('month',fe3.updated_at)=d) AS expenses,
        0 AS profit
      FROM generate_series(date_trunc('month', _from), date_trunc('month', _to), '1 month') d
    ) x
  ));

  _r := _r || jsonb_build_object('sales_by_payment_method', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT sp.payment_method AS method, COUNT(*) AS count, SUM(sp.amount) AS amount
      FROM sale_payments sp JOIN sales s ON s.id=sp.sale_id
      WHERE sp.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _from AND _to
      GROUP BY sp.payment_method ORDER BY amount DESC
    ) x
  ));

  _r := _r || jsonb_build_object('top_products_sold', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT si.product_name_snapshot AS name, SUM(si.quantity) AS qty, SUM(si.total_amount) AS revenue
      FROM sale_items si JOIN sales s ON s.id=si.sale_id
      WHERE si.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _from AND _to
      GROUP BY si.product_name_snapshot ORDER BY revenue DESC LIMIT 5
    ) x
  ));

  -- Team ranking: use updated_at for so_revenue
  _r := _r || jsonb_build_object('team_ranking', (
    SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      WITH sale_stats AS (
        SELECT s.seller_user_id AS uid, COUNT(*) AS sales_count, SUM(s.total_amount) AS sales_revenue
        FROM sales s WHERE s.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _from AND _to AND s.seller_user_id IS NOT NULL
        GROUP BY s.seller_user_id
      ),
      so_stats AS (
        SELECT so.assigned_technician_id AS uid, COUNT(*) AS so_count,
          COALESCE(SUM(fe.paid_amount),0) AS so_revenue
        FROM service_orders so
        LEFT JOIN financial_entries fe ON fe.service_order_id=so.id AND fe.entry_type='revenue' AND fe.status::text IN ('paid','partial') AND fe.tenant_id=_tid
        WHERE so.tenant_id=_tid AND so.created_at BETWEEN _from AND _to AND so.assigned_technician_id IS NOT NULL
        GROUP BY so.assigned_technician_id
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