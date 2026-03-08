
-- Revoke direct API access to materialized views (they should only be accessed via RPC functions)
REVOKE ALL ON mv_dashboard_kpis FROM anon, authenticated;
REVOKE ALL ON mv_technician_performance FROM anon, authenticated;
REVOKE ALL ON mv_partner_performance FROM anon, authenticated;
REVOKE ALL ON mv_inventory_usage FROM anon, authenticated;

-- Create secure RPC wrappers to access materialized views
CREATE OR REPLACE FUNCTION public.get_cached_dashboard_kpis()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT row_to_json(mv)::jsonb FROM mv_dashboard_kpis mv LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_cached_technician_performance()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(mv)::jsonb ORDER BY mv.delivered_orders DESC), '[]'::jsonb) FROM mv_technician_performance mv;
$$;

CREATE OR REPLACE FUNCTION public.get_cached_partner_performance()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(mv)::jsonb ORDER BY mv.total_revenue DESC), '[]'::jsonb) FROM mv_partner_performance mv;
$$;

CREATE OR REPLACE FUNCTION public.get_cached_inventory_usage()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(mv)::jsonb ORDER BY mv.total_consumed DESC), '[]'::jsonb) FROM mv_inventory_usage mv;
$$;
