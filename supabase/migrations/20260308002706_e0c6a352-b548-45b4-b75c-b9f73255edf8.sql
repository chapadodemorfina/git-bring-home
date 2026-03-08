
-- =====================================================
-- 1. Default WhatsApp notification templates
-- =====================================================
INSERT INTO public.notification_templates (template_key, name, channel, subject, body, variables, is_active)
VALUES
  ('so_received', 'Dispositivo Recebido', 'whatsapp', NULL,
   E'Olá {customer_name}! 👋\n\nSeu dispositivo foi recebido com sucesso.\n\n📋 Ordem de Serviço: {order_number}\n📱 Dispositivo: {device_name}\n\nAcompanhe o andamento:\n{tracking_url}\n\nObrigado por escolher a {company_name}!',
   '["customer_name","order_number","device_name","tracking_url","company_name"]'::jsonb, true),

  ('so_diagnosis_completed', 'Diagnóstico Concluído', 'whatsapp', NULL,
   E'Olá {customer_name}! 🔧\n\nO diagnóstico do seu dispositivo foi concluído.\n\n📋 OS: {order_number}\n📱 Dispositivo: {device_name}\n\nEm breve você receberá o orçamento.\n\nAcompanhe: {tracking_url}',
   '["customer_name","order_number","device_name","tracking_url"]'::jsonb, true),

  ('so_quote_ready', 'Orçamento Pronto', 'whatsapp', NULL,
   E'Olá {customer_name}! 💰\n\nSeu orçamento está pronto!\n\n📋 OS: {order_number}\n💵 Valor: R$ {quote_value}\n\nAprove ou recuse pelo link:\n{tracking_url}\n\nQualquer dúvida, estamos à disposição!',
   '["customer_name","order_number","quote_value","tracking_url"]'::jsonb, true),

  ('so_quote_approved', 'Orçamento Aprovado', 'whatsapp', NULL,
   E'Olá {customer_name}! ✅\n\nSeu orçamento foi aprovado!\n\n📋 OS: {order_number}\nIniciaremos o reparo em breve.\n\nAcompanhe: {tracking_url}',
   '["customer_name","order_number","tracking_url"]'::jsonb, true),

  ('so_in_repair', 'Reparo Iniciado', 'whatsapp', NULL,
   E'Olá {customer_name}! 🔧\n\nO reparo do seu dispositivo foi iniciado.\n\n📋 OS: {order_number}\n📱 Dispositivo: {device_name}\n\nAcompanhe: {tracking_url}',
   '["customer_name","order_number","device_name","tracking_url"]'::jsonb, true),

  ('so_repair_completed', 'Reparo Concluído', 'whatsapp', NULL,
   E'Olá {customer_name}! ✅\n\nO reparo do seu dispositivo foi concluído com sucesso!\n\n📋 OS: {order_number}\nEstamos realizando os testes finais.\n\nAcompanhe: {tracking_url}',
   '["customer_name","order_number","tracking_url"]'::jsonb, true),

  ('so_ready_for_pickup', 'Pronto para Retirada', 'whatsapp', NULL,
   E'Olá {customer_name}! 🎉\n\nSeu dispositivo está pronto para retirada!\n\n📋 OS: {order_number}\n📱 Dispositivo: {device_name}\n\nAguardamos sua visita!\n\n{company_name}',
   '["customer_name","order_number","device_name","company_name"]'::jsonb, true),

  ('so_delivered', 'Dispositivo Entregue', 'whatsapp', NULL,
   E'Olá {customer_name}! 😊\n\nSeu dispositivo foi entregue.\n\n📋 OS: {order_number}\n\nObrigado por escolher a {company_name}!\nCaso precise, estamos à disposição.',
   '["customer_name","order_number","company_name"]'::jsonb, true)
ON CONFLICT (template_key) DO NOTHING;

