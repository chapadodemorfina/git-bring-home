
-- 1. Fix collection_point_performance RPC: CTE deduplicates by so.id first, then aggregates normally
CREATE OR REPLACE FUNCTION public.collection_point_performance(
  _from timestamptz DEFAULT NULL,
  _to   timestamptz DEFAULT NULL,
  _cp_id uuid       DEFAULT NULL
)
RETURNS TABLE(
  cp_id              uuid,
  cp_name            text,
  total_orders       bigint,
  completed_orders   bigint,
  total_revenue      numeric,
  avg_ticket         numeric,
  commission_value   numeric,
  commission_type    text,
  calculated_commission numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid := get_active_tenant_id();
BEGIN
  RETURN QUERY
  WITH unique_orders AS (
    SELECT
      so.id AS so_id,
      so.collection_point_id,
      so.total_amount,
      so.status
    FROM service_orders so
    WHERE so.tenant_id = _tenant
      AND so.collection_point_id IS NOT NULL
      AND (_from IS NULL OR so.created_at >= _from)
      AND (_to   IS NULL OR so.created_at <= _to)
      AND (_cp_id IS NULL OR so.collection_point_id = _cp_id)
  )
  SELECT
    cp.id                                              AS cp_id,
    cp.name::text                                      AS cp_name,
    COUNT(uo.so_id)                                    AS total_orders,
    COUNT(uo.so_id) FILTER (WHERE uo.status::text IN ('completed','delivered')) AS completed_orders,
    COALESCE(SUM(uo.total_amount) FILTER (WHERE uo.status::text IN ('completed','delivered')), 0) AS total_revenue,
    CASE
      WHEN COUNT(uo.so_id) FILTER (WHERE uo.status::text IN ('completed','delivered')) > 0
      THEN ROUND(
        SUM(uo.total_amount) FILTER (WHERE uo.status::text IN ('completed','delivered'))
        / COUNT(uo.so_id) FILTER (WHERE uo.status::text IN ('completed','delivered')), 2)
      ELSE 0
    END                                                AS avg_ticket,
    cp.commission_value,
    cp.commission_type::text                           AS commission_type,
    CASE cp.commission_type::text
      WHEN 'percentage' THEN
        ROUND(COALESCE(SUM(uo.total_amount) FILTER (WHERE uo.status::text IN ('completed','delivered')), 0)
              * cp.commission_value / 100, 2)
      WHEN 'fixed_per_order' THEN
        cp.commission_value * COUNT(uo.so_id) FILTER (WHERE uo.status::text IN ('completed','delivered'))
      WHEN 'fixed_per_device' THEN
        cp.commission_value * COUNT(uo.so_id) FILTER (WHERE uo.status::text IN ('completed','delivered'))
      ELSE 0
    END                                                AS calculated_commission
  FROM collection_points cp
  LEFT JOIN unique_orders uo ON uo.collection_point_id = cp.id
  WHERE cp.tenant_id = _tenant
    AND cp.is_active = true
    AND (_cp_id IS NULL OR cp.id = _cp_id)
  GROUP BY cp.id, cp.name, cp.commission_value, cp.commission_type;
END;
$$;

-- 2. Helper: check if a quote belongs to an OS from the operator's collection point
CREATE OR REPLACE FUNCTION public.is_cp_operator_for_quote(_quote_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM repair_quotes rq
    JOIN service_orders so ON so.id = rq.service_order_id
    WHERE rq.id = _quote_id
      AND so.collection_point_id = get_user_cp_id()
  );
$$;

-- 3. Harden quote_approvals INSERT policy with ownership check
DROP POLICY IF EXISTS "cp_operator_insert_qa" ON public.quote_approvals;

CREATE POLICY "cp_operator_insert_qa"
ON public.quote_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'collection_point_operator'::app_role)
  AND check_cp_permission('approve_quotes')
  AND is_cp_operator_for_quote(quote_id)
);
