
-- =================================================
-- WhatsApp Conversational Module - Enums
-- =================================================
CREATE TYPE public.whatsapp_conversation_status AS ENUM ('active', 'bot_active', 'waiting_human', 'human_active', 'resolved', 'archived');
CREATE TYPE public.whatsapp_message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.whatsapp_message_type AS ENUM ('text', 'image', 'audio', 'document', 'location', 'system');
CREATE TYPE public.whatsapp_handoff_status AS ENUM ('pending', 'assigned', 'active', 'resolved', 'cancelled');

-- =================================================
-- whatsapp_conversations
-- =================================================
CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  phone text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  status whatsapp_conversation_status NOT NULL DEFAULT 'bot_active',
  current_handoff_state whatsapp_handoff_status,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  assigned_to_user_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_wc_phone ON whatsapp_conversations (phone);
CREATE INDEX idx_wc_customer ON whatsapp_conversations (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_wc_status ON whatsapp_conversations (status);
CREATE TRIGGER set_updated_at_wc BEFORE UPDATE ON whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =================================================
-- whatsapp_messages
-- =================================================
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction whatsapp_message_direction NOT NULL,
  message_type whatsapp_message_type NOT NULL DEFAULT 'text',
  provider_message_id text,
  text_content text,
  payload jsonb DEFAULT '{}',
  intent text,
  confidence numeric,
  sent_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_wm_conv ON whatsapp_messages (conversation_id, created_at);

-- =================================================
-- whatsapp_ai_actions
-- =================================================
CREATE TABLE public.whatsapp_ai_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES whatsapp_messages(id),
  action_type text NOT NULL,
  action_payload jsonb DEFAULT '{}',
  result_payload jsonb DEFAULT '{}',
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_ai_actions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_waa_conv ON whatsapp_ai_actions (conversation_id);

-- =================================================
-- whatsapp_handoffs
-- =================================================
CREATE TABLE public.whatsapp_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  requested_by text NOT NULL DEFAULT 'customer',
  reason text,
  status whatsapp_handoff_status NOT NULL DEFAULT 'pending',
  assigned_to_user_id uuid,
  started_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_handoffs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_wh_status ON whatsapp_handoffs (status) WHERE status IN ('pending', 'assigned', 'active');
CREATE INDEX idx_wh_conv ON whatsapp_handoffs (conversation_id);

-- =================================================
-- RLS Policies - admin/manager/front_desk only
-- =================================================
CREATE POLICY "staff_select_wc" ON whatsapp_conversations FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk']::app_role[]));
CREATE POLICY "staff_insert_wc" ON whatsapp_conversations FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk']::app_role[]));
CREATE POLICY "staff_update_wc" ON whatsapp_conversations FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk']::app_role[]));

CREATE POLICY "staff_select_wm" ON whatsapp_messages FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk']::app_role[]));
CREATE POLICY "staff_insert_wm" ON whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk']::app_role[]));

CREATE POLICY "staff_select_waa" ON whatsapp_ai_actions FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk']::app_role[]));
CREATE POLICY "staff_insert_waa" ON whatsapp_ai_actions FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk']::app_role[]));

CREATE POLICY "staff_select_wh" ON whatsapp_handoffs FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk']::app_role[]));
CREATE POLICY "staff_insert_wh" ON whatsapp_handoffs FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk']::app_role[]));
CREATE POLICY "staff_update_wh" ON whatsapp_handoffs FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk']::app_role[]));

-- =================================================
-- Safe data access RPCs (customer-scoped)
-- =================================================
CREATE OR REPLACE FUNCTION public.wa_lookup_customer(_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _matches jsonb;
  _count integer;
BEGIN
  SELECT COUNT(*), COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'full_name', full_name, 'email', email, 'phone', phone, 'whatsapp', whatsapp, 'document', document
  )), '[]'::jsonb)
  INTO _count, _matches
  FROM customers
  WHERE is_active = true AND (
    replace(replace(replace(phone, ' ', ''), '-', ''), '+', '') LIKE '%' || replace(replace(replace(_phone, ' ', ''), '-', ''), '+', '') || '%'
    OR replace(replace(replace(whatsapp, ' ', ''), '-', ''), '+', '') LIKE '%' || replace(replace(replace(_phone, ' ', ''), '-', ''), '+', '') || '%'
  );

  RETURN jsonb_build_object('count', _count, 'customers', _matches);
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_get_customer_orders(_customer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', so.id,
      'order_number', so.order_number,
      'status', so.status::text,
      'priority', so.priority::text,
      'reported_issue', so.reported_issue,
      'device_label', TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.model, '')),
      'created_at', so.created_at,
      'updated_at', so.updated_at
    ) ORDER BY so.created_at DESC), '[]'::jsonb)
    FROM service_orders so
    LEFT JOIN devices d ON d.id = so.device_id
    WHERE so.customer_id = _customer_id
      AND so.status NOT IN ('cancelled')
    LIMIT 5
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_get_customer_quotes(_customer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', rq.id,
      'quote_number', rq.quote_number,
      'status', rq.status::text,
      'total_amount', rq.total_amount,
      'analysis_fee', rq.analysis_fee,
      'expires_at', rq.expires_at,
      'order_number', so.order_number,
      'service_order_id', so.id
    ) ORDER BY rq.created_at DESC), '[]'::jsonb)
    FROM repair_quotes rq
    JOIN service_orders so ON so.id = rq.service_order_id
    WHERE so.customer_id = _customer_id
      AND rq.status IN ('draft', 'sent', 'approved')
    LIMIT 5
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_get_customer_balance(_customer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_open', COALESCE(SUM(amount - paid_amount) FILTER (WHERE status IN ('pending', 'partial', 'overdue')), 0),
      'overdue_count', COUNT(*) FILTER (WHERE status = 'overdue'),
      'entries', COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'description', description,
        'amount', amount,
        'paid_amount', paid_amount,
        'status', status::text,
        'due_date', due_date
      ) ORDER BY due_date) FILTER (WHERE status IN ('pending', 'partial', 'overdue')), '[]'::jsonb)
    )
    FROM financial_entries
    WHERE customer_id = _customer_id AND entry_type = 'revenue' AND status <> 'cancelled'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_get_customer_warranties(_customer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', w.id,
      'warranty_number', w.warranty_number,
      'start_date', w.start_date,
      'end_date', w.end_date,
      'is_void', w.is_void,
      'is_active', (w.end_date::date >= CURRENT_DATE AND NOT w.is_void),
      'order_number', so.order_number,
      'coverage', w.coverage_description
    ) ORDER BY w.end_date DESC), '[]'::jsonb)
    FROM warranties w
    JOIN service_orders so ON so.id = w.service_order_id
    WHERE so.customer_id = _customer_id
    LIMIT 5
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_get_customer_logistics(_customer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', pd.id,
      'logistics_type', pd.logistics_type::text,
      'status', pd.status::text,
      'scheduled_date', pd.scheduled_date,
      'driver_name', pd.driver_name,
      'order_number', so.order_number
    ) ORDER BY pd.created_at DESC), '[]'::jsonb)
    FROM pickups_deliveries pd
    JOIN service_orders so ON so.id = pd.service_order_id
    WHERE so.customer_id = _customer_id
      AND pd.status NOT IN ('delivered', 'cancelled')
    LIMIT 5
  );
END;
$$;
