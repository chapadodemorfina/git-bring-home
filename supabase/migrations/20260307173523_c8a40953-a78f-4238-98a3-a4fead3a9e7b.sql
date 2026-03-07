
-- Enums
CREATE TYPE public.service_order_status AS ENUM (
  'received', 'triage', 'awaiting_diagnosis', 'awaiting_quote',
  'awaiting_customer_approval', 'awaiting_parts', 'in_repair',
  'in_testing', 'ready_for_pickup', 'delivered', 'cancelled', 'warranty_return'
);

CREATE TYPE public.service_order_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE public.intake_channel AS ENUM ('front_desk', 'collection_point', 'whatsapp', 'phone', 'email', 'website');

-- Sequence for order numbers
CREATE SEQUENCE public.service_order_number_seq START 1000;

-- Main table
CREATE TABLE public.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT 'OS-' || lpad(nextval('service_order_number_seq')::text, 6, '0'),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  device_id uuid REFERENCES public.devices(id),
  status service_order_status NOT NULL DEFAULT 'received',
  priority service_order_priority NOT NULL DEFAULT 'normal',
  intake_channel intake_channel NOT NULL DEFAULT 'front_desk',
  collection_point_id uuid NULL,
  reported_issue text,
  physical_condition text,
  accessories_received text,
  intake_notes text,
  internal_notes text,
  expected_deadline timestamptz,
  assigned_technician_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Status history
CREATE TABLE public.service_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  from_status service_order_status,
  to_status service_order_status NOT NULL,
  notes text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Signatures
CREATE TABLE public.service_order_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signer_role text NOT NULL DEFAULT 'customer',
  signature_data text NOT NULL,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Terms
CREATE TABLE public.service_order_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Attachments
CREATE TABLE public.service_order_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  caption text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_service_orders_customer ON public.service_orders(customer_id);
CREATE INDEX idx_service_orders_device ON public.service_orders(device_id);
CREATE INDEX idx_service_orders_status ON public.service_orders(status);
CREATE INDEX idx_service_orders_number ON public.service_orders(order_number);
CREATE INDEX idx_so_status_history_order ON public.service_order_status_history(service_order_id);

-- Updated_at triggers
CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_service_order_terms_updated_at BEFORE UPDATE ON public.service_order_terms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_attachments ENABLE ROW LEVEL SECURITY;

-- service_orders policies
CREATE POLICY "Authenticated can view service_orders" ON public.service_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert service_orders" ON public.service_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update service_orders" ON public.service_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete service_orders" ON public.service_orders FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- status_history policies
CREATE POLICY "Authenticated can view so_status_history" ON public.service_order_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert so_status_history" ON public.service_order_status_history FOR INSERT TO authenticated WITH CHECK (true);

-- signatures policies
CREATE POLICY "Authenticated can view so_signatures" ON public.service_order_signatures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert so_signatures" ON public.service_order_signatures FOR INSERT TO authenticated WITH CHECK (true);

-- terms policies
CREATE POLICY "Authenticated can view so_terms" ON public.service_order_terms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage so_terms" ON public.service_order_terms FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- attachments policies
CREATE POLICY "Authenticated can view so_attachments" ON public.service_order_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert so_attachments" ON public.service_order_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete so_attachments" ON public.service_order_attachments FOR DELETE TO authenticated USING (true);

-- Storage bucket for SO attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('service-order-attachments', 'service-order-attachments', true);

CREATE POLICY "Authenticated can upload so attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'service-order-attachments');
CREATE POLICY "Anyone can view so attachments" ON storage.objects FOR SELECT USING (bucket_id = 'service-order-attachments');
CREATE POLICY "Authenticated can delete so attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'service-order-attachments');

-- Insert default terms
INSERT INTO public.service_order_terms (title, content, version) VALUES (
  'Termos de Serviço - Recebimento',
  E'1. O cliente declara que o equipamento foi entregue nas condições descritas neste documento.\n2. A empresa não se responsabiliza por dados armazenados no dispositivo.\n3. O prazo estimado é uma previsão e pode sofrer alterações.\n4. O orçamento será comunicado antes da execução do serviço.\n5. Equipamentos não retirados em até 90 dias após a conclusão serão considerados abandonados.\n6. A garantia do serviço é de 90 dias a partir da data de entrega.',
  1
);
