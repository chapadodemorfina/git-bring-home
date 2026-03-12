
-- Add columns to suppliers table
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS supplier_type text DEFAULT 'distribuidor_local',
  ADD COLUMN IF NOT EXISTS lead_time_days integer DEFAULT 7;

-- Create inventory_scrap table
CREATE TABLE public.inventory_scrap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type text NOT NULL,
  brand text,
  model text,
  condition text,
  salvageable_parts text,
  location text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_scrap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_scrap" ON public.inventory_scrap
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role, 'front_desk'::app_role]));

CREATE POLICY "staff_insert_scrap" ON public.inventory_scrap
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'front_desk'::app_role]));

CREATE POLICY "staff_update_scrap" ON public.inventory_scrap
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role]));

CREATE POLICY "admin_delete_scrap" ON public.inventory_scrap
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
