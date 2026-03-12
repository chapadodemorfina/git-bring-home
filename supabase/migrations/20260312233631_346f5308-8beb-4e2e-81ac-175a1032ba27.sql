
-- Enums for scrap module
CREATE TYPE public.scrap_category AS ENUM (
  'aparelho_completo', 'placa', 'carcaca', 'tela_quebrada', 'lote_pecas', 'acessorio'
);

CREATE TYPE public.scrap_status AS ENUM (
  'aguardando_triagem', 'triada', 'desmontada', 'pecas_recuperadas', 'descartada', 'vendida', 'usada_internamente'
);

-- Expand inventory_scrap with new columns
ALTER TABLE public.inventory_scrap
  ADD COLUMN scrap_category public.scrap_category DEFAULT 'aparelho_completo',
  ADD COLUMN status public.scrap_status DEFAULT 'aguardando_triagem',
  ADD COLUMN service_order_id uuid REFERENCES public.service_orders(id),
  ADD COLUMN customer_id uuid REFERENCES public.customers(id),
  ADD COLUMN imei_serial text,
  ADD COLUMN color text,
  ADD COLUMN estimated_recovery_value numeric DEFAULT 0;

-- Triage table
CREATE TABLE public.scrap_triage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrap_id uuid NOT NULL REFERENCES public.inventory_scrap(id) ON DELETE CASCADE,
  triaged_by uuid REFERENCES auth.users(id),
  still_powers_on boolean DEFAULT false,
  board_responsive boolean DEFAULT false,
  screen_usable boolean DEFAULT false,
  carcass_usable boolean DEFAULT false,
  camera_usable boolean DEFAULT false,
  connectors_usable boolean DEFAULT false,
  battery_usable boolean DEFAULT false,
  buttons_flex_usable boolean DEFAULT false,
  speaker_mic_usable boolean DEFAULT false,
  charge_module_usable boolean DEFAULT false,
  destination text,
  recovery_potential text,
  estimated_value numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Carcass details table
CREATE TABLE public.scrap_carcass_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrap_id uuid NOT NULL REFERENCES public.inventory_scrap(id) ON DELETE CASCADE UNIQUE,
  color text,
  aesthetic_state text,
  back_cover_ok boolean DEFAULT false,
  frame_ok boolean DEFAULT false,
  buttons_ok boolean DEFAULT false,
  sim_tray_ok boolean DEFAULT false,
  lenses_ok boolean DEFAULT false,
  missing_details text,
  purpose text DEFAULT 'estoque',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.scrap_triage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrap_carcass_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage scrap_triage"
  ON public.scrap_triage FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage scrap_carcass_details"
  ON public.scrap_carcass_details FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Dashboard RPC
CREATE OR REPLACE FUNCTION public.scrap_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total', (SELECT COUNT(*) FROM inventory_scrap),
      'by_status', (
        SELECT COALESCE(jsonb_object_agg(status::text, cnt), '{}'::jsonb)
        FROM (SELECT status, COUNT(*) as cnt FROM inventory_scrap GROUP BY status) s
      ),
      'by_category', (
        SELECT COALESCE(jsonb_object_agg(scrap_category::text, cnt), '{}'::jsonb)
        FROM (SELECT scrap_category, COUNT(*) as cnt FROM inventory_scrap GROUP BY scrap_category) c
      ),
      'by_brand', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('brand', brand, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
        FROM (SELECT COALESCE(brand, 'Sem marca') as brand, COUNT(*) as cnt FROM inventory_scrap GROUP BY brand ORDER BY cnt DESC LIMIT 10) b
      ),
      'estimated_recovery', (SELECT COALESCE(SUM(estimated_recovery_value), 0) FROM inventory_scrap WHERE status NOT IN ('descartada', 'vendida')),
      'actual_recovery', (
        SELECT COALESCE(SUM(spr.quantity * COALESCE(p.cost_price, 0)), 0)
        FROM scrap_parts_recovered spr
        JOIN products p ON p.id = spr.product_id
        WHERE spr.added_to_stock = true
      ),
      'top_recovered_parts', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', p.name, 'total_qty', total_qty) ORDER BY total_qty DESC), '[]'::jsonb)
        FROM (
          SELECT product_id, SUM(quantity) as total_qty
          FROM scrap_parts_recovered WHERE added_to_stock = true
          GROUP BY product_id ORDER BY total_qty DESC LIMIT 10
        ) t
        JOIN products p ON p.id = t.product_id
      )
    )
  );
END;
$$;
