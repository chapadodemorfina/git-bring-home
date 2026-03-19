DROP FUNCTION IF EXISTS public.process_sale_return(uuid, uuid, uuid, integer, numeric, text);

CREATE OR REPLACE FUNCTION public.process_sale_return(
  _sale_id uuid, _sale_item_id uuid, _product_id uuid, _quantity integer, _amount_refunded numeric, _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale sales%ROWTYPE;
  _item sale_items%ROWTYPE;
  _product products%ROWTYPE;
  _new_qty integer;
  _user_id uuid;
  _total_returned integer;
  _mov record;
BEGIN
  _user_id := auth.uid();

  SELECT * INTO _sale FROM sales WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF _sale.status NOT IN ('completed', 'partially_refunded') THEN RAISE EXCEPTION 'Venda não pode receber devolução neste status'; END IF;

  -- Validate item quantity
  IF _sale_item_id IS NOT NULL THEN
    SELECT * INTO _item FROM sale_items WHERE id = _sale_item_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado'; END IF;

    SELECT COALESCE(SUM(quantity), 0) INTO _total_returned FROM sale_returns WHERE sale_item_id = _sale_item_id;
    IF _total_returned + _quantity > _item.quantity THEN
      RAISE EXCEPTION 'Quantidade de devolução excede o vendido';
    END IF;
  END IF;

  -- Return to stock
  IF _product_id IS NOT NULL THEN
    SELECT * INTO _product FROM products WHERE id = _product_id FOR UPDATE;
    IF FOUND THEN
      _new_qty := _product.quantity + _quantity;
      UPDATE products SET quantity = _new_qty WHERE id = _product_id;

      INSERT INTO stock_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference_type, reference_id, notes, created_by)
      VALUES (_product_id, 'sale_return', _quantity, _product.quantity, _new_qty, _product.cost_price, 'sale', _sale_id, 'Devolução: ' || _reason, _user_id);
    END IF;
  END IF;

  -- Record return
  INSERT INTO sale_returns (sale_id, sale_item_id, product_id, quantity, amount_refunded, reason, processed_by)
  VALUES (_sale_id, _sale_item_id, _product_id, _quantity, _amount_refunded, _reason, _user_id);

  -- Update sale status
  DECLARE
    _all_items_total integer;
    _all_returned_total integer;
  BEGIN
    SELECT COALESCE(SUM(quantity), 0) INTO _all_items_total FROM sale_items WHERE sale_id = _sale_id;
    SELECT COALESCE(SUM(quantity), 0) INTO _all_returned_total FROM sale_returns WHERE sale_id = _sale_id;

    IF _all_returned_total >= _all_items_total THEN
      UPDATE sales SET status = 'refunded' WHERE id = _sale_id;
    ELSE
      UPDATE sales SET status = 'partially_refunded' WHERE id = _sale_id;
    END IF;
  END;

  -- Financial adjustment
  IF _amount_refunded > 0 THEN
    INSERT INTO financial_entries (entry_type, description, amount, paid_amount, customer_id, category, status, created_by)
    VALUES ('expense', 'Devolução - ' || _sale.sale_number, _amount_refunded, _amount_refunded,
      _sale.customer_id, 'sale_return', 'paid', _user_id);
  END IF;

  -- Reverse proportional cash register movements
  -- Find original sale movements and create refund entries proportionally
  IF _amount_refunded > 0 THEN
    FOR _mov IN
      SELECT * FROM cash_register_movements
      WHERE reference_type = 'sale' AND reference_id = _sale_id AND amount > 0
    LOOP
      IF EXISTS (SELECT 1 FROM cash_registers WHERE id = _mov.cash_register_id AND status = 'open') THEN
        -- Create refund movement on same channel (cash/bank) as original payment
        INSERT INTO cash_register_movements (
          cash_register_id, movement_type, payment_method, amount,
          description, reference_type, reference_id, affects_cash, affects_bank,
          source_type, created_by, tenant_id
        ) VALUES (
          _mov.cash_register_id, 'withdrawal', _mov.payment_method,
          -LEAST(_amount_refunded, _mov.amount),
          'Devolução: ' || _sale.sale_number || ' - ' || _reason,
          'sale_return', _sale_id, _mov.affects_cash, _mov.affects_bank,
          'system', _user_id, _mov.tenant_id
        );
        -- Only refund up to the amount needed
        _amount_refunded := _amount_refunded - LEAST(_amount_refunded, _mov.amount);
        EXIT WHEN _amount_refunded <= 0;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;