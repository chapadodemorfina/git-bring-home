
CREATE OR REPLACE FUNCTION public.process_sale_return(
  _sale_id uuid,
  _sale_item_id uuid,
  _product_id uuid,
  _quantity integer,
  _amount_refunded numeric,
  _reason text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _active_tenant_id uuid;
  _sale record;
  _sale_item record;
  _product record;
  _new_qty integer;
  _return_id uuid;
  _proportion numeric;
  _mov record;
  _new_total_returned numeric;
  _new_status sale_status;
  _already_returned_qty integer;
  _already_returned_amount numeric;
  _remaining_qty integer;
  _remaining_amount numeric;
  _item_original_total numeric;
BEGIN
  -- Auth
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Reason required
  IF coalesce(trim(_reason), '') = '' THEN
    RAISE EXCEPTION 'reason required' USING ERRCODE = '22023';
  END IF;

  -- Quantity
  IF _quantity IS NULL OR _quantity <= 0 THEN
    RAISE EXCEPTION 'invalid return quantity' USING ERRCODE = '22023';
  END IF;

  -- Amount
  IF _amount_refunded IS NULL OR _amount_refunded <= 0 THEN
    RAISE EXCEPTION 'invalid refund amount' USING ERRCODE = '22023';
  END IF;

  -- Tenant
  _active_tenant_id := public.get_active_tenant_id();
  IF _active_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant required' USING ERRCODE = '42501';
  END IF;

  -- Permission
  IF NOT public.has_permission(auth.uid(), 'sales.return') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Load + lock sale scoped to tenant
  SELECT * INTO _sale
  FROM public.sales
  WHERE id = _sale_id
    AND tenant_id = _active_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sale not found or access denied' USING ERRCODE = '42501';
  END IF;

  IF _sale.status = 'cancelled'::sale_status THEN
    RAISE EXCEPTION 'sale already cancelled' USING ERRCODE = '22023';
  END IF;

  IF _sale.status = 'refunded'::sale_status THEN
    RAISE EXCEPTION 'sale already refunded' USING ERRCODE = '22023';
  END IF;

  -- Load + lock sale item scoped to sale/product/tenant
  SELECT * INTO _sale_item
  FROM public.sale_items
  WHERE id = _sale_item_id
    AND sale_id = _sale_id
    AND product_id = _product_id
    AND tenant_id = _active_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sale item not found or access denied' USING ERRCODE = '42501';
  END IF;

  -- Already returned quantity/amount for this item
  SELECT coalesce(sum(quantity), 0), coalesce(sum(amount_refunded), 0)
  INTO _already_returned_qty, _already_returned_amount
  FROM public.sale_returns
  WHERE sale_id = _sale_id
    AND sale_item_id = _sale_item_id
    AND product_id = _product_id
    AND tenant_id = _active_tenant_id;

  _remaining_qty := _sale_item.quantity - _already_returned_qty;
  IF _quantity > _remaining_qty THEN
    RAISE EXCEPTION 'return quantity exceeds available quantity' USING ERRCODE = '22023';
  END IF;

  -- Item-level amount validation
  _item_original_total := coalesce(_sale_item.total_amount, _sale_item.unit_price * _sale_item.quantity);
  IF _amount_refunded > (_item_original_total - _already_returned_amount) THEN
    RAISE EXCEPTION 'refund amount exceeds available item amount' USING ERRCODE = '22023';
  END IF;

  -- Sale-level amount validation
  _remaining_amount := _sale.total_amount - coalesce(_sale.total_returned, 0);
  IF _amount_refunded > _remaining_amount THEN
    RAISE EXCEPTION 'refund amount exceeds available amount' USING ERRCODE = '22023';
  END IF;

  -- Insert return record
  INSERT INTO sale_returns (sale_id, sale_item_id, product_id, quantity, amount_refunded, reason, tenant_id, processed_by)
  VALUES (_sale_id, _sale_item_id, _product_id, _quantity, _amount_refunded, trim(_reason), _sale.tenant_id, auth.uid())
  RETURNING id INTO _return_id;

  -- Stock reversal
  IF _product_id IS NOT NULL THEN
    SELECT * INTO _product FROM products WHERE id = _product_id FOR UPDATE;
    IF FOUND THEN
      _new_qty := _product.quantity + _quantity;
      UPDATE products SET quantity = _new_qty WHERE id = _product_id;
      INSERT INTO stock_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference_id, reference_type, notes, tenant_id)
      VALUES (_product_id, 'sale_return'::stock_movement_type, _quantity, _product.quantity, _new_qty, 0, _sale_id, 'sale_return', 'Devolução: ' || trim(_reason), _sale.tenant_id);
    END IF;
  END IF;

  -- Financial expense entry
  INSERT INTO financial_entries (entry_type, description, amount, status, tenant_id, created_by)
  VALUES ('expense'::financial_entry_type, 'Devolução ' || _sale.sale_number || ': ' || trim(_reason), _amount_refunded, 'paid'::financial_entry_status, _sale.tenant_id, auth.uid());

  -- Cash register reversal
  FOR _mov IN
    SELECT * FROM cash_register_movements
    WHERE reference_id = _sale_id::text AND tenant_id = _sale.tenant_id
      AND movement_type::text IN ('sale', 'receipt')
    ORDER BY created_at LIMIT 1
  LOOP
    INSERT INTO cash_register_movements (
      cash_register_id, movement_type, amount, description, reference_id, reference_type,
      payment_method, affects_cash, affects_bank, source_type, tenant_id, created_by
    ) VALUES (
      _mov.cash_register_id, 'withdrawal'::cash_movement_type, _amount_refunded,
      'Devolução ' || _sale.sale_number, _sale_id::text, 'sale_return',
      _mov.payment_method, _mov.affects_cash, _mov.affects_bank, 'sale', _sale.tenant_id, auth.uid()
    );
  END LOOP;

  -- Proportional commission reversal
  IF _sale.total_amount > 0 THEN
    _proportion := _amount_refunded / _sale.total_amount;
    PERFORM reverse_sale_commissions(_sale_id, _proportion);
  END IF;

  -- Update sale totals/status
  _new_total_returned := COALESCE(_sale.total_returned, 0) + _amount_refunded;
  _new_status := CASE
    WHEN _new_total_returned >= _sale.total_amount THEN 'refunded'::sale_status
    ELSE 'partially_refunded'::sale_status
  END;
  UPDATE sales SET
    total_returned = _new_total_returned,
    status = _new_status
  WHERE id = _sale_id;

  -- Audit
  INSERT INTO public.audit_logs (
    tenant_id, user_id, table_name, record_id, action, old_data, new_data
  ) VALUES (
    _active_tenant_id,
    auth.uid(),
    'sales',
    _sale_id,
    'sale_return_processed',
    jsonb_build_object(
      'status', _sale.status,
      'total_returned', _sale.total_returned,
      'payment_status', _sale.payment_status,
      'total_amount', _sale.total_amount
    ),
    jsonb_build_object(
      'sale_return_id', _return_id,
      'sale_item_id', _sale_item_id,
      'product_id', _product_id,
      'quantity', _quantity,
      'amount_refunded', _amount_refunded,
      'reason', trim(_reason),
      'new_status', _new_status,
      'new_total_returned', _new_total_returned
    )
  );

  RETURN _return_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.process_sale_return(uuid, uuid, uuid, integer, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_sale_return(uuid, uuid, uuid, integer, numeric, text) FROM anon;
REVOKE ALL ON FUNCTION public.process_sale_return(uuid, uuid, uuid, integer, numeric, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.process_sale_return(uuid, uuid, uuid, integer, numeric, text) FROM service_role;

GRANT EXECUTE ON FUNCTION public.process_sale_return(uuid, uuid, uuid, integer, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale_return(uuid, uuid, uuid, integer, numeric, text) TO service_role;
