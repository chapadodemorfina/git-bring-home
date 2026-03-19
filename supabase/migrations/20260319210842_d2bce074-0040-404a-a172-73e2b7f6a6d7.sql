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
      AND is_cp_operator_for_cp(so.collection_point_id)
  );
$$;