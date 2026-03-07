
-- Enum for logistics status
CREATE TYPE public.logistics_status AS ENUM (
  'pickup_requested',
  'pickup_scheduled',
  'picked_up',
  'in_transport',
  'received_at_lab',
  'ready_for_return',
  'return_scheduled',
  'returned'
);

-- Enum for logistics type
CREATE TYPE public.logistics_type AS ENUM (
  'pickup',
  'delivery',
  'collection_point_transfer'
);

-- Main pickups_deliveries table
CREATE TABLE public.pickups_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE NOT NULL,
  collection_point_id UUID REFERENCES public.collection_points(id) ON DELETE SET NULL,
  logistics_type public.logistics_type NOT NULL DEFAULT 'pickup',
  status public.logistics_status NOT NULL DEFAULT 'pickup_requested',
  
  -- Address
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  
  -- Scheduling
  requested_date TIMESTAMPTZ,
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  
  -- People
  contact_name TEXT,
  contact_phone TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  
  -- Proof
  proof_storage_path TEXT,
  proof_notes TEXT,
  
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transport events log
CREATE TABLE public.transport_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pickup_delivery_id UUID REFERENCES public.pickups_deliveries(id) ON DELETE CASCADE NOT NULL,
  from_status public.logistics_status,
  to_status public.logistics_status NOT NULL,
  notes TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pickups_deliveries_so ON public.pickups_deliveries(service_order_id);
CREATE INDEX idx_pickups_deliveries_status ON public.pickups_deliveries(status);
CREATE INDEX idx_transport_events_pd ON public.transport_events(pickup_delivery_id);

-- Updated_at trigger
CREATE TRIGGER set_pickups_deliveries_updated_at
  BEFORE UPDATE ON public.pickups_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.pickups_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pickups_deliveries" ON public.pickups_deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert pickups_deliveries" ON public.pickups_deliveries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update pickups_deliveries" ON public.pickups_deliveries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete pickups_deliveries" ON public.pickups_deliveries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view transport_events" ON public.transport_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert transport_events" ON public.transport_events FOR INSERT TO authenticated WITH CHECK (true);