-- =====================================================
-- 2. Default notification rules (map status → template)
-- =====================================================
INSERT INTO public.notification_rules (event_type, channel, template_id, target_audience, delay_minutes, is_active)
SELECT v.event_type, 'whatsapp'::notification_channel, t.id, 'customer', v.delay_min, true
FROM (VALUES
  ('so_status_received',                  'so_received',            0),
  ('so_status_awaiting_quote',            'so_diagnosis_completed', 0),
  ('so_status_awaiting_customer_approval','so_quote_ready',         0),
  ('so_status_in_repair',                 'so_in_repair',           0),
  ('so_status_in_testing',                'so_repair_completed',    0),
  ('so_status_ready_for_pickup',          'so_ready_for_pickup',    0),
  ('so_status_delivered',                 'so_delivered',            0)
) AS v(event_type, tpl_key, delay_min)
JOIN public.notification_templates t ON t.template_key = v.tpl_key
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. Trigger function: auto-create notification_events on SO status change
-- =====================================================
CREATE OR REPLACE FUNCTION public.trg_so_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire on actual status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notification_events (
      event_type,
      entity_type,
      entity_id,
      payload,
      processing_status
    ) VALUES (
      'so_status_' || NEW.status,
      'service_order',
      NEW.id,
      jsonb_build_object(
        'service_order_id', NEW.id,
        'order_number', NEW.order_number,
        'customer_id', NEW.customer_id,
        'device_id', NEW.device_id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'collection_point_id', NEW.collection_point_id
      ),
      'pending'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Drop if exists to avoid duplicates
DROP TRIGGER IF EXISTS trg_so_status_notification ON public.service_orders;

CREATE TRIGGER trg_so_status_notification
  AFTER UPDATE OF status ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_so_status_notification();

-- =====================================================
-- 4. Enhance process_notification_events to resolve variables
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_notification_events()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _evt RECORD;
  _rule RECORD;
  _tpl RECORD;
  _body TEXT;
  _subject TEXT;
  _customer RECORD;
  _device RECORD;
  _quote RECORD;
  _tracking_url TEXT;
  _company_name TEXT;
  _recipient_phone TEXT;
  _queued INT := 0;
BEGIN
  -- Get company name
  SELECT value INTO _company_name FROM app_settings WHERE key = 'company_name';
  IF _company_name IS NULL THEN _company_name := 'i9 Solution'; END IF;

  FOR _evt IN
    SELECT * FROM notification_events
    WHERE processing_status = 'pending'
    ORDER BY created_at
    LIMIT 100
  LOOP
    -- Find matching active rules
    FOR _rule IN
      SELECT r.*, t.body AS tpl_body, t.subject AS tpl_subject, t.template_key
      FROM notification_rules r
      JOIN notification_templates t ON t.id = r.template_id
      WHERE r.event_type = _evt.event_type
        AND r.is_active = true
        AND t.is_active = true
    LOOP
      -- Resolve customer data
      SELECT c.full_name, COALESCE(c.whatsapp, c.phone) AS phone
      INTO _customer
      FROM customers c
      WHERE c.id = (_evt.payload->>'customer_id')::uuid;

      IF _customer IS NULL OR _customer.phone IS NULL THEN
        CONTINUE; -- skip if no phone
      END IF;

      _recipient_phone := _customer.phone;

      -- Resolve device
      SELECT COALESCE(d.brand || ' ' || d.model, d.model, 'Dispositivo') AS label
      INTO _device
      FROM devices d
      WHERE d.id = (_evt.payload->>'device_id')::uuid;

      -- Resolve quote value
      SELECT rq.total_amount
      INTO _quote
      FROM repair_quotes rq
      WHERE rq.service_order_id = (_evt.payload->>'service_order_id')::uuid
      ORDER BY rq.created_at DESC
      LIMIT 1;

      -- Resolve tracking URL
      SELECT 'https://id-preview--ebe3ff90-7ca5-4e81-93e4-17b6775c4789.lovable.app/track/' || pt.public_token
      INTO _tracking_url
      FROM public_tracking_links pt
      WHERE pt.service_order_id = (_evt.payload->>'service_order_id')::uuid
        AND pt.status = 'active'
      LIMIT 1;

      IF _tracking_url IS NULL THEN
        _tracking_url := '';
      END IF;

      -- Replace variables in template
      _body := _rule.tpl_body;
      _body := replace(_body, '{customer_name}', COALESCE(_customer.full_name, 'Cliente'));
      _body := replace(_body, '{order_number}', COALESCE(_evt.payload->>'order_number', ''));
      _body := replace(_body, '{device_name}', COALESCE(_device.label, 'Dispositivo'));
      _body := replace(_body, '{quote_value}', COALESCE(_quote.total_amount::text, '0'));
      _body := replace(_body, '{tracking_url}', _tracking_url);
      _body := replace(_body, '{company_name}', _company_name);

      _subject := _rule.tpl_subject;
      IF _subject IS NOT NULL THEN
        _subject := replace(_subject, '{customer_name}', COALESCE(_customer.full_name, 'Cliente'));
        _subject := replace(_subject, '{order_number}', COALESCE(_evt.payload->>'order_number', ''));
      END IF;

      -- Insert into queue with delay
      INSERT INTO notification_queue (
        event_id, rule_id, template_id, channel,
        recipient_address, recipient_name,
        rendered_body, rendered_subject,
        payload, status, next_attempt_at
      ) VALUES (
        _evt.id, _rule.id, _rule.template_id, _rule.channel,
        _recipient_phone, _customer.full_name,
        _body, _subject,
        _evt.payload, 'pending',
        NOW() + (_rule.delay_minutes || ' minutes')::interval
      );

      _queued := _queued + 1;
    END LOOP;

    -- Mark event as processed
    UPDATE notification_events
    SET processing_status = 'processed', processed_at = NOW()
    WHERE id = _evt.id;
  END LOOP;

  RETURN jsonb_build_object('queued', _queued);
END;
$$;
