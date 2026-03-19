
-- 1. Add total_returned column to sales if missing
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_returned numeric NOT NULL DEFAULT 0;

-- 2. Rewrite complete_sale to fix tenant_id issues and auto-generate commissions
CREATE OR REPLACE FUNCTION complete_sale(_sale_id uuid)
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
  _total_paid numeric;
  _pay_status sale_payment_status;
BEGIN
  _user_id := auth.uid();

  SELECT * INTO _sale FROM sales WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF _sale.status <> 'draft' THEN RAISE EXCEPTION 'Venda não está em rascunho'; END IF;

  -- Validate and deduct stock
  FOR _item IN SELECT * FROM sale_items WHERE sale_id = _sale_id LOOP
    IF _item.product_id IS NOT NULL THEN
      SELECT * INTO _product FROM products WHERE id = _item.product_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Produto % não encontrado', _item.product_name_snapshot; END IF;
      IF _product.quantity < _item.quantity THEN
        RAISE EXCEPTION 'Estoque insuficiente para %: disponível %, solicitado %', _product.name, _product.quantity, _item.quantity;
      END IF;

      _new_qty := _product.quantity - _item.quantity;
      UPDATE products SET quantity = _new_qty WHERE id = _item.product_id;

      INSERT INTO stock_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference_type, reference_id, notes, created_by, tenant_id)
      VALUES (_item.product_id, 'sale', -_item.quantity, _product.quantity, _new_qty, _item.cost_price_snapshot, 'sale', _sale_id, 'Venda ' || _sale.sale_number, _user_id, _sale.tenant_id);
    END IF;
  END LOOP;

  -- Calculate payment status
  SELECT COALESCE(SUM(amount), 0) INTO _total_paid FROM sale_payments WHERE sale_id = _sale_id;
  IF _total_paid >= _sale.total_amount THEN _pay_status := 'paid';
  ELSIF _total_paid > 0 THEN _pay_status := 'partial';
  ELSE _pay_status := 'pending';
  END IF;

  -- Update sale
  UPDATE sales SET status = 'completed', payment_status = _pay_status, completed_at = now() WHERE id = _sale_id;

  -- Create financial entry with tenant_id
  IF _sale.total_amount > 0 THEN
    INSERT INTO financial_entries (entry_type, description, amount, paid_amount, customer_id, category, status, created_by, tenant_id)
    VALUES ('revenue', 'Venda ' || _sale.sale_number, _sale.total_amount, _total_paid,
      _sale.customer_id, 'sale',
      CASE WHEN _total_paid >= _sale.total_amount THEN 'paid'::financial_entry_status
           WHEN _total_paid > 0 THEN 'partial'::financial_entry_status
           ELSE 'pending'::financial_entry_status END,
      _user_id, _sale.tenant_id);
  END IF;

  -- Auto-generate commissions
  PERFORM generate_sale_commissions(_sale_id);

  RETURN jsonb_build_object('success', true, 'payment_status', _pay_status::text);
END;
$$;
