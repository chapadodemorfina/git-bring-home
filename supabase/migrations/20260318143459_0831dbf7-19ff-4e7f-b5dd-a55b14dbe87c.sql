
-- Table for tracking all customer message events
CREATE TABLE public.customer_message_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  event_type TEXT NOT NULL, -- sale_completed, payment_confirmed, os_ready, quote_approved
  reference_type TEXT NOT NULL, -- sale, service_order, payment, quote
  reference_id UUID NOT NULL,
  template_key TEXT,
  message_text TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  sent_automatically BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate auto-sends for same event
CREATE UNIQUE INDEX idx_unique_auto_message ON public.customer_message_events (reference_type, reference_id, event_type, template_key)
  WHERE sent_automatically = true;

-- Indexes
CREATE INDEX idx_cme_customer ON public.customer_message_events(customer_id);
CREATE INDEX idx_cme_reference ON public.customer_message_events(reference_type, reference_id);
CREATE INDEX idx_cme_created ON public.customer_message_events(created_at DESC);

-- RLS
ALTER TABLE public.customer_message_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view message events"
  ON public.customer_message_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert message events"
  ON public.customer_message_events FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update message events"
  ON public.customer_message_events FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Insert default messaging templates into notification_templates
INSERT INTO public.notification_templates (template_key, name, channel, body, variables, is_active)
VALUES
  ('sale_completed_whatsapp', 'Comprovante de Venda - WhatsApp', 'whatsapp',
   E'Olá {{customer_name}}! 🛒\n\nSua compra foi concluída com sucesso!\n\n📋 *Venda:* {{sale_number}}\n📦 *Itens:* {{items_summary}}\n💰 *Total:* R$ {{total_amount}}\n💳 *Pagamento:* {{payment_method}}\n📅 *Data:* {{sale_date}}\n\nObrigado pela preferência! 😊\n\n{{company_name}}',
   '["customer_name","sale_number","items_summary","total_amount","payment_method","sale_date","company_name"]'::jsonb, true),

  ('payment_confirmed_whatsapp', 'Confirmação de Pagamento - WhatsApp', 'whatsapp',
   E'Olá {{customer_name}}! ✅\n\nPagamento confirmado!\n\n💰 *Valor pago:* R$ {{paid_amount}}\n📋 *Referência:* {{reference}}\n💳 *Método:* {{payment_method}}\n📊 *Saldo restante:* R$ {{remaining_balance}}\n\nObrigado! 🙏\n\n{{company_name}}',
   '["customer_name","paid_amount","reference","payment_method","remaining_balance","company_name"]'::jsonb, true),

  ('os_ready_whatsapp', 'OS Pronta para Retirada - WhatsApp', 'whatsapp',
   E'Olá {{customer_name}}! 🔧\n\nSeu serviço está pronto!\n\n📋 *OS:* {{order_number}}\n📱 *Status:* {{status}}\n\n🏪 Venha retirar em nosso horário de atendimento.\n\n{{final_notes}}\n\n{{company_name}}',
   '["customer_name","order_number","status","final_notes","company_name"]'::jsonb, true),

  ('quote_approved_whatsapp', 'Orçamento Aprovado - WhatsApp', 'whatsapp',
   E'Olá {{customer_name}}! ✅\n\nSeu orçamento foi aprovado!\n\n📋 *OS:* {{order_number}}\n💰 *Valor aprovado:* R$ {{approved_amount}}\n\n📌 *Próximos passos:* Iniciaremos o reparo em breve. Você será notificado sobre o andamento.\n\n{{company_name}}',
   '["customer_name","order_number","approved_amount","company_name"]'::jsonb, true)
ON CONFLICT (template_key) DO NOTHING;
