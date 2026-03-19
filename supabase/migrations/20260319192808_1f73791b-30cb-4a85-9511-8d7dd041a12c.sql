DROP FUNCTION IF EXISTS public.cancel_sale(uuid, text);

CREATE OR REPLACE FUNCTION public.cancel_sale(_sale_id uuid, _reason text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale record;
  _item record;
  _mov record;
BEGIN
  SELECT * INTO _sale FROM sales WHERE id = _sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF _sale.status::text = 'cancelled' THEN RAISE EXCEPTION 'Venda já cancelada'; END IF;

  FOR _item IN SELECT * FROM sale_items WHERE sale_id = _sale_id LOOP
    IF _item.product_id IS NOT NULL THEN
      UPDATE products SET current_stock = current_stock + _item.quantity WHERE id = _item.product_id;
      INSERT INTO stock_movements (product_id, movement_type, quantity, unit_cost, reference_id, reference_type, notes, tenant_id)
      VALUES (_item.product_id, 'sale_return'::stock_movement_type, _item.quantity, _item.cost_price_snapshot, _sale_id, 'sale', 'Estorno cancelamento ' || _sale.sale_number, _sale.tenant_id);
    END IF;
  END LOOP;

  UPDATE financial_entries SET status = 'cancelled'::financial_entry_status
  WHERE service_order_id IS NULL AND tenant_id = _sale.tenant_id
    AND description ILIKE '%' || _sale.sale_number || '%' AND status::text != 'cancelled';

  UPDATE accounts_receivable SET status = 'cancelled'
  WHERE reference_id = _sale_id::text AND tenant_id = _sale.tenant_id AND status != 'cancelled';

  FOR _mov IN
    SELECT * FROM cash_register_movements
    WHERE reference_id = _sale_id::text AND tenant_id = _sale.tenant_id AND movement_type::text = 'receipt'
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

  UPDATE sales SET status = 'cancelled'::sale_status, notes = COALESCE(notes, '') || ' | Cancelada: ' || _reason
  WHERE id = _sale_id;
END;
$$;

-- Also update process_sale_return
DROP FUNCTION IF EXISTS public.process_sale_return(uuid, uuid, uuid, integer, numeric, text);

CREATE OR REPLACE FUNCTION public.process_sale_return(
  _sale_id uuid, _sale_item_id uuid, _product_id uuid,
  _quantity integer, _amount_refunded numeric, _reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale record;
  _return_id uuid;
  _proportion numeric;
  _mov record;
BEGIN
  SELECT * INTO _sale FROM sales WHERE id = _sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;

  INSERT INTO sale_returns (sale_id, sale_item_id, product_id, quantity, amount_refunded, reason, tenant_id)
  VALUES (_sale_id, _sale_item_id, _product_id, _quantity, _amount_refunded, _reason, _sale.tenant_id)
  RETURNING id INTO _return_id;

  IF _product_id IS NOT NULL THEN
    UPDATE products SET current_stock = current_stock + _quantity WHERE id = _product_id;
    INSERT INTO stock_movements (product_id, movement_type, quantity, unit_cost, reference_id, reference_type, notes, tenant_id)
    VALUES (_product_id, 'sale_return'::stock_movement_type, _quantity, 0, _sale_id, 'sale_return', 'Devolução: ' || _reason, _sale.tenant_id);
  END IF;

  INSERT INTO financial_entries (entry_type, description, amount, status, tenant_id)
  VALUES ('expense'::financial_entry_type, 'Devolução ' || _sale.sale_number || ': ' || _reason, _amount_refunded, 'paid'::financial_entry_status, _sale.tenant_id);

  FOR _mov IN
    SELECT * FROM cash_register_movements
    WHERE reference_id = _sale_id::text AND tenant_id = _sale.tenant_id AND movement_type::text = 'receipt'
    ORDER BY created_at LIMIT 1
  LOOP
    INSERT INTO cash_register_movements (
      cash_register_id, movement_type, amount, description, reference_id, reference_type,
      payment_method, affects_cash, affects_bank, source_type, tenant_id, created_by
    ) VALUES (
      _mov.cash_register_id, 'withdrawal'::cash_movement_type, _amount_refunded,
      'Devolução ' || _sale.sale_number, _sale_id::text, 'sale_return',
      _mov.payment_method, _mov.affects_cash, _mov.affects_bank, 'sale', _sale.tenant_id, _mov.created_by
    );
  END LOOP;

  IF _sale.total_amount > 0 THEN
    _proportion := _amount_refunded / _sale.total_amount;
    PERFORM reverse_sale_commissions(_sale_id, _proportion);
  END IF;

  UPDATE sales SET
    total_returned = COALESCE(total_returned, 0) + _amount_refunded,
    status = CASE WHEN COALESCE(total_returned, 0) + _amount_refunded >= total_amount THEN 'cancelled'::sale_status ELSE status END
  WHERE id = _sale_id;

  RETURN _return_id;
END;
$$;