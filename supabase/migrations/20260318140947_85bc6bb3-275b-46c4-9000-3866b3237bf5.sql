
-- Enum for cash register status
CREATE TYPE public.cash_register_status AS ENUM ('open', 'closed');

-- Enum for cash movement type
CREATE TYPE public.cash_movement_type AS ENUM ('sale', 'receipt', 'withdrawal', 'reinforcement', 'expense', 'adjustment');

-- Cash registers table
CREATE TABLE public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by UUID REFERENCES auth.users(id) NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  initial_amount NUMERIC NOT NULL DEFAULT 0,
  status public.cash_register_status NOT NULL DEFAULT 'open',
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  expected_amount NUMERIC,
  counted_amount NUMERIC,
  difference_amount NUMERIC,
  notes TEXT,
  closing_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cash register movements table
CREATE TABLE public.cash_register_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE CASCADE NOT NULL,
  movement_type public.cash_movement_type NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cash_registers_status ON public.cash_registers(status);
CREATE INDEX idx_cash_registers_opened_by ON public.cash_registers(opened_by);
CREATE INDEX idx_cash_register_movements_register ON public.cash_register_movements(cash_register_id);
CREATE INDEX idx_cash_register_movements_type ON public.cash_register_movements(movement_type);

-- Updated_at trigger
CREATE TRIGGER set_cash_registers_updated_at
  BEFORE UPDATE ON public.cash_registers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;

-- Cash registers policies (staff roles)
CREATE POLICY "Staff can view cash registers"
  ON public.cash_registers FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk', 'finance']::app_role[]));

CREATE POLICY "Staff can insert cash registers"
  ON public.cash_registers FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk']::app_role[]));

CREATE POLICY "Staff can update cash registers"
  ON public.cash_registers FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk']::app_role[]));

-- Cash register movements policies
CREATE POLICY "Staff can view movements"
  ON public.cash_register_movements FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk', 'finance']::app_role[]));

CREATE POLICY "Staff can insert movements"
  ON public.cash_register_movements FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk']::app_role[]));

-- Function to close cash register with calculated expected amount
CREATE OR REPLACE FUNCTION public.close_cash_register(
  _register_id UUID,
  _counted_amount NUMERIC,
  _closing_notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _register cash_registers%ROWTYPE;
  _total_in NUMERIC;
  _total_out NUMERIC;
  _expected NUMERIC;
  _difference NUMERIC;
BEGIN
  SELECT * INTO _register FROM cash_registers WHERE id = _register_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caixa não encontrado'; END IF;
  IF _register.status = 'closed' THEN RAISE EXCEPTION 'Caixa já está fechado'; END IF;

  -- Calculate expected: initial + all ins - all outs
  SELECT
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)
  INTO _total_in, _total_out
  FROM cash_register_movements
  WHERE cash_register_id = _register_id;

  _expected := _register.initial_amount + _total_in - _total_out;
  _difference := _counted_amount - _expected;

  UPDATE cash_registers SET
    status = 'closed',
    closed_by = auth.uid(),
    closed_at = now(),
    expected_amount = _expected,
    counted_amount = _counted_amount,
    difference_amount = _difference,
    closing_notes = _closing_notes
  WHERE id = _register_id;

  RETURN jsonb_build_object(
    'success', true,
    'expected_amount', _expected,
    'counted_amount', _counted_amount,
    'difference', _difference
  );
END;
$$;
