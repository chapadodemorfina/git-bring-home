-- Fix all search RPCs to use get_active_tenant_id() instead of JWT app_metadata

-- 1. search_service_orders
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
      NULLIF(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.model, '')), '') AS device_label
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

-- 2. search_financial_entries
CREATE OR REPLACE FUNCTION public.search_financial_entries(
  _search text DEFAULT NULL,
  _entry_type text DEFAULT NULL,
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
  FROM financial_entries fe
  LEFT JOIN customers c ON c.id = fe.customer_id
  LEFT JOIN suppliers s ON s.id = fe.supplier_id
  LEFT JOIN service_orders so ON so.id = fe.service_order_id
  WHERE fe.tenant_id = _tid
    AND (_search IS NULL OR _search = '' OR
      fe.description ILIKE _like OR
      fe.category ILIKE _like OR
      fe.notes ILIKE _like OR
      c.full_name ILIKE _like OR
      s.name ILIKE _like OR
      so.order_number ILIKE _like
    )
    AND (_entry_type IS NULL OR fe.entry_type::text = _entry_type)
    AND (_status IS NULL OR fe.status::text = _status);

  SELECT json_agg(row_to_json(t)) INTO _items
  FROM (
    SELECT
      fe.*,
      c.full_name AS customer_name,
      s.name AS supplier_name,
      so.order_number AS order_number
    FROM financial_entries fe
    LEFT JOIN customers c ON c.id = fe.customer_id
    LEFT JOIN suppliers s ON s.id = fe.supplier_id
    LEFT JOIN service_orders so ON so.id = fe.service_order_id
    WHERE fe.tenant_id = _tid
      AND (_search IS NULL OR _search = '' OR
        fe.description ILIKE _like OR
        fe.category ILIKE _like OR
        fe.notes ILIKE _like OR
        c.full_name ILIKE _like OR
        s.name ILIKE _like OR
        so.order_number ILIKE _like
      )
      AND (_entry_type IS NULL OR fe.entry_type::text = _entry_type)
      AND (_status IS NULL OR fe.status::text = _status)
    ORDER BY fe.created_at DESC
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

-- 3. search_sales
CREATE OR REPLACE FUNCTION public.search_sales(
  _search text DEFAULT NULL,
  _status text DEFAULT NULL,
  _payment_status text DEFAULT NULL,
  _date_from text DEFAULT NULL,
  _date_to text DEFAULT NULL,
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
  FROM sales sa
  LEFT JOIN customers c ON c.id = sa.customer_id
  LEFT JOIN profiles p ON p.id = sa.seller_user_id
  WHERE sa.tenant_id = _tid
    AND (_search IS NULL OR _search = '' OR
      sa.sale_number ILIKE _like OR
      sa.notes ILIKE _like OR
      c.full_name ILIKE _like OR
      c.phone ILIKE _like OR
      c.document ILIKE _like OR
      p.full_name ILIKE _like
    )
    AND (_status IS NULL OR sa.status::text = _status)
    AND (_payment_status IS NULL OR sa.payment_status::text = _payment_status)
    AND (_date_from IS NULL OR sa.created_at >= _date_from::timestamptz)
    AND (_date_to IS NULL OR sa.created_at <= (_date_to || 'T23:59:59')::timestamptz);

  SELECT json_agg(row_to_json(t)) INTO _items
  FROM (
    SELECT
      sa.*,
      c.full_name AS customer_name,
      p.full_name AS seller_name
    FROM sales sa
    LEFT JOIN customers c ON c.id = sa.customer_id
    LEFT JOIN profiles p ON p.id = sa.seller_user_id
    WHERE sa.tenant_id = _tid
      AND (_search IS NULL OR _search = '' OR
        sa.sale_number ILIKE _like OR
        sa.notes ILIKE _like OR
        c.full_name ILIKE _like OR
        c.phone ILIKE _like OR
        c.document ILIKE _like OR
        p.full_name ILIKE _like
      )
      AND (_status IS NULL OR sa.status::text = _status)
      AND (_payment_status IS NULL OR sa.payment_status::text = _payment_status)
      AND (_date_from IS NULL OR sa.created_at >= _date_from::timestamptz)
      AND (_date_to IS NULL OR sa.created_at <= (_date_to || 'T23:59:59')::timestamptz)
    ORDER BY sa.created_at DESC
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

-- 4. search_receivables
CREATE OR REPLACE FUNCTION public.search_receivables(
  _search text DEFAULT NULL,
  _status text DEFAULT NULL,
  _overdue_only boolean DEFAULT false,
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
  FROM accounts_receivable ar
  LEFT JOIN customers c ON c.id = ar.customer_id
  WHERE ar.tenant_id = _tid
    AND (_search IS NULL OR _search = '' OR
      ar.description ILIKE _like OR
      ar.reference_type ILIKE _like OR
      c.full_name ILIKE _like OR
      c.phone ILIKE _like OR
      c.document ILIKE _like
    )
    AND (_status IS NULL OR ar.status = _status)
    AND (_overdue_only = false OR ar.status = 'overdue');

  SELECT json_agg(row_to_json(t)) INTO _items
  FROM (
    SELECT
      ar.*,
      c.full_name AS customer_name
    FROM accounts_receivable ar
    LEFT JOIN customers c ON c.id = ar.customer_id
    WHERE ar.tenant_id = _tid
      AND (_search IS NULL OR _search = '' OR
        ar.description ILIKE _like OR
        ar.reference_type ILIKE _like OR
        c.full_name ILIKE _like OR
        c.phone ILIKE _like OR
        c.document ILIKE _like
      )
      AND (_status IS NULL OR ar.status = _status)
      AND (_overdue_only = false OR ar.status = 'overdue')
    ORDER BY ar.due_date ASC
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

-- 5. search_stock_movements
CREATE OR REPLACE FUNCTION public.search_stock_movements(
  _search text DEFAULT NULL,
  _product_id uuid DEFAULT NULL,
  _movement_type text DEFAULT NULL,
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
  FROM stock_movements sm
  LEFT JOIN products p ON p.id = sm.product_id
  WHERE sm.tenant_id = _tid
    AND (_search IS NULL OR _search = '' OR
      p.name ILIKE _like OR
      p.sku ILIKE _like OR
      sm.notes ILIKE _like
    )
    AND (_product_id IS NULL OR sm.product_id = _product_id)
    AND (_movement_type IS NULL OR sm.movement_type::text = _movement_type);

  SELECT json_agg(row_to_json(t)) INTO _items
  FROM (
    SELECT
      sm.*,
      json_build_object('name', p.name, 'sku', p.sku) AS products
    FROM stock_movements sm
    LEFT JOIN products p ON p.id = sm.product_id
    WHERE sm.tenant_id = _tid
      AND (_search IS NULL OR _search = '' OR
        p.name ILIKE _like OR
        p.sku ILIKE _like OR
        sm.notes ILIKE _like
      )
      AND (_product_id IS NULL OR sm.product_id = _product_id)
      AND (_movement_type IS NULL OR sm.movement_type::text = _movement_type)
    ORDER BY sm.created_at DESC
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

-- 6. search_warranties
CREATE OR REPLACE FUNCTION public.search_warranties(
  _search text DEFAULT NULL,
  _status_filter text DEFAULT NULL,
  _type_filter text DEFAULT NULL,
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
  FROM warranties w
  LEFT JOIN service_orders so ON so.id = w.service_order_id
  LEFT JOIN customers c ON c.id = so.customer_id
  LEFT JOIN devices d ON d.id = so.device_id
  WHERE w.tenant_id = _tid
    AND (_search IS NULL OR _search = '' OR
      w.warranty_number ILIKE _like OR
      so.order_number ILIKE _like OR
      c.full_name ILIKE _like OR
      c.phone ILIKE _like OR
      d.brand ILIKE _like OR
      d.model ILIKE _like
    )
    AND (_status_filter IS NULL OR
      (_status_filter = 'active' AND w.is_void = false AND w.end_date >= CURRENT_DATE) OR
      (_status_filter = 'expired' AND w.is_void = false AND w.end_date < CURRENT_DATE) OR
      (_status_filter = 'voided' AND w.is_void = true)
    )
    AND (_type_filter IS NULL OR w.warranty_type::text = _type_filter);

  SELECT json_agg(row_to_json(t)) INTO _items
  FROM (
    SELECT
      w.*,
      so.order_number,
      c.full_name AS customer_name,
      NULLIF(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.model, '')), '') AS device_label
    FROM warranties w
    LEFT JOIN service_orders so ON so.id = w.service_order_id
    LEFT JOIN customers c ON c.id = so.customer_id
    LEFT JOIN devices d ON d.id = so.device_id
    WHERE w.tenant_id = _tid
      AND (_search IS NULL OR _search = '' OR
        w.warranty_number ILIKE _like OR
        so.order_number ILIKE _like OR
        c.full_name ILIKE _like OR
        c.phone ILIKE _like OR
        d.brand ILIKE _like OR
        d.model ILIKE _like
      )
      AND (_status_filter IS NULL OR
        (_status_filter = 'active' AND w.is_void = false AND w.end_date >= CURRENT_DATE) OR
        (_status_filter = 'expired' AND w.is_void = false AND w.end_date < CURRENT_DATE) OR
        (_status_filter = 'voided' AND w.is_void = true)
      )
      AND (_type_filter IS NULL OR w.warranty_type::text = _type_filter)
    ORDER BY w.created_at DESC
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

-- 7. search_warranty_returns
CREATE OR REPLACE FUNCTION public.search_warranty_returns(
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
  FROM warranty_returns wr
  LEFT JOIN warranties w ON w.id = wr.warranty_id
  LEFT JOIN service_orders so ON so.id = w.service_order_id
  LEFT JOIN customers c ON c.id = so.customer_id
  WHERE wr.tenant_id = _tid
    AND (_search IS NULL OR _search = '' OR
      wr.reason ILIKE _like OR
      w.warranty_number ILIKE _like OR
      c.full_name ILIKE _like OR
      so.order_number ILIKE _like
    )
    AND (_status IS NULL OR wr.status::text = _status);

  SELECT json_agg(row_to_json(t)) INTO _items
  FROM (
    SELECT
      wr.*,
      w.warranty_number,
      w.service_order_id,
      so.order_number,
      c.full_name AS customer_name
    FROM warranty_returns wr
    LEFT JOIN warranties w ON w.id = wr.warranty_id
    LEFT JOIN service_orders so ON so.id = w.service_order_id
    LEFT JOIN customers c ON c.id = so.customer_id
    WHERE wr.tenant_id = _tid
      AND (_search IS NULL OR _search = '' OR
        wr.reason ILIKE _like OR
        w.warranty_number ILIKE _like OR
        c.full_name ILIKE _like OR
        so.order_number ILIKE _like
      )
      AND (_status IS NULL OR wr.status::text = _status)
    ORDER BY wr.created_at DESC
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