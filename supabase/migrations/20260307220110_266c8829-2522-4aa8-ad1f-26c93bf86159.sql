
-- Enum for public link status
CREATE TYPE public.public_link_status AS ENUM ('active', 'revoked', 'expired');

-- Public tracking links table
CREATE TABLE public.service_order_public_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  public_token text NOT NULL,
  status public_link_status NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_access_at timestamptz,
  access_count integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX idx_sopl_token ON public.service_order_public_links(public_token);
CREATE INDEX idx_sopl_service_order ON public.service_order_public_links(service_order_id);
CREATE INDEX idx_sopl_status ON public.service_order_public_links(status) WHERE status = 'active';

ALTER TABLE public.service_order_public_links ENABLE ROW LEVEL SECURITY;

-- Staff can manage links
CREATE POLICY "staff_all_sopl" ON public.service_order_public_links
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'front_desk'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'front_desk'::app_role]));

-- Public data access RPC (no auth required, validates token)
CREATE OR REPLACE FUNCTION public.public_track_order(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  -- Find and validate token
  SELECT * INTO _link FROM service_order_public_links
  WHERE public_token = _token AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired_token');
  END IF;

  -- Check expiry
  IF _link.expires_at IS NOT NULL AND _link.expires_at < now() THEN
    UPDATE service_order_public_links SET status = 'expired' WHERE id = _link.id;
    RETURN jsonb_build_object('error', 'token_expired');
  END IF;

  -- Update access stats
  UPDATE service_order_public_links
  SET last_access_at = now(), access_count = access_count + 1
  WHERE id = _link.id;

  -- Get service order (safe fields only)
  SELECT so.id, so.order_number, so.status::text as status, so.priority::text as priority,
         so.reported_issue, so.created_at, so.updated_at, so.expected_deadline,
         so.customer_id, so.device_id, so.collection_point_id
  INTO _so FROM service_orders so WHERE so.id = _link.service_order_id;

  IF _so IS NULL THEN
    RETURN jsonb_build_object('error', 'order_not_found');
  END IF;

  -- Customer name only
  SELECT c.full_name INTO _customer FROM customers c WHERE c.id = _so.customer_id;

  -- Device label only
  SELECT TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.model, '')) as label, d.device_type::text as device_type
  INTO _device FROM devices d WHERE d.id = _so.device_id;

  -- Simplified timeline (customer-safe milestones only)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'status', h.to_status::text,
    'timestamp', h.created_at
  ) ORDER BY h.created_at ASC), '[]'::jsonb)
  INTO _timeline
  FROM service_order_status_history h
  WHERE h.service_order_id = _so.id;

  -- Latest relevant quote
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

  -- Logistics
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'type', pd.logistics_type::text,
    'status', pd.status::text,
    'scheduled_date', pd.scheduled_date,
    'driver_name', pd.driver_name
  ) ORDER BY pd.created_at DESC), '[]'::jsonb)
  INTO _logistics
  FROM pickups_deliveries pd WHERE pd.service_order_id = _so.id;

  -- Warranty
  SELECT jsonb_build_object(
    'warranty_number', w.warranty_number,
    'start_date', w.start_date,
    'end_date', w.end_date,
    'is_void', w.is_void,
    'is_active', (w.end_date::date >= CURRENT_DATE AND NOT w.is_void),
    'coverage', w.coverage_description
  ) INTO _warranty
  FROM warranties w WHERE w.service_order_id = _so.id ORDER BY w.created_at DESC LIMIT 1;

  -- Balance summary
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

  RETURN jsonb_build_object(
    'order_number', _so.order_number,
    'status', _so.status,
    'priority', _so.priority,
    'reported_issue', _so.reported_issue,
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
    'service_order_id', _so.id
  );
END;
$$;

-- Public quote approval/rejection (validates token, not auth)
CREATE OR REPLACE FUNCTION public.public_approve_reject_quote(_token text, _quote_id uuid, _decision text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link service_order_public_links%ROWTYPE;
  _quote repair_quotes%ROWTYPE;
  _so service_orders%ROWTYPE;
  _new_so_status service_order_status;
BEGIN
  -- Validate token
  SELECT * INTO _link FROM service_order_public_links
  WHERE public_token = _token AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;
  IF _link.expires_at IS NOT NULL AND _link.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'token_expired');
  END IF;

  -- Validate quote belongs to this service order
  SELECT * INTO _quote FROM repair_quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND OR _quote.service_order_id <> _link.service_order_id THEN
    RETURN jsonb_build_object('error', 'quote_not_found_or_mismatch');
  END IF;
  IF _quote.status NOT IN ('sent') THEN
    RETURN jsonb_build_object('error', 'quote_not_in_valid_state', 'current_status', _quote.status::text);
  END IF;

  SELECT * INTO _so FROM service_orders WHERE id = _quote.service_order_id FOR UPDATE;

  IF _decision = 'approved' THEN
    _new_so_status := 'in_repair';
  ELSE
    _new_so_status := 'cancelled';
  END IF;

  INSERT INTO quote_approvals (quote_id, decision, decided_by_name, decided_by_role, reason)
  VALUES (_quote_id, _decision::quote_status, 'Portal Público', 'customer', 'Aprovação via portal de acompanhamento');

  UPDATE repair_quotes SET status = _decision::quote_status WHERE id = _quote_id;
  UPDATE service_orders SET status = _new_so_status WHERE id = _so.id;

  INSERT INTO service_order_status_history (service_order_id, from_status, to_status, notes)
  VALUES (_so.id, _so.status, _new_so_status,
    CASE WHEN _decision = 'approved' THEN 'Orçamento aprovado via portal público' ELSE 'Orçamento rejeitado via portal público' END);

  IF _decision = 'approved' AND COALESCE(_quote.total_amount, 0) > 0 THEN
    INSERT INTO financial_entries (entry_type, description, amount, service_order_id, customer_id, quote_id, category)
    VALUES ('revenue', 'Serviço - ' || _quote.quote_number, _quote.total_amount, _so.id, _so.customer_id, _quote_id, 'service');
  END IF;

  -- Log in audit
  INSERT INTO audit_logs (action, table_name, record_id, new_data)
  VALUES ('public_quote_' || _decision, 'repair_quotes', _quote_id,
    jsonb_build_object('token_id', _link.id, 'quote_number', _quote.quote_number, 'decision', _decision));

  RETURN jsonb_build_object('success', true, 'new_status', _new_so_status::text);
END;
$$;

-- Generate token helper
CREATE OR REPLACE FUNCTION public.generate_public_tracking_token(_service_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token text;
  _link_id uuid;
BEGIN
  -- Generate cryptographically random token
  _token := encode(gen_random_bytes(24), 'hex');

  -- Revoke existing active tokens for this SO
  UPDATE service_order_public_links SET status = 'revoked', revoked_at = now()
  WHERE service_order_id = _service_order_id AND status = 'active';

  INSERT INTO service_order_public_links (service_order_id, public_token, created_by)
  VALUES (_service_order_id, _token, auth.uid())
  RETURNING id INTO _link_id;

  RETURN jsonb_build_object('id', _link_id, 'token', _token);
END;
$$;
