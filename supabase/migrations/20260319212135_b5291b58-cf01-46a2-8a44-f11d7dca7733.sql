
-- cp_ranking: uses financial_entries for revenue since service_orders has no total_amount column
CREATE OR REPLACE FUNCTION public.cp_ranking(
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _cp_id uuid DEFAULT NULL
)
RETURNS TABLE(
  rank_position bigint,
  cp_id uuid,
  cp_name text,
  total_orders bigint,
  completed_orders bigint,
  total_revenue numeric,
  avg_ticket numeric,
  commission numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base_orders AS (
    SELECT DISTINCT ON (so.id)
      so.id AS so_id,
      so.collection_point_id,
      so.status
    FROM service_orders so
    WHERE so.tenant_id = get_active_tenant_id()
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
      AND fe.tenant_id = get_active_tenant_id()
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
    JOIN collection_points cp ON cp.id = orv.collection_point_id
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
$$;
