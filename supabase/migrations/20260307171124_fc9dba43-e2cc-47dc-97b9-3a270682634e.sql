
-- Device type enum
CREATE TYPE public.device_type AS ENUM (
  'notebook', 'desktop_pc', 'monitor', 'tv', 'smartphone',
  'tablet', 'printer', 'electronic_module', 'motherboard', 'other'
);

-- Devices table
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  device_type device_type NOT NULL DEFAULT 'other',
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  imei TEXT,
  color TEXT,
  password_notes TEXT,
  physical_condition TEXT,
  reported_issue TEXT,
  internal_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Device accessories checklist
CREATE TABLE public.device_accessories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  delivered BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Device photos
CREATE TABLE public.device_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_devices_customer ON public.devices(customer_id);
CREATE INDEX idx_devices_serial ON public.devices(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX idx_devices_type ON public.devices(device_type);
CREATE INDEX idx_device_accessories_device ON public.device_accessories(device_id);
CREATE INDEX idx_device_photos_device ON public.device_photos(device_id);

-- Full text search on devices
CREATE INDEX idx_devices_search ON public.devices USING gin (
  to_tsvector('portuguese', coalesce(brand, '') || ' ' || coalesce(model, '') || ' ' || coalesce(serial_number, ''))
);

-- Updated at trigger
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_photos ENABLE ROW LEVEL SECURITY;

-- Devices policies
CREATE POLICY "Authenticated can view devices" ON public.devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert devices" ON public.devices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update devices" ON public.devices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete devices" ON public.devices FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Accessories policies
CREATE POLICY "Authenticated can view device_accessories" ON public.device_accessories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert device_accessories" ON public.device_accessories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update device_accessories" ON public.device_accessories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete device_accessories" ON public.device_accessories FOR DELETE TO authenticated USING (true);

-- Photos policies
CREATE POLICY "Authenticated can view device_photos" ON public.device_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert device_photos" ON public.device_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete device_photos" ON public.device_photos FOR DELETE TO authenticated USING (true);

-- Storage bucket for device photos
INSERT INTO storage.buckets (id, name, public) VALUES ('device-photos', 'device-photos', true);

-- Storage policies
CREATE POLICY "Authenticated can upload device photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'device-photos');
CREATE POLICY "Anyone can view device photos" ON storage.objects FOR SELECT USING (bucket_id = 'device-photos');
CREATE POLICY "Authenticated can delete device photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'device-photos');
