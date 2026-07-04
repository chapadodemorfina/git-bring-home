
-- Fase 2A.5a-1: blindar agregadores financeiros de leitura

-- 1) finance_summary(_from, _to)
CREATE OR REPLACE FUNCTION public.finance_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
  _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'total_revenue', (SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='revenue' AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'total_expenses', (SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='expense' AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'total_paid', (SELECT COALESCE(SUM(paid_amount),0) FROM financial_entries WHERE tenant_id=_tid AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'total_pending', (SELECT COALESCE(SUM(amount-paid_amount),0) FROM financial_entries WHERE tenant_id=_tid AND status IN ('pending','partial','overdue') AND created_at BETWEEN _from AND _to),
    'total_overdue', (SELECT COALESCE(SUM(amount-paid_amount),0) FROM financial_entries WHERE tenant_id=_tid AND status='overdue' AND created_at BETWEEN _from AND _to),
    'count_entries', (SELECT COUNT(*) FROM financial_entries WHERE tenant_id=_tid AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'count_overdue', (SELECT COUNT(*) FROM financial_entries WHERE tenant_id=_tid AND status='overdue'),
    'by_category', (SELECT COALESCE(jsonb_object_agg(COALESCE(category,'Sem categoria'),total),'{}'::jsonb) FROM (SELECT category,SUM(amount) as total FROM financial_entries WHERE tenant_id=_tid AND entry_type='revenue' AND status<>'cancelled' AND created_at BETWEEN _from AND _to GROUP BY category) c),
    'by_payment_method', (SELECT COALESCE(jsonb_object_agg(COALESCE(p.payment_method,'N/A'),p.total),'{}'::jsonb) FROM (SELECT payment_method,SUM(amount) as total FROM payments WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to GROUP BY payment_method) p)
  ) INTO _result;
  RETURN _result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finance_summary(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finance_summary(timestamptz, timestamptz) TO authenticated, service_role;

-- 2) receivables_summary()
CREATE OR REPLACE FUNCTION public.receivables_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total_receivable', COALESCE(SUM(remaining_amount) FILTER (WHERE status IN ('pending','partial','overdue')), 0),
      'total_overdue', COALESCE(SUM(remaining_amount) FILTER (WHERE status = 'overdue'), 0),
      'overdue_count', COUNT(*) FILTER (WHERE status = 'overdue'),
      'received_month', COALESCE(SUM(amount_received) FILTER (
        WHERE status IN ('paid','partial') AND updated_at >= date_trunc('month', CURRENT_DATE)
      ), 0),
      'open_count', COUNT(*) FILTER (WHERE status IN ('pending','partial','overdue')),
      'total_count', COUNT(*)
    )
    FROM accounts_receivable
    WHERE tenant_id = _tid
      AND status <> 'cancelled'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.receivables_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receivables_summary() TO authenticated, service_role;

-- 3) search_receivables(_search, _status, _overdue_only, _page, _page_size)
CREATE OR REPLACE FUNCTION public.search_receivables(
  _search text DEFAULT NULL,
  _status text DEFAULT NULL,
  _overdue_only boolean DEFAULT false,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 25
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _offset int := (_page - 1) * _page_size;
  _total bigint;
  _items json;
  _like text;
  _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  _like := '%' || COALESCE(_search, '') || '%';

  SELECT count(*) INTO _total
  FROM accounts_receivable ar
  LEFT JOIN customers c ON c.id = ar.customer_id
  WHERE ar.tenant_id = _tid
    AND (_search IS NULL OR _search = '' OR
      ar.description ILIKE _like OR
      ar.reference_type ILIKE _like OR
      c.full_name ILIKE _like OR
      c.phone ILIKE _like OR
      c.document ILIKE _like
    )
    AND (_status IS NULL OR ar.status = _status)
    AND (_overdue_only = false OR ar.status = 'overdue');

  SELECT json_agg(row_to_json(t)) INTO _items
  FROM (
    SELECT
      ar.*,
      c.full_name AS customer_name
    FROM accounts_receivable ar
    LEFT JOIN customers c ON c.id = ar.customer_id
    WHERE ar.tenant_id = _tid
      AND (_search IS NULL OR _search = '' OR
        ar.description ILIKE _like OR
        ar.reference_type ILIKE _like OR
        c.full_name ILIKE _like OR
        c.phone ILIKE _like OR
        c.document ILIKE _like
      )
      AND (_status IS NULL OR ar.status = _status)
      AND (_overdue_only = false OR ar.status = 'overdue')
    ORDER BY ar.due_date ASC
    LIMIT _page_size OFFSET _offset
  ) t;

  RETURN json_build_object(
    'items', COALESCE(_items, '[]'::json),
    'total', _total,
    'page', _page,
    'pageSize', _page_size,
    'totalPages', GREATEST(1, CEIL(_total::numeric / _page_size))
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_receivables(text, text, boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_receivables(text, text, boolean, integer, integer) TO authenticated, service_role;

-- 4) get_financial_balances()
CREATE OR REPLACE FUNCTION public.get_financial_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tid uuid := public.get_active_tenant_id();
  _today_start timestamptz := date_trunc('day', now());
  _result jsonb;
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'cash_balance', (
      SELECT COALESCE((
        SELECT cr.initial_amount
          + COALESCE(SUM(CASE WHEN m.affects_cash AND m.amount > 0 THEN m.amount ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN m.affects_cash AND m.amount < 0 THEN ABS(m.amount) ELSE 0 END), 0)
        FROM cash_registers cr
        LEFT JOIN cash_register_movements m ON m.cash_register_id = cr.id
        WHERE cr.tenant_id = _tid AND cr.status = 'open'
        GROUP BY cr.id, cr.initial_amount
        LIMIT 1
      ), 0)
    ),
    'bank_balance', (
      SELECT COALESCE((
        SELECT COALESCE(cr.opening_bank_balance, 0)
          + COALESCE(SUM(CASE WHEN m.affects_bank AND m.amount > 0 THEN m.amount ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN m.affects_bank AND m.amount < 0 THEN ABS(m.amount) ELSE 0 END), 0)
        FROM cash_registers cr
        LEFT JOIN cash_register_movements m ON m.cash_register_id = cr.id
        WHERE cr.tenant_id = _tid AND cr.status = 'open'
        GROUP BY cr.id, cr.opening_bank_balance
        LIMIT 1
      ), 0)
    ),
    'is_register_open', EXISTS(SELECT 1 FROM cash_registers WHERE tenant_id = _tid AND status = 'open'),
    'today_income', (
      SELECT COALESCE(SUM(amount), 0) FROM financial_entries
      WHERE tenant_id = _tid AND entry_type = 'revenue' AND status <> 'cancelled' AND created_at >= _today_start
    ),
    'today_expenses', (
      SELECT COALESCE(SUM(amount), 0) FROM financial_entries
      WHERE tenant_id = _tid AND entry_type IN ('expense', 'commission') AND status <> 'cancelled' AND created_at >= _today_start
    ),
    'receivables_total', (
      SELECT COALESCE(SUM(amount - paid_amount), 0) FROM financial_entries
      WHERE tenant_id = _tid AND entry_type = 'revenue' AND status IN ('pending', 'partial', 'overdue')
    ),
    'payables_total', (
      SELECT COALESCE(SUM(amount - paid_amount), 0) FROM financial_entries
      WHERE tenant_id = _tid AND entry_type IN ('expense', 'commission') AND status IN ('pending', 'partial', 'overdue')
    ),
    'overdue_count', (
      SELECT COUNT(*) FROM financial_entries WHERE tenant_id = _tid AND status = 'overdue'
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_financial_balances() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_financial_balances() TO authenticated, service_role;

-- 5) sales_dashboard_summary(_from, _to)
CREATE OR REPLACE FUNCTION public.sales_dashboard_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total_sales', (SELECT COUNT(*) FROM sales WHERE tenant_id=_tid AND status='completed' AND completed_at BETWEEN _from AND _to),
      'total_revenue', (SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE tenant_id=_tid AND status='completed' AND completed_at BETWEEN _from AND _to),
      'average_ticket', (SELECT COALESCE(AVG(total_amount),0) FROM sales WHERE tenant_id=_tid AND status='completed' AND completed_at BETWEEN _from AND _to),
      'total_returns', (SELECT COALESCE(SUM(sr.amount_refunded),0) FROM sale_returns sr JOIN sales s ON s.id=sr.sale_id WHERE s.tenant_id=_tid AND sr.returned_at BETWEEN _from AND _to),
      'sales_by_payment_method', (
        SELECT COALESCE(jsonb_object_agg(pm::text, cnt), '{}'::jsonb)
        FROM (
          SELECT sp.payment_method as pm, COUNT(*) as cnt
          FROM sale_payments sp
          JOIN sales s ON s.id = sp.sale_id
          WHERE s.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _from AND _to
          GROUP BY sp.payment_method
        ) sub
      ),
      'top_products', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', product_name_snapshot, 'qty', total_qty, 'revenue', total_rev) ORDER BY total_qty DESC), '[]'::jsonb)
        FROM (
          SELECT si.product_name_snapshot, SUM(si.quantity) as total_qty, SUM(si.total_amount) as total_rev
          FROM sale_items si
          JOIN sales s ON s.id = si.sale_id
          WHERE s.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _from AND _to
          GROUP BY si.product_name_snapshot
          ORDER BY total_qty DESC LIMIT 10
        ) sub
      ),
      'sales_by_seller', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', COALESCE(p.full_name,'Desconhecido'), 'count', cnt, 'revenue', rev) ORDER BY cnt DESC), '[]'::jsonb)
        FROM (
          SELECT s.seller_user_id, COUNT(*) as cnt, SUM(s.total_amount) as rev
          FROM sales s
          WHERE s.tenant_id=_tid AND s.status='completed' AND s.completed_at BETWEEN _from AND _to
          GROUP BY s.seller_user_id
        ) sub
        LEFT JOIN profiles p ON p.id = sub.seller_user_id
      )
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sales_dashboard_summary(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sales_dashboard_summary(timestamptz, timestamptz) TO authenticated, service_role;
