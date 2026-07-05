
CREATE OR REPLACE FUNCTION public.cancel_sale(_sale_id uuid, _reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _sale record;
  _item record;
  _product record;
  _new_qty integer;
  _mov record;
  _active_tenant_id uuid;
  _reason_trim text;
BEGIN
  -- Guard: authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Guard: reason required
  _reason_trim := coalesce(trim(_reason), '');
  IF _reason_trim = '' THEN
    RAISE EXCEPTION 'reason required' USING ERRCODE = '22023';
  END IF;

  -- Guard: active tenant
  _active_tenant_id := public.get_active_tenant_id();
  IF _active_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant required' USING ERRCODE = '42501';
  END IF;

  -- Guard: permission
  IF NOT public.has_permission(auth.uid(), 'sales.cancel') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Load sale with tenant boundary and lock
  SELECT * INTO _sale
  FROM public.sales
  WHERE id = _sale_id
    AND tenant_id = _active_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sale not found or access denied' USING ERRCODE = '42501';
  END IF;

  IF _sale.status::text = 'cancelled' THEN
    RAISE EXCEPTION 'sale already cancelled' USING ERRCODE = '22023';
  END IF;

  -- Revert stock only if sale was completed
  IF _sale.status::text = 'completed' OR _sale.status::text = 'partially_refunded' THEN
    FOR _item IN SELECT * FROM sale_items WHERE sale_id = _sale_id LOOP
      IF _item.product_id IS NOT NULL THEN
        SELECT * INTO _product FROM products WHERE id = _item.product_id FOR UPDATE;
        IF FOUND THEN
          _new_qty := _product.quantity + _item.quantity;
          UPDATE products SET quantity = _new_qty WHERE id = _item.product_id;
          INSERT INTO stock_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference_id, reference_type, notes, tenant_id)
          VALUES (_item.product_id, 'sale_return'::stock_movement_type, _item.quantity, _product.quantity, _new_qty, _item.cost_price_snapshot, _sale_id, 'sale', 'Estorno cancelamento ' || _sale.sale_number, _sale.tenant_id);
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Cancel financial entries
  UPDATE financial_entries SET status = 'cancelled'::financial_entry_status
  WHERE service_order_id IS NULL AND tenant_id = _sale.tenant_id
    AND description ILIKE '%' || _sale.sale_number || '%' AND status::text != 'cancelled';

  -- Cancel accounts receivable
  UPDATE accounts_receivable SET status = 'cancelled'
  WHERE reference_id = _sale_id::text AND tenant_id = _sale.tenant_id AND status != 'cancelled';

  -- Reverse cash register movements
  FOR _mov IN
    SELECT * FROM cash_register_movements
    WHERE reference_id = _sale_id::text AND tenant_id = _sale.tenant_id
      AND movement_type::text IN ('sale', 'receipt')
  LOOP
    INSERT INTO cash_register_movements (
      cash_register_id, movement_type, amount, description, reference_id, reference_type,
      payment_method, affects_cash, affects_bank, source_type, tenant_id, created_by
    ) VALUES (
      _mov.cash_register_id, 'withdrawal'::cash_movement_type, _mov.amount,
      'Estorno: ' || _mov.description, _sale_id::text, 'sale',
      _mov.payment_method, _mov.affects_cash, _mov.affects_bank, 'sale', _sale.tenant_id, _mov.created_by
    );
  END LOOP;

  PERFORM reverse_sale_commissions(_sale_id, 1.0);

  UPDATE sales SET
    status = 'cancelled'::sale_status,
    cancelled_at = now(),
    notes = COALESCE(notes, '') || ' | Cancelada: ' || _reason_trim
  WHERE id = _sale_id;

  -- Structured audit
  INSERT INTO public.audit_logs (
    tenant_id, user_id, table_name, record_id, action, old_data, new_data
  ) VALUES (
    _active_tenant_id,
    auth.uid(),
    'sales',
    _sale_id,
    'sale_cancelled',
    jsonb_build_object(
      'status', _sale.status,
      'payment_status', _sale.payment_status,
      'total_amount', _sale.total_amount
    ),
    jsonb_build_object(
      'status', 'cancelled',
      'reason', _reason_trim,
      'cancelled_at', now()
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_sale(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_sale(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.cancel_sale(uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.cancel_sale(uuid, text) FROM service_role;

GRANT EXECUTE ON FUNCTION public.cancel_sale(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale(uuid, text) TO service_role;
