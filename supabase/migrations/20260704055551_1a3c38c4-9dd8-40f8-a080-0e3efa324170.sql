
-- ============================================================
-- FASE 2A.5c-2.1: Blindar mutações financeiras
-- ============================================================

-- ------------------------------------------------------------
-- 1. register_payment (legacy overload: _financial_entry_id, ...)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_payment(
  _financial_entry_id uuid,
  _amount numeric,
  _payment_method text DEFAULT 'pix'::text,
  _payment_date timestamp with time zone DEFAULT now(),
  _reference text DEFAULT NULL::text,
  _notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _entry financial_entries%ROWTYPE;
  _user_id uuid;
  _tid uuid := public.get_active_tenant_id();
  _new_paid numeric;
  _new_status financial_entry_status;
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  _user_id := auth.uid();

  SELECT * INTO _entry
  FROM financial_entries
  WHERE id = _financial_entry_id AND tenant_id = _tid
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento financeiro não encontrado';
  END IF;

  _new_paid := _entry.paid_amount + _amount;
  IF _new_paid > _entry.amount THEN
    RAISE EXCEPTION 'Pagamento excede o saldo restante';
  END IF;

  IF _new_paid >= _entry.amount THEN
    _new_status := 'paid';
  ELSE
    _new_status := 'partial';
  END IF;

  INSERT INTO payments (
    financial_entry_id, amount, payment_method, payment_date,
    reference, notes, created_by, tenant_id
  )
  VALUES (
    _financial_entry_id, _amount, _payment_method::payment_method, _payment_date,
    _reference, _notes, _user_id, _tid
  );

  UPDATE financial_entries
  SET paid_amount = _new_paid, status = _new_status
  WHERE id = _financial_entry_id AND tenant_id = _tid;

  RETURN jsonb_build_object(
    'success', true,
    'new_paid_amount', _new_paid,
    'new_status', _new_status::text
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.register_payment(uuid, numeric, text, timestamptz, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_payment(uuid, numeric, text, timestamptz, text, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.register_payment(uuid, numeric, text, timestamptz, text, text) TO authenticated;

-- ------------------------------------------------------------
-- 2. register_payment (new overload: _entry_id, ..., _installments)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_payment(
  _entry_id uuid,
  _amount numeric,
  _method text,
  _notes text DEFAULT NULL::text,
  _reference text DEFAULT NULL::text,
  _installment_number integer DEFAULT NULL::integer,
  _total_installments integer DEFAULT NULL::integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _entry financial_entries%ROWTYPE;
  _new_paid numeric;
  _new_status financial_entry_status;
  _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _entry
  FROM financial_entries
  WHERE id = _entry_id AND tenant_id = _tid
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada financeira não encontrada';
  END IF;

  _new_paid := _entry.paid_amount + _amount;
  IF _new_paid >= _entry.amount THEN
    _new_status := 'paid';
  ELSE
    _new_status := 'partial';
  END IF;

  UPDATE financial_entries
  SET paid_amount = _new_paid, status = _new_status, updated_at = now()
  WHERE id = _entry_id AND tenant_id = _tid;

  INSERT INTO payments (
    financial_entry_id, amount, payment_method, notes, reference,
    installment_number, total_installments, created_by, tenant_id
  )
  VALUES (
    _entry_id, _amount, _method, _notes, _reference,
    _installment_number, _total_installments, auth.uid(), _tid
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_paid', _new_paid,
    'new_status', _new_status
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.register_payment(uuid, numeric, text, text, text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_payment(uuid, numeric, text, text, text, integer, integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.register_payment(uuid, numeric, text, text, text, integer, integer) TO authenticated;

-- ------------------------------------------------------------
-- 3. register_receivable_payment
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_receivable_payment(
  _receivable_id uuid,
  _amount numeric,
  _payment_method text DEFAULT 'pix'::text,
  _notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _rec accounts_receivable%ROWTYPE;
  _new_received NUMERIC;
  _new_status TEXT;
  _user_id UUID;
  _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  _user_id := auth.uid();

  SELECT * INTO _rec
  FROM accounts_receivable
  WHERE id = _receivable_id AND tenant_id = _tid
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta a receber não encontrada';
  END IF;
  IF _rec.status = 'cancelled' THEN
    RAISE EXCEPTION 'Conta cancelada';
  END IF;
  IF _rec.status = 'paid' THEN
    RAISE EXCEPTION 'Conta já quitada';
  END IF;

  _new_received := _rec.amount_received + _amount;
  IF _new_received > _rec.total_amount THEN
    RAISE EXCEPTION 'Pagamento excede o saldo restante';
  END IF;

  IF _new_received >= _rec.total_amount THEN
    _new_status := 'paid';
  ELSE
    _new_status := 'partial';
  END IF;

  INSERT INTO receivable_payments (receivable_id, amount, payment_method, notes, created_by, tenant_id)
  VALUES (_receivable_id, _amount, _payment_method, _notes, _user_id, _tid);

  UPDATE accounts_receivable
  SET amount_received = _new_received, status = _new_status
  WHERE id = _receivable_id AND tenant_id = _tid;

  INSERT INTO financial_entries (
    entry_type, description, amount, paid_amount, customer_id, category, status, created_by, tenant_id
  )
  VALUES (
    'revenue', 'Recebimento - ' || _rec.description, _amount, _amount,
    _rec.customer_id, 'receivable_payment', 'paid', _user_id, _tid
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_received', _new_received,
    'new_status', _new_status
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.register_receivable_payment(uuid, numeric, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_receivable_payment(uuid, numeric, text, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.register_receivable_payment(uuid, numeric, text, text) TO authenticated;

-- ------------------------------------------------------------
-- 4. close_cash_register
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_cash_register(
  _register_id uuid,
  _counted_amount numeric,
  _closing_notes text DEFAULT NULL::text,
  _counted_bank_balance numeric DEFAULT NULL::numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _register
  FROM cash_registers
  WHERE id = _register_id AND tenant_id = _tid
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caixa não encontrado';
  END IF;
  IF _register.status = 'closed' THEN
    RAISE EXCEPTION 'Caixa já está fechado';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN amount > 0 AND affects_cash THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN amount < 0 AND affects_cash THEN ABS(amount) ELSE 0 END), 0)
  INTO _total_cash_in, _total_cash_out
  FROM cash_register_movements
  WHERE cash_register_id = _register_id AND tenant_id = _tid;

  _expected_cash := _register.initial_amount + _total_cash_in - _total_cash_out;
  _diff_cash := _counted_amount - _expected_cash;

  SELECT
    COALESCE(SUM(CASE WHEN amount > 0 AND affects_bank THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN amount < 0 AND affects_bank THEN ABS(amount) ELSE 0 END), 0)
  INTO _total_bank_in, _total_bank_out
  FROM cash_register_movements
  WHERE cash_register_id = _register_id AND tenant_id = _tid;

  _expected_bank := COALESCE(_register.opening_bank_balance, 0) + _total_bank_in - _total_bank_out;
  _diff_bank := CASE WHEN _counted_bank_balance IS NOT NULL THEN _counted_bank_balance - _expected_bank ELSE NULL END;

  UPDATE cash_registers SET
    status = 'closed',
    closed_by = auth.uid(),
    closed_at = now(),
    expected_amount = _expected_cash,
    counted_amount = _counted_amount,
    difference_amount = _diff_cash,
    expected_bank_balance = _expected_bank,
    closing_bank_balance = _counted_bank_balance,
    difference_bank = _diff_bank,
    closing_notes = _closing_notes
  WHERE id = _register_id AND tenant_id = _tid;

  RETURN jsonb_build_object(
    'success', true,
    'expected_cash', _expected_cash,
    'counted_cash', _counted_amount,
    'difference_cash', _diff_cash,
    'expected_bank', _expected_bank,
    'counted_bank', _counted_bank_balance,
    'difference_bank', _diff_bank
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.close_cash_register(uuid, numeric, text, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_cash_register(uuid, numeric, text, numeric) FROM anon;
GRANT  EXECUTE ON FUNCTION public.close_cash_register(uuid, numeric, text, numeric) TO authenticated;
