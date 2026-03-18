
-- ============================================
-- SALES MODULE - Complete Schema
-- ============================================

-- 1. Enums
CREATE TYPE public.sale_status AS ENUM ('draft', 'completed', 'cancelled', 'partially_refunded', 'refunded');
CREATE TYPE public.sale_payment_status AS ENUM ('pending', 'partial', 'paid', 'refunded', 'cancelled');
CREATE TYPE public.sale_payment_method AS ENUM ('cash', 'pix', 'credit_card', 'debit_card', 'bank_transfer', 'other');

-- 2. Sales table
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  seller_user_id uuid NOT NULL,
  status public.sale_status NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  surcharge_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_status public.sale_payment_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

-- Auto sale_number sequence
CREATE SEQUENCE public.sale_number_seq START 1;

CREATE OR REPLACE FUNCTION public.trg_set_sale_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := 'VEN-' || lpad(nextval('sale_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sale_number
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_sale_number();

-- updated_at trigger
CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Sale Items
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  sku_snapshot text,
  product_name_snapshot text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  cost_price_snapshot numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Sale Payments
CREATE TABLE public.sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method public.sale_payment_method NOT NULL DEFAULT 'pix',
  amount numeric NOT NULL DEFAULT 0,
  installments integer,
  reference text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Sale Returns
CREATE TABLE public.sale_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  sale_item_id uuid REFERENCES public.sale_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  amount_refunded numeric NOT NULL DEFAULT 0,
  reason text NOT NULL,
  returned_at timestamptz NOT NULL DEFAULT now(),
  processed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_returns ENABLE ROW LEVEL SECURITY;

-- Sales policies: admin, manager, front_desk, finance can read; admin/manager/front_desk can write
CREATE POLICY "sales_select" ON public.sales FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk', 'finance']::app_role[]));

CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk']::app_role[]));

CREATE POLICY "sales_update" ON public.sales FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk', 'finance']::app_role[]));

-- Sale items (cascade from sale access)
CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk', 'finance']::app_role[]));

CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk']::app_role[]));

CREATE POLICY "sale_items_update" ON public.sale_items FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk']::app_role[]));

CREATE POLICY "sale_items_delete" ON public.sale_items FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk']::app_role[]));

-- Sale payments
CREATE POLICY "sale_payments_select" ON public.sale_payments FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk', 'finance']::app_role[]));

CREATE POLICY "sale_payments_insert" ON public.sale_payments FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk', 'finance']::app_role[]));

-- Sale returns
CREATE POLICY "sale_returns_select" ON public.sale_returns FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'front_desk', 'finance']::app_role[]));

CREATE POLICY "sale_returns_insert" ON public.sale_returns FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'finance']::app_role[]));

-- 7. Audit triggers
CREATE TRIGGER trg_audit_sales_insert
  AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log('sale_created');

CREATE TRIGGER trg_audit_sales_update
  AFTER UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log('sale_updated');

-- 8. Complete sale function (stock deduction + financial entry)
CREATE OR REPLACE FUNCTION public.complete_sale(_sale_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Validate and deduct stock for each item
  FOR _item IN SELECT * FROM sale_items WHERE sale_id = _sale_id LOOP
    IF _item.product_id IS NOT NULL THEN
      SELECT * INTO _product FROM products WHERE id = _item.product_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Produto % não encontrado', _item.product_name_snapshot; END IF;
      IF _product.quantity < _item.quantity THEN
        RAISE EXCEPTION 'Estoque insuficiente para %: disponível %, solicitado %', _product.name, _product.quantity, _item.quantity;
      END IF;

      _new_qty := _product.quantity - _item.quantity;
      UPDATE products SET quantity = _new_qty WHERE id = _item.product_id;

      INSERT INTO stock_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference_type, reference_id, notes, created_by)
      VALUES (_item.product_id, 'sale', -_item.quantity, _product.quantity, _new_qty, _item.cost_price_snapshot, 'sale', _sale_id, 'Venda ' || _sale.sale_number, _user_id);
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

  -- Create financial entry
  IF _sale.total_amount > 0 THEN
    INSERT INTO financial_entries (entry_type, description, amount, paid_amount, customer_id, category, status, created_by)
    VALUES ('revenue', 'Venda ' || _sale.sale_number, _sale.total_amount, _total_paid,
      _sale.customer_id, 'sale',
      CASE WHEN _total_paid >= _sale.total_amount THEN 'paid'::financial_entry_status
           WHEN _total_paid > 0 THEN 'partial'::financial_entry_status
           ELSE 'pending'::financial_entry_status END,
      _user_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'payment_status', _pay_status::text);
