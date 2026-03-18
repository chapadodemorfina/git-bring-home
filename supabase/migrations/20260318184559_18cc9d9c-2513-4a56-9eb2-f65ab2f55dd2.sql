-- Add missing company settings
INSERT INTO app_settings (key, value, description) VALUES
  ('company_cnpj', '', 'CNPJ da empresa'),
  ('company_address', '', 'Endereço completo da empresa'),
  ('company_logo_url', '', 'URL do logotipo da empresa')
ON CONFLICT (key) DO NOTHING;

-- Technical checklists for service orders (entry/exit)
CREATE TABLE IF NOT EXISTS service_order_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  checklist_type text NOT NULL DEFAULT 'entry' CHECK (checklist_type IN ('entry', 'exit')),
  technician_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE service_order_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage checklists"
  ON service_order_checklists FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_so_checklists_order ON service_order_checklists(service_order_id, checklist_type);
