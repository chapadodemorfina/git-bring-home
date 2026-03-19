-- Drop existing functions first to handle parameter default changes
DROP FUNCTION IF EXISTS cancel_sale(uuid, text);
DROP FUNCTION IF EXISTS process_sale_return(uuid, uuid, uuid, integer, numeric, text);

-- Fix cancel_sale: wrong column name (current_stock→quantity), missing cancelled_at, wrong movement_type filter
CREATE OR REPLACE FUNCTION cancel_sale(_sale_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale record;
  _item record;
  _product record;
  _new_qty integer;
  _mov record;
BEGIN
  SELECT * INTO _sale FROM sales WHERE id = _sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF _sale.status::text = 'cancelled' THEN RAISE EXCEPTION 'Venda já cancelada'; END IF;

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

  -- Reverse cash register movements (both 'sale' and 'receipt' types)
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
    notes = COALESCE(notes, '') || ' | Cancelada: ' || _reason
  WHERE id = _sale_id;
END;
$$;

-- Fix process_sale_return: wrong column name, missing stock tracking, status 'refunded' instead of 'cancelled'
CREATE OR REPLACE FUNCTION process_sale_return(
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
  _product record;
  _new_qty integer;
  _return_id uuid;
  _proportion numeric;
  _mov record;
  _new_total_returned numeric;
BEGIN
  SELECT * INTO _sale FROM sales WHERE id = _sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;

  INSERT INTO sale_returns (sale_id, sale_item_id, product_id, quantity, amount_refunded, reason, tenant_id)
  VALUES (_sale_id, _sale_item_id, _product_id, _quantity, _amount_refunded, _reason, _sale.tenant_id)
  RETURNING id INTO _return_id;

  -- Return stock with proper tracking
  IF _product_id IS NOT NULL THEN
    SELECT * INTO _product FROM products WHERE id = _product_id FOR UPDATE;
    IF FOUND THEN
      _new_qty := _product.quantity + _quantity;
      UPDATE products SET quantity = _new_qty WHERE id = _product_id;
      INSERT INTO stock_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference_id, reference_type, notes, tenant_id)
      VALUES (_product_id, 'sale_return'::stock_movement_type, _quantity, _product.quantity, _new_qty, 0, _sale_id, 'sale_return', 'Devolução: ' || _reason, _sale.tenant_id);
    END IF;
  END IF;

  -- Financial entry for refund
  INSERT INTO financial_entries (entry_type, description, amount, status, tenant_id, created_by)
  VALUES ('expense'::financial_entry_type, 'Devolução ' || _sale.sale_number || ': ' || _reason, _amount_refunded, 'paid'::financial_entry_status, _sale.tenant_id, auth.uid());

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
      _mov.payment_method, _mov.affects_cash, _mov.affects_bank, 'sale', _sale.tenant_id, _mov.created_by
    );
  END LOOP;

  -- Proportional commission reversal
  IF _sale.total_amount > 0 THEN
    _proportion := _amount_refunded / _sale.total_amount;
    PERFORM reverse_sale_commissions(_sale_id, _proportion);
  END IF;

  -- Update sale: use 'refunded' for full return, 'partially_refunded' for partial
  _new_total_returned := COALESCE(_sale.total_returned, 0) + _amount_refunded;
  UPDATE sales SET
    total_returned = _new_total_returned,
    status = CASE
      WHEN _new_total_returned >= total_amount THEN 'refunded'::sale_status
      ELSE 'partially_refunded'::sale_status
    END
  WHERE id = _sale_id;

  RETURN _return_id;
END;
$$;