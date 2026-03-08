
-- Fix hardcoded 'i9 Solution' fallback in public_track_order RPC
CREATE OR REPLACE FUNCTION public.public_track_order(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _link service_order_public_links%ROWTYPE;
  _so record;
  _customer record;
  _device record;
  _timeline jsonb;
  _quote jsonb;
  _logistics jsonb;
  _warranty jsonb;
  _balance jsonb;
  _whatsapp_number text;
  _company_name text;
  _recent_access_count integer;
BEGIN
  SELECT * INTO _link FROM service_order_public_links
  WHERE public_token = _token AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired_token');
  END IF;

  IF _link.expires_at IS NOT NULL AND _link.expires_at < now() THEN
    UPDATE service_order_public_links SET status = 'expired' WHERE id = _link.id;
    RETURN jsonb_build_object('error', 'token_expired');
  END IF;

  UPDATE service_order_public_links
  SET last_access_at = now(), access_count = access_count + 1
  WHERE id = _link.id;

  SELECT so.id, so.order_number, so.status::text as status, so.priority::text as priority,
         so.created_at, so.updated_at, so.expected_deadline,
         so.customer_id, so.device_id, so.collection_point_id
  INTO _so FROM service_orders so WHERE so.id = _link.service_order_id;

  IF _so IS NULL THEN
    RETURN jsonb_build_object('error', 'order_not_found');
  END IF;

  SELECT c.full_name INTO _customer FROM customers c WHERE c.id = _so.customer_id;

  SELECT TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.model, '')) as label,
         d.device_type::text as device_type,
         d.reported_issue as device_reported_issue
  INTO _device FROM devices d WHERE d.id = _so.device_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'status', h.to_status::text,
    'timestamp', h.created_at
  ) ORDER BY h.created_at ASC), '[]'::jsonb)
  INTO _timeline
  FROM service_order_status_history h
  WHERE h.service_order_id = _so.id;

  SELECT jsonb_build_object(
    'quote_number', rq.quote_number,
    'status', rq.status::text,
    'total_amount', rq.total_amount,
    'expires_at', rq.expires_at,
    'id', rq.id
  ) INTO _quote
  FROM repair_quotes rq
  WHERE rq.service_order_id = _so.id AND rq.status IN ('sent', 'approved', 'rejected', 'expired')
  ORDER BY rq.created_at DESC LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'type', pd.logistics_type::text,
    'status', pd.status::text,
    'scheduled_date', pd.scheduled_date
  ) ORDER BY pd.created_at DESC), '[]'::jsonb)
  INTO _logistics
  FROM pickups_deliveries pd WHERE pd.service_order_id = _so.id;

  SELECT jsonb_build_object(
    'warranty_number', w.warranty_number,
    'start_date', w.start_date,
    'end_date', w.end_date,
    'is_void', w.is_void,
    'is_active', (w.end_date::date >= CURRENT_DATE AND NOT w.is_void),
    'coverage', w.coverage_description
  ) INTO _warranty
  FROM warranties w WHERE w.service_order_id = _so.id ORDER BY w.created_at DESC LIMIT 1;

  SELECT jsonb_build_object(
    'total', COALESCE(SUM(fe.amount), 0),
    'paid', COALESCE(SUM(fe.paid_amount), 0),
    'remaining', COALESCE(SUM(fe.amount - fe.paid_amount), 0),
    'status', CASE
      WHEN COALESCE(SUM(fe.amount), 0) = 0 THEN 'none'
      WHEN COALESCE(SUM(fe.paid_amount), 0) >= COALESCE(SUM(fe.amount), 0) THEN 'paid'
      WHEN EXISTS(SELECT 1 FROM financial_entries f2 WHERE f2.service_order_id = _so.id AND f2.status = 'overdue') THEN 'overdue'
      WHEN COALESCE(SUM(fe.paid_amount), 0) > 0 THEN 'partial'
      ELSE 'pending'
    END
  ) INTO _balance
  FROM financial_entries fe
  WHERE fe.service_order_id = _so.id AND fe.entry_type = 'revenue' AND fe.status <> 'cancelled';

  SELECT value INTO _whatsapp_number FROM app_settings WHERE key = 'whatsapp_support_number';
  SELECT value INTO _company_name FROM app_settings WHERE key = 'company_name';

  RETURN jsonb_build_object(
    'order_number', _so.order_number,
    'status', _so.status,
    'priority', _so.priority,
    'reported_issue', _device.device_reported_issue,
    'created_at', _so.created_at,
    'updated_at', _so.updated_at,
    'expected_deadline', _so.expected_deadline,
    'customer_name', _customer.full_name,
    'device_label', _device.label,
    'device_type', _device.device_type,
    'timeline', _timeline,
    'quote', _quote,
    'logistics', _logistics,
    'warranty', _warranty,
    'balance', _balance,
    'whatsapp_number', COALESCE(_whatsapp_number, ''),
    'company_name', COALESCE(_company_name, '')
  );
END;
$function$;
