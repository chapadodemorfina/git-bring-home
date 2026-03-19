
-- 1. PARTIAL UNIQUE INDEX: enforce exactly one open register per tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_open_register_per_tenant
  ON cash_registers (tenant_id) WHERE status = 'open';

-- 2. TRIGGER: block edits on closed cash registers
CREATE OR REPLACE FUNCTION public.trg_protect_closed_cash_register()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow status transition from open to closed (the close operation itself)
  IF TG_OP = 'UPDATE' AND OLD.status = 'open' AND NEW.status = 'closed' THEN
    RETURN NEW;
  END IF;
  -- Block any other update on closed registers
  IF TG_OP = 'UPDATE' AND OLD.status = 'closed' THEN
    RAISE EXCEPTION 'Não é possível editar um caixa já fechado.'
      USING ERRCODE = 'P0001';
  END IF;
  -- Block deletes on any register
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Não é permitido excluir registros de caixa.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_closed_cash_register ON cash_registers;
CREATE TRIGGER trg_protect_closed_cash_register
  BEFORE UPDATE OR DELETE ON cash_registers
  FOR EACH ROW EXECUTE FUNCTION public.trg_protect_closed_cash_register();

-- 3. TRIGGER: block edits/deletes on movements of closed registers
CREATE OR REPLACE FUNCTION public.trg_protect_closed_movements()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _status text;
BEGIN
  -- On INSERT, check if the target register is open
  IF TG_OP = 'INSERT' THEN
    SELECT status::text INTO _status FROM cash_registers WHERE id = NEW.cash_register_id;
    IF _status <> 'open' THEN
      RAISE EXCEPTION 'Não é possível adicionar movimentação em caixa fechado.'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  -- On UPDATE or DELETE, check the register status
  SELECT status::text INTO _status FROM cash_registers WHERE id = OLD.cash_register_id;
  IF _status = 'closed' THEN
    RAISE EXCEPTION 'Não é possível alterar movimentações de caixa já fechado.'
      USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_closed_movements ON cash_register_movements;
CREATE TRIGGER trg_protect_closed_movements
  BEFORE INSERT OR UPDATE OR DELETE ON cash_register_movements
  FOR EACH ROW EXECUTE FUNCTION public.trg_protect_closed_movements();

-- 4. TRIGGER: audit log on cash register open/close
CREATE OR REPLACE FUNCTION public.trg_audit_cash_register()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On INSERT (open)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (tenant_id, user_id, action, table_name, record_id, new_data)
    VALUES (
      NEW.tenant_id,
      NEW.opened_by,
      'cash_register_opened',
      'cash_registers',
      NEW.id,
      jsonb_build_object(
        'initial_amount', NEW.initial_amount,
        'opening_bank_balance', NEW.opening_bank_balance,
        'notes', NEW.notes,
        'opened_at', NEW.opened_at
      )
    );
    RETURN NEW;
  END IF;
  -- On UPDATE (close)
  IF TG_OP = 'UPDATE' AND OLD.status = 'open' AND NEW.status = 'closed' THEN
    INSERT INTO audit_logs (tenant_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      NEW.tenant_id,
      NEW.closed_by,
      'cash_register_closed',
      'cash_registers',
      NEW.id,
      jsonb_build_object(
        'initial_amount', OLD.initial_amount,
        'opening_bank_balance', OLD.opening_bank_balance,
        'opened_at', OLD.opened_at
      ),
      jsonb_build_object(
        'closed_at', NEW.closed_at,
        'expected_amount', NEW.expected_amount,
        'counted_amount', NEW.counted_amount,
        'difference_amount', NEW.difference_amount,
        'expected_bank_balance', NEW.expected_bank_balance,
        'closing_bank_balance', NEW.closing_bank_balance,
        'difference_bank', NEW.difference_bank,
        'closing_notes', NEW.closing_notes
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_cash_register ON cash_registers;
CREATE TRIGGER trg_audit_cash_register
  AFTER INSERT OR UPDATE ON cash_registers
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_cash_register();

-- 5. FUNCTION: get last closed register balances for suggested opening
CREATE OR REPLACE FUNCTION public.get_last_closed_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tid uuid := public.get_active_tenant_id();
  _result jsonb;
BEGIN
  IF _tid IS NULL THEN RAISE EXCEPTION 'Tenant not set'; END IF;

  SELECT jsonb_build_object(
    'last_cash_balance', COALESCE(cr.counted_amount, cr.expected_amount, cr.initial_amount),
    'last_bank_balance', COALESCE(cr.closing_bank_balance, cr.expected_bank_balance, cr.opening_bank_balance),
    'closed_at', cr.closed_at,
    'opened_by_name', p.full_name
  ) INTO _result
  FROM cash_registers cr
  LEFT JOIN profiles p ON p.id = cr.opened_by
  WHERE cr.tenant_id = _tid AND cr.status = 'closed'
  ORDER BY cr.closed_at DESC NULLS LAST
  LIMIT 1;

  RETURN COALESCE(_result, jsonb_build_object('last_cash_balance', 0, 'last_bank_balance', 0, 'closed_at', null, 'opened_by_name', null));
END;
$$;
