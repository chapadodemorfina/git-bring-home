-- Function to check if a product can be safely deleted
CREATE OR REPLACE FUNCTION public.can_delete_product(_product_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _links json;
  _has_links boolean := false;
BEGIN
  SELECT json_build_object(
    'stock_movements', (SELECT count(*) FROM stock_movements WHERE product_id = _product_id),
    'repair_parts_used', (SELECT count(*) FROM repair_parts_used WHERE product_id = _product_id),
    'part_reservations', (SELECT count(*) FROM part_reservations WHERE product_id = _product_id),
    'diagnosis_parts', (SELECT count(*) FROM diagnosis_parts WHERE product_id = _product_id)
  ) INTO _links;

  _has_links := (
    (_links->>'stock_movements')::int > 0 OR
    (_links->>'repair_parts_used')::int > 0 OR
    (_links->>'part_reservations')::int > 0 OR
    (_links->>'diagnosis_parts')::int > 0
  );

  RETURN json_build_object('can_delete', NOT _has_links, 'links', _links);
END;
$$;

-- Function to check if a supplier can be safely deleted
CREATE OR REPLACE FUNCTION public.can_delete_supplier(_supplier_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _links json;
  _has_links boolean := false;
BEGIN
  SELECT json_build_object(
    'products', (SELECT count(*) FROM products WHERE supplier_id = _supplier_id),
    'purchase_entries', (SELECT count(*) FROM purchase_entries WHERE supplier_id = _supplier_id),
    'financial_entries', (SELECT count(*) FROM financial_entries WHERE supplier_id = _supplier_id)
  ) INTO _links;

  _has_links := (
    (_links->>'products')::int > 0 OR
    (_links->>'purchase_entries')::int > 0 OR
    (_links->>'financial_entries')::int > 0
  );

  RETURN json_build_object('can_delete', NOT _has_links, 'links', _links);
END;
$$;