
-- 1. Multi-turn conversation state table
CREATE TABLE public.whatsapp_pending_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  pending_intent text NOT NULL,
  pending_action text,
  pending_entity_type text,
  pending_entity_id uuid,
  pending_question text,
  pending_context jsonb DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wps_conversation_id ON public.whatsapp_pending_states(conversation_id);
CREATE INDEX idx_wps_expires ON public.whatsapp_pending_states(expires_at);

ALTER TABLE public.whatsapp_pending_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_wps" ON public.whatsapp_pending_states
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'front_desk'::app_role]));

CREATE POLICY "staff_insert_wps" ON public.whatsapp_pending_states
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- 2. Unique constraint for webhook idempotency
CREATE UNIQUE INDEX idx_wa_messages_provider_id 
  ON public.whatsapp_messages(provider_message_id) 
  WHERE provider_message_id IS NOT NULL;

-- 3. Add metadata column to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations 
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 4. Customer lookup by document (CPF/CNPJ)
CREATE OR REPLACE FUNCTION public.wa_lookup_customer_by_document(_document text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _result jsonb;
BEGIN
  SELECT jsonb_build_object('id', c.id, 'full_name', c.full_name, 'phone', c.phone, 'document', c.document)
  INTO _result FROM customers c WHERE c.document = _document AND c.is_active = true LIMIT 1;
  RETURN _result;
END;
$$;

-- 5. Lookup service order by order_number
CREATE OR REPLACE FUNCTION public.wa_lookup_by_order_number(_order_number text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _result jsonb;
BEGIN
  SELECT jsonb_build_object('service_order_id', so.id, 'order_number', so.order_number, 'customer_id', so.customer_id, 'customer_name', c.full_name, 'status', so.status)
  INTO _result FROM service_orders so JOIN customers c ON c.id = so.customer_id WHERE so.order_number = _order_number LIMIT 1;
  RETURN _result;
END;
$$;

-- 6. Lookup quote by quote_number
CREATE OR REPLACE FUNCTION public.wa_lookup_by_quote_number(_quote_number text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _result jsonb;
BEGIN
  SELECT jsonb_build_object('quote_id', rq.id, 'quote_number', rq.quote_number, 'service_order_id', rq.service_order_id, 'customer_id', so.customer_id, 'customer_name', c.full_name, 'status', rq.status, 'total_amount', rq.total_amount)
  INTO _result FROM repair_quotes rq JOIN service_orders so ON so.id = rq.service_order_id JOIN customers c ON c.id = so.customer_id WHERE rq.quote_number = _quote_number LIMIT 1;
  RETURN _result;
END;
$$;

-- 7. Expire stale pending states
CREATE OR REPLACE FUNCTION public.wa_expire_pending_states()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer;
BEGIN
  DELETE FROM whatsapp_pending_states WHERE expires_at < now();
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

-- 8. Archive stale conversations
CREATE OR REPLACE FUNCTION public.wa_archive_stale_conversations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer;
BEGIN
  UPDATE whatsapp_conversations SET status = 'resolved', updated_at = now()
  WHERE status IN ('bot_active', 'active') AND last_message_at < now() - interval '24 hours';
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;
