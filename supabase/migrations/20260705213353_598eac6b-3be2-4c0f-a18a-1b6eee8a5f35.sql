
CREATE OR REPLACE FUNCTION public.update_draft_sale(
  _sale_id uuid,
  _sale_data jsonb,
  _items jsonb,
  _payments jsonb DEFAULT '[]'::jsonb,
  _finalize boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _active_tenant_id uuid;
  _sale public.sales%ROWTYPE;
  _old_items_count int;
  _old_payments_count int;
  _old_total numeric;
  _old_payment_status public.sale_payment_status;
  _subtotal numeric := 0;
  _discount numeric := 0;
  _surcharge numeric := 0;
  _total numeric := 0;
  _customer_id uuid;
  _notes text;
  _item jsonb;
  _pay jsonb;
  _paid_sum numeric := 0;
  _new_payment_status public.sale_payment_status;
  _new_items_count int := 0;
  _new_payments_count int := 0;
  _complete_result uuid;
BEGIN
  -- Auth
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Tenant
  _active_tenant_id := public.get_active_tenant_id();
  IF _active_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant required' USING ERRCODE = '42501';
  END IF;

  -- Permission
  IF NOT public.has_permission(auth.uid(), 'sales.update') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Lock the sale within tenant
  SELECT * INTO _sale
  FROM public.sales
  WHERE id = _sale_id AND tenant_id = _active_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sale not found or access denied' USING ERRCODE = '42501';
  END IF;

  -- Only draft
  IF _sale.status <> 'draft' THEN
    RAISE EXCEPTION 'only draft sales can be updated' USING ERRCODE = '22023';
  END IF;

  -- Snapshot old for audit
  _old_total := _sale.total_amount;
  _old_payment_status := _sale.payment_status;
  SELECT COUNT(*) INTO _old_items_count FROM public.sale_items WHERE sale_id = _sale_id AND tenant_id = _active_tenant_id;
  SELECT COUNT(*) INTO _old_payments_count FROM public.sale_payments WHERE sale_id = _sale_id AND tenant_id = _active_tenant_id;

  -- Parse header fields (whitelisted)
  _customer_id := NULLIF(_sale_data->>'customer_id','')::uuid;
  _discount    := COALESCE((_sale_data->>'discount_amount')::numeric, 0);
  _surcharge   := COALESCE((_sale_data->>'surcharge_amount')::numeric, 0);
  _notes       := NULLIF(_sale_data->>'notes','');

  IF _discount < 0 OR _surcharge < 0 THEN
    RAISE EXCEPTION 'invalid discount or surcharge' USING ERRCODE = '22023';
  END IF;

  -- Validate items and compute subtotal
  IF jsonb_typeof(_items) <> 'array' THEN
    RAISE EXCEPTION 'items must be an array' USING ERRCODE = '22023';
  END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    IF COALESCE((_item->>'quantity')::int, 0) <= 0 THEN
      RAISE EXCEPTION 'item quantity must be > 0' USING ERRCODE = '22023';
    END IF;
    IF COALESCE((_item->>'unit_price')::numeric, -1) < 0 THEN
      RAISE EXCEPTION 'item unit_price must be >= 0' USING ERRCODE = '22023';
    END IF;
    _subtotal := _subtotal
      + (COALESCE((_item->>'unit_price')::numeric,0) * COALESCE((_item->>'quantity')::int,0))
      - COALESCE((_item->>'discount_amount')::numeric,0);
    _new_items_count := _new_items_count + 1;
  END LOOP;

  _total := _subtotal - _discount + _surcharge;
  IF _total < 0 THEN
    RAISE EXCEPTION 'total cannot be negative' USING ERRCODE = '22023';
  END IF;

  -- Replace items (server-side, scoped by tenant)
  DELETE FROM public.sale_items
   WHERE sale_id = _sale_id AND tenant_id = _active_tenant_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    INSERT INTO public.sale_items (
      sale_id, tenant_id, product_id, sku_snapshot, product_name_snapshot,
      quantity, unit_price, cost_price_snapshot, discount_amount, total_amount
    ) VALUES (
      _sale_id,
      _active_tenant_id,
      NULLIF(_item->>'product_id','')::uuid,
      NULLIF(_item->>'sku_snapshot',''),
      COALESCE(_item->>'product_name_snapshot',''),
      COALESCE((_item->>'quantity')::int, 1),
      COALESCE((_item->>'unit_price')::numeric, 0),
      COALESCE((_item->>'cost_price_snapshot')::numeric, 0),
      COALESCE((_item->>'discount_amount')::numeric, 0),
      (COALESCE((_item->>'unit_price')::numeric,0) * COALESCE((_item->>'quantity')::int,0))
        - COALESCE((_item->>'discount_amount')::numeric,0)
    );
  END LOOP;

  -- Replace payments (server-side, scoped by tenant)
  DELETE FROM public.sale_payments
   WHERE sale_id = _sale_id AND tenant_id = _active_tenant_id;

  IF jsonb_typeof(_payments) = 'array' THEN
    FOR _pay IN SELECT * FROM jsonb_array_elements(_payments) LOOP
      IF COALESCE((_pay->>'amount')::numeric, 0) <= 0 THEN
        RAISE EXCEPTION 'payment amount must be > 0' USING ERRCODE = '22023';
      END IF;
      IF NULLIF(_pay->>'payment_method','') IS NULL THEN
        RAISE EXCEPTION 'payment_method is required' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.sale_payments (
        sale_id, tenant_id, payment_method, amount, installments, reference, notes
      ) VALUES (
        _sale_id,
        _active_tenant_id,
        (_pay->>'payment_method')::public.sale_payment_method,
        (_pay->>'amount')::numeric,
        NULLIF(_pay->>'installments','')::int,
        NULLIF(_pay->>'reference',''),
        NULLIF(_pay->>'notes','')
      );
      _paid_sum := _paid_sum + (_pay->>'amount')::numeric;
      _new_payments_count := _new_payments_count + 1;
    END LOOP;
  END IF;

  -- Recompute payment_status server-side
  IF _paid_sum <= 0 THEN
    _new_payment_status := 'pending';
  ELSIF _paid_sum >= _total THEN
    _new_payment_status := 'paid';
  ELSE
    _new_payment_status := 'partial';
  END IF;

  -- Update sale header (whitelisted fields only)
  UPDATE public.sales
     SET customer_id      = _customer_id,
         subtotal         = _subtotal,
         discount_amount  = _discount,
         surcharge_amount = _surcharge,
         total_amount     = _total,
         notes            = _notes,
         payment_status   = _new_payment_status
   WHERE id = _sale_id AND tenant_id = _active_tenant_id;

  -- Audit
  INSERT INTO public.audit_logs (tenant_id, user_id, table_name, record_id, action, old_data, new_data)
  VALUES (
    _active_tenant_id,
    auth.uid(),
    'sales',
    _sale_id,
    'draft_sale_updated',
    jsonb_build_object(
      'status', _sale.status,
      'total_amount', _old_total,
      'payment_status', _old_payment_status,
      'items_count', _old_items_count,
      'payments_count', _old_payments_count
    ),
    jsonb_build_object(
      'total_amount', _total,
      'payment_status', _new_payment_status,
      'items_count', _new_items_count,
      'payments_count', _new_payments_count,
      'finalize', _finalize
    )
  );

  -- Optional finalize (keep behaviour: delegate to complete_sale, called separately by client)
  IF _finalize THEN
    SELECT public.complete_sale(_sale_id) INTO _complete_result;
  END IF;

  RETURN _sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_draft_sale(uuid, jsonb, jsonb, jsonb, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_draft_sale(uuid, jsonb, jsonb, jsonb, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_draft_sale(uuid, jsonb, jsonb, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_draft_sale(uuid, jsonb, jsonb, jsonb, boolean) TO service_role;
