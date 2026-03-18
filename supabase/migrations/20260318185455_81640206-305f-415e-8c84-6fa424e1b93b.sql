
CREATE OR REPLACE FUNCTION public.change_service_order_status(
  _order_id uuid,
  _from_status text,
  _to_status text,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE service_orders
  SET status = _to_status::service_order_status,
      updated_at = now()
  WHERE id = _order_id;

  INSERT INTO service_order_status_history (service_order_id, from_status, to_status, notes, changed_by)
  VALUES (
    _order_id,
    CASE WHEN _from_status IS NOT NULL THEN _from_status::service_order_status ELSE NULL END,
    _to_status::service_order_status,
    _notes,
    auth.uid()
  );
END;
$$;
