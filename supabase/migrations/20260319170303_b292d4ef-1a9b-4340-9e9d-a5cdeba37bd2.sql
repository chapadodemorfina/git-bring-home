
-- 1. Add missing FK for closed_by (opened_by FK already exists)
DO $$ BEGIN
  ALTER TABLE cash_registers ADD CONSTRAINT cash_registers_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES profiles(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE cash_register_movements ADD CONSTRAINT cash_register_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add bank balance columns to cash_registers
ALTER TABLE cash_registers
  ADD COLUMN IF NOT EXISTS opening_bank_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_bank_balance numeric,
  ADD COLUMN IF NOT EXISTS expected_bank_balance numeric,
  ADD COLUMN IF NOT EXISTS difference_bank numeric;

-- 3. Add affects_cash/affects_bank and source_type to movements
ALTER TABLE cash_register_movements
  ADD COLUMN IF NOT EXISTS affects_cash boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS affects_bank boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual';

-- 4. Close orphaned open registers
UPDATE cash_registers
  SET status = 'closed', closed_at = now(), closing_notes = 'Fechado automaticamente (correção de dados)'
  WHERE status = 'open';

-- 5. Update close_cash_register to handle bank balances
CREATE OR REPLACE FUNCTION public.close_cash_register(
  _register_id uuid,
  _counted_amount numeric,
  _closing_notes text DEFAULT NULL,
  _counted_bank_balance numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _register cash_registers%ROWTYPE;
  _total_cash_in NUMERIC;
  _total_cash_out NUMERIC;
  _total_bank_in NUMERIC;
  _total_bank_out NUMERIC;
  _expected_cash NUMERIC;
  _expected_bank NUMERIC;
  _diff_cash NUMERIC;
  _diff_bank NUMERIC;
BEGIN
  SELECT * INTO _register FROM cash_registers WHERE id = _register_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caixa não encontrado'; END IF;
  IF _register.status = 'closed' THEN RAISE EXCEPTION 'Caixa já está fechado'; END IF;

  SELECT
    COALESCE(SUM(CASE WHEN amount > 0 AND affects_cash THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN amount < 0 AND affects_cash THEN ABS(amount) ELSE 0 END), 0)
  INTO _total_cash_in, _total_cash_out
  FROM cash_register_movements WHERE cash_register_id = _register_id;

  _expected_cash := _register.initial_amount + _total_cash_in - _total_cash_out;
  _diff_cash := _counted_amount - _expected_cash;

  SELECT
    COALESCE(SUM(CASE WHEN amount > 0 AND affects_bank THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN amount < 0 AND affects_bank THEN ABS(amount) ELSE 0 END), 0)
  INTO _total_bank_in, _total_bank_out
  FROM cash_register_movements WHERE cash_register_id = _register_id;

  _expected_bank := COALESCE(_register.opening_bank_balance, 0) + _total_bank_in - _total_bank_out;
  _diff_bank := CASE WHEN _counted_bank_balance IS NOT NULL THEN _counted_bank_balance - _expected_bank ELSE NULL END;

  UPDATE cash_registers SET
    status = 'closed', closed_by = auth.uid(), closed_at = now(),
    expected_amount = _expected_cash, counted_amount = _counted_amount, difference_amount = _diff_cash,
    expected_bank_balance = _expected_bank, closing_bank_balance = _counted_bank_balance, difference_bank = _diff_bank,
    closing_notes = _closing_notes
  WHERE id = _register_id;

  RETURN jsonb_build_object(
    'success', true, 'expected_cash', _expected_cash, 'counted_cash', _counted_amount,
    'difference_cash', _diff_cash, 'expected_bank', _expected_bank,
    'counted_bank', _counted_bank_balance, 'difference_bank', _diff_bank
  );
END;
$$;

-- 6. Create function to get current financial balances
CREATE OR REPLACE FUNCTION public.get_financial_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tid uuid := public.get_active_tenant_id();
  _today_start timestamptz := date_trunc('day', now());
  _result jsonb;
BEGIN
  IF _tid IS NULL THEN RAISE EXCEPTION 'Tenant not set'; END IF;

  SELECT jsonb_build_object(
    'cash_balance', (
      SELECT COALESCE((
        SELECT cr.initial_amount
          + COALESCE(SUM(CASE WHEN m.affects_cash AND m.amount > 0 THEN m.amount ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN m.affects_cash AND m.amount < 0 THEN ABS(m.amount) ELSE 0 END), 0)
        FROM cash_registers cr
        LEFT JOIN cash_register_movements m ON m.cash_register_id = cr.id
        WHERE cr.tenant_id = _tid AND cr.status = 'open'
        GROUP BY cr.id, cr.initial_amount
        LIMIT 1
      ), 0)
    ),
    'bank_balance', (
      SELECT COALESCE((
        SELECT COALESCE(cr.opening_bank_balance, 0)
          + COALESCE(SUM(CASE WHEN m.affects_bank AND m.amount > 0 THEN m.amount ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN m.affects_bank AND m.amount < 0 THEN ABS(m.amount) ELSE 0 END), 0)
        FROM cash_registers cr
        LEFT JOIN cash_register_movements m ON m.cash_register_id = cr.id
        WHERE cr.tenant_id = _tid AND cr.status = 'open'
        GROUP BY cr.id, cr.opening_bank_balance
        LIMIT 1
      ), 0)
    ),
    'is_register_open', EXISTS(SELECT 1 FROM cash_registers WHERE tenant_id = _tid AND status = 'open'),
    'today_income', (
      SELECT COALESCE(SUM(amount), 0) FROM financial_entries
      WHERE tenant_id = _tid AND entry_type = 'revenue' AND status <> 'cancelled' AND created_at >= _today_start
    ),
    'today_expenses', (
      SELECT COALESCE(SUM(amount), 0) FROM financial_entries
      WHERE tenant_id = _tid AND entry_type IN ('expense', 'commission') AND status <> 'cancelled' AND created_at >= _today_start
    ),
    'receivables_total', (
      SELECT COALESCE(SUM(amount - paid_amount), 0) FROM financial_entries
      WHERE tenant_id = _tid AND entry_type = 'revenue' AND status IN ('pending', 'partial', 'overdue')
    ),
    'payables_total', (
      SELECT COALESCE(SUM(amount - paid_amount), 0) FROM financial_entries
      WHERE tenant_id = _tid AND entry_type IN ('expense', 'commission') AND status IN ('pending', 'partial', 'overdue')
    ),
    'overdue_count', (
      SELECT COUNT(*) FROM financial_entries WHERE tenant_id = _tid AND status = 'overdue'
    )
  ) INTO _result;

  RETURN _result;
END;
$$;
