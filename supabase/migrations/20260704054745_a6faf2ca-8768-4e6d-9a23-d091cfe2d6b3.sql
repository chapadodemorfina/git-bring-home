
-- ============================================================
-- audit_os_financial_inconsistencies()
-- Converte de LANGUAGE sql para plpgsql, preservando payload,
-- adiciona gatekeeper server-side (admin/manager).
-- ============================================================
DROP FUNCTION IF EXISTS public.audit_os_financial_inconsistencies();

CREATE OR REPLACE FUNCTION public.audit_os_financial_inconsistencies()
 RETURNS TABLE(
   service_order_id uuid,
   order_number text,
   customer_name text,
   os_status text,
   os_total numeric,
   primary_revenue_id uuid,
   primary_revenue_amount numeric,
   primary_revenue_paid numeric,
   primary_revenue_status text,
   divergence numeric,
   has_auxiliary_revenues boolean,
   auxiliary_count bigint,
   auxiliary_paid_any boolean,
   cancelled_os_active_revenue boolean,
   issue_type text
 )
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tid uuid := get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH primary_rev AS (
    SELECT
      fe.service_order_id,
      fe.id AS fe_id,
      fe.amount,
      fe.paid_amount,
      fe.status::text AS fe_status
    FROM financial_entries fe
    WHERE fe.entry_type = 'revenue'
      AND fe.is_primary_os_revenue = true
      AND fe.status <> 'cancelled'
      AND fe.tenant_id = _tid
  ),
  aux_rev AS (
    SELECT
      fe.service_order_id,
      COUNT(*) AS cnt,
      bool_or(fe.status::text = 'paid') AS any_paid
    FROM financial_entries fe
    WHERE fe.entry_type = 'revenue'
      AND fe.is_primary_os_revenue = false
      AND fe.status <> 'cancelled'
      AND fe.service_order_id IS NOT NULL
      AND fe.tenant_id = _tid
    GROUP BY fe.service_order_id
  ),
  combined AS (
    SELECT
      so.id AS service_order_id,
      so.order_number,
      c.full_name AS customer_name,
      so.status::text AS os_status,
      COALESCE(so.total_amount, 0) AS os_total,
      pr.fe_id AS primary_revenue_id,
      COALESCE(pr.amount, 0) AS primary_revenue_amount,
      COALESCE(pr.paid_amount, 0) AS primary_revenue_paid,
      pr.fe_status AS primary_revenue_status,
      COALESCE(so.total_amount, 0) - COALESCE(pr.amount, 0) AS divergence,
      COALESCE(ar.cnt, 0) > 0 AS has_auxiliary_revenues,
      COALESCE(ar.cnt, 0) AS auxiliary_count,
      COALESCE(ar.any_paid, false) AS auxiliary_paid_any,
      (so.status::text = 'cancelled' AND pr.fe_id IS NOT NULL) AS cancelled_os_active_revenue,
      CASE
        WHEN so.status::text = 'cancelled' AND pr.fe_id IS NOT NULL THEN 'cancelled_with_active_revenue'
        WHEN pr.fe_id IS NULL AND so.total_amount > 0 AND so.status::text <> 'cancelled' THEN 'missing_primary_revenue'
        WHEN pr.fe_id IS NOT NULL AND ABS(COALESCE(so.total_amount, 0) - COALESCE(pr.amount, 0)) > 0.01 AND pr.fe_status = 'paid' THEN 'critical_divergence'
        WHEN pr.fe_id IS NOT NULL AND ABS(COALESCE(so.total_amount, 0) - COALESCE(pr.amount, 0)) > 0.01 THEN 'divergence'
        WHEN COALESCE(ar.cnt, 0) > 0 THEN 'has_auxiliaries'
        ELSE NULL
      END AS issue_type
    FROM service_orders so
    LEFT JOIN customers c ON c.id = so.customer_id
    LEFT JOIN primary_rev pr ON pr.service_order_id = so.id
    LEFT JOIN aux_rev ar ON ar.service_order_id = so.id
    WHERE so.tenant_id = _tid
  )
  SELECT * FROM combined WHERE combined.issue_type IS NOT NULL
  ORDER BY
    CASE combined.issue_type
      WHEN 'critical_divergence' THEN 1
      WHEN 'cancelled_with_active_revenue' THEN 2
      WHEN 'missing_primary_revenue' THEN 3
      WHEN 'divergence' THEN 4
      WHEN 'has_auxiliaries' THEN 5
    END,
    combined.order_number DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.audit_os_financial_inconsistencies() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_os_financial_inconsistencies() FROM anon;
GRANT  EXECUTE ON FUNCTION public.audit_os_financial_inconsistencies() TO authenticated;

-- ============================================================
-- upsert_os_revenue(_service_order_id uuid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_os_revenue(_service_order_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tid uuid := get_active_tenant_id();
  _so  record;
  _fe_id uuid;
  _fe_status text;
  _uid uuid := auth.uid();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;

  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT has_any_role(_uid, ARRAY['admin','manager']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT id, order_number, customer_id, total_amount, status
    INTO _so
    FROM service_orders
   WHERE id = _service_order_id
     AND tenant_id = _tid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de serviço não encontrada';
  END IF;

  IF _so.total_amount <= 0 THEN
    UPDATE financial_entries
       SET status = 'cancelled', updated_at = now()
     WHERE service_order_id = _service_order_id
       AND entry_type = 'revenue'
       AND is_primary_os_revenue = true
       AND status <> 'cancelled'
       AND tenant_id = _tid;
    RETURN NULL;
  END IF;

  SELECT id, status::text INTO _fe_id, _fe_status
    FROM financial_entries
   WHERE service_order_id = _service_order_id
     AND entry_type = 'revenue'
     AND is_primary_os_revenue = true
     AND status <> 'cancelled'
     AND tenant_id = _tid
   LIMIT 1;

  IF _fe_id IS NOT NULL THEN
    IF _fe_status <> 'paid' THEN
      UPDATE financial_entries
         SET amount = _so.total_amount,
             description = 'Receita OS #' || _so.order_number,
             customer_id = _so.customer_id,
             updated_at = now()
       WHERE id = _fe_id
         AND tenant_id = _tid;
    END IF;
    RETURN _fe_id;
  ELSE
    INSERT INTO financial_entries (
      entry_type, status, description, amount, paid_amount,
      service_order_id, customer_id, category, created_by,
      is_primary_os_revenue, tenant_id
    ) VALUES (
      'revenue', 'pending',
      'Receita OS #' || _so.order_number,
      _so.total_amount, 0,
      _service_order_id, _so.customer_id,
      'Serviço de Reparo', _uid,
      true, _tid
    )
    RETURNING id INTO _fe_id;
    RETURN _fe_id;
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.upsert_os_revenue(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_os_revenue(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.upsert_os_revenue(uuid) TO authenticated;

-- ============================================================
-- cancel_os_revenue(_service_order_id uuid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_os_revenue(_service_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tid uuid := get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE financial_entries
     SET status = 'cancelled', updated_at = now()
   WHERE service_order_id = _service_order_id
     AND entry_type = 'revenue'
     AND is_primary_os_revenue = true
     AND status <> 'cancelled'
     AND tenant_id = _tid;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cancel_os_revenue(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_os_revenue(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.cancel_os_revenue(uuid) TO authenticated;
