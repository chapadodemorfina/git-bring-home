
-- FASE 2A.5d-2: Blindar leitura global de comissões
-- commission_summary(_from, _to) e cp_ranking(_from, _to, _cp_id)

CREATE OR REPLACE FUNCTION public.commission_summary(_from date DEFAULT NULL::date, _to date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tid uuid;
  _result jsonb;
BEGIN
  _tid := get_active_tenant_id();

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
    'total_pending', COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0),
    'total_approved', COALESCE(SUM(CASE WHEN status = 'approved' THEN commission_amount ELSE 0 END), 0),
    'total_paid', COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0),
    'total_cancelled', COALESCE(SUM(CASE WHEN status = 'cancelled' THEN commission_amount ELSE 0 END), 0),
    'total_month', COALESCE(SUM(CASE WHEN status IN ('pending','approved','paid') AND reference_date >= date_trunc('month', CURRENT_DATE) THEN commission_amount ELSE 0 END), 0),
    'count_pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'count_approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'count_paid', COUNT(*) FILTER (WHERE status = 'paid')
  ) INTO _result
  FROM commission_entries
  WHERE tenant_id = _tid
    AND (_from IS NULL OR reference_date >= _from)
    AND (_to IS NULL OR reference_date <= _to);

  RETURN _result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.commission_summary(date, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.commission_summary(date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.commission_summary(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commission_summary(date, date) TO service_role;


-- cp_ranking: convert to plpgsql to add gate; preserve TABLE signature/columns/order
CREATE OR REPLACE FUNCTION public.cp_ranking(_from date DEFAULT NULL::date, _to date DEFAULT NULL::date, _cp_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(rank_position bigint, cp_id uuid, cp_name text, total_orders bigint, completed_orders bigint, total_revenue numeric, avg_ticket numeric, commission numeric)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tid uuid;
BEGIN
  _tid := get_active_tenant_id();

  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base_orders AS (
    SELECT DISTINCT ON (so.id)
      so.id AS so_id,
      so.collection_point_id,
      so.status
    FROM service_orders so
    WHERE so.tenant_id = _tid
      AND so.collection_point_id IS NOT NULL
      AND (_from IS NULL OR so.created_at::date >= _from)
      AND (_to IS NULL OR so.created_at::date <= _to)
      AND (_cp_id IS NULL OR so.collection_point_id = _cp_id)
  ),
  order_revenue AS (
    SELECT
      bo.so_id,
      bo.collection_point_id,
      bo.status,
      COALESCE(SUM(fe.amount), 0) AS revenue
    FROM base_orders bo
    LEFT JOIN financial_entries fe
      ON fe.service_order_id = bo.so_id
      AND fe.entry_type = 'revenue'
      AND fe.status != 'cancelled'
      AND fe.tenant_id = _tid
    GROUP BY bo.so_id, bo.collection_point_id, bo.status
  ),
  agg AS (
    SELECT
      cp.id AS cp_id,
      cp.name AS cp_name,
      COUNT(*) AS total_orders,
      COUNT(*) FILTER (WHERE orv.status::text IN ('completed','delivered','delivered_to_customer')) AS completed_orders,
      COALESCE(SUM(orv.revenue) FILTER (WHERE orv.status::text IN ('completed','delivered','delivered_to_customer')), 0) AS total_revenue,
      CASE
        WHEN COUNT(*) FILTER (WHERE orv.status::text IN ('completed','delivered','delivered_to_customer')) > 0
        THEN ROUND(
          COALESCE(SUM(orv.revenue) FILTER (WHERE orv.status::text IN ('completed','delivered','delivered_to_customer')), 0)
          / COUNT(*) FILTER (WHERE orv.status::text IN ('completed','delivered','delivered_to_customer')), 2)
        ELSE 0
      END AS avg_ticket,
      CASE cp.commission_type::text
        WHEN 'percentage' THEN
          ROUND(COALESCE(SUM(orv.revenue) FILTER (WHERE orv.status::text IN ('completed','delivered','delivered_to_customer')), 0)
                * cp.commission_value / 100, 2)
        WHEN 'fixed_per_order' THEN
          cp.commission_value * COUNT(*) FILTER (WHERE orv.status::text IN ('completed','delivered','delivered_to_customer'))
        WHEN 'fixed_per_device' THEN
          cp.commission_value * COUNT(*) FILTER (WHERE orv.status::text IN ('completed','delivered','delivered_to_customer'))
        ELSE 0
      END AS commission
    FROM order_revenue orv
    JOIN collection_points cp
      ON cp.id = orv.collection_point_id
     AND cp.tenant_id = _tid
    GROUP BY cp.id, cp.name, cp.commission_type, cp.commission_value
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY agg.total_revenue DESC) AS rank_position,
    agg.cp_id,
    agg.cp_name,
    agg.total_orders,
    agg.completed_orders,
    agg.total_revenue,
    agg.avg_ticket,
    agg.commission
  FROM agg
  ORDER BY agg.total_revenue DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cp_ranking(date, date, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cp_ranking(date, date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cp_ranking(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cp_ranking(date, date, uuid) TO service_role;
