
-- ============================================================
-- finance_summary() — recriar tenant-safe + role check
-- ============================================================
CREATE OR REPLACE FUNCTION public.finance_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tid uuid := public.get_active_tenant_id();
  _result jsonb;
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'total_revenue',       COALESCE(SUM(CASE WHEN entry_type = 'revenue' THEN amount END), 0),
    'total_expenses',      COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount END), 0),
    'total_commissions',   COALESCE(SUM(CASE WHEN entry_type = 'commission' THEN amount END), 0),
    'pending_receivables', COALESCE(SUM(CASE WHEN entry_type = 'revenue'
                                              AND status IN ('pending','partial','overdue')
                                          THEN amount - paid_amount END), 0),
    'pending_payables',    COALESCE(SUM(CASE WHEN entry_type IN ('expense','commission')
                                              AND status IN ('pending','partial','overdue')
                                          THEN amount - paid_amount END), 0),
    'overdue_count',       COUNT(*) FILTER (WHERE status = 'overdue'),
    'profit',              COALESCE(SUM(CASE WHEN entry_type = 'revenue'   THEN amount ELSE 0 END), 0)
                         - COALESCE(SUM(CASE WHEN entry_type = 'expense'   THEN amount ELSE 0 END), 0)
                         - COALESCE(SUM(CASE WHEN entry_type = 'commission' THEN amount ELSE 0 END), 0)
  )
  INTO _result
  FROM financial_entries
  WHERE tenant_id = _tid
    AND status <> 'cancelled';

  RETURN _result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.finance_summary() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finance_summary() FROM anon;
GRANT  EXECUTE ON FUNCTION public.finance_summary() TO authenticated;

-- ============================================================
-- get_cached_dashboard_kpis() — MV sem tenant_id → bloquear client app
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.get_cached_dashboard_kpis() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_cached_dashboard_kpis() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_cached_dashboard_kpis() FROM authenticated;