END;
$$;

-- 9. Cancel sale function (reverse stock + financial)
CREATE OR REPLACE FUNCTION public.cancel_sale(_sale_id uuid, _reason text DEFAULT 'Cancelamento')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sale sales%ROWTYPE;
  _item record;
  _product products%ROWTYPE;
  _new_qty integer;
  _user_id uuid;
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
  END IF;

  UPDATE sales SET status = 'cancelled', payment_status = 'cancelled', cancelled_at = now() WHERE id = _sale_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 10. Process return function
CREATE OR REPLACE FUNCTION public.process_sale_return(
  _sale_id uuid,
  _sale_item_id uuid,
  _product_id uuid,
  _quantity integer,
  _amount_refunded numeric,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sale sales%ROWTYPE;
  _item sale_items%ROWTYPE;
  _product products%ROWTYPE;
  _new_qty integer;
  _user_id uuid;
  _total_returned integer;
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

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 11. Sales dashboard summary
CREATE OR REPLACE FUNCTION public.sales_dashboard_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_sales', (SELECT COUNT(*) FROM sales WHERE status = 'completed' AND completed_at BETWEEN _from AND _to),
      'total_revenue', (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE status = 'completed' AND completed_at BETWEEN _from AND _to),
      'average_ticket', (SELECT COALESCE(AVG(total_amount), 0) FROM sales WHERE status = 'completed' AND completed_at BETWEEN _from AND _to),
      'total_returns', (SELECT COALESCE(SUM(amount_refunded), 0) FROM sale_returns sr JOIN sales s ON s.id = sr.sale_id WHERE sr.returned_at BETWEEN _from AND _to),
      'sales_by_payment_method', (
        SELECT COALESCE(jsonb_object_agg(pm::text, cnt), '{}'::jsonb)
        FROM (
          SELECT sp.payment_method as pm, COUNT(*) as cnt
          FROM sale_payments sp
          JOIN sales s ON s.id = sp.sale_id
          WHERE s.status = 'completed' AND s.completed_at BETWEEN _from AND _to
          GROUP BY sp.payment_method
        ) sub
      ),
      'top_products', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', product_name_snapshot, 'qty', total_qty, 'revenue', total_rev) ORDER BY total_qty DESC), '[]'::jsonb)
        FROM (
          SELECT si.product_name_snapshot, SUM(si.quantity) as total_qty, SUM(si.total_amount) as total_rev
          FROM sale_items si
          JOIN sales s ON s.id = si.sale_id
          WHERE s.status = 'completed' AND s.completed_at BETWEEN _from AND _to
          GROUP BY si.product_name_snapshot
          ORDER BY total_qty DESC LIMIT 10
        ) sub
      ),
      'sales_by_seller', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', COALESCE(p.full_name, 'Desconhecido'), 'count', cnt, 'revenue', rev) ORDER BY cnt DESC), '[]'::jsonb)
        FROM (
          SELECT s.seller_user_id, COUNT(*) as cnt, SUM(s.total_amount) as rev
          FROM sales s
          WHERE s.status = 'completed' AND s.completed_at BETWEEN _from AND _to
          GROUP BY s.seller_user_id
        ) sub
        LEFT JOIN profiles p ON p.id = sub.seller_user_id
      )
    )
  );
END;
$$;

-- Add 'sale' and 'sale_return' to stock_movements movement_type if not already there
-- We'll handle this via the `sb` cast since movement_type is likely text
-- No additional migration needed if movement_type is text

-- Index for performance
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sales_completed_at ON public.sales(completed_at);
CREATE INDEX idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX idx_sales_seller_user_id ON public.sales(seller_user_id);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_sale_payments_sale_id ON public.sale_payments(sale_id);
CREATE INDEX idx_sale_returns_sale_id ON public.sale_returns(sale_id);
