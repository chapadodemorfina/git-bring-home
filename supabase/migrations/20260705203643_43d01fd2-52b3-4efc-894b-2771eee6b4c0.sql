CREATE OR REPLACE FUNCTION public.process_sale_payment(
  _sale_id uuid,
  _amount numeric,
  _payment_method text,
  _installments integer DEFAULT NULL,
  _reference text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _cash_register_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _active_tenant_id uuid;
  _sale record;
  _already_paid numeric;
  _remaining numeric;
  _new_paid_total numeric;
  _new_payment_status sale_payment_status;
  _payment_id uuid;
  _cash_movement_id uuid;
  _cash_ok boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  _active_tenant_id := public.get_active_tenant_id();
  IF _active_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_permission(auth.uid(), 'sales.payment') THEN
    RAISE EXCEPTION 'forbidden: sales.payment required' USING ERRCODE = '42501';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'invalid payment amount' USING ERRCODE = '22023';
  END IF;

  IF _payment_method IS NULL OR btrim(_payment_method) = '' THEN
    RAISE EXCEPTION 'payment method required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO _sale
  FROM public.sales
  WHERE id = _sale_id AND tenant_id = _active_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sale not found or access denied' USING ERRCODE = '42501';
  END IF;

  IF _sale.status::text IN ('draft','cancelled','refunded') THEN
    RAISE EXCEPTION 'sale status does not allow payment: %', _sale.status USING ERRCODE = '22023';
  END IF;

  IF _sale.payment_status::text IN ('paid','refunded','cancelled') THEN
    RAISE EXCEPTION 'sale payment status does not allow new payment: %', _sale.payment_status USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(sum(amount), 0) INTO _already_paid
  FROM public.sale_payments
  WHERE sale_id = _sale_id AND tenant_id = _active_tenant_id;

  _remaining := _sale.total_amount - _already_paid;
  IF _amount > _remaining + 0.005 THEN
    RAISE EXCEPTION 'payment amount (%) exceeds remaining balance (%)', _amount, _remaining USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.sale_payments (
    tenant_id, sale_id, payment_method, amount, installments, reference, notes, paid_at
  ) VALUES (
    _active_tenant_id, _sale_id, _payment_method::sale_payment_method, _amount,
    _installments, _reference, _notes, now()
  ) RETURNING id INTO _payment_id;

  _new_paid_total := _already_paid + _amount;
  IF _new_paid_total >= _sale.total_amount - 0.005 THEN
    _new_payment_status := 'paid'::sale_payment_status;
  ELSIF _new_paid_total > 0 THEN
    _new_payment_status := 'partial'::sale_payment_status;
  ELSE
    _new_payment_status := 'pending'::sale_payment_status;
  END IF;

  UPDATE public.sales
  SET payment_status = _new_payment_status, updated_at = now()
  WHERE id = _sale_id AND tenant_id = _active_tenant_id;

  IF _cash_register_id IS NOT NULL THEN
    PERFORM 1 FROM public.cash_registers
    WHERE id = _cash_register_id AND tenant_id = _active_tenant_id AND status = 'open'
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'cash register not found, not open, or not in active tenant' USING ERRCODE = '42501';
    END IF;

    IF NOT public.has_permission(auth.uid(), 'cash_register.movement') THEN
      RAISE EXCEPTION 'forbidden: cash_register.movement required' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.cash_register_movements (
      tenant_id, cash_register_id, movement_type, payment_method, amount,
      description, reference_type, reference_id, created_by, source_type
    ) VALUES (
      _active_tenant_id, _cash_register_id, 'sale'::cash_movement_type, _payment_method, _amount,
      'Pagamento de venda ' || coalesce(_sale.sale_number, _sale_id::text),
      'sale_payment', _payment_id, auth.uid(), 'sale_payment'
    ) RETURNING id INTO _cash_movement_id;

    _cash_ok := true;
  END IF;

  INSERT INTO public.audit_logs (
    tenant_id, user_id, table_name, record_id, action, old_data, new_data
  ) VALUES (
    _active_tenant_id, auth.uid(), 'sales', _sale_id, 'sale_payment_processed',
    jsonb_build_object(
      'payment_status', _sale.payment_status,
      'already_paid', _already_paid,
      'total_amount', _sale.total_amount
    ),
    jsonb_build_object(
      'payment_id', _payment_id,
      'amount', _amount,
      'payment_method', _payment_method,
      'installments', _installments,
      'reference', _reference,
      'new_paid_total', _new_paid_total,
      'new_payment_status', _new_payment_status,
      'cash_register_id', _cash_register_id,
      'cash_register_movement_id', _cash_movement_id,
      'cash_movement_recorded', _cash_ok
    )
  );

  RETURN _payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.process_sale_payment(uuid, numeric, text, integer, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_sale_payment(uuid, numeric, text, integer, text, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.process_sale_payment(uuid, numeric, text, integer, text, text, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.process_sale_payment(uuid, numeric, text, integer, text, text, uuid) FROM service_role;

GRANT EXECUTE ON FUNCTION public.process_sale_payment(uuid, numeric, text, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale_payment(uuid, numeric, text, integer, text, text, uuid) TO service_role;
