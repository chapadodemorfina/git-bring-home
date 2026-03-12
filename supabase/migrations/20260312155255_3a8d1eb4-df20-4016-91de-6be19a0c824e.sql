
-- Scrap disassembly records
CREATE TABLE public.scrap_disassembly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrap_id uuid NOT NULL REFERENCES public.inventory_scrap(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scrap_disassembly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view disassemblies"
  ON public.scrap_disassembly FOR SELECT TO authenticated USING (true);

CREATE POLICY "Technicians and admins can insert disassemblies"
  ON public.scrap_disassembly FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'bench_technician', 'field_technician']::app_role[])
  );

-- Recovered parts from disassembly
CREATE TABLE public.scrap_parts_recovered (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disassembly_id uuid NOT NULL REFERENCES public.scrap_disassembly(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  condition text NOT NULL DEFAULT 'usado',
  added_to_stock boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scrap_parts_recovered ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recovered parts"
  ON public.scrap_parts_recovered FOR SELECT TO authenticated USING (true);

CREATE POLICY "Technicians and admins can insert recovered parts"
  ON public.scrap_parts_recovered FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'bench_technician', 'field_technician']::app_role[])
  );

CREATE POLICY "Technicians and admins can update recovered parts"
  ON public.scrap_parts_recovered FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'bench_technician', 'field_technician']::app_role[])
  );

-- RPC to recover a scrap part into stock atomically
CREATE OR REPLACE FUNCTION public.recover_scrap_part(
  _recovered_part_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _part scrap_parts_recovered%ROWTYPE;
  _product products%ROWTYPE;
  _user_id uuid;
  _new_qty integer;
BEGIN
  _user_id := auth.uid();

  SELECT * INTO _part FROM scrap_parts_recovered WHERE id = _recovered_part_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Peça recuperada não encontrada'; END IF;
  IF _part.added_to_stock THEN RAISE EXCEPTION 'Peça já foi adicionada ao estoque'; END IF;

  SELECT * INTO _product FROM products WHERE id = _part.product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;

  _new_qty := _product.quantity + _part.quantity;

  UPDATE products SET quantity = _new_qty WHERE id = _part.product_id;

  INSERT INTO stock_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference_type, reference_id, notes, created_by)
  VALUES (_part.product_id, 'scrap_recovery', _part.quantity, _product.quantity, _new_qty, _product.cost_price, 'scrap_disassembly', _part.disassembly_id, 'Recuperado de sucata - Condição: ' || _part.condition, _user_id);

  UPDATE scrap_parts_recovered SET added_to_stock = true WHERE id = _recovered_part_id;

  RETURN jsonb_build_object('success', true, 'new_quantity', _new_qty);
END;
$$;
