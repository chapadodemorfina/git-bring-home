CREATE OR REPLACE FUNCTION public.search_service_orders(
  _search text DEFAULT NULL,
  _status text DEFAULT NULL,
  _page int DEFAULT 1,
  _page_size int DEFAULT 25
)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _offset int := (_page - 1) * _page_size;
  _total bigint;
  _items json;
  _like text;
  _tid uuid;
BEGIN
  _like := '%' || COALESCE(_search, '') || '%';
  _tid := get_active_tenant_id();

  SELECT count(*) INTO _total
  FROM service_orders so
  LEFT JOIN customers c ON c.id = so.customer_id
  LEFT JOIN devices d ON d.id = so.device_id
  WHERE so.tenant_id = _tid
    AND (_search IS NULL OR _search = '' OR
      so.order_number ILIKE _like OR
      so.reported_issue ILIKE _like OR
      so.intake_notes ILIKE _like OR
      so.internal_notes ILIKE _like OR
      c.full_name ILIKE _like OR
      c.phone ILIKE _like OR
      c.document ILIKE _like OR
      d.brand ILIKE _like OR
      d.model ILIKE _like OR
      d.serial_number ILIKE _like OR
      d.imei ILIKE _like
    )
    AND (_status IS NULL OR so.status::text = _status);

  SELECT json_agg(row_to_json(t)) INTO _items
  FROM (
    SELECT
      so.*,
      c.full_name AS customer_name,
      c.phone AS customer_phone,
      c.document AS customer_document,
      NULLIF(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.model, '')), '') AS device_label,
      p.full_name AS technician_name,
      cp.name AS collection_point_name
    FROM service_orders so
    LEFT JOIN customers c ON c.id = so.customer_id
    LEFT JOIN devices d ON d.id = so.device_id
    LEFT JOIN profiles p ON p.id = so.assigned_technician_id
    LEFT JOIN collection_points cp ON cp.id = so.collection_point_id
    WHERE so.tenant_id = _tid
      AND (_search IS NULL OR _search = '' OR
        so.order_number ILIKE _like OR
        so.reported_issue ILIKE _like OR
        so.intake_notes ILIKE _like OR
        so.internal_notes ILIKE _like OR
        c.full_name ILIKE _like OR
        c.phone ILIKE _like OR
        c.document ILIKE _like OR
        d.brand ILIKE _like OR
        d.model ILIKE _like OR
        d.serial_number ILIKE _like OR
        d.imei ILIKE _like
      )
      AND (_status IS NULL OR so.status::text = _status)
    ORDER BY so.created_at DESC
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