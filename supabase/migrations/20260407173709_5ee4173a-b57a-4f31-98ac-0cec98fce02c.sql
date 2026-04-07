CREATE OR REPLACE FUNCTION public.search_service_orders(
  _search text DEFAULT NULL,
  _status text DEFAULT NULL,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 25,
  _priority text DEFAULT NULL,
  _origin text DEFAULT NULL,
  _collection_point_id uuid DEFAULT NULL,
  _technician_id uuid DEFAULT NULL,
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL,
  _intake_channel text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid := get_active_tenant_id();
  _offset integer := (_page - 1) * _page_size;
  _total bigint;
  _items jsonb;
BEGIN
  SELECT count(*) INTO _total
  FROM service_orders so
  JOIN customers c ON c.id = so.customer_id
  LEFT JOIN devices d ON d.id = so.device_id
  LEFT JOIN collection_points cp ON cp.id = so.collection_point_id
  WHERE so.tenant_id = _tenant
    AND (_status IS NULL OR so.status = _status::service_order_status)
    AND (_priority IS NULL OR so.priority = _priority::service_order_priority)
    AND (_technician_id IS NULL OR so.assigned_technician_id = _technician_id)
    AND (_collection_point_id IS NULL OR so.collection_point_id = _collection_point_id)
    AND (_intake_channel IS NULL OR so.intake_channel = _intake_channel)
    AND (_date_from IS NULL OR so.created_at::date >= _date_from)
    AND (_date_to IS NULL OR so.created_at::date <= _date_to)
    AND (
      _origin IS NULL
      OR (_origin = 'counter' AND so.collection_point_id IS NULL)
      OR (_origin = 'partner' AND so.collection_point_id IS NOT NULL)
    )
    AND (
      _search IS NULL
      OR so.order_number ILIKE '%' || _search || '%'
      OR c.full_name ILIKE '%' || _search || '%'
      OR c.phone ILIKE '%' || _search || '%'
      OR c.document ILIKE '%' || _search || '%'
      OR so.reported_issue ILIKE '%' || _search || '%'
      OR (d.brand || ' ' || d.model) ILIKE '%' || _search || '%'
      OR cp.name ILIKE '%' || _search || '%'
    );

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO _items
  FROM (
    SELECT
      so.id,
      so.order_number,
      so.status,
      so.priority,
      so.intake_channel,
      so.reported_issue,
      so.collection_point_id,
      so.assigned_technician_id,
      so.estimated_value,
      so.total_amount,
      so.expected_deadline,
      so.created_at,
      so.updated_at,
      c.full_name AS customer_name,
      CASE
        WHEN d.id IS NOT NULL THEN trim(coalesce(d.brand, '') || ' ' || coalesce(d.model, ''))
        ELSE NULL
      END AS device_label,
      cp.name AS collection_point_name,
      p.full_name AS technician_name
    FROM service_orders so
    JOIN customers c ON c.id = so.customer_id
    LEFT JOIN devices d ON d.id = so.device_id
    LEFT JOIN collection_points cp ON cp.id = so.collection_point_id
    LEFT JOIN profiles p ON p.id = so.assigned_technician_id
    WHERE so.tenant_id = _tenant
      AND (_status IS NULL OR so.status = _status::service_order_status)
      AND (_priority IS NULL OR so.priority = _priority::service_order_priority)
      AND (_technician_id IS NULL OR so.assigned_technician_id = _technician_id)
      AND (_collection_point_id IS NULL OR so.collection_point_id = _collection_point_id)
      AND (_intake_channel IS NULL OR so.intake_channel = _intake_channel)
      AND (_date_from IS NULL OR so.created_at::date >= _date_from)
      AND (_date_to IS NULL OR so.created_at::date <= _date_to)
      AND (
        _origin IS NULL
        OR (_origin = 'counter' AND so.collection_point_id IS NULL)
        OR (_origin = 'partner' AND so.collection_point_id IS NOT NULL)
      )
      AND (
        _search IS NULL
        OR so.order_number ILIKE '%' || _search || '%'
        OR c.full_name ILIKE '%' || _search || '%'
        OR c.phone ILIKE '%' || _search || '%'
        OR c.document ILIKE '%' || _search || '%'
        OR so.reported_issue ILIKE '%' || _search || '%'
        OR (d.brand || ' ' || d.model) ILIKE '%' || _search || '%'
        OR cp.name ILIKE '%' || _search || '%'
      )
    ORDER BY so.created_at DESC
    LIMIT _page_size OFFSET _offset
  ) t;

  RETURN jsonb_build_object(
    'items', _items,
    'total', _total,
    'page', _page,
    'pageSize', _page_size,
    'totalPages', greatest(1, ceil(_total::numeric / _page_size))
  );
END;
$$;