DROP FUNCTION IF EXISTS public.cancel_sale(uuid, text);

CREATE OR REPLACE FUNCTION public.cancel_sale(_sale_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale sales%ROWTYPE;
  _item record;
  _product products%ROWTYPE;
  _new_qty integer;
  _user_id uuid;
  _mov record;
BEGIN
  _user_id := auth.uid();

  SELECT * INTO _sale FROM sales WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF _sale.status = 'cancelled' THEN RAISE EXCEPTION 'Venda já cancelada'; END IF;

  -- Reverse stock if sale was completed
  IF _sale.status = 'completed' THEN
    FOR _item IN SELECT * FROM sale_items WHERE sale_id = _sale_id LOOP
      IF _item.product_id IS NOT NULL THEN
        SELECT * INTO _product FROM products WHERE id = _item.product_id FOR UPDATE;
        IF FOUND THEN
          _new_qty := _product.quantity + _item.quantity;
          UPDATE products SET quantity = _new_qty WHERE id = _item.product_id;

          INSERT INTO stock_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference_type, reference_id, notes, created_by)
          VALUES (_item.product_id, 'sale_return', _item.quantity, _product.quantity, _new_qty, _item.cost_price_snapshot, 'sale', _sale_id, 'Cancelamento: ' || _sale.sale_number || ' - ' || _reason, _user_id);
        END IF;
      END IF;
    END LOOP;

    -- Cancel related financial entries
    UPDATE financial_entries SET status = 'cancelled', updated_at = now()
    WHERE category = 'sale' AND description LIKE '%' || _sale.sale_number || '%' AND status <> 'cancelled';

    -- Cancel related accounts receivable
    UPDATE accounts_receivable SET status = 'cancelled', updated_at = now()
    WHERE reference_type = 'sale' AND reference_id = _sale_id AND status <> 'cancelled';
  END IF;

  -- Reverse cash register movements (insert opposite movements)
  FOR _mov IN
    SELECT * FROM cash_register_movements
    WHERE reference_type = 'sale' AND reference_id = _sale_id
  LOOP
    IF EXISTS (SELECT 1 FROM cash_registers WHERE id = _mov.cash_register_id AND status = 'open') THEN
      INSERT INTO cash_register_movements (
        cash_register_id, movement_type, payment_method, amount,
        description, reference_type, reference_id, affects_cash, affects_bank,
        source_type, created_by, tenant_id
      ) VALUES (
        _mov.cash_register_id, 'adjustment', _mov.payment_method, -_mov.amount,
        'Cancelamento: ' || _sale.sale_number || ' - ' || _reason,
        'sale_cancel', _sale_id, _mov.affects_cash, _mov.affects_bank,
        'system', _user_id, _mov.tenant_id
      );
    END IF;
  END LOOP;

  UPDATE sales SET status = 'cancelled', payment_status = 'cancelled', cancelled_at = now() WHERE id = _sale_id;

  RETURN jsonb_build_object('success', true);
END;
$$;