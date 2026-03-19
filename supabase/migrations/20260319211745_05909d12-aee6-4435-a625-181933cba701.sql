
-- 1. Enum for period commission status
CREATE TYPE public.cp_commission_period_status AS ENUM ('pending', 'approved', 'paid');

-- 2. Period-based commission table
CREATE TABLE public.cp_commission_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  collection_point_id uuid NOT NULL REFERENCES public.collection_points(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_orders integer NOT NULL DEFAULT 0,
  completed_orders integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status cp_commission_period_status NOT NULL DEFAULT 'pending',
  financial_entry_id uuid REFERENCES public.financial_entries(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, collection_point_id, period_start, period_end)
);

ALTER TABLE public.cp_commission_periods ENABLE ROW LEVEL SECURITY;

-- RLS: tenant isolation
CREATE POLICY "cp_commission_periods_tenant_isolation"
ON public.cp_commission_periods
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (tenant_id = get_active_tenant_id())
WITH CHECK (tenant_id = get_active_tenant_id());

-- Auto-set tenant_id
CREATE TRIGGER set_tenant_id_cp_commission_periods
  BEFORE INSERT ON public.cp_commission_periods
  FOR EACH ROW
  EXECUTE FUNCTION set_tenant_id_on_insert();

-- Updated_at trigger using simple function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_cp_commission_periods
  BEFORE UPDATE ON public.cp_commission_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. RPC: generate_cp_commissions
CREATE OR REPLACE FUNCTION public.generate_cp_commissions(
  _period_start date,
  _period_end date,
  _cp_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid := get_active_tenant_id();
  _row RECORD;
  _count integer := 0;
  _commission numeric;
BEGIN
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'Tenant não identificado';
  END IF;

  FOR _row IN
    WITH unique_orders AS (
      SELECT DISTINCT ON (so.id)
        so.id,
        so.collection_point_id,
        so.total_amount,
        so.status
      FROM service_orders so
      WHERE so.tenant_id = _tenant
        AND so.collection_point_id IS NOT NULL
        AND so.status::text IN ('completed', 'delivered', 'delivered_to_customer')
        AND so.created_at::date >= _period_start
        AND so.created_at::date <= _period_end
        AND (_cp_id IS NULL OR so.collection_point_id = _cp_id)
    )
    SELECT
      cp.id AS cp_id,
      cp.name AS cp_name,
      cp.commission_type,
      cp.commission_value,
      COUNT(*) AS total_orders,
      COUNT(*) AS completed_orders,
      COALESCE(SUM(uo.total_amount), 0) AS total_revenue
    FROM unique_orders uo
    JOIN collection_points cp ON cp.id = uo.collection_point_id
    GROUP BY cp.id, cp.name, cp.commission_type, cp.commission_value
  LOOP
    -- Skip if already exists for this period+cp
    IF EXISTS (
      SELECT 1 FROM cp_commission_periods
      WHERE tenant_id = _tenant
        AND collection_point_id = _row.cp_id
        AND period_start = _period_start
        AND period_end = _period_end
    ) THEN
      CONTINUE;
    END IF;

    -- Calculate commission
    IF _row.commission_type::text = 'percentage' THEN
      _commission := _row.total_revenue * (_row.commission_value / 100);
    ELSIF _row.commission_type::text = 'fixed_per_order' THEN
      _commission := _row.completed_orders * _row.commission_value;
    ELSIF _row.commission_type::text = 'fixed_per_device' THEN
      _commission := _row.completed_orders * _row.commission_value;
    ELSE
      _commission := 0;
    END IF;

    INSERT INTO cp_commission_periods (
      tenant_id, collection_point_id, period_start, period_end,
      total_orders, completed_orders, total_revenue, commission_amount, status
    ) VALUES (
      _tenant, _row.cp_id, _period_start, _period_end,
      _row.total_orders, _row.completed_orders, _row.total_revenue, _commission, 'pending'
    );
    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

-- 4. RPC: approve_cp_commission
CREATE OR REPLACE FUNCTION public.approve_cp_commission(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec RECORD;
  _tenant uuid := get_active_tenant_id();
  _cp_name text;
  _fe_id uuid;
BEGIN
  SELECT * INTO _rec
  FROM cp_commission_periods
  WHERE id = _id AND tenant_id = _tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comissão não encontrada';
  END IF;

  IF _rec.status != 'pending' THEN
    RAISE EXCEPTION 'Apenas comissões pendentes podem ser aprovadas (status atual: %)', _rec.status;
  END IF;

  SELECT name INTO _cp_name FROM collection_points WHERE id = _rec.collection_point_id;

  INSERT INTO financial_entries (
    tenant_id, entry_type, description, amount, paid_amount, status, category, collection_point_id, created_by
  ) VALUES (
    _tenant, 'expense', 'Comissão ponto: ' || COALESCE(_cp_name, 'N/A') || ' (' || _rec.period_start || ' a ' || _rec.period_end || ')',
    _rec.commission_amount, 0, 'pending', 'Comissão Ponto de Coleta', _rec.collection_point_id, auth.uid()
  ) RETURNING id INTO _fe_id;

  UPDATE cp_commission_periods
  SET status = 'approved', financial_entry_id = _fe_id, updated_at = now()
  WHERE id = _id;
END;
$$;

-- 5. RPC: pay_cp_commission
CREATE OR REPLACE FUNCTION public.pay_cp_commission(_id uuid, _method text DEFAULT 'pix')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec RECORD;
  _tenant uuid := get_active_tenant_id();
  _register_id uuid;
  _affects_cash boolean;
  _affects_bank boolean;
BEGIN
  SELECT * INTO _rec
  FROM cp_commission_periods
  WHERE id = _id AND tenant_id = _tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comissão não encontrada';
  END IF;

  IF _rec.status = 'pending' THEN
    RAISE EXCEPTION 'Comissão precisa ser aprovada antes de pagar';
  END IF;

  IF _rec.status = 'paid' THEN
    RAISE EXCEPTION 'Comissão já foi paga';
  END IF;

  IF _rec.financial_entry_id IS NOT NULL THEN
    UPDATE financial_entries
    SET paid_amount = amount, status = 'paid', updated_at = now()
    WHERE id = _rec.financial_entry_id AND tenant_id = _tenant;
  END IF;

  _affects_cash := _method IN ('cash', 'dinheiro');
  _affects_bank := NOT _affects_cash;

  SELECT id INTO _register_id
  FROM cash_registers
  WHERE tenant_id = _tenant AND status = 'open'
  LIMIT 1;

  IF _register_id IS NOT NULL THEN
    INSERT INTO cash_register_movements (
      tenant_id, cash_register_id, movement_type, amount, description,
      payment_method, source_type, reference_id, affects_cash, affects_bank
    ) VALUES (
      _tenant, _register_id, 'withdrawal', _rec.commission_amount,
      'Pagamento comissão ponto de coleta',
      _method, 'cp_commission', _id::text, _affects_cash, _affects_bank
    );
  END IF;

  UPDATE cp_commission_periods
  SET status = 'paid', updated_at = now()
  WHERE id = _id;
END;
$$;
