-- =====================================================
-- SALES ↔ FINANCIAL ENTRIES SYNC
-- Structural fix for payment synchronization
-- =====================================================

-- 1. ADD sale_id COLUMN to financial_entries
ALTER TABLE public.financial_entries 
  ADD COLUMN IF NOT EXISTS sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_entries_sale_id 
  ON public.financial_entries(sale_id) WHERE sale_id IS NOT NULL;

-- 2. BACKFILL existing data: link the known sale financial entry
UPDATE public.financial_entries fe
SET sale_id = s.id
FROM public.sales s
WHERE fe.category = 'sale'
  AND fe.sale_id IS NULL
  AND fe.description = 'Venda ' || s.sale_number
  AND fe.tenant_id = s.tenant_id;

-- 3. CENTRAL RECALCULATION FUNCTION
CREATE OR REPLACE FUNCTION public.recalculate_sale_payment_status(_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale_total numeric;
  _sale_tenant uuid;
  _total_paid numeric;
  _new_status sale_payment_status;
  _sale_current_status text;
BEGIN
  -- Get sale info
  SELECT total_amount, tenant_id, status::text
  INTO _sale_total, _sale_tenant, _sale_current_status
  FROM sales WHERE id = _sale_id;

  IF NOT FOUND THEN RETURN; END IF;
  
  -- Don't recalculate cancelled/refunded sales
  IF _sale_current_status IN ('cancelled', 'refunded') THEN RETURN; END IF;

  -- Sum paid_amount from all active financial entries linked to this sale
  SELECT COALESCE(SUM(paid_amount), 0)
  INTO _total_paid
  FROM financial_entries
  WHERE sale_id = _sale_id
    AND tenant_id = _sale_tenant
    AND status::text NOT IN ('cancelled');

  -- Also include direct sale_payments not linked via financial_entries
  -- (payments registered directly on the sale screen)
  _total_paid := _total_paid + COALESCE((
    SELECT SUM(sp.amount)
    FROM sale_payments sp
    WHERE sp.sale_id = _sale_id
      AND sp.tenant_id = _sale_tenant
      AND NOT EXISTS (
        -- Exclude if there's already a financial_entry tracking this sale
        -- to avoid double-counting
        SELECT 1 FROM financial_entries fe2
        WHERE fe2.sale_id = _sale_id
          AND fe2.tenant_id = _sale_tenant
          AND fe2.status::text <> 'cancelled'
      )
  ), 0);

  -- Determine new status
  IF _total_paid <= 0 THEN
    _new_status := 'pending';
  ELSIF _total_paid >= _sale_total THEN
    _new_status := 'paid';
  ELSE
    _new_status := 'partial';
  END IF;

  -- Update sale (only if changed to avoid unnecessary writes)
  UPDATE sales
  SET payment_status = _new_status,
      updated_at = now()
  WHERE id = _sale_id
    AND tenant_id = _sale_tenant
    AND payment_status IS DISTINCT FROM _new_status;
END;
$$;

-- 4. TRIGGER FUNCTION on financial_entries
CREATE OR REPLACE FUNCTION public.trg_sync_sale_payment_from_financial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_sale_id uuid;
BEGIN
  -- Prevent infinite loops
  IF current_setting('app.syncing_sale', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Determine which sale_id to recalculate
  IF TG_OP = 'DELETE' THEN
    _target_sale_id := OLD.sale_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Recalculate for both old and new sale_id if changed
    IF OLD.sale_id IS DISTINCT FROM NEW.sale_id AND OLD.sale_id IS NOT NULL THEN
      PERFORM set_config('app.syncing_sale', 'true', true);
      PERFORM recalculate_sale_payment_status(OLD.sale_id);
      PERFORM set_config('app.syncing_sale', 'false', true);
    END IF;
    _target_sale_id := NEW.sale_id;
  ELSE
    _target_sale_id := NEW.sale_id;
  END IF;

  -- Only proceed if linked to a sale
  IF _target_sale_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Set guard flag and recalculate
  PERFORM set_config('app.syncing_sale', 'true', true);
  PERFORM recalculate_sale_payment_status(_target_sale_id);
  PERFORM set_config('app.syncing_sale', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. ATTACH TRIGGERS to financial_entries
DROP TRIGGER IF EXISTS trg_financial_entry_sale_sync ON public.financial_entries;

CREATE TRIGGER trg_financial_entry_sale_sync
  AFTER INSERT OR UPDATE OF paid_amount, status, sale_id, amount
  OR DELETE
  ON public.financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_sale_payment_from_financial();

-- 6. UPDATE complete_sale TO STORE sale_id in financial_entries
CREATE OR REPLACE FUNCTION public.complete_sale(_sale_id uuid)
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

  -- Calculate payment status from sale_payments
  SELECT COALESCE(SUM(amount), 0) INTO _total_paid FROM sale_payments WHERE sale_id = _sale_id;
  IF _total_paid >= _sale.total_amount THEN _pay_status := 'paid';
  ELSIF _total_paid > 0 THEN _pay_status := 'partial';
  ELSE _pay_status := 'pending';
  END IF;

  -- Set guard to prevent trigger loop
  PERFORM set_config('app.syncing_sale', 'true', true);

  -- Update sale
  UPDATE sales SET status = 'completed', payment_status = _pay_status, completed_at = now() WHERE id = _sale_id;

  -- Create financial entry WITH sale_id link
  IF _sale.total_amount > 0 THEN
    INSERT INTO financial_entries (entry_type, description, amount, paid_amount, customer_id, category, status, created_by, tenant_id, sale_id)
    VALUES ('revenue', 'Venda ' || _sale.sale_number, _sale.total_amount, _total_paid,
      _sale.customer_id, 'sale',
      CASE WHEN _total_paid >= _sale.total_amount THEN 'paid'::financial_entry_status
           WHEN _total_paid > 0 THEN 'partial'::financial_entry_status
           ELSE 'pending'::financial_entry_status END,
      _user_id, _sale.tenant_id, _sale_id);
  END IF;

  -- Reset guard
  PERFORM set_config('app.syncing_sale', 'false', true);

  -- Auto-generate commissions
  PERFORM generate_sale_commissions(_sale_id);

  RETURN jsonb_build_object('success', true, 'payment_status', _pay_status::text);
END;
$$;